import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SunWeb from '@tronprotocol/sun-network-sdk';
import './App.css';
import Navbar from './components/Navbar';

// BSC Configuration
const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// Tron Sidechain Configuration
const SUNWEB_CONFIG = {
  fullHost: 'https://api.shasta.trongrid.io', // Replace with your sidechain node URL
  sideOptions: {
    fullNode: 'https://api.shasta.trongrid.io', // Sidechain full node
    solidityNode: 'https://api.shasta.trongrid.io', // Sidechain solidity node
    eventServer: 'https://api.shasta.trongrid.io' // Sidechain event server
  }
};
const SIDE_CHAIN_USDT_ADDRESS = "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs"; // Replace with actual sidechain USDT address

const sunWeb = new SunWeb(SUNWEB_CONFIG);

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [bnbBalance, setBnbBalance] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(null);
  const [tronAddress, setTronAddress] = useState(null);
  const [trxBalance, setTrxBalance] = useState(null);
  const [tronUsdtBalance, setTronUsdtBalance] = useState(null);

  // BSC Wallet Connection (Unchanged)
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

  // Updated Tron Sidechain Connection
  const connectTronWallet = async () => {
    if (!window.tronWeb) {
      alert("Please install TronLink wallet");
      return;
    }

    if (!window.tronWeb.ready) {
      alert("Please unlock your TronLink wallet");
      return;
    }

    try {
      // Get mainchain address
      const mainchainAddress = window.tronWeb.defaultAddress.base58;
      if (!mainchainAddress) {
        alert("Please connect your TronLink wallet");
        return;
      }

      // Get sidechain address
      const sidechainAddress = await sunWeb.sidechain.getSidechainAddress(mainchainAddress);
      setTronAddress(sidechainAddress);

      // Get sidechain balances
      const trxBal = await sunWeb.sidechain.trx.getBalance(sidechainAddress);
      setTrxBalance((trxBal / 1e6).toFixed(2));

      const usdtContract = await sunWeb.sidechain.contract().at(SIDE_CHAIN_USDT_ADDRESS);
      const usdtBal = await usdtContract.balanceOf(sidechainAddress).call();
      setTronUsdtBalance((usdtBal / 1e6).toFixed(2));
    } catch (error) {
      console.error("Tron Sidechain Error:", error);
      alert("Error connecting to Tron sidechain. Please ensure:\n1. TronLink is connected\n2. You're on the correct network\n3. Sidechain nodes are accessible");
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
            <h2>TRON Sidechain Wallet</h2>
            <p>Address: {tronAddress}</p>
            <p>TRX Balance: {trxBalance} TRX</p>
            <p>USDT Balance: {tronUsdtBalance} USDT</p>
          </div>
        )}
      </div>
    </>
  );
}
