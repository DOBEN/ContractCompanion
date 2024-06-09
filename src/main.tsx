import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Alert, Button } from "react-bootstrap";

import { ethers, BrowserProvider } from "ethers";

import GithubPicture from "./public/github.png";
import LinkedInPicture from "./public/linkedin.jpg";
import EmailPicture from "./public/email.png";

import { MainCard } from "./components/MainCard";

import "./styles.scss";
import { getNetworkName } from "./utils";

interface MetamaskError extends Error {
  code: number;
}

async function switchToSelectedNetwork(selectedNetwork: bigint | undefined) {
  if (selectedNetwork) {
    const networkName = getNetworkName(selectedNetwork);

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + selectedNetwork.toString(16) }],
      });
      console.log(`Switched to "${networkName}" network`);
    } catch (switchError) {
      if ((switchError as MetamaskError).code === 4902) {
        throw new Error(
          `"${networkName}" network is not available in your Metamask.
         You might need to enable testnets in your Metamask or add the "${networkName}" manually.`,
        );
      } else {
        throw new Error(
          `Failed to switch to the "${networkName}" network: ` +
            (switchError as Error).message,
        );
      }
    }
  }
}

const App = () => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [account, setAccount] = useState<string | undefined>();
  const [provider, setProvider] = useState<BrowserProvider | undefined>(
    undefined,
  );
  const [blockchainNetwork, setBlockchainNetwork] = useState<
    bigint | undefined
  >(undefined);

  const clearWalletConnection = async () => {
    setProvider(undefined);
    setAccount(undefined);
  };

  const connectWalletHandler = async () => {
    if (!blockchainNetwork) {
      setErrorMessage(
        `Select "Blockchain Network" or "Injected Network" in the dropDown first.`,
      );
      return;
    }

    if (window.ethereum) {
      setErrorMessage(undefined);
      let provider = new ethers.BrowserProvider(window.ethereum);

      if ((await provider.getNetwork()).chainId != blockchainNetwork) {
        try {
          await switchToSelectedNetwork(blockchainNetwork);
          provider = new ethers.BrowserProvider(window.ethereum);
        } catch (e) {
          setErrorMessage((e as Error).message);
          return;
        }
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0];
      setProvider(provider);
      setAccount(account);
    } else {
      setErrorMessage("Please Install Browser Wallet (e.g. Metamask).");
    }
  };

  return (
    <Router>
      <div className="navbar">
        <div>Call Any Contract</div>
        <div className="centerItemsFixed">
          <div className="secondary">
            <img
              src={GithubPicture}
              alt="Github"
              style={{ maxWidth: "40px", height: "40px" }}
            />
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/DOBEN/ContractCompanion`}
            >
              Github
            </a>
          </div>
          <div className="secondary">
            <img
              src={LinkedInPicture}
              alt="LinkedIn"
              style={{ maxWidth: "40px", height: "40px" }}
            />
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://www.linkedin.com/in/dorisbenda/`}
            >
              LinkedIn
            </a>
          </div>
          <div className="secondary">
            <img
              src={EmailPicture}
              alt="Email"
              style={{ maxWidth: "38px", height: "38px", padding: "5px" }}
            />
            doris_benda&#123;at&#125;web3achiever.com
          </div>
        </div>
        <Button variant="primary" id="account" onClick={connectWalletHandler}>
          {account
            ? account.slice(0, 5) + "..." + account.slice(-5)
            : "Connect Wallet"}
        </Button>
      </div>

      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

      <Routes>
        <Route
          path="/"
          element={
            <MainCard
              provider={provider}
              blockchainNetwork={blockchainNetwork}
              setBlockchainNetwork={setBlockchainNetwork}
              clearWalletConnection={clearWalletConnection}
            />
          }
        />
      </Routes>
    </Router>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
