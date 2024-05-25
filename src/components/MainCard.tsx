import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, Button, Form } from "react-bootstrap";

import { EtherscanProvider as Provider, BrowserProvider } from "ethers";
import { functionArguments, functionSelectors } from "evmole";

import { validateContractAddress } from "../utils";
import { ReadWriteRow } from "./ReadWriteRow";

interface Props {
  accountAddress: string | undefined;
  provider: BrowserProvider | undefined;
}

interface FunctionInterface {
  functionHash: string;
  inputParameterTypeArray: string[];
  databaseLookUpArray: string[];
  perfectMatchName: string | undefined;
}

export function MainCard(props: Props) {
  const { provider } = props;

  type FormType = {
    contractAddress: string | undefined;
  };
  const { control, register, formState, handleSubmit } = useForm<FormType>({
    mode: "all",
  });

  const [contractAddress] = useWatch({
    control: control,
    name: ["contractAddress"],
  });

  const [error, setError] = useState<string | undefined>(undefined);
  const [newLoad, setNewLoad] = useState<boolean>(false);
  const [functionInterfaces, setFunctionInterfaces] = useState<
    FunctionInterface[]
  >([]);

  async function onSubmit() {
    setError(undefined);
    setFunctionInterfaces([]);
    setNewLoad(false);

    if (contractAddress === undefined) {
      setError(`'Contract Address' input field is undefined`);
      throw Error(`'Contract Address' input field is undefined`);
    }

    // TODO: add different chain handling

    const bytecode = await new Provider("sepolia").getCode(contractAddress);

    if (bytecode.length == 0) {
      throw Error(
        `No byteCode at that address. This is not a contract address.`,
      );
    }

    const list = functionSelectors(bytecode);

    const interfaces: FunctionInterface[] = [];

    for (let i = 0; i < list.length; i++) {
      const argumentsString = functionArguments(bytecode, list[i]);

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
      const temp_functionInterfaces = functionInterfaces;
      const urls = functionInterfaces.map(
        (item) =>
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${item.functionHash.slice(2)}`,
      );

      const all_functionInterfaces = await Promise.all(
        urls.map(async (url, position) => {
          const response = await fetch(url, {
            method: "GET",
            headers: new Headers({ "content-type": "application/json" }),
          });

          if (!response.ok) {
            const error = response.json();
            console.error(
              `Unable to fetch function signature: ${JSON.stringify(error)}`,
            );
          }

          const abi = await response.json();

          for (let j = 0; j < abi.results.length; j++) {
            const sig = abi.results[j].text_signature;
            temp_functionInterfaces[position].databaseLookUpArray.push(
              abi.results[j].text_signature,
            );

            const regex = /\((.*?)\)/;
            const matches = sig.match(regex);

            // Get input paramter types
            if (matches && matches.length > 1) {
              const parametersString = matches[1];
              const parameters =
                parametersString.trim() === ""
                  ? []
                  : parametersString
                      .split(",")
                      .map((param: string) => param.trim());

              // If we find a function name where the input parameter perfectly matches the extracted input parameter from the bytecode.
              // Mark this as the perfect match. We know this is the correct function name for sure.
              if (
                JSON.stringify(parameters) ===
                JSON.stringify(
                  temp_functionInterfaces[position].inputParameterTypeArray,
                )
              ) {
                const functionName = sig.substring(0, sig.indexOf("(")).trim();
                temp_functionInterfaces[position].perfectMatchName =
                  functionName;
              }
            }
          }
          return temp_functionInterfaces[position];
        }),
      );

      setFunctionInterfaces(all_functionInterfaces);
    }

    fetchFunctionInterfacesFromDatabase();
  }, [newLoad]);

  return (
    <>
      <div className="centered">
        <div className="card">
          <h2 className="centered">WORKS ONLY ON SEPOLIA FOR MVP</h2>
          <br />
          <h2 className="centered">Interact With Any Contract</h2>
          <br />
          <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="col mb-3">
              <Form.Label>Contract Address</Form.Label>
              <Form.Control
                {...register("contractAddress", {
                  required: true,
                  validate: validateContractAddress,
                })}
                placeholder="0x677c09067dB0990904D01C561c32cf800a67B786"
              />
              {formState.errors.contractAddress && (
                <Alert variant="info">
                  Ethereum contract address is required.{" "}
                  {formState.errors.contractAddress.message}
                </Alert>
              )}
              <Form.Text />
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
            {functionInterfaces.map((element, position) => {
              return (
                <ReadWriteRow
                  key={position}
                  provider={provider}
                  contractAddress={contractAddress}
                  functionHash={element.functionHash}
                  databaseLookUpArray={element.databaseLookUpArray}
                  perfectMatchName={element.perfectMatchName}
                  inputParameterTypeArray={element.inputParameterTypeArray}
                />
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
