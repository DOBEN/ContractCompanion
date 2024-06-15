import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, Button, Form } from "react-bootstrap";
import Switch from "react-switch";
import Select, { SingleValue } from "react-select";

import { BrowserProvider, EtherscanProvider } from "ethers";
import { functionArguments, functionSelectors } from "evmole";

import {
  NETWORK_OPTIONS,
  findOption,
  OptionType,
  validateAddress,
  validateByteCode,
} from "../utils";
import { ReadWriteRow } from "./ReadWriteRow";

interface Props {
  account: string | undefined;
  provider: BrowserProvider | undefined;
  blockchainNetwork: bigint | undefined;
  providerNetworkName: string | undefined;
  providerChainId: bigint | undefined;
  setSelectedNetwork: (network: bigint | undefined) => void;
  selectedNetwork: bigint | undefined;
  clearWalletConnection: () => void;
}

interface FunctionInterface {
  databaseLookUpArray: string[];
  functionHash: string;
  inputParameterTypeArray: string[];
  perfectMatchName: string | undefined;
}

export function MainCard(props: Props) {
  const {
    account,
    provider,
    blockchainNetwork,
    providerNetworkName,
    providerChainId,
    selectedNetwork,
    setSelectedNetwork,
    clearWalletConnection,
  } = props;

  type FormType = {
    deriveFromContractAddress: string | undefined;
    deriveFromChain: boolean;
    byteCode: string | undefined;
    contractAddress: string | undefined;
    valueInWEI: number | undefined;
    gasLimit: number | undefined;
  };
  const { formState, control, handleSubmit, register, reset } =
    useForm<FormType>({
      defaultValues: {
        deriveFromChain: true,
      },
      mode: "all",
    });

  const [
    deriveFromContractAddress,
    deriveFromChain,
    byteCode,
    contractAddress,
    valueInWEI,
    gasLimit,
  ] = useWatch({
    control: control,
    name: [
      "deriveFromContractAddress",
      "deriveFromChain",
      "byteCode",
      "contractAddress",
      "valueInWEI",
      "gasLimit",
    ],
  });

  const [error, setError] = useState<string | undefined>(undefined);
  const [newLoad, setNewLoad] = useState<boolean>(false);
  const [functionInterfaces, setFunctionInterfaces] = useState<
    FunctionInterface[]
  >([]);

  async function onSubmit(providedByteCode: string | undefined) {
    setError(undefined);
    setFunctionInterfaces([]);
    setNewLoad(false);

    let byteCode;

    if (deriveFromChain) {
      if (!deriveFromContractAddress) {
        setError(`'Contract Address' input field is undefined`);
        throw Error(`'Contract Address' input field is undefined`);
      }

      if (!providerChainId || !selectedNetwork) {
        setError(`Select 'Blockchain Network' in the drop down`);
        throw Error(`Select 'Blockchain Network' in the drop down`);
      }

      // If wallet is not connected then use the selected network, otherwise use the network from the wallet.
      const effectiveNetwork = account ? providerChainId : selectedNetwork;

      if (effectiveNetwork === -1n) {
        setError(
          `If you want to use the injected network from the wallet, then connect your wallet first.`,
        );
        throw new Error(
          `If you want to use the injected network from the wallet, then connect your wallet first.`,
        );
      }

      try {
        byteCode = await new EtherscanProvider(effectiveNetwork).getCode(
          deriveFromContractAddress,
        );
      } catch (error) {
        const err = error as Error;
        setError(
          `Provide the "Deployed ByteCode" instead because EtherScan does not support this network: ${err.message}.`,
        );
        throw new Error(
          `Provide the "Deployed ByteCode" instead because EtherScan does not support this network: ${err.message}.`,
        );
      }

      if (byteCode === "0x") {
        setError(
          `No bytecode at this address. This is not a contract address on the "${providerNetworkName}" network.`,
        );
        throw Error(
          `No bytecode at this address. This is not a contract address on the "${providerNetworkName}" network.`,
        );
      }
    } else {
      if (!providedByteCode) {
        setError(`'byteCode' input field is undefined`);
        throw Error(`'byteCode' input field is undefined`);
      }
      byteCode = providedByteCode;
    }

    const list = functionSelectors(byteCode);

    if (list.length === 0) {
      setError("Could not find any function selectors in the bytecode.");
      return;
    }

    const interfaces: FunctionInterface[] = [];

    for (let i = 0; i < list.length; i++) {
      const argumentsString = functionArguments(byteCode, list[i]);

      const inputParameters: string[] =
        argumentsString.trim() === ""
          ? []
          : Array.from(
              argumentsString.split(",").map((param: string) => param.trim()),
            );

      interfaces.push({
        functionHash: "0x" + list[i],
        inputParameterTypeArray: inputParameters,
        databaseLookUpArray: [],
        perfectMatchName: undefined,
      });
    }

    setFunctionInterfaces(interfaces);
    setNewLoad(true);
  }

  useEffect(() => {
    async function fetchFunctionInterfacesFromDatabase() {
      const tempFunctionInterfaces = [...functionInterfaces]; // Spread to create a new array copy

      const functionHashes = tempFunctionInterfaces.map(
        (item) => item.functionHash,
      );
      if (functionHashes.length > 0) {
        try {
          const response = await fetch(
            `https://api.openchain.xyz/signature-database/v1/lookup?function=${functionHashes.join(",")}&filter=false`,
            {
              method: "GET",
              headers: new Headers({ "Content-Type": "application/json" }),
            },
          );

          if (!response.ok) {
            const error = await response.json();
            console.error(
              `Unable to fetch function signatures: ${JSON.stringify(error)}`,
            );
            return; // Exit the function if the response is not OK
          }

          const abi = await response.json();

          tempFunctionInterfaces.forEach((functionInterface) => {
            const potentialFunctions =
              abi.result.function[functionInterface.functionHash] || [];

            potentialFunctions.forEach(
              (potentialFunction: { name: string }) => {
                // Find perfect name and input parameter match
                const regex = /\((.*?)\)/;
                const matches = potentialFunction.name.match(regex);

                // Get input parameter types
                if (matches && matches.length > 1) {
                  const parametersString = matches[1];
                  const parameters =
                    parametersString.trim() === ""
                      ? []
                      : parametersString
                          .split(",")
                          .map((param) => param.trim());

                  // If we find a function name where the input parameter perfectly matches the extracted input parameter from the bytecode.
                  // Mark this as the perfect match. We know this is the correct function name for sure.
                  if (
                    JSON.stringify(parameters) ===
                    JSON.stringify(functionInterface.inputParameterTypeArray)
                  ) {
                    const functionName = potentialFunction.name
                      .substring(0, potentialFunction.name.indexOf("("))
                      .trim();
                    functionInterface.perfectMatchName = functionName;
                  }
                }
              },
            );

            functionInterface.databaseLookUpArray = potentialFunctions;
          });

          setFunctionInterfaces(tempFunctionInterfaces);
        } catch (error) {
          console.error(`Error fetching function signatures: ${error}`);
        }
      }
    }

    fetchFunctionInterfacesFromDatabase();
  }, [newLoad]);

  return (
    <>
      <div className="centered">
        <div className="card">
          <h2 className="centered">Interact With Any Contract</h2>
          <br />

          <Form.Group className="col mb-3">
            <Form.Label>Blockchain Network</Form.Label>
            <Select
              options={NETWORK_OPTIONS}
              value={findOption(blockchainNetwork)}
              onChange={(selectedOption: SingleValue<OptionType>) => {
                clearWalletConnection();
                setSelectedNetwork(selectedOption?.value);
              }}
            />
            <Form.Text />
          </Form.Group>

          <Form onSubmit={handleSubmit(() => onSubmit(byteCode))}>
            <Form.Group className="col mb-3 centerItems">
              <Form.Label>Contract Address</Form.Label>
              <Controller
                name="deriveFromChain"
                control={control}
                render={({ field: { value } }) => (
                  <Switch
                    onChange={() => {
                      // Resets all values in the form except this switch.
                      reset({ deriveFromChain: !value });
                      setFunctionInterfaces([]);
                    }}
                    onColor="#808080"
                    checked={!value}
                    checkedIcon={false}
                    uncheckedIcon={false}
                  />
                )}
              />
              <Form.Label>Deployed Bytecode</Form.Label>
            </Form.Group>

            <Form.Group className="col mb-3">
              {!deriveFromChain && (
                <>
                  <textarea
                    style={{ width: "100%" }}
                    defaultValue={byteCode}
                    {...register("byteCode", {
                      required: true,
                      validate: validateByteCode,
                    })}
                  ></textarea>
                  {formState.errors.byteCode && (
                    <Alert variant="info">
                      ByteCode is required. {formState.errors.byteCode.message}
                    </Alert>
                  )}
                </>
              )}

              {deriveFromChain && (
                <>
                  <Form.Control
                    {...register("deriveFromContractAddress", {
                      required: true,
                      validate: validateAddress,
                    })}
                    placeholder="0x677c09067dB0990904D01C561c32cf800a67B786"
                  />
                  {formState.errors.deriveFromContractAddress && (
                    <Alert variant="info">
                      Ethereum contract address is required.{" "}
                      {formState.errors.deriveFromContractAddress.message}
                    </Alert>
                  )}
                  <Form.Text />
                </>
              )}
            </Form.Group>

            <Button variant="secondary" type="submit">
              Get Interface
            </Button>
          </Form>

          {functionInterfaces && functionInterfaces.length !== 0 && (
            <>
              <br />
              <table>
                <thead>
                  <tr>
                    <th>Function Hashes</th>
                    <th>Input Parameter Types</th>
                    {/* KEPT FOR DEBUGGING */}
                    {/* <th>debug</th> */}
                  </tr>
                </thead>
                <tbody id="table">
                  {functionInterfaces.map(
                    (funInterface: FunctionInterface, parentIndex: number) => {
                      return (
                        <tr key={parentIndex}>
                          <td>{funInterface.functionHash}</td>
                          <td>
                            {(funInterface.perfectMatchName
                              ? funInterface.perfectMatchName
                              : "") +
                              "[" +
                              funInterface.inputParameterTypeArray +
                              "]"}
                          </td>
                          {/* KEPT FOR DEBUGGING */}
                          {/* <td>
                            {"[" +
                              funInterface.databaseLookUpArray
                                .map((item) => item.toString())
                                .join(", ") +
                              "]"}
                          </td> */}
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </>
          )}
          {error && <Alert variant="danger">{error}</Alert>}
        </div>

        {functionInterfaces.length !== 0 && (
          <>
            <div className="centered">
              <div className="card">
                <h2 className="centered">Environment Variables</h2>
                <Form.Group className="col mb-3">
                  <Form.Label>
                    {deriveFromChain
                      ? "Proxy Address (Optional)"
                      : "Contract Address"}
                  </Form.Label>
                  <Form.Control
                    {...register("contractAddress", {
                      validate: validateAddress,
                    })}
                    placeholder=""
                  />
                  {formState.errors.contractAddress && (
                    <Alert variant="info">
                      Ethereum contract address is required.{" "}
                      {formState.errors.contractAddress.message}
                    </Alert>
                  )}
                  <Form.Text />
                </Form.Group>
                <Form.Group className="col mb-3">
                  <Form.Label>Value in WEI (Optional)</Form.Label>
                  <Form.Control
                    {...register("valueInWEI", {
                      min: 0,
                    })}
                    type="number"
                    placeholder="0"
                  />
                  {formState.errors.valueInWEI && (
                    <Alert variant="info">
                      A number greater or equal to 0 is required.{" "}
                      {formState.errors.valueInWEI.message}
                    </Alert>
                  )}
                  <Form.Text />
                </Form.Group>
                <Form.Group className="col mb-3">
                  <Form.Label>GasLimit (Optional)</Form.Label>
                  <Form.Control
                    {...register("gasLimit", {
                      min: 0,
                    })}
                    type="number"
                    placeholder="3000000"
                  />
                  {formState.errors.gasLimit && (
                    <Alert variant="info">
                      A number greater or equal to 0 is required.{" "}
                      {formState.errors.gasLimit.message}
                    </Alert>
                  )}
                  <Form.Text />
                </Form.Group>
              </div>
            </div>

            {functionInterfaces.map((element, position) => {
              return (
                <ReadWriteRow
                  key={position}
                  account={account}
                  provider={provider}
                  contractAddress={contractAddress}
                  functionHash={element.functionHash}
                  perfectMatchName={element.perfectMatchName}
                  inputParameterTypeArray={element.inputParameterTypeArray}
                  deriveFromContractAddress={deriveFromContractAddress}
                  deriveFromChain={deriveFromChain}
                  valueInWEI={valueInWEI}
                  gasLimit={gasLimit}
                  providerChainId={providerChainId}
                />
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
