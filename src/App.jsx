import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_MAINNET_HEX = "0x2b6653dc";
const TRON_MAINNET_DECIMAL = 728126428; // Decimal equivalent of 0x2b6653dc
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

  // BSC Wallet Connection (unchanged)

  // TRON Wallet Connection with debug
  const connectTronWallet = async () => {
    try {
      console.log('[TRON] Connection flow started');
      if (!window.tronWeb) {
        console.warn('[TRON] TronLink not detected');
        const install = confirm("TronLink not detected! Install?");
        if (install) window.open("https://www.tronlink.org/");
        return;
      }

      console.log('[TRON] Requesting accounts...');
      const { code, message } = await window.tronWeb.request({
        method: 'tron_requestAccounts'
      }).catch(error => ({
        code: error.code,
        message: error.message
      }));

      console.log(`[TRON] Accounts response:`, { code, message });
      if (code !== 200) {
        alert(message || "Connection request rejected");
        return;
      }

      console.log('[TRON] Checking wallet state...');
      if (!window.tronWeb.ready) {
        alert("Please unlock TronLink first");
        return;
      }

      console.log('[TRON] Checking network...');
      const currentChainId = window.tronWeb.fullNode.chainId;
      console.log(`[TRON] Raw chain ID:`, currentChainId);
      
      // Convert chain ID to number for comparison
      const chainIdNumber = parseInt(currentChainId, currentChainId.startsWith('0x') ? 16 : 10);
      console.log(`[TRON] Parsed chain ID: ${chainIdNumber}, Expected: ${TRON_MAINNET_DECIMAL}`);

      if (chainIdNumber !== TRON_MAINNET_DECIMAL) {
        console.log('[TRON] Attempting network switch...');
        try {
          const switchResult = await window.tronWeb.request({
            method: 'wallet_switchNetwork',
            params: [{ chainId: TRON_MAINNET_HEX }]
          });
          console.log('[TRON] Switch result:', switchResult);

          // Verify network after switch
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
          const newChainId = window.tronWeb.fullNode.chainId;
          const newChainIdNumber = parseInt(newChainId, newChainId.startsWith('0x') ? 16 : 10);
          console.log(`[TRON] Post-switch chain ID: ${newChainIdNumber
