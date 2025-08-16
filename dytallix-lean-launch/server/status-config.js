const RPC = process.env.RPC_HTTP_URL
  || process.env.VITE_RPC_HTTP_URL
  || 'http://178.156.187.81:26657'; // fallback to Hetzner RPC

const LCD = process.env.LCD_HTTP_URL
  || process.env.VITE_LCD_HTTP_URL
  || 'http://178.156.187.81:1317'; // fallback to Hetzner LCD

module.exports = { RPC, LCD };
