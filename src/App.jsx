import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_MAINNET_ID = 728126428; // Decimal equivalent of 0x2b6653dc
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

  // BSC connection logic remains same as previous version

  const connectTronWallet = async () => {
    try {
      // 1. Check TronLink availability
      if (!window.tronWeb) {
        const installConfirmation = confirm("TronLink extension not detected! Click OK to install.");
        if (installConfirmation) window.open("https://www.tronlink.org/", "_blank");
        return;
      }

      // 2. Check if wallet is unlocked
      if (!window.tronWeb.ready) {
        alert("Please unlock your TronLink wallet first");
        return;
      }

      // 3. Validate network using decimal chain ID
      const currentChainId = parseInt(window.tronWeb.fullNode.chainId, 16);
      
      if (currentChainId !== TRON_MAINNET_ID) {
        try {
          await window.tronWeb.request({
            method: 'wallet_switchNetwork',
            params: [{ chainId: '0x2b6653dc' }] // Hex value for switching
          });
          
          // Verify network after switch
          const newChainId = parseInt(window.tronWeb.fullNode.chainId, 16);
          if (newChainId !== TRON_MAINNET_ID) {
            throw new Error("Failed to switch networks");
          }
        } catch (error) {
          alert(`Please switch to TRON Mainnet in TronLink: ${error.message || "Network switch failed"}`);
          return;
        }
      }

      // 4. Request accounts
      const { code, message } = await window.tronWeb.request({ 
        method: 'tron_requestAccounts'
      }).catch(error => ({
        code: error.code,
        message: error.message
      }));

      if (code !== 200) {
        alert(message || "Connection request rejected");
        return;
      }

      // 5. Validate address
      const tronAddress = window.tronWeb.defaultAddress.base58;
      if (!window.tronWeb.isAddress(tronAddress)) {
        throw new Error("Invalid TRON address received");
      }
      setTronAddress(tronAddress);

      // 6. Fetch balances
      const [trxBal, usdtContract] = await Promise.all([
        window.tronWeb.trx.getBalance(tronAddress),
        window.tronWeb.contract(ERC20_ABI, TRON_USDT_ADDRESS)
      ]);

      // TRX Balance
      setTrxBalance((trxBal / 1e6).toFixed(2));

      // USDT Balance
      const [balance, decimals] = await Promise.all([
        usdtContract.balanceOf(tronAddress).call(),
        usdtContract.decimals().call()
      ]);
      const formattedBalance = balance / (10 ** decimals);
      setTronUsdtBalance(formattedBalance.toFixed(2));

    } catch (error) {
      console.error("Tron connection error:", error);
      const errorMessage = error.message.includes("rejected") 
        ? "Connection canceled by user" 
        : error.message || "Check TronLink configuration";
      alert(`Tron connection failed: ${errorMessage}`);
    }
  };

  useEffect(() => {
    const handleTronUpdate = async () => {
      if (window.tronWeb?.ready && window.tronWeb.defaultAddress?.base58) {
        try {
          // Validate network
          const currentChainId = parseInt(window.tronWeb.fullNode.chainId, 16);
          if (currentChainId !== TRON_MAINNET_ID) return;

          const tronAddress = window.tronWeb.defaultAddress.base58;
          if (!window.tronWeb.isAddress(tronAddress)) return;

          setTronAddress(tronAddress);

          // Update balances
          const [trxBal, usdtContract] = await Promise.all([
            window.tronWeb.trx.getBalance(tronAddress),
            window.tronWeb.contract(ERC20_ABI, TRON_USDT_ADDRESS)
          ]);

          setTrxBalance((trxBal / 1e6).toFixed(2));

          const [balance, decimals] = await Promise.all([
            usdtContract.balanceOf(tronAddress).call(),
            usdtContract.decimals().call()
          ]);
          const formattedBalance = balance / (10 ** decimals);
          setTronUsdtBalance(formattedBalance.toFixed(2));
        } catch (error) {
          console.log("Tron balance update failed:", error);
        }
      }
    };

    if (window.tronWeb) {
      window.tronWeb.on('addressChanged', handleTronUpdate);
      window.tronWeb.on('networkChanged', handleTronUpdate);
      handleTronUpdate();
    }

    return () => {
      if (window.tronWeb) {
        window.tronWeb.off('addressChanged', handleTronUpdate);
        window.tronWeb.off('networkChanged', handleTronUpdate);
      }
    };
  }, []);

  // JSX remains same as previous version
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
