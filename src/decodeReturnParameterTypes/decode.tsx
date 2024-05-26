import {
  getPadding,
  getPaddingSize,
  getPotentialTypesForWord,
  hexStringToBytes,
} from "./utils";

interface DecodedType {
  type: string;
  coverages: Set<number>;
}

export interface TypeCharacteristics {
  types: string[];
  typeSize: number;
}

export function decodeReturnParameterTypes(
  returnValueWords: string[],
): string[] {
  const potentialTypes: string[] = [];
  let coveredWords = new Set<number>();

  let wordIndex = 0;
  while (coveredWords.size != returnValueWords.length) {
    if (coveredWords.has(wordIndex)) {
      wordIndex += 1;
      continue;
    }
    const word = returnValueWords[wordIndex];

    let result: DecodedType;
    try {
      // Check if the first word is a dynamic ABI encoded type
      result = tryDecodeDynamicParameter(wordIndex, returnValueWords);

      potentialTypes.push(result.type);
      coveredWords = new Set<number>([...coveredWords, ...result.coverages]);

      wordIndex += 1;
      continue;
    } catch (e) {
      // If the first word is not a dynamic ABI encoded type, continue with trying to decode it as a single word
    }

    const typeCharacteristics = performHeuristic(word);

    if (typeCharacteristics.types.length > 0) {
      potentialTypes.push(typeCharacteristics.types[0]);
      coveredWords.add(wordIndex);
    }

    wordIndex += 1;
  }

  console.log(`covered words: [...coveredWords]`);
  console.log(`potential parameter inputs: (${potentialTypes})`);

  return potentialTypes;
}

export function processAndValidateWord(
  wordIndex: number,
  word: string,
  returnValueWords: string[],
) {
  const hexWord = Number(`0x${word}`);

  // If the word is a multiple of 32, it may be an offset pointing to the start of an ABI-encoded item
  if (hexWord % Number(32) != 0 || hexWord == 0) {
    console.error(
      `parameter ${wordIndex}: ${word} doesn't appear to be an offset pointer to a dynamic type`,
    );
    throw new Error("NotPointerToDynamicType");
  }

  // Check if the pointer is pointing to a valid location in the returnValue
  const wordOffset = hexWord / 32;
  if (wordOffset >= returnValueWords.length) {
    console.error(
      `parameter ${wordIndex}: ${word} is out of bounds (offset check)`,
    );
    throw new Error("WordOffsetOutOfBounds");
  }

  return wordOffset;
}

export function tryDecodeDynamicParameter(
  wordIndex: number,
  returnValueWords: string[],
): DecodedType {
  // Initialize a `Set` called `wordCoverages` with the `index` of the current word.
  // We keep track of which words we've covered while attempting to ABI-decode the current word
  const wordCoverages = new Set([wordIndex]);

  const word = returnValueWords[wordIndex];

  // (1) The first validation step.
  // This checks if the current word could be a valid
  // pointer to an ABI-encoded dynamic type. If it is not, we throw an error.
  let wordOffset;
  try {
    wordOffset = processAndValidateWord(wordIndex, word, returnValueWords);
  } catch (e) {
    throw new Error(`${(e as Error).message}`);
  }

  // (2) The second validation step.
  // Get the `word` at the `wordOffset` index.
  //
  // Note: `sizeOfType` is the size of the ABI-encoded item. It varies depending on the type of the
  // item. For example, the size of a `bytes` is the number of bytes in the encoded data, while
  // for a dynamic-length array, the size is the number of elements in the array.
  const sizeOfType = Number(returnValueWords[wordOffset]);

  // (3) The third validation step.
  // Add the size word index to `wordCoverages`, since this word is part of the ABI-encoded
  // type and should not be decoded again.
  wordCoverages.add(wordOffset);

  // (4) The fourth validation step.
  // Check if there are enough words left in the returnValue to contain the ABI-encoded item.
  // If there aren't, it doesn't necessarily mean that the returnValue is invalid, but it does
  // indicate that this type cannot be an array, since there aren't enough words left to store
  // the array elements. In that case, we first try to decode the value as bytes.
  const dataStartWordOffset = wordOffset + 1;
  const dataEndWordOffset = dataStartWordOffset + sizeOfType - 1;

  if (dataEndWordOffset >= returnValueWords.length) {
    // Type cannot be an array
    return tryDecodeDynamicParameterAsBytesOrString(
      wordIndex,
      returnValueWords,
      wordOffset,
      word,
      dataStartWordOffset,
      sizeOfType,
      wordCoverages,
    );
  } else {
    return tryDecodeDynamicParameterAsArray(
      wordIndex,
      returnValueWords,
      wordOffset,
      word,
      dataStartWordOffset,
      dataEndWordOffset,
      wordCoverages,
    );
  }
}

