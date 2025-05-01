import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_MAINNET_HEX = "0x2b6653dc";
const TRON_MAINNET_DECIMAL = 728126428;
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

  // BSC Wallet Connection
  const connectBSCWallet = async () => {
    if (!window.ethereum) {
      alert("Please install Trust Wallet and open in Trust Wallet's browser");
      return;
    }

    try {
      const isTrustWallet = !!window.ethereum.isTrust || !!window.ethereum.isTrustWallet;
      if (!isTrustWallet) {
        alert("Please use Trust Wallet's built-in browser");
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
          } catch {
            alert("Please switch to BSC Mainnet in Trust Wallet");
            throw new Error("Network switch failed");
          }
        }
        return provider;
      };

      provider = await handleNetwork();
      
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts?.length) {
        alert("No accounts found");
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      const [bnbBal, usdtContract] = await Promise.all([
        provider.getBalance(address),
        new ethers.Contract(BSC_USDT_ADDRESS, ERC20_ABI, provider)
      ]);

      setBnbBalance(ethers.formatEther(bnbBal));

      const [usdtBal, decimals] = await Promise.all([
        usdtContract.balanceOf(address),
        usdtContract.decimals()
      ]);
      
      setUsdtBalance(parseFloat(ethers.formatUnits(usdtBal, decimals)).toFixed(2));
    } catch (error) {
      console.error("BSC Error:", error);
      alert(error.message || "BSC connection failed");
    }
  };

  // TRON Wallet Connection with Enhanced Debugging
  const connectTronWallet = async () => {
    try {
      console.log('[TRON] Initializing connection...');
      
      if (!window.tronWeb) {
        console.warn('[TRON] TronLink extension not detected');
        const install = confirm("TronLink not detected! Click OK to install.");
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

      console.log(`[TRON] Account request response - Code: ${code}, Message: "${message}"`);
      if (code !== 200) {
        alert(message || "Connection request rejected");
        return;
      }

      if (!window.tronWeb.ready) {
        alert("Please unlock TronLink first");
        return;
      }

      console.log('[TRON] Checking network...');
      const currentChainId = window.tronWeb.fullNode.chainId;
      console.log(`[TRON] Raw chain ID: ${currentChainId}`);
      
      // Convert chain ID to number
      const chainIdNum = currentChainId.startsWith('0x') 
        ? parseInt(currentChainId, 16)
        : parseInt(currentChainId, 10);

      console.log(`[TRON] Parsed chain ID: ${chainIdNum}, Expected: ${TRON_MAINNET_DECIMAL}`);
      
      if (chainIdNum !== TRON_MAINNET_DECIMAL) {
        console.log('[TRON] Attempting network switch...');
        try {
          await window.tronWeb.request({
            method: 'wallet_switchNetwork',
            params: [{ chainId: TRON_MAINNET_HEX }]
          });

          // Wait for network update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newChainId = window.tronWeb.fullNode.chainId;
          const newChainIdNum = newChainId.startsWith('0x') 
            ? parseInt(newChainId, 16)
            : parseInt(newChainId, 10);

          console.log(`[TRON] Post-switch chain ID: ${newChainIdNum}`);
          
          if (newChainIdNum !== TRON_MAINNET_DECIMAL) {
            alert(`Still on wrong network (ID: ${newChainIdNum}). Please switch manually to TRON Mainnet.`);
            return;
          }
          
          console.log('[TRON] Network switch successful, reloading...');
          window.location.reload();
          return;
        } catch (error) {
          console.error('[TRON] Network switch error:', error);
          alert(`Failed to switch network: ${error.message}. Please switch manually in TronLink.`);
          return;
        }
      }

      console.log('[TRON] Network validated, getting address...');
      const tronAddress = window.tronWeb.defaultAddress.base58;
      if (!window.tronWeb.isAddress(tronAddress)) {
        throw new Error(`Invalid TRON address: ${tronAddress}`);
      }
      setTronAddress(tronAddress);

      console.log('[TRON] Fetching balances...');
      const [trxBal, usdtContract] = await Promise.all([
        window.tronWeb.trx.getBalance(tronAddress),
        window.tronWeb.contract(ERC20_ABI, TRON_USDT_ADDRESS)
      ]);

      console.log(`[TRON] Raw TRX balance: ${trxBal}`);
      setTrxBalance((trxBal / 1e6).toFixed(2));

      const [balance, decimals] = await Promise.all([
        usdtContract.balanceOf(tronAddress).call(),
        usdtContract.decimals().call()
      ]);
      console.log(`[TRON] Raw USDT values - Balance: ${balance}, Decimals: ${decimals}`);
      setTronUsdtBalance((balance / (10 ** decimals)).toFixed(2));

      console.log('[TRON] Connection completed successfully');
    } catch (error) {
      console.error("[TRON] Final error:", error);
      alert(error.message.includes("rejected") 
        ? "Connection canceled by user" 
        : error.message || "TRON connection failed");
    }
  };

  // Tron Auto-Update with Network Checks
  useEffect(() => {
    const handleTronUpdate = async () => {
      console.log('[TRON] Auto-update triggered');
      if (window.tronWeb?.ready && window.tronWeb.defaultAddress?.base58) {
        try {
          const currentChainId = window.tronWeb.fullNode.chainId;
          const chainIdNum = currentChainId.startsWith('0x') 
            ? parseInt(currentChainId, 16)
            : parseInt(currentChainId, 10);

          console.log(`[TRON] Auto-update chain check: ${chainIdNum} vs ${TRON_MAINNET_DECIMAL}`);
          
          if (chainIdNum !== TRON_MAINNET_DECIMAL) {
            console.warn('[TRON] Network mismatch in auto-update');
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
      console.log('[TRON] Setting up event listeners');
      window.tronWeb.on('addressChanged', handleTronUpdate);
      window.tronWeb.on('chainChanged', handleTronUpdate);
      handleTronUpdate();
    }

    return () => {
      if (window.tronWeb) {
        console.log('[TRON] Removing event listeners');
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
