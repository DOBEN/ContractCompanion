import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, Button, Form } from "react-bootstrap";
import Switch from "react-switch";
import PulseLoader from "react-spinners/PulseLoader";

import { BrowserProvider, ethers } from "ethers";

import { TxHashLink } from "./EtherScanTxLink";
import { decodeReturnParameterTypes } from "./DecodeReturnValue";

interface Props {
  functionHash: string;
  contractAddress: string | undefined;
  provider: BrowserProvider | undefined;
  databaseLookUpArray: string[];
  perfectMatchName: string | undefined;
  inputParameterTypeArray: string[];
}

function parseInputParameter(
  inputParameter: string | undefined,
  inputParameterTypeArray: string[],
) {
  if (inputParameterTypeArray.length === 0) {
    return "";
  }

  if (inputParameter === undefined) {
    throw new Error("Set input parameters in input field.");
  }

  try {
    let abiCoder = new ethers.AbiCoder();

    // Parse the valid JSON string into arrays
    const inputParameterArray = JSON.parse(inputParameter);

    let inputParameterABIEncoded = abiCoder
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
    let abiCoder = new ethers.AbiCoder();

    // Parse the valid JSON string into arrays
    const returnParameterTypeArray = JSON.parse(returnParameterType);

    let returnParameterABIDecoded = abiCoder.decode(
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
    functionHash,
    contractAddress,
    provider,
    perfectMatchName,
    inputParameterTypeArray,
    databaseLookUpArray,
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

  const [rawByteReturnValue, setRawByteReturnValue] = useState<
    string | undefined
  >(undefined);

  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [waiting, setWaiting] = useState<boolean>(false);
  const [parsedReturnValue, setParsedReturnValue] = useState<
    string | undefined
  >(undefined);

  async function onSubmitWrite() {
    setError(undefined);
    setTxHash(undefined);
    setRawByteReturnValue(undefined);
    setParsedReturnValue(undefined);

    if (
      inputParameter &&
      inputParameter.length === 0 &&
      inputParameterTypeArray.length > 0
    ) {
      setError(`Set Input Parameter`);
      throw Error(`'inputParameter' input field is undefined`);
    }

    if (provider === undefined) {
      setError(`Connect Your Browser Wallet`);
      throw Error(`'provider' input field is undefined`);
    }

    setWaiting(true);

    try {
      let inputParameterABIEncoded = parseInputParameter(
        inputParameter,
        inputParameterTypeArray,
      );

      // Create transaction
      let transaction = {
        to: contractAddress,
        data:
          functionHash +
          (inputParameterABIEncoded ? inputParameterABIEncoded : ""),
      };

      const signer = await provider.getSigner();
      const txResponse = await signer.sendTransaction(transaction);

      let txHash = txResponse.hash;

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
    setRawByteReturnValue(undefined);
    setParsedReturnValue(undefined);
    setTxHash(undefined);

    if (
      inputParameter &&
      inputParameter.length === 0 &&
      inputParameterTypeArray.length > 0
    ) {
      setError(`Set Input Parameter`);
      throw Error(`'inputParameter' input field is undefined`);
    }

    if (provider === undefined) {
      setError(`Connect Your Browser Wallet`);
      throw Error(`'provider' input field is undefined`);
    }

    setWaiting(true);

    let returnValueRawBytes;

    // Call contract
    try {
      let inputParameterABIEncoded = parseInputParameter(
        inputParameter,
        inputParameterTypeArray,
      );

      // Create transaction
      let transaction = {
        to: contractAddress,
        data:
          functionHash +
          (inputParameterABIEncoded ? inputParameterABIEncoded : ""),
      };

      returnValueRawBytes = await provider.call(transaction);
      setRawByteReturnValue(returnValueRawBytes);

      // If returnParameterTypes are provided, parse the return parameter.
      if (returnParameterType) {
        let parsedReturnValue = parseReturnParameter(
          returnParameterType,
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

    // Try to decode the return parameter types.
    if (returnValueRawBytes) {
      let decodedReturnValueTypes =
        decodeReturnParameterTypes(returnValueRawBytes);
      if (decodedReturnValueTypes) {
        let types = decodedReturnValueTypes
          .map((item) => `"${item}"`)
          .join(", ");

        console.log(types);
        setValue("returnParameterType", "[" + types + "]");
      } else {
        // TODO: improve on the decoding; proper error display once decoding is reliable
        console.log("Could not derive return parameter types");
      }
    }
  }

  return (
    <>
      <div className="cardFull">
        <Form.Group className="centerItems">
          {functionHash +
            (perfectMatchName ? " (" + perfectMatchName + ")" : "")}
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

        {inputParameterTypeArray.length > 0 && (
          <Form.Group className="col d-flex align-items-center justify-content-center">
            <Form.Control
              {...register("inputParameter", {})}
              placeholder={
                "Input Parameters: [" +
                inputParameterTypeArray +
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
      {rawByteReturnValue && (
        <>
          <Alert variant="info">
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
            {rawByteReturnValue}
          </Alert>
        </>
      )}

      {parsedReturnValue && (
        <>
          <Alert variant="info">Parsed return parameter:</Alert>
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
          <TxHashLink txHash={txHash} />
        </Alert>
      )}
    </>
  );
}
