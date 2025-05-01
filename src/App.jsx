import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import Navbar from './components/Navbar';

const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_MAINNET_NODE = "https://api.trongrid.io";
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
      alert(error.message || "BSC connection failed");
    }
  };

  const connectTronWallet = async () => {
    try {
      if (!window.tronWeb) {
        const install = confirm("TronLink not detected! Install?");
        if (install) window.open("https://www.tronlink.org/");
        return;
      }

      const { code, message } = await window.tronLink.request({
        method: 'tron_requestAccounts'
      }).catch(error => ({
        code: error.code,
        message: error.message
      }));

      if (code !== 200) {
        alert(message || "Connection request rejected");
        return;
      }

      if (!window.tronWeb.ready) {
        alert("Please unlock TronLink first");
        return;
      }

      if (window.tronWeb.fullNode.host !== TRON_MAINNET_NODE) {
        alert("Please switch to TRON Mainnet in TronLink");
        return;
      }

      const tronAddress = window.tronWeb.defaultAddress.base58;
      if (!window.tronWeb.isAddress(tronAddress)) {
        throw new Error("Invalid TRON address");
      }
      setTronAddress(tronAddress);

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
      alert(error.message || "TRON connection failed");
    }
  };

  useEffect(() => {
    const handleTronUpdate = async () => {
      if (window.tronWeb?.ready && window.tronWeb.defaultAddress?.base58) {
        try {
          if (window.tronWeb.fullNode.host !== TRON_MAINNET_NODE) return;

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
        } catch (error) {}
      }
    };

    if (window.tronWeb) {
      window.tronWeb.on('addressChanged', handleTronUpdate);
      window.tronWeb.on('nodeChanged', handleTronUpdate);
      handleTronUpdate();
    }

    return () => {
      if (window.tronWeb) {
        window.tronWeb.off('addressChanged', handleTronUpdate);
        window.tronWeb.off('nodeChanged', handleTronUpdate);
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
