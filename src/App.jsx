import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [bnbBalance, setBnbBalance] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(null);
  const [tronAddress, setTronAddress] = useState(null);
  const [trxBalance, setTrxBalance] = useState(null);
  const [tronUsdtBalance, setTronUsdtBalance] = useState(null);

  const connectBSCWallet = async () => {
    if (!window.ethereum) {
      alert("Please install Trust Wallet and open this DApp in Trust Wallet's browser");
      return;
    }

    try {
      // More robust Trust Wallet detection
      const isTrustWallet = window.ethereum?.isTrust ||
                           window.ethereum?.isTrustWallet ||
                           window.trustwallet?.isTrust ||
                           /Trust/i.test(navigator.userAgent);

      if (!isTrustWallet) {
        alert("This DApp only works with Trust Wallet. Please open it in Trust Wallet's browser.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Ensure we're on BSC Mainnet (chainId 56)
      const { chainId } = await provider.getNetwork();
      if (chainId !== 56) {
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: "0x38" }]);
        } catch (switchError) {
          alert("Please switch your Trust Wallet network to Binance Smart Chain (BSC) Mainnet and try again");
          return;
        }
      }

      // Request accounts and handle user rejection
      try {
        const accounts = await provider.send("eth_requestAccounts", []);
        if (!accounts || accounts.length === 0) {
          alert("No accounts found. Please make sure Trust Wallet is connected to BSC network");
          return;
        }
      } catch (err) {
        if (err.code === 4001) {
          alert("Connection rejected. Please accept the connection request in Trust Wallet");
        } else {
          console.error("Wallet connection error:", err);
          alert("Error connecting to wallet. Please ensure you're using Trust Wallet's built-in browser and connected to BSC network");
        }
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      const bnb = await provider.getBalance(address);
      setBnbBalance(ethers.formatEther(bnb));

      const usdtContract = new ethers.Contract(BSC_USDT_ADDRESS, ERC20_ABI, provider);
      const usdtBal = await usdtContract.balanceOf(address);
      const usdtDecimals = await usdtContract.decimals();
      const formatted = Number(usdtBal) / 10 ** usdtDecimals;
      setUsdtBalance(formatted.toFixed(2));
    } catch (error) {
      console.error("Error connecting to BSC wallet:", error);
      alert("Error connecting to wallet. Please make sure you're using Trust Wallet's built-in browser");
    }
  };

  const connectTronWallet = async () => {
    if (typeof window.tronWeb === 'undefined') {
      alert("Please install TronLink wallet from the Chrome Web Store");
      return;
    }

    if (!window.tronWeb.ready) {
      alert("Please unlock your TronLink wallet and connect to the Tron network");
      return;
    }

    try {
      const tronAddress = window.tronWeb.defaultAddress.base58;
      if (!tronAddress) {
        alert("Please connect your TronLink wallet");
        return;
      }

      setTronAddress(tronAddress);

      const trxBal = await window.tronWeb.trx.getBalance(tronAddress);
      setTrxBalance((trxBal / 1e6).toFixed(2));

      const usdtContract = await window.tronWeb.contract().at("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
      const usdtBal = await usdtContract.balanceOf(tronAddress).call();
      setTronUsdtBalance((usdtBal / 1e6).toFixed(2));
    } catch (error) {
      console.error("Error connecting to Tron wallet:", error);
      alert("Error connecting to TronLink. Please make sure you have approved the connection.");
    }
  };

  useEffect(() => {
    if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
      connectTronWallet();
    }
  }, []);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="buttons">
          <button onClick={connectBSCWallet}>Connect BSC Wallet</button>
          <button onClick={connectTronWallet}>Connect Tron Wallet</button>
        </div>

        {walletAddress && (
          <div className="card">
            <h2>BSC Wallet</h2>
            <p>Address: {walletAddress}</p>
            <p>BNB Balance: {bnbBalance} BNB</p>
            <p>USDT Balance: {usdtBalance} USDT</p>
          </div>
        )}

        {tronAddress && (
          <div className="card">
            <h2>TRON Wallet</h2>
            <p>Address: {tronAddress}</p>
            <p>TRX Balance: {trxBalance} TRX</p>
            <p>USDT Balance: {tronUsdtBalance} USDT</p>
          </div>
        )}
      </div>
    </>
  );
}

