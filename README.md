# Contract Companion

[Live Front End](https://deployment-vercel-dqhc.vercel.app/)

## How It Works

You can use the front to interact with any contract on the Sepolia network - reading and writing. You don't need to have access to the ABI or source code to do so just provide the contract address.
The front end extracts function selectors and arguments from the Ethereum Virtual Machine (EVM) bytecode, even for unverified contracts. If the signature is known (e.g. via lookups in the [database](https://www.4byte.directory)), it even displays the matching human-readable names of the functions. Optionally, you can provide the return parameter types to decode the return parameter when reading data from the contract. 

## Commands

- Clone the repo:

```
git clone https://github.com/DOBEN/ContractCompanion.git
```
- Run `yarn` to install dependencies in the root folder of this project:
```
yarn
```

- Run `yarn build` to build the front end:
```
yarn build
```

- Run `yarn dev` or `yarn preview` to run the front end locally:
```
yarn dev
```

- Run `yarn fmt` to run prettier:
```
yarn fmt
```

- Run `yarn lint` to run the linter:
```
yarn lint
```

## EVM Bytecode Analyzers

This section summarizes projects that are interesting to check out for a deep dive into EVM bytecode analysis.

- [Evmole](https://github.com/cdump/evmole)
- [Whatsabi](https://github.com/shazow/whatsabi)
- [EVM_Opcodes](https://www.evm.codes/)
- [EVM_Playground](https://www.evm.codes/playground?fork=shanghai)
- [Panoramix](https://github.com/palkeo/panoramix)
- [Symbolic EVM](https://github.com/acuarica/evm)
- [Heimdall](https://github.com/Jon-Becker/heimdall-rs)
- [EtherVM](https://ethervm.io/decompile)

## Exploring On-Chain Bytecode Diversity

While Solidity remains the predominant language for deployed contracts, the Ethereum Virtual Machine (EVM) bytecode landscape is quite diverse. Beyond Solidity, I encounter a variety of origins for on-chain bytecode, spanning different languages, frameworks, and even raw bytecode optimizations. Here is a collection of interesting bytecode origins:

- *Solidity*: The familiar and widely-used language for smart contract development.
- *Vyper*: An alternative smart contract language.
(e.g. [Curve protocol](https://curve.readthedocs.io/ref-addresses.html)).
- *Yul*: An intermediate language for Ethereum smart contracts, offering low-level control and optimization capabilities.
- *Raw bytecode*
    - e.g. [MIMC_sponge hash function contract](https://etherscan.io/address/0x83584f83f26af4edda9cbe8c730bc87c364b28fe#code). It contains the implementation of the zk-friendly hash function of the Tornado cash protocol.
    - e.g. [Huff contract](https://sepolia.etherscan.io/address/0x2e98D76982FB23a4c669bF4eBBeA8f7aDEaB76b5). It was written using the [Huff language](https://docs.huff.sh/).

