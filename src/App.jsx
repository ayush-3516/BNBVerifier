import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { TronLinkAdapter, WalletConnectAdapter } from "@tronweb3/tronwallet-adapters";
import './App.css';

// BSC Configuration
const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// Tron Configuration
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export default function App() {
  const [bscAddress, setBscAddress] = useState('');
  const [bnbBalance, setBnbBalance] = useState('');
  const [usdtBalance, setUsdtBalance] = useState('');
  const [tronAddress, setTronAddress] = useState('');
  const [trxBalance, setTrxBalance] = useState('');
  const [tronUsdtBalance, setTronUsdtBalance] = useState('');
  const [connector, setConnector] = useState(null);

  // BSC Wallet Connection
  const connectBSCWallet = async () => {
    if (!window.ethereum) {
      alert("Please install a Web3 wallet like Trust Wallet");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setBscAddress(address);
      
      const bnbBalance = await provider.getBalance(address);
      setBnbBalance(ethers.formatEther(bnbBalance));

      const usdtContract = new ethers.Contract(BSC_USDT_ADDRESS, ERC20_ABI, provider);
      const balance = await usdtContract.balanceOf(address);
      const decimals = await usdtContract.decimals();
      setUsdtBalance(ethers.formatUnits(balance, decimals));
    } catch (error) {
      console.error("BSC Error:", error);
      alert("BSC Connection Error: " + error.message);
    }
  };

  // Tron Wallet Connection with WalletConnect
  const connectTronWallet = async () => {
    try {
      const adapter = new WalletConnectAdapter({
        network: 'mainnet',
        options: {
          relayUrl: "wss://relay.walletconnect.com",
          metadata: {
            name: "My DApp",
            description: "A Tron DApp Example",
            url: window.location.href,
            icons: ["https://walletconnect.org/walletconnect-logo.png"]
          }
        }
      });

      await adapter.connect();
      setTronAddress(adapter.address);

      // Get TRX balance
      const trxBal = await adapter.tronWeb.trx.getBalance(adapter.address);
      setTrxBalance(trxBal / 1e6);

      // Get USDT balance
      const contract = await adapter.tronWeb.contract().at(TRON_USDT_ADDRESS);
      const usdtBal = await contract.balanceOf(adapter.address).call();
      setTronUsdtBalance(usdtBal / 1e6);

      // Set up event listeners
      adapter.on("accountsChanged", (accounts) => {
        setTronAddress(accounts[0]);
      });

      adapter.on("chainChanged", (chainId) => {
        if (chainId !== "0x2b6653dc") {
          alert("Please switch to Tron Mainnet");
        }
      });

    } catch (error) {
      console.error("Tron WalletConnect Error:", error);
      alert("Connection Error: " + error.message);
    }
  };

  // Disconnect wallets
  const disconnectWallets = () => {
    if (connector) {
      connector.killSession();
    }
    setBscAddress('');
    setTronAddress('');
  };

  return (
    <div className="App">
      <header>
        <h1>Multi-Chain Wallet Dashboard</h1>
        <button onClick={disconnectWallets}>Disconnect All</button>
      </header>

      <div className="wallets-container">
        <div className="wallet-card">
          <h2>BSC Wallet</h2>
          <button onClick={connectBSCWallet}>Connect BSC Wallet</button>
          {bscAddress && (
            <div className="wallet-info">
              <p>Address: {bscAddress}</p>
              <p>BNB Balance: {bnbBalance}</p>
              <p>USDT Balance: {usdtBalance}</p>
            </div>
          )}
        </div>

        <div className="wallet-card">
          <h2>Tron Wallet</h2>
          <button onClick={connectTronWallet}>Connect Tron Wallet</button>
          {tronAddress && (
            <div className="wallet-info">
              <p>Address: {tronAddress}</p>
              <p>TRX Balance: {trxBalance}</p>
              <p>USDT Balance: {tronUsdtBalance}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
