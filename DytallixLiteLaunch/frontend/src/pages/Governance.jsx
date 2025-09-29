import React from 'react';

const Governance = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Governance</h1>
        
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Governance Interface Coming Soon
          </h2>
          <p className="text-gray-600 mb-4">
            Participate in Dytallix governance with DGT tokens.
          </p>
          <p className="text-gray-500">
            Use the CLI tool for now: <code className="bg-gray-200 px-2 py-1 rounded">dytx gov-propose</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Governance;