import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import { AssetInventory } from './pages/AssetInventory';
import { PolicyManagement } from './pages/PolicyManagement';
import { Attestation } from './pages/Attestation';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<AssetInventory />} />
          <Route path="policies" element={<PolicyManagement />} />
          <Route path="attestation" element={<Attestation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