export function tryDecodeDynamicParameterAsArray(
  wordIndex: number,
  returnValueWords: string[],
  byteOffset: number,
  word: string,
  dataStartWordOffset: number,
  dataEndWordOffset: number,
  wordCoverages: Set<number>,
): DecodedType {
  console.log(`parameter ${wordIndex}: '${word}' may be an array`);

  // (1) Get all words from `dataStartWordOffset` to `dataEndWordOffset`.
  // This is where the encoded data may be stored.
  const dataWords = returnValueWords.slice(
    dataStartWordOffset,
    dataEndWordOffset,
  );

  console.log(`potential array items: ${dataWords}`);

  // (2) We can extend `wordCoverages` with the indices of all words from `byteOffset` to
  // `dataEndWordOffset`, since we've now covered all words in the ABI-encoded type.
  for (let i = byteOffset; i <= dataEndWordOffset; i++) {
    wordCoverages.add(i);
  }

  // (3) Get the potential type of the array elements. Under the hood, this function:
  //     - iterates over each word in `dataWords`
  //     - checks if the word is a dynamic type by recursively calling
  //       `tryDecodeDynamicParameter`
  //         - if it is a dynamic type, we know the type of the array elements and can return it
  //         - if it is a static type, find the potential types that can represent each element in
  //           the array
  const potentialType = getPotentialType(
    dataWords,
    wordIndex,
    returnValueWords,
    word,
    dataStartWordOffset,
    wordCoverages,
  );
  console.log(`parameter ${wordIndex}: '${word}' is ${potentialType}`);

  return { type: `${potentialType}[]`, coverages: wordCoverages };
}

export function tryDecodeDynamicParameterAsBytesOrString(
  wordIndex: number,
  returnValueWords: string[],
  byteOffset: number,
  word: string,
  dataStartWordOffset: number,
  sizeOfType: number,
  wordCoverages: Set<number>,
): DecodedType {
  console.log(`parameter ${wordIndex}: '${word}' may be bytes`);

  // (1) Get all the words from `dataStartWordOffset` to the end of `returnValueWords`.
  // This is where the encoded data may be stored.
  const dataWords = returnValueWords.slice(dataStartWordOffset);

  // (2) Perform a quick validation check to see if there are enough remaining bytes
  // to contain the ABI-encoded item. If there aren't, return an `BytesCheckOutOfBounds` error.
  if (dataWords.join().length / 2 < sizeOfType) {
    console.error(
      `parameter ${wordIndex}: ${word} is out of bounds (bytes check)`,
    );
    throw new Error("BytesCheckOutOfBounds");
  }

  // (3) Calculate how many words are needed to store the encoded data with size `sizeOfType`.
  const wordCountForSize = Math.ceil(sizeOfType / 32);
  const dataEndWordOffset = dataStartWordOffset + wordCountForSize;
  console.log(`with data: ${dataWords.join()}`);

  // (4) Perform a quick validation check to see if there are enough remaining bytes
  // to contain the ABI-encoded item. If there aren't, return an `CeiledSizeCheckOutOfBounds` error.
  if (dataWords.length < wordCountForSize) {
    console.error(
      `parameter ${wordIndex}: ${word} is out of bounds (CeiledSize check)`,
    );
    throw new Error("CeiledSizeCheckOutOfBounds");
  }

  // (5) Get the last word in `dataWords`, so we can perform a size check. There should be
  // `sizeOfType % 32` bytes in this word, and the rest should be null bytes.
  const lastWord = dataWords[wordCountForSize - 1];
  const lastWordSize = sizeOfType % 32;

  // If the padding size of this last word is greater than `32 - lastWordSize`,
  // there are too many bytes in the last word, and this is not a valid ABI-encoded type.
  // return an `PaddingCheckFailed` error.
  const paddingSize = getPaddingSize(lastWord);
  if (paddingSize > 32 - lastWordSize) {
    console.error(
      `parameter ${wordIndex}: '${word}' with size ${sizeOfType} cannot fit into last word with padding of ${paddingSize} bytes (bytes)`,
    );
    throw new Error("PaddingCheckFailed");
  }

  // (5) We've covered all words from `dataStartWordOffset` to `dataEndWordOffset`,
  // so add them to `wordCoverages`.
  for (let i = byteOffset; i < dataEndWordOffset; i++) {
    wordCoverages.add(i);
  }

  console.log(`parameter ${wordIndex}: '${word}' is bytes`);
  return { type: "bytes", coverages: wordCoverages };
}

