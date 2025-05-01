import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_MAINNET_CHAIN_ID = "0x2b6653dc";
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

  // TRON Wallet Connection
  const connectTronWallet = async () => {
    try {
      // 1. Check TronLink availability
      if (!window.tronWeb) {
        const install = confirm("TronLink not detected! Install?");
        if (install) window.open("https://www.tronlink.org/");
        return;
      }

      // 2. Request accounts first as recommended
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

      // 3. Check if wallet is unlocked
      if (!window.tronWeb.ready) {
        alert("Please unlock TronLink first");
        return;
      }

      // 4. Validate network
      const currentChainId = window.tronWeb.fullNode.chainId;
      if (currentChainId !== TRON_MAINNET_CHAIN_ID) {
        try {
          await window.tronWeb.request({
            method: 'wallet_switchNetwork',
            params: [{ chainId: TRON_MAINNET_CHAIN_ID }]
          });
        } catch (error) {
          alert("Please switch to TRON Mainnet in TronLink");
          return;
        }
      }

      // 5. Get validated address
      const tronAddress = window.tronWeb.defaultAddress.base58;
      if (!window.tronWeb.isAddress(tronAddress)) {
        throw new Error("Invalid TRON address format");
      }
      setTronAddress(tronAddress);

      // 6. Fetch balances
      const [trxBal, usdtContract] = await Promise.all([
        window.tronWeb.trx.getBalance(tronAddress),
        window.tronWeb.contract(ERC20_ABI, TRON_USDT_ADDRESS)
      ]);

      setTrxBalance((trxBal / 1e6).toFixed(2));

      const [balance, decimals] = await Promise.all([
        usdtContract.balanceOf(tronAddress).call(),
        usdtContract.decimals().call()
      ]);
      setTronUsdtBalance((balance / (10 ** decimals)).toFixed(2));

    } catch (error) {
      console.error("TRON Error:", error);
      const errorMessage = error.message.includes("rejected") 
        ? "Connection canceled by user" 
        : error.message || "Check TronLink configuration";
      alert(`TRON connection failed: ${errorMessage}`);
    }
  };

  // Tron Auto-Update
  useEffect(() => {
    const handleTronUpdate = async () => {
      if (window.tronWeb?.ready && window.tronWeb.defaultAddress?.base58) {
        try {
          if (window.tronWeb.fullNode.chainId !== TRON_MAINNET_CHAIN_ID) return;

          const address = window.tronWeb.defaultAddress.base58;
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
        } catch (error) {
          console.log("Tron balance update failed:", error);
        }
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
