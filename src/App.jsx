import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SunWeb from '@tronprotocol/sun-network-sdk';
import './App.css';
import Navbar from './components/Navbar';

// Configuration
const SUNWEB_CONFIG = {
  mainChain: {
    fullHost: 'https://api.trongrid.io' // Mainnet TRON node
  },
  sideChain: {
    fullHost: 'https://sun.tronex.io' // Official SunNetwork sidechain node
  }
};

// Contract Addresses
const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const MAINCHAIN_TRON_USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const SIDECHAIN_TRON_USDT = 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs';

// Initialize SunWeb
const sunWeb = new SunWeb(SUNWEB_CONFIG);

// BSC ABI
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

  // BSC Wallet Connection (Unchanged)
  const connectBSCWallet = async () => {
    if (!window.ethereum) {
      alert("Please install Trust Wallet");
      return;
    }

    try {
      const isTrustWallet = !!window.ethereum.isTrust || !!window.ethereum.isTrustWallet;
      if (!isTrustWallet) {
        alert("Please use Trust Wallet's browser");
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
          } catch (error) {
            alert("Please switch to BSC Mainnet");
            throw error;
          }
        }
        return provider;
      };

      provider = await handleNetwork();
      
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setWalletAddress(address);

      // Get balances
      const [bnbBal, usdtBal] = await Promise.all([
        provider.getBalance(address),
        getBSCUSDTBalance(address, provider)
      ]);

      setBnbBalance(ethers.formatEther(bnbBal));
      setUsdtBalance(usdtBal);
    } catch (error) {
      alert(`BSC Error: ${error.message}`);
    }
  };

  const getBSCUSDTBalance = async (address, provider) => {
    const contract = new ethers.Contract(BSC_USDT_ADDRESS, ERC20_ABI, provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals()
    ]);
    return parseFloat(ethers.formatUnits(balance, decimals)).toFixed(2);
  };

  // Corrected Tron Sidechain Implementation
  const connectTronWallet = async () => {
    if (!window.tronWeb?.ready) {
      alert("Please install/unlock TronLink");
      return;
    }

    try {
      const mainchainAddress = window.tronWeb.defaultAddress.base58;
      if (!mainchainAddress) throw new Error("No TronLink address found");

      // Get sidechain address
      const sidechainAddress = await sunWeb.sidechain.getSidechainAddress(mainchainAddress);
      setTronAddress(sidechainAddress);

      // Get sidechain balances
      const [trxBal, usdtBal] = await Promise.all([
        sunWeb.sidechain.trx.getBalance(sidechainAddress),
        sunWeb.sidechain.contract()
          .at(SIDECHAIN_TRON_USDT)
          .then(contract => contract.balanceOf(sidechainAddress).call())
      ]);

      setTrxBalance(sunWeb.sidechain.fromSun(trxBal).toFixed(2));
      setTronUsdtBalance(sunWeb.sidechain.fromSun(usdtBal).toFixed(2));
    } catch (error) {
      alert(`Tron Error: ${error.message}`);
      console.error("SunNetwork Error:", error);
    }
  };

  useEffect(() => {
    if (window.tronWeb?.ready) {
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
            <h2>TRON Sidechain</h2>
            <p>Address: {tronAddress}</p>
            <p>TRX Balance: {trxBalance} TRX</p>
            <p>USDT Balance: {tronUsdtBalance} USDT</p>
          </div>
        )}
      </div>
    </>
  );
}
