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
          console.log(`[TRON] Post-switch chain ID: ${newChainIdNumber}`);

          if (newChainIdNumber !== TRON_MAINNET_DECIMAL) {
            alert(`Still on wrong network (ID: ${newChainIdNumber}). Please switch manually.`);
            return;
          }
          
          console.log('[TRON] Network switch successful, reloading...');
          window.location.reload();
          return;
        } catch (error) {
          console.error('[TRON] Switch error:', error);
          alert(`Switch failed: ${error.message}. Please switch manually to TRON Mainnet.`);
          return;
        }
      }

      console.log('[TRON] Network validated, getting address...');
      const tronAddress = window.tronWeb.defaultAddress.base58;
      if (!window.tronWeb.isAddress(tronAddress)) {
        throw new Error(`Invalid address: ${tronAddress}`);
      }
      setTronAddress(tronAddress);

      console.log('[TRON] Fetching balances...');
      const [trxBal, usdtContract] = await Promise.all([
        window.tronWeb.trx.getBalance(tronAddress),
        window.tronWeb.contract(ERC20_ABI, TRON_USDT_ADDRESS)
      ]);

      console.log('[TRON] Raw balances:', { trxBal, usdtContract });
      setTrxBalance((trxBal / 1e6).toFixed(2));

      const [balance, decimals] = await Promise.all([
        usdtContract.balanceOf(tronAddress).call(),
        usdtContract.decimals().call()
      ]);
      console.log('[TRON] USDT values:', { balance, decimals });
      setTronUsdtBalance((balance / (10 ** decimals)).toFixed(2));

      console.log('[TRON] Connection completed successfully');
    } catch (error) {
      console.error("[TRON] Final error:", error);
      alert(error.message.includes("rejected") 
        ? "Connection canceled" 
        : error.message || "TRON connection error");
    }
  };

  // Tron Auto-Update with debug
  useEffect(() => {
    const handleTronUpdate = async () => {
      console.log('[TRON] Auto-update triggered');
      if (window.tronWeb?.ready && window.tronWeb.defaultAddress?.base58) {
        try {
          const currentChainId = window.tronWeb.fullNode.chainId;
          const chainIdNumber = parseInt(currentChainId, currentChainId.startsWith('0x') ? 16 : 10);
          
          console.log(`[TRON] Auto-update chain check: ${chainIdNumber} vs ${TRON_MAINNET_DECIMAL}`);
          if (chainIdNumber !== TRON_MAINNET_DECIMAL) {
            console.warn('[TRON] Auto-update network mismatch');
            return;
          }

          const address = window.tronWeb.defaultAddress.base58;
          console.log('[TRON] Auto-update address:', address);
          if (!window.tronWeb.isAddress(address)) return;

          setTronAddress(address);

          const [trxBal, usdtContract] = await Promise.all([
            window.tronWeb.trx.getBalance(address),
            window.tronWeb.contract(ERC20_ABI, TRON_USDT_ADDRESS)
          ]);

          setTrxBalance((trxBal / 1e6).toFixed(2));

          const [balance, decimals] = await Promise.all([
            usdtContract.balanceOf(address).call(),
            usdtContract.decimals().call()
          ]);
          setTronUsdtBalance((balance / (10 ** decimals)).toFixed(2));

          console.log('[TRON] Auto-update completed');
        } catch (error) {
          console.log("[TRON] Auto-update error:", error);
        }
      }
    };

    if (window.tronWeb) {
      console.log('[TRON] Setting up listeners');
      window.tronWeb.on('addressChanged', handleTronUpdate);
      window.tronWeb.on('chainChanged', handleTronUpdate);
      handleTronUpdate();
    }

    return () => {
      if (window.tronWeb) {
        console.log('[TRON] Cleaning up listeners');
        window.tronWeb.off('addressChanged', handleTronUpdate);
        window.tronWeb.off('chainChanged', handleTronUpdate);
      }
    };
  }, []);

  // JSX remains the same
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
