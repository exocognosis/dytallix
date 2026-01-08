// Blockchain Explorer Functionality
// Fetches and displays real blockchain data from Dytallix node

(function() {
  'use strict';

  const BLOCKCHAIN_NODE = 'http://localhost:3003';
  let updateInterval = null;
  let isBlockchainReady = false;

  const ExplorerData = {
    init: function() {
      console.log('[Explorer] Initializing blockchain explorer...');
      
      // Wait 3 seconds before first fetch to give blockchain time to start
      setTimeout(() => {
        this.fetchAndDisplayData();
        
        // Update every 5 seconds
        updateInterval = setInterval(() => {
          if (isBlockchainReady) {
            this.fetchAndDisplayData();
          }
        }, 5000);
      }, 3000);
    },

    fetchAndDisplayData: async function() {
      try {
        // Fetch blocks and transactions in parallel
        const [blocks, transactions] = await Promise.all([
          this.fetchRecentBlocks(),
          this.fetchRecentTransactions()
        ]);

        if (blocks || transactions) {
          isBlockchainReady = true;
        }

        if (blocks) {
          this.displayBlocks(blocks);
        }

        if (transactions) {
          this.displayTransactions(transactions);
        }

        // Update metrics in hero section
        if (blocks && blocks.length > 0) {
          this.updateMetrics(blocks[0]);
        }

      } catch (error) {
        console.warn('[Explorer] Error fetching blockchain data:', error);
      }
    },

    fetchRecentBlocks: async function() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${BLOCKCHAIN_NODE}/blocks?limit=10`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return data.blocks || [];
        }
      } catch (error) {
        if (!isBlockchainReady) {
          console.log('[Explorer] Blockchain not ready, waiting...');
        } else {
          console.warn('[Explorer] Could not fetch blocks:', error);
        }
      }
      return null;
    },

    fetchRecentTransactions: async function() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${BLOCKCHAIN_NODE}/transactions?limit=10`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return data.transactions || [];
        }
      } catch (error) {
        if (!isBlockchainReady) {
          console.log('[Explorer] Blockchain not ready, waiting...');
        } else {
          console.warn('[Explorer] Could not fetch transactions:', error);
        }
      }
      return null;
    },

    displayBlocks: function(blocks) {
      const blockFeed = document.getElementById('block-feed');
      if (!blockFeed) return;

      if (blocks.length === 0) {
        blockFeed.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 2rem;">
              <span class="card-content">No blocks found. Waiting for blockchain...</span>
            </td>
          </tr>
        `;
        return;
      }

      blockFeed.innerHTML = blocks.slice(0, 5).map(block => {
        const timeAgo = this.getTimeAgo(block.timestamp);
        const txCount = block.transactions ? block.transactions.length : 0;
        const validator = block.validator || block.miner || 'N/A';
        const validatorShort = this.truncateAddress(validator);

        return `
          <tr>
            <td>
              <strong>#${block.height || block.number || 'N/A'}</strong><br>
              <span class="card-content mb-0">${timeAgo}</span>
            </td>
            <td>${txCount}</td>
            <td>${block.size || 'N/A'}</td>
            <td>${validatorShort}</td>
          </tr>
        `;
      }).join('');
    },

    displayTransactions: function(transactions) {
      const txContainer = document.querySelector('.stacked-list');
      if (!txContainer) return;

      if (transactions.length === 0) {
        txContainer.innerHTML = `
          <div class="stacked-list-item">
            <div>
              <span class="card-content">No transactions found yet. Send tokens from the wallet to see them here!</span>
            </div>
          </div>
        `;
        return;
      }

      txContainer.innerHTML = transactions.slice(0, 10).map(tx => {
        const txHash = tx.hash || tx.tx_hash || 'N/A';
        const txHashShort = this.truncateHash(txHash);
        const from = this.truncateAddress(tx.from || tx.sender || 'N/A');
        const to = this.truncateAddress(tx.to || tx.recipient || 'N/A');
        const amount = tx.amount || tx.value || '0';
        const token = tx.token || 'DGT';
        const status = tx.status || 'confirmed';
        
        const statusBadge = status === 'confirmed' || status === 'success' 
          ? '<span class="badge badge-success">Success</span>'
          : '<span class="badge">Pending</span>';

        return `
          <div class="stacked-list-item">
            <div>
              <span class="form-label">${txHashShort}</span>
              <p class="card-content mb-0">From ${from} → ${to} · ${amount} ${token}</p>
            </div>
            ${statusBadge}
          </div>
        `;
      }).join('');
    },

    updateMetrics: function(latestBlock) {
      // Update latest block number
      const latestBlockEl = document.querySelector('.hero-metrics .metric-value');
      if (latestBlockEl && latestBlock.height) {
        latestBlockEl.textContent = latestBlock.height.toLocaleString();
      }

      // Update time ago
      const latestBlockTime = document.querySelector('.hero-metrics .metric-trend');
      if (latestBlockTime && latestBlock.timestamp) {
        latestBlockTime.textContent = this.getTimeAgo(latestBlock.timestamp);
      }
    },

    truncateHash: function(hash) {
      if (!hash || hash === 'N/A') return hash;
      if (hash.length <= 12) return hash;
      return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
    },

    truncateAddress: function(address) {
      if (!address || address === 'N/A') return address;
      if (address.length <= 10) return address;
      return `${address.substring(0, 7)}...`;
    },

    getTimeAgo: function(timestamp) {
      if (!timestamp) return 'unknown';
      
      let date;
      if (typeof timestamp === 'number') {
        // Unix timestamp (seconds or milliseconds)
        date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
      } else {
        date = new Date(timestamp);
      }

      const seconds = Math.floor((new Date() - date) / 1000);

      if (seconds < 10) return 'just now';
      if (seconds < 60) return `${seconds} seconds ago`;
      
      const minutes = Math.floor(seconds / 60);
      if (minutes === 1) return '1 minute ago';
      if (minutes < 60) return `${minutes} minutes ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours === 1) return '1 hour ago';
      if (hours < 24) return `${hours} hours ago`;
      
      const days = Math.floor(hours / 24);
      if (days === 1) return '1 day ago';
      return `${days} days ago`;
    },

    destroy: function() {
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ExplorerData.init());
  } else {
    ExplorerData.init();
  }

  // Export to global scope
  window.DytallixExplorer = ExplorerData;

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => ExplorerData.destroy());
})();
