import React from 'react';
import BlockHeightWidget from '../components/BlockHeightWidget';
import PQCStatusCard from '../components/PQCStatusCard';

export default function Monitor() {
  return (
    <div>
      <h2>Network Monitor</h2>
      <BlockHeightWidget />
      <PQCStatusCard />
    </div>
  );
}
