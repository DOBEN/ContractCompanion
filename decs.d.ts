declare module "evmole";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  removeListener(arg0: string, arg1: () => void): unknown;
  on: (
    eventName: string,
    handler: (...args: [string | undefined]) => void,
  ) => void;
}

interface Window {
  ethereum: EthereumProvider;
}
