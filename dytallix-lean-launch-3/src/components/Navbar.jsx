import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav>
      <div className="app-container">
        <Link to="/">Home</Link>
        <Link to="/faucet">Faucet</Link>
        <Link to="/monitor">Monitor</Link>
        <Link to="/techspecs">Tech Specs</Link>
        <Link to="/modules">Modules</Link>
        <Link to="/roadmap">Roadmap</Link>
        <Link to="/devresources">Dev Resources</Link>
      </div>
    </nav>
  );
}
