import React from 'react';

export default function TechSpecs() {
  return (
    <div>
      <h2>Technical Specifications</h2>
      <p>Dytallix employs a dual-token system:</p>
      <ul>
        <li><strong>DGT:</strong> fixed-supply governance token.</li>
        <li><strong>DRT:</strong> inflationary reward token with burns.</li>
      </ul>
      <p>Smart contract sources can be found in the <code>/tokenomics</code> directory.</p>
    </div>
  );
}
