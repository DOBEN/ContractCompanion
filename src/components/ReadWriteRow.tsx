import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, Button, Form } from "react-bootstrap";
import Switch from "react-switch";
import PulseLoader from "react-spinners/PulseLoader";

import { guessAbiEncodedData } from "@openchainxyz/abi-guesser";
import { BrowserProvider, ethers } from "ethers";
import { ParamType } from "ethers/abi";

import { TxHashLink } from "./EtherScanTxLink";
import { FunctionInterface } from "../utils";

const ETHEREUM_WORD_SIZE = 64; // 32 bytes = 64 hex characters

const abiCoder = new ethers.AbiCoder();

interface Props {
  account: string | undefined;
  contractAddress: string | undefined;
  provider: BrowserProvider | undefined;
  deriveFromContractAddress: string | undefined;
  valueInWEI: number | undefined;
  gasLimit: number | undefined;
  deriveFromChain: boolean;
  providerChainId: bigint | undefined;
  functionInterface: FunctionInterface;
}

function parseInputParameter(
  inputParameter: string | undefined,
  inputParameterTypeArray: string[],
) {
  if (inputParameterTypeArray.length === 0) {
    return "";
  }

  if (!inputParameter) {
    throw new Error("Set input parameters in input field.");
  }

  try {
    // Parse the valid JSON string into arrays
    const inputParameterArray = JSON.parse(inputParameter);

    const inputParameterABIEncoded = abiCoder
      .encode(inputParameterTypeArray, inputParameterArray)
      .slice(2);

    return inputParameterABIEncoded;
  } catch (e) {
    console.error((e as Error).message);
    throw new Error((e as Error).message);
  }
}

function parseReturnParameter(
  returnParameterType: string,
  returnValueRawBytes: string,
) {
  try {
    // Parse the valid JSON string into arrays
    const returnParameterTypeArray = JSON.parse(returnParameterType);

    const returnParameterABIDecoded = abiCoder.decode(
      returnParameterTypeArray,
      returnValueRawBytes,
    );

    return returnParameterABIDecoded;
  } catch (e) {
    console.error((e as Error).message);
    throw new Error((e as Error).message);
  }
}

