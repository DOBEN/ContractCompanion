import React, { useEffect, useState } from "react";
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
  // '-1n` is used to signal that the network is injected by the wallet.
  if (selectedNetwork && selectedNetwork !== -1n) {
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
  const [providerNetworkName, setProviderNetworkName] = useState<
    string | undefined
  >(undefined);
  const [providerChainId, setProviderChainId] = useState<bigint | undefined>(
    undefined,
  );
  const [selectedNetwork, setSelectedNetwork] = useState<bigint | undefined>(
    undefined,
  );

  useEffect(() => {
    const initializeProvider = async () => {
      if (window.ethereum) {
        // Initialize the provider
        const initialProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(initialProvider);

        try {
          // Get the networkName + chainId and set it in the state
          const network = await initialProvider.getNetwork();
          setProviderNetworkName(network.name);
          setProviderChainId(network.chainId);
        } catch (error) {
          console.error("Error fetching network name: ", error);
        }
      } else {
        console.error("No Ethereum wallet detected");
      }
    };

    initializeProvider();

    // Event handler for chainChanged
    const handleChainChanged = (newChainId: string = "-1") => {
      console.log("Network changed to: ", parseInt(newChainId, 16));

      // Reload page if user changes the network in the wallet
      if (newChainId !== "0x" + selectedNetwork?.toString(16)) {
        window.location.reload();
      }
    };

    // Event handler for accountChanged
    const handleAccountChanged = async () => {
      if (provider) {
        try {
          const accounts = await provider.send("eth_requestAccounts", []);

          console.log("Account changed to: ", accounts[0]);

          setAccount(accounts[0]);
        } catch (error) {
          setErrorMessage((error as Error).message);
        }
      }
    };

    if (window.ethereum) {
      window.ethereum.on("chainChanged", handleChainChanged);
      window.ethereum.on("accountsChanged", handleAccountChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("accountsChanged", handleAccountChanged);
      }
    };
  }, [selectedNetwork]);

  const clearAccountConnection = async () => {
    setAccount(undefined);
  };

  const connectWalletHandler = async () => {
    setErrorMessage(undefined);

    if (!selectedNetwork) {
      setErrorMessage(`Select "Blockchain Network" in the dropdown first.`);
      return;
    }

    if (!window.ethereum || !provider) {
      setErrorMessage("Please install a browser wallet (e.g. Metamask).");
      return;
    }

    try {
      const currentNetwork = (await provider.getNetwork()).chainId;

      if (currentNetwork != selectedNetwork) {
        await switchToSelectedNetwork(selectedNetwork);
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);

      const network = await newProvider?.getNetwork();
      setProviderNetworkName(network?.name);
      setProviderChainId(network.chainId);

      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (error) {
      setErrorMessage((error as Error).message);
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
          {account && (
            <>
              <br />({providerNetworkName})
            </>
          )}
        </Button>
      </div>

      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

      <Routes>
        <Route
          path="/"
          element={
            <MainCard
              provider={provider}
              blockchainNetwork={selectedNetwork}
              providerNetworkName={providerNetworkName}
              providerChainId={providerChainId}
              setSelectedNetwork={setSelectedNetwork}
              clearAccountConnection={clearAccountConnection}
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
