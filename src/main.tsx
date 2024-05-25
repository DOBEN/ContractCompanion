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

const SEPOLIA_CHAIN_ID = 11155111n;

interface MetamaskError extends Error {
  code: number;
}

async function switchToSepolia() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + SEPOLIA_CHAIN_ID.toString(16) }],
    });
    console.log("Switched to Sepolia network");
  } catch (switchError) {
    if ((switchError as MetamaskError).code === 4902) {
      throw new Error(
        "Sepolia network is not available in your Metamask, please enable testnets in your Metamask or add the Sepolia testnet manually",
      );
    } else {
      throw new Error(
        "Failed to switch to the Sepolia network: " +
          (switchError as Error).message,
      );
    }
  }
}

const App = () => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [account, setAccount] = useState<string>();
  const [provider, setProvider] = useState<BrowserProvider | undefined>(
    undefined,
  );

  const connectWalletHandler = async () => {
    if (window.ethereum) {
      setErrorMessage(undefined);
      let provider = new ethers.BrowserProvider(window.ethereum);

      if ((await provider.getNetwork()).chainId != SEPOLIA_CHAIN_ID) {
        try {
          await switchToSepolia();
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
          element={<MainCard provider={provider} accountAddress={account} />}
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
