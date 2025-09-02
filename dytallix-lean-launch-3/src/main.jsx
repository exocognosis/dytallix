import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/global.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Faucet from './pages/Faucet';
import TechSpecs from './pages/TechSpecs';
import Modules from './pages/Modules';
import Roadmap from './pages/Roadmap';
import DevResources from './pages/DevResources';
import Monitor from './pages/Monitor';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/faucet" element={<Faucet />} />
          <Route path="/techspecs" element={<TechSpecs />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/devresources" element={<DevResources />} />
          <Route path="/monitor" element={<Monitor />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
