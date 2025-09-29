import React, { useState } from 'react';

const Explorer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('block');

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search logic
    console.log(`Searching for ${searchType}: ${searchTerm}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Blockchain Explorer</h1>
        
        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="block">Block</option>
              <option value="tx">Transaction</option>
              <option value="address">Address</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search by ${searchType}...`}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Search
            </button>
          </form>
        </div>

        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Explorer Coming Soon
          </h2>
          <p className="text-gray-600">
            The blockchain explorer is being developed and will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Explorer;