import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Wallet from './pages/Wallet';
import Faucet from './pages/Faucet';
import Explorer from './pages/Explorer';
import Dashboard from './pages/Dashboard';
import Governance from './pages/Governance';

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/wallet', label: 'Wallet', icon: '💼' },
    { path: '/faucet', label: 'Faucet', icon: '🚰' },
    { path: '/explorer', label: 'Explorer', icon: '🔍' },
    { path: '/governance', label: 'Governance', icon: '🗳️' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-indigo-600">Dytallix</span>
            <span className="text-sm text-gray-500">Testnet</span>
          </Link>
          
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Dytallix LiteLaunch</h3>
            <p className="text-gray-300">
              Lightweight testnet deployment for the Dytallix ecosystem with DGT/DRT dual-token system.
            </p>
          </div>
          
          <div>
            <h4 className="text-md font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
              <li><Link to="/faucet" className="hover:text-white">Get Testnet Tokens</Link></li>
              <li><Link to="/explorer" className="hover:text-white">Block Explorer</Link></li>
              <li><Link to="/governance" className="hover:text-white">Governance</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-semibold mb-4">Network Info</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>Chain ID: dytallix-testnet-1</li>
              <li>RPC: http://localhost:26657</li>
              <li>REST: http://localhost:1317</li>
              <li>Faucet: http://localhost:8787</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-4 text-center text-gray-400">
          <p>&copy; 2024 Dytallix. Apache-2.0 License. Built for testnet deployment.</p>
        </div>
      </div>
    </footer>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/faucet" element={<Faucet />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-4">Page not found</p>
                  <Link to="/" className="text-indigo-600 hover:text-indigo-700">
                    Return Home
                  </Link>
                </div>
              </div>
            } />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </Router>
  );
}

export default App;