export function ReadWriteRow(props: Props) {
  const {
    account,
    contractAddress,
    provider,
    valueInWEI,
    gasLimit,
    deriveFromContractAddress,
    deriveFromChain,
    providerChainId,
    functionInterface,
  } = props;

  type FormType = {
    inputParameter: string;
    returnParameterType: string;
    shouldWrite: boolean;
  };
  const { control, register, setValue, formState, handleSubmit } =
    useForm<FormType>({
      mode: "all",
    });

  const [shouldWrite, inputParameter, returnParameterType] = useWatch({
    control: control,
    name: ["shouldWrite", "inputParameter", "returnParameterType"],
  });

  const [returnValueWords, setReturnValueWords] = useState<
    string[] | undefined
  >(undefined);

  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [waiting, setWaiting] = useState<boolean>(false);
  const [parsedReturnValue, setParsedReturnValue] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    // If mutability is `read`, set the switch accordingly.
    // If mutability is `write`, set the switch accordingly.
    functionInterface.mutability.slice(0, 4) === "Read"
      ? setValue("shouldWrite", false)
      : setValue("shouldWrite", true);
  });

  async function onSubmitWrite() {
    setError(undefined);
    setTxHash(undefined);
    setReturnValueWords(undefined);
    setParsedReturnValue(undefined);

    if (
      inputParameter &&
      inputParameter.length === 0 &&
      functionInterface.inputParameterTypeArray.length > 0
    ) {
      setError(`Set Input Parameter`);
      throw Error(`'inputParameter' input field is undefined`);
    }

    if (!account || !provider) {
      setError(`Connect Your Browser Wallet`);
      throw Error(`Connect Your Browser Wallet`);
    }

    // If the contract interface was derived NOT from the chain but instead by providing the raw byte code in
    // the text area, we need a manually set 'contractAddress` to be able to read and write from the chain.
    if (!deriveFromChain && !contractAddress) {
      setError(
        `Set the "Contract Address" in the "Environment Variables" box.`,
      );
      throw Error(
        `Set the "Contract Address" in the "Environment Variables" box.`,
      );
    }

    setWaiting(true);

    try {
      const inputParameterABIEncoded = parseInputParameter(
        inputParameter,
        functionInterface.inputParameterTypeArray,
      );

      // Create transaction
      const transaction = {
        // If `contractAddress (e.g. a proxyAddress)` is set, we send the request to this address instead of the `deriveFromContractAddress`.
        to: contractAddress ? contractAddress : deriveFromContractAddress,
        data:
          functionInterface.functionHash +
          (inputParameterABIEncoded ? inputParameterABIEncoded : ""),
        value: valueInWEI ? valueInWEI : 0,
        gasLimit: gasLimit ? gasLimit : 3000000,
      };

      const signer = await provider.getSigner();

      // This should never happen, but just in case.
      if (signer.address.toLowerCase() !== account.toLowerCase()) {
        setError("Signer address does not match the connected account.");
        return;
      }

      const txResponse = await signer.sendTransaction(transaction);

      const txHash = txResponse.hash;

      await provider.waitForTransaction(txHash);

      setTxHash(txHash);
    } catch (e) {
      console.error((e as Error).message);
      setError((e as Error).message);
    } finally {
      setWaiting(false);
    }
  }

  async function onSubmitRead() {
    setError(undefined);
    setReturnValueWords(undefined);
    setParsedReturnValue(undefined);
    setTxHash(undefined);

    if (
      inputParameter &&
      inputParameter.length === 0 &&
      functionInterface.inputParameterTypeArray.length > 0
    ) {
      setError(`Set Input Parameter`);
      throw Error(`'inputParameter' input field is undefined`);
    }

    if (!account || !provider) {
      setError(`Connect Your Browser Wallet`);
      throw Error(`Connect Your Browser Wallet`);
    }

    // If the contract interface was derived NOT from the chain but instead by providing the raw byte code in
    // the text area, we need a manually set 'contractAddress` to be able to read and write from the chain.
    if (!deriveFromChain && !contractAddress) {
      setError(
        `Set the "Contract Address" in the "Environment Variables" box.`,
      );
      throw Error(
        `Set the "Contract Address" in the "Environment Variables" box.`,
      );
    }

    setWaiting(true);

    // Call contract
    try {
      const inputParameterABIEncoded = parseInputParameter(
        inputParameter,
        functionInterface.inputParameterTypeArray,
      );

      // Create transaction
      const transaction = {
        // If `contractAddress (e.g. a proxyAddress)` is set, we send the request to this address instead of the `deriveFromContractAddress`.
        to: contractAddress ? contractAddress : deriveFromContractAddress,
        data:
          functionInterface.functionHash +
          (inputParameterABIEncoded ? inputParameterABIEncoded : ""),
      };

      const returnValueRawBytes = await provider.call(transaction);

      // Remove '0x'
      const returnValueTruncated = returnValueRawBytes.slice(2);

      // Split the return value into Etheruem words of size 32 bytes.
      const returnValueWordsArray = [];
      for (
        let i = 0;
        i < returnValueTruncated.length;
        i += ETHEREUM_WORD_SIZE
      ) {
        returnValueWordsArray.push(
          returnValueTruncated.slice(i, i + ETHEREUM_WORD_SIZE),
        );
      }
      setReturnValueWords(returnValueWordsArray);

      // The manually set `returnParameterType` takes precedence over decoding the return parameter types.
      let finalReturnParameterTypes = returnParameterType;

      // If no `returnParameterType` is given in the inputField, try to decode the return parameter types
      // and update the inputField with them. If needed, the user can "correct" the
      // filled in types and press the `read` button a second time.
      if (!finalReturnParameterTypes && returnValueWordsArray.length != 0) {
        const paramTypes = Array.from(
          guessAbiEncodedData(returnValueTruncated)!,
        ) as unknown as ParamType[];

        if (paramTypes) {
          const typesAsString = paramTypes
            .map((item) => `"${item.format()}"`)
            .join(", ");

          finalReturnParameterTypes = "[" + typesAsString + "]";
          setValue("returnParameterType", finalReturnParameterTypes);
        } else {
          // TODO: improve on the decoding; proper error display once decoding is reliable
          console.log("Could not derive return parameter types");
        }
      }

      // If `finalReturnParameterTypes` are available, parse the return parameter.
      if (finalReturnParameterTypes) {
        const parsedReturnValue = parseReturnParameter(
          finalReturnParameterTypes,
          returnValueRawBytes,
        );

        setParsedReturnValue(
          JSON.stringify(parsedReturnValue, (_, value) =>
            typeof value === "bigint" ? value.toString() : value,
          ),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWaiting(false);
    }
  }

  return (
    <>
      <div className="cardFull">
        <Form.Group className="centerItems">
          {functionInterface.functionHash +
            (functionInterface.perfectMatchName
              ? " (" + functionInterface.perfectMatchName + ")"
              : "")}
        </Form.Group>

        <Form.Group className="centerItems">
          Write
          <Controller
            name="shouldWrite"
            control={control}
            defaultValue={false}
            render={({ field: { onChange } }) => (
              <Switch
                onChange={() => {
                  onChange(!shouldWrite);
                }}
                onColor="#808080"
                checked={!shouldWrite}
                checkedIcon={false}
                uncheckedIcon={false}
              />
            )}
          />
          Read
        </Form.Group>

        <Button
          variant="third"
          type="submit"
          onClick={
            shouldWrite
              ? handleSubmit(onSubmitWrite)
              : handleSubmit(onSubmitRead)
          }
        >
          {shouldWrite ? "Write" : "Read"}
        </Button>

        {functionInterface.inputParameterTypeArray.length > 0 && (
          <Form.Group className="col d-flex align-items-center justify-content-center">
            <Form.Control
              {...register("inputParameter", {})}
              placeholder={
                "Input Parameters: [" +
                functionInterface.inputParameterTypeArray +
                "] (e.g. for [uint[]] write [[1,2,3]])"
              }
            />
            {formState.errors.inputParameter && (
              <Alert variant="info">
                Input Parameter is required.{" "}
                {formState.errors.inputParameter.message}
              </Alert>
            )}
            <Form.Text />
          </Form.Group>
        )}

        {!shouldWrite && (
          <Form.Group className="col d-flex align-items-center justify-content-center">
            <Form.Control
              {...register("returnParameterType", {})}
              placeholder={
                'Return Parameter Types: (e.g. ["address","uint256","uint256[]"]) (optional - will decode raw bytes if added)'
              }
            />
            <Form.Text />
          </Form.Group>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {waiting === true && (
        <>
          <PulseLoader /> Waiting
        </>
      )}
      {returnValueWords && (
        <>
          <Alert variant="secondary">
            Returned raw bytes from the smart contract{" "}
            {parsedReturnValue === undefined
              ? `. Add associated array of
                        'returnParameterTypes' above if you want to decode below raw bytes`
              : ""}
            :
          </Alert>
          <Alert
            variant="info"
            style={{ wordWrap: "break-word", maxWidth: `100%` }}
          >
            <pre>{returnValueWords.join("\n")}</pre>
          </Alert>
        </>
      )}

      {parsedReturnValue && (
        <>
          <Alert variant="secondary">Parsed return parameter:</Alert>
          <Alert variant="secondary">
            (You can correct the types manually in the above input field and
            press the `Read` button again)
          </Alert>
          <Alert
            variant="info"
            style={{ wordWrap: "break-word", maxWidth: `100%` }}
          >
            <pre>
              {JSON.stringify(JSON.parse(parsedReturnValue), undefined, 2)}
            </pre>
          </Alert>
        </>
      )}
      {txHash && (
        <Alert variant="info">
          <TxHashLink txHash={txHash} providerChainId={providerChainId} />
        </Alert>
      )}
    </>
  );
}
