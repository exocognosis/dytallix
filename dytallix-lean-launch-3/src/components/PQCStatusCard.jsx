import React, { useEffect, useState } from 'react';
import { getPQCStatus } from '../lib/api';

export default function PQCStatusCard() {
  const [status, setStatus] = useState({});

  useEffect(() => {
    getPQCStatus().then(setStatus);
  }, []);

  return (
    <div>
      <h3>PQC Status</h3>
      <ul>
        {Object.entries(status).map(([algo, val]) => (
          <li key={algo}>{algo}: {val}</li>
        ))}
      </ul>
    </div>
  );
}
