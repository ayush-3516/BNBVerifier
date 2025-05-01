import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_MAINNET_HEX = "0x2b6653dc";
const TRON_MAINNET_DECIMAL = 728126428;
const ERC20_ABI = [
  // Keep existing ABI
];

export default function App() {
  // State variables remain the same

  // BSC Wallet Connection (unchanged)

  // TRON Wallet Connection with enhanced checks
  const connectTronWallet = async () => {
    try {
      console.log('[TRON] Initializing connection...');
      
      if (!window.tronWeb) {
        const install = confirm("TronLink not detected! Install?");
        if (install) window.open("https://www.tronlink.org/");
        return;
      }

      // Request accounts first as recommended
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

      if (!window.tronWeb?.ready) {
        alert("Please unlock TronLink first");
        return;
      }

      // Safe network validation
      const currentChainId = window.tronWeb.fullNode?.chainId?.toString?.();
      if (!currentChainId) {
        alert("Could not detect network. Please refresh the page.");
        return;
      }

      const chainIdNum = currentChainId.startsWith('0x') 
        ? parseInt(currentChainId, 16)
        : parseInt(currentChainId, 10);

      console.log(`[TRON] Network ID: ${chainIdNum} (${currentChainId})`);

      if (chainIdNum !== TRON_MAINNET_DECIMAL) {
        try {
          await window.tronWeb.request({
            method: 'wallet_switchNetwork',
            params: [{ chainId: TRON_MAINNET_HEX }]
          });
          console.log('[TRON] Network switch requested, reloading...');
          window.location.reload();
          return;
        } catch (error) {
          alert("Please switch to TRON Mainnet manually in TronLink");
          return;
        }
      }

      // Safe address validation
      const tronAddress = window.tronWeb.defaultAddress?.base58;
      if (!tronAddress || !window.tronWeb.isAddress(tronAddress)) {
        throw new Error("Invalid TRON address format");
      }
      setTronAddress(tronAddress);

      // Balance fetching with null checks
      const [trxBal, usdtContract] = await Promise.all([
        window.tronWeb.trx.getBalance(tronAddress).catch(() => 0),
        window.tronWeb.contract(ERC20_ABI, TRON_USDT_ADDRESS)
      ]);

      setTrxBalance((trxBal / 1e6).toFixed(2));

      const [balance, decimals] = await Promise.all([
        usdtContract.balanceOf(tronAddress).call().catch(() => 0),
        usdtContract.decimals().call().catch(() => 6)
      ]);
      
      setTronUsdtBalance((balance / (10 ** decimals)).toFixed(2));

    } catch (error) {
      console.error("[TRON] Error:", error);
      alert(error.message || "TRON connection failed");
    }
  };

  // Auto-update with safe checks
  useEffect(() => {
    const handleTronUpdate = async () => {
      console.log('[TRON] Auto-update triggered');
      
      if (!window.tronWeb?.ready || !window.tronWeb.defaultAddress?.base58) return;

      try {
        const currentChainId = window.tronWeb.fullNode?.chainId?.toString?.();
        if (!currentChainId) return;

        const chainIdNum = currentChainId.startsWith('0x') 
          ? parseInt(currentChainId, 16)
          : parseInt(currentChainId, 10);

        if (chainIdNum !== TRON_MAINNET_DECIMAL) return;

        const address = window.tronWeb.defaultAddress.base58;
        if (!window.tronWeb.isAddress(address)) return;

        // Update balances...
        
      } catch (error) {
        console.log("[TRON] Auto-update error:", error);
      }
    };

    if (window.tronWeb) {
      window.tronWeb.on('addressChanged', handleTronUpdate);
      window.tronWeb.on('chainChanged', handleTronUpdate);
      handleTronUpdate();
    }

    return () => {
      if (window.tronWeb) {
        window.tronWeb.off('addressChanged', handleTronUpdate);
        window.tronWeb.off('chainChanged', handleTronUpdate);
      }
    };
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
