// Dytallix Wallet UI (React/TypeScript)
// PQC keygen, sign, verify, and address display
import React, { useState } from 'react';

export const Wallet: React.FC = () => {
  const [address, setAddress] = useState('');
  // TODO: Integrate PQC keygen and signing logic

  const handleKeygen = () => {
    // TODO: Call backend or WASM for PQC keygen
    setAddress('dyt1dummyaddress');
  };

  return (
    <div>
      <h2>Dytallix Wallet</h2>
      <button onClick={handleKeygen}>Generate PQC Keypair</button>
      <div>Address: {address}</div>
      {/* TODO: Add sign/verify UI */}
    </div>
  );
};
