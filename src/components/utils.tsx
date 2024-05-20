import { TypeCharacteristics } from "./DecodeReturnValue";

type Padding = { type: "None" } | { type: "Left" } | { type: "Right" };

// Get minimum size needed to store the given word
export function getPotentialTypesForWord(word: string): TypeCharacteristics {
  // Get padding of the word, note this is a maximum.
  let paddingSize = getPaddingSize(word);

  // Get number of bytes padded
  let byteSize = word.length / 2 - paddingSize;

  return byteSizeToType(byteSize);
}

// Given a byte size, return a `TypeCharacteristics` containing: \
// 1. The byte size \
// 2. Potential types that the byte size could be.
export function byteSizeToType(byteSize: number): TypeCharacteristics {
  let potentialTypes: string[] = [];

  switch (true) {
    case byteSize === 1:
      potentialTypes.push("bool");
      break;
    case byteSize >= 15 && byteSize <= 20:
      potentialTypes.push("address");
      break;
    default:
      break;
  }

  potentialTypes.push(`uint${byteSize * 8}`);
  potentialTypes.push(`bytes${byteSize}`);
  potentialTypes.push(`int${byteSize * 8}`);

  // Return list of potential type castings, sorted by likelihood descending
  return { types: potentialTypes, typeSize: byteSize };
}

// Given a string of bytes, determine if it is left or right padded.
export function getPadding(bytes: number[]): Padding {
  let size = bytes.length;

  // Get indices of null bytes in the decoded bytes
  let nullByteIndices = bytes
    .map((byte, index) => ({ byte, index }))
    .filter((item) => item.byte === 0)
    .map((item) => item.index);

  // We can avoid doing a full check if any of the following are true:
  // There are no null bytes OR Neither first nor last byte is a null byte, it is not padded
  if (
    nullByteIndices.length == 0 ||
    (nullByteIndices[0] != 0 &&
      nullByteIndices[nullByteIndices.length - 1] != size - 1)
  ) {
    return { type: "None" };
  }

  // The first byte is a null byte AND the last byte is not a null byte, it is left padded
  if (
    nullByteIndices[0] == 0 &&
    nullByteIndices[nullByteIndices.length - 1] != size - 1
  ) {
    return { type: "Left" };
  }

  // The first byte is not a null byte AND the last byte is a null byte, it is right padded
  if (
    nullByteIndices[0] != 0 &&
    nullByteIndices[nullByteIndices.length - 1] == size - 1
  ) {
    return { type: "Right" };
  }

  // Get non-null byte indices
  let nonNullByteIndices = bytes
    .map((byte, index) => ({ byte, index }))
    .filter((item) => item.byte != 0)
    .map((item) => item.index);

  if (nonNullByteIndices.length === 0) {
    return { type: "None" };
  }

  // Check if the there are more null-bytes before the first non-null byte than after the last
  // non-null byte
  let leftHandPadding = nullByteIndices.filter(
    (index) => index < nonNullByteIndices[0],
  ).length;
  let rightHandPadding = nullByteIndices.filter(
    (index) => index > nonNullByteIndices[nonNullByteIndices.length - 1],
  ).length;

  switch (true) {
    case leftHandPadding > rightHandPadding:
      return { type: "Left" };
    case leftHandPadding < rightHandPadding:
      return { type: "Right" };
    default:
      return { type: "None" };
  }
}

// Given a string of bytes, get the max padding size for the data
export function getPaddingSize(bytesAsHexString: string): number {
  let bytes = hexStringToBytes(bytesAsHexString);

  const padding = getPadding(bytes);

  switch (padding.type) {
    case "Left": {
      // Count number of null-bytes at the start of the data
      // Find the index of the first non-zero element
      const firstNonZeroIndex = [...bytes].findIndex((byte) => byte !== 0);

      // If all elements are zero, the findIndex will return -1, so we use length
      if (firstNonZeroIndex === -1) {
        return bytes.length;
      }
      return firstNonZeroIndex;
    }
    case "Right": {
      // count number of null-bytes at the end of the data
      // Find the index of the first non-zero element
      const firstNonZeroIndex = [...bytes]
        .reverse()
        .findIndex((byte) => byte !== 0);

      // If all elements are zero, the findIndex will return -1, so we use length
      if (firstNonZeroIndex === -1) {
        return bytes.length - bytes.length;
      }
      return firstNonZeroIndex;
    }
    case "None": {
      return 0;
    }
  }
}

// Convert a hex string to bytes.
export function hexStringToBytes(bytesAsHexString: string): number[] {
  // Ensure the input is a valid hexadecimal string
  if (bytesAsHexString.length % 2 !== 0) {
    throw new Error("Invalid hexadecimal string");
  }

  const bytes: number[] = [];

  // Iterate over the hex string, converting each pair of characters to a byte
  for (let i = 0; i < bytesAsHexString.length; i += 2) {
    const byte = parseInt(bytesAsHexString.substr(i, 2), 16);
    bytes.push(byte);
  }

  return bytes;
}