export function getPotentialType(
  dataWords: string[],
  wordIndex: number,
  returnValueWords: string[],
  word: string,
  dataStartWordOffset: number,
  wordCoverages: Set<number>,
): string {
  const allTypeCharacteristics: TypeCharacteristics[] = [];

  dataWords.forEach((currentWord, i) => {
    // We need to get a slice of returnValueWords from `dataStartWordOffset` to the end
    // of the returnValueWords. this is because nested abi-encoded items
    // reset the offsets of the words.
    const dataWords = returnValueWords.slice(dataStartWordOffset);

    // First, check if this word *could* be a nested abi-encoded item
    console.log(
      `parameter ${wordIndex}: '${word}' checking for nested abi-encoded data`,
    );

    try {
      const potentialType = tryDecodeDynamicParameter(i, dataWords);

      // We need to add dataStartWordOffset to all the offsets in nestedCoverages
      // because they are relative to the start of the nested abi-encoded item.
      const nestedCoverages = Array.from(potentialType.coverages).map(
        (x) => x + dataStartWordOffset,
      );

      // Merge coverages and nestedCoverages
      wordCoverages = new Set<number>([...wordCoverages, ...nestedCoverages]);

      allTypeCharacteristics.push({
        types: [potentialType.type],
        typeSize: 32,
      });

      return;
    } catch (e) {
      // Type is not a nested dynamic type. Continue with the rest of the function.
    }

    const typeCharacteristics = performHeuristic(currentWord);

    allTypeCharacteristics.push(typeCharacteristics);
  });

  const result = allTypeCharacteristics.reduce(
    (
      [potentialType, maxSize]: [string, number],
      { types, typeSize }: TypeCharacteristics,
    ): [string, number] => {
      // "address" and "string" are priority types
      if (types.includes("string")) {
        return ["string", 32];
      } else if (types.includes("address")) {
        // TODO: Fix this, improve on this heuristic
        return ["address", 32];
        // TODO:  make bool priority type
      }

      if (typeSize > maxSize) {
        return [types[0] || "", typeSize];
      } else {
        return [potentialType, maxSize];
      }
    },
    ["", 0],
  );

  return result[0];
}

export function performHeuristic(word: string): TypeCharacteristics {
  const typeCharacteristics = getPotentialTypesForWord(word);

  // Perform heuristics
  // - if we use right-padding, this is probably bytesN
  // - if we use left-padding, this is probably uintN or intN or address or bool
  // - if we use no padding, this is probably bytes32
  const padding = getPadding(hexStringToBytes(word));

  switch (padding.type) {
    case "Left": {
      typeCharacteristics.types = typeCharacteristics.types.filter(
        (t) =>
          t.startsWith("uint") ||
          t.startsWith("address") ||
          t.startsWith("bool"),
      );
      break;
    }
    default: {
      typeCharacteristics.types = typeCharacteristics.types.filter(
        (t) => t.startsWith("bytes") || t.startsWith("string"),
      );
      break;
    }
  }

  return typeCharacteristics;
}
