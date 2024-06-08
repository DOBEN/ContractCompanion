// Regular expression pattern to match a valid Ethereum address
const addressRegex = /^0x[0-9a-fA-F]{40}$/;

// Regular expression pattern to match a hex string
const hexRegex = /^0x[0-9a-fA-F]*$/;

/**
 * This function validates if a string represents a valid Ethereum address in hex encoding with an "0x" prefix.
 * The length, and the characters are validated.
 *
 * @param address - An Ethereum address represented as a hex encoded string with an "0x" prefix.
 * @returns An error message if validation fails.
 */
export function validateAddress(address: string | undefined) {
  if (!address || !addressRegex.test(address)) {
    return `Please enter a valid Ethereum address. It is a hex string [0-9a-fA-F] with "0x" prefix and a fixed length of 40 characters.`;
  }
}

/**
 * This function validates if a string represents byteCode in hex encoding with an "0x" prefix.
 *
 * @param byteCode - ByteCode represented as a hex encoded string with "0x" prefix.
 * @returns An error message if validation fails.
 */
export function validateByteCode(byteCode: string | undefined) {
  if (byteCode === undefined || !hexRegex.test(byteCode)) {
    return `Please enter a valid byteCode. It is a hex string [0-9a-fA-F] with "0x" prefix.`;
  }
}
