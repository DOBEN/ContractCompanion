import etherscanLink from "@metamask/etherscan-link";

interface TxHashLinkProps {
  txHash: string;
  providerChainId: bigint | undefined;
}

/**
 * A component that displays the EtherScan link of a transaction hash.
 */
export const TxHashLink = function TxHashLink(props: TxHashLinkProps) {
  const { txHash, providerChainId } = props;

  let txLink;
  try {
    txLink = etherscanLink.createExplorerLink(
      txHash,
      providerChainId?.toString() ?? "-1",
    );
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="centered">
      Txhash:
      <a className="link" target="_blank" rel="noreferrer" href={`${txLink}`}>
        {txHash}
      </a>
    </div>
  );
};
