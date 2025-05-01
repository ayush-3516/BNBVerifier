import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
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
      const isTrustWallet = !!window.ethereum.isTrust || !!window.ethereum.isTrustWallet;
      if (!isTrustWallet) {
        alert("Please use Trust Wallet's built-in browser to access this DApp.");
        return;
      }

      let provider = new ethers.BrowserProvider(window.ethereum);

      const handleNetwork = async () => {
        const network = await provider.getNetwork();
        if (network.chainId !== 56) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x38' }],
            });
            provider = new ethers.BrowserProvider(window.ethereum);
          } catch (switchError) {
            alert("Please switch to Binance Smart Chain Mainnet in Trust Wallet");
            throw new Error("Network switch failed");
          }
        }
        return provider;
      };

      provider = await handleNetwork();
      
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts?.length) {
        alert("No accounts found. Please connect your Trust Wallet.");
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      const bnbBalance = await provider.getBalance(address);
      setBnbBalance(ethers.formatEther(bnbBalance));

      const usdtContract = new ethers.Contract(BSC_USDT_ADDRESS, ERC20_ABI, provider);
      const [balance, decimals] = await Promise.all([
        usdtContract.balanceOf(address),
        usdtContract.decimals()
      ]);
      
      const formattedBalance = ethers.formatUnits(balance, decimals);
      const displayBalance = parseFloat(formattedBalance).toFixed(2);
      setUsdtBalance(displayBalance);
    } catch (error) {
      console.error("BSC Connection Error:", error);
      alert(error.message || "Error connecting to wallet. Please ensure you're using Trust Wallet's browser on BSC Mainnet.");
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

      const usdtContract = await window.tronWeb.contract(
        ERC20_ABI,
        TRON_USDT_ADDRESS
      );
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
            <p>USDT Balance: {usdtBalance || '0.00'} USDT</p>
          </div>
        )}

        {tronAddress && (
          <div className="card">
            <h2>TRON Wallet</h2>
            <p>Address: {tronAddress}</p>
            <p>TRX Balance: {trxBalance || '0.00'} TRX</p>
            <p>USDT Balance: {tronUsdtBalance || '0.00'} USDT</p>
          </div>
        )}
      </div>
    </>
  );
}
