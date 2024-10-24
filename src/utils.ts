// Regular expression pattern to match a valid Ethereum address
const addressRegex = /^0x[0-9a-fA-F]{40}$/;

// Regular expression pattern to match a hex string
const hexRegex = /^0x[0-9a-fA-F]*$/;

export interface FunctionInterface {
  databaseLookUpArray: string[];
  functionHash: string;
  inputParameterTypeArray: string[];
  // The `perfectMatchNames` is ordered by the likelihood of occurrence.
  // Meaning there can be several perfect matches but the match at position `0`
  // is most likely.
  perfectMatchNames: string[];
  // https://docs.rs/alloy-sol-type-parser/latest/alloy_sol_type_parser/enum.StateMutability.html
  // Pure: Pure functions promise not to read from or modify the state.
  // View: View functions promise not to modify the state.
  // NonPayable: Nonpayable functions promise not to receive Ether.
  //    This is the solidity default: https://docs.soliditylang.org/en/latest/abi-spec.html#json
  //    The state mutability nonpayable is reflected in Solidity by not specifying a state mutability modifier at all.
  // Payable: Payable functions make no promises.
  mutability: string;
}

/**
 * This function validates if a string represents a valid Ethereum address in hex encoding with an "0x" prefix.
 * The length, and the characters are validated.
 *
 * @param address - An Ethereum address represented as a hex encoded string with an "0x" prefix or undefined.
 * @returns An error message if validation fails.
 */
export function validateAddress(address: string | undefined) {
  if (!address) {
    // If the address is undefined, it is a valid setting of the input field because some address fields are optional.
    return true;
  } else if (!addressRegex.test(address)) {
    // If the address is defined, it has to be a valid Ethereum address.
    return `Please enter a valid Ethereum address. It is a hex string [0-9a-fA-F] with "0x" prefix and a fixed length of 40 characters.`;
  }
}

/**
 * This function validates if a string represents byteCode in hex encoding with an "0x" prefix or undefined.
 *
 * @param byteCode - ByteCode represented as a hex encoded string with "0x" prefix.
 * @returns An error message if validation fails.
 */
export function validateByteCode(byteCode: string | undefined) {
  if (byteCode === undefined || !hexRegex.test(byteCode)) {
    return `Please enter a valid byteCode. It is a hex string [0-9a-fA-F] with "0x" prefix.`;
  }
}

// Define the option type.
export type OptionType = { label: string; value: bigint };

// Available options for the blockchain network.
export const ETHEREUM = { label: "Ethereum", value: 1n };
export const SEPOLIA = { label: "Sepolia (testnet)", value: 11155111n };
// Value '-1n' is used to signal that the network is injected by the wallet.
export const INJECTED = { label: "Injected Network (by wallet)", value: -1n };

// All available blockchain network options.
export const NETWORK_OPTIONS: OptionType[] = [ETHEREUM, SEPOLIA, INJECTED];

// Helper function to find the blockchain network name by value.
export const getNetworkName = (value: bigint | undefined) => {
  // '-1n` is used to signal that the network is injected by the wallet.
  if (value === -1n) {
    throw Error(
      "Network name is not hardcoded for this 'Injected network (by wallet)'.",
    );
  }

  return findOption(value)?.label;
};

// Helper function to find the option by value.
export const findOption = (value: bigint | undefined) => {
  if (value) {
    return NETWORK_OPTIONS.find((option) => option.value === value);
  }
};
