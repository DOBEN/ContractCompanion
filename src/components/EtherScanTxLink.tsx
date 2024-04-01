interface TxHashLinkProps {
  txHash: string;
}

/**
 * A component that displays the EtherScan link of a transaction hash.
 */
export const TxHashLink = function TxHashLink(props: TxHashLinkProps) {
  const { txHash } = props;

  return (
    <div className="centered">
      Txhash: {/* TODO: adjust link for different networks */}
      <a
        className="link"
        target="_blank"
        rel="noreferrer"
        href={`https://sepolia.etherscan.io/tx/${txHash}`}
      >
        {txHash}
      </a>
    </div>
  );
};
