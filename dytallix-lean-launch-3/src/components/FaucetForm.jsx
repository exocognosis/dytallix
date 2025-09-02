import React, { useState } from 'react';
import { requestFaucet } from '../lib/api';

export default function FaucetForm() {
  const [token, setToken] = useState('DGT');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await requestFaucet(token);
    setMessage(res.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Token:
        <select value={token} onChange={e => setToken(e.target.value)}>
          <option value="DGT">DGT</option>
          <option value="DRT">DRT</option>
        </select>
      </label>
      <button type="submit">Request</button>
      {message && <p>{message}</p>}
    </form>
  );
}
