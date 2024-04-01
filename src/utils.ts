// Regular expression pattern to match a valid Ethereum address
const addressRegex = /^(0x)?[0-9a-fA-F]{40}$/;

/**
 * This function validates if a string represents a valid Ethereum Address in hex encoding.
 * The length, and the characters are validated.
 *
 * @param address - An Ethereum address represented as a hex encoded string.
 * @returns An error message if validation fails.
 */
export function validateContractAddress(address: string | undefined) {
  if (address) {
    try {
      addressRegex.test(address);
    } catch (e) {
      return `Please enter a valid contract address. It is a hex string [0-9a-fA-F] with a fixed length of 40 characters. Original error: ${
        (e as Error).message
      }.`;
    }
  }
}
