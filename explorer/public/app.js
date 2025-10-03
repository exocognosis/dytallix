class DytallixExplorer {
    constructor() {
        this.apiBase = window.location.origin;
        this.currentTab = 'blocks';
        this.autoRefreshInterval = null;
        this.pqc = { enabled: false };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupTabSwitching();
        await this.loadInitialData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Modal close
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('searchModal').addEventListener('click', (e) => {
            if (e.target.id === 'searchModal') this.closeModal();
        });
    }

    setupTabSwitching() {
        const tabs = ['blocksTab', 'transactionsTab', 'validatorsTab'];
        
        tabs.forEach(tabId => {
            document.getElementById(tabId).addEventListener('click', () => {
                const tabName = tabId.replace('Tab', '');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active', 'border-blue-500', 'text-blue-600');
            button.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });

        const activeTab = document.getElementById(`${tabName}Tab`);
        activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');
        activeTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}Content`).classList.remove('hidden');

        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    async loadInitialData() {
        try {
            await this.loadNetworkStatus();
            await this.loadTabData(this.currentTab);
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async loadNetworkStatus() {
        try {
            const response = await fetch(`${this.apiBase}/api/status`);
            const status = await response.json();

            this.pqc = status.pqc || { enabled: false };
            document.getElementById('latestBlock').textContent = `Block: ${status.latestHeight || status.status?.resultSyncInfo?.latest_block_height || '-'}`;
            document.getElementById('statsLatestBlock').textContent = status.latestHeight || status.status?.resultSyncInfo?.latest_block_height || '-';
            document.getElementById('statsChainId').textContent = status.chainId || status.status?.node_info?.network || '-';
            
            const validatorsResponse = await fetch(`${this.apiBase}/api/validators`);
            const validatorsData = await validatorsResponse.json();
            const total = (validatorsData.bonded?.validators?.length || 0) + (validatorsData.unbonding?.validators?.length || 0) + (validatorsData.unbonded?.validators?.length || 0);
            document.getElementById('statsValidators').textContent = total;
            
        } catch (error) {
            console.error('Failed to load network status:', error);
            document.getElementById('networkStatus').innerHTML = 
                '<i class="fas fa-circle text-red-400 mr-1"></i>Disconnected';
        }
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'blocks':
                await this.loadBlocks();
                break;
            case 'transactions':
                await this.loadTransactions();
                break;
            case 'validators':
                await this.loadValidators();
                break;
        }
    }

    async loadBlocks() {
        try {
            const response = await fetch(`${this.apiBase}/api/blocks?limit=20`);
            const data = await response.json();
            
            const tbody = document.getElementById('blocksTableBody');
            tbody.innerHTML = '';

            data.blocks.forEach(block => {
                const row = document.createElement('tr');
                row.classList.add('hover:bg-gray-50', 'cursor-pointer');
                row.addEventListener('click', () => this.showBlockDetails(block));
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${block.height}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        ${this.truncateHash(block.hash)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${this.formatTime(block.time)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${block.txCount}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        ${this.truncateHash(block.proposer)}
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load blocks:', error);
            this.showError('blocksTableBody', 'Failed to load blocks');
        }
    }

    async loadTransactions() {
        try {
            const response = await fetch(`${this.apiBase}/api/transactions?limit=20`);
            const data = await response.json();
            
            const tbody = document.getElementById('transactionsTableBody');
            tbody.innerHTML = '';

            // Helper to verify PQC via backend
            const verifyPqc = async (tx) => {
                try {
                    if (!this.pqc.enabled || !tx || !tx.signature || !tx.publicKey || !tx.body) return null;
                    const resp = await fetch(`${this.apiBase}/api/verify-tx`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ signer: { publicKey: tx.publicKey, algo: 'pqc/dilithium3' }, signature: tx.signature, body: tx.body })
                    });
                    if (!resp.ok) return { ok: false };
                    return await resp.json();
                } catch (e) {
                    return { ok: false };
                }
            };

            for (const tx of data.transactions) {
                const row = document.createElement('tr');
                row.classList.add('hover:bg-gray-50', 'cursor-pointer');
                row.addEventListener('click', () => this.showTransactionDetails(tx));
                
                const riskBadge = this.createRiskBadge(tx.ai_risk_score);
                let pqcBadge = '';
                if (this.pqc.enabled && tx.signature) {
                    // Optimistically show pending, then update
                    pqcBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800" title="Verifying PQC signature...">PQC …</span>';
                }
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        ${this.truncateHash(tx.hash)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${tx.height}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${this.formatTime(tx.time)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tx.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${tx.success ? 'Success' : 'Failed'}
                        </span>
                        <span class="pqc-badge-slot">${pqcBadge}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        ${riskBadge}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${tx.gasUsed ? tx.gasUsed.toLocaleString() : 'N/A'}
                    </td>
                `;
                
                tbody.appendChild(row);

                // After append, perform async verification and update badge
                if (this.pqc.enabled && tx.signature) {
                    verifyPqc(tx).then((res) => {
                        const slot = row.querySelector('.pqc-badge-slot');
                        if (!slot) return;
                        if (res && res.ok) {
                            slot.innerHTML = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800" title="PQC signature verified">PQC ✓</span>';
                        } else {
                            const reason = res?.reason || 'UNKNOWN';
                            const title = reason === 'PQC_DISABLED' ? 'PQC disabled' : reason === 'UNSUPPORTED_ALGO' ? 'Unsupported algorithm' : reason === 'MISSING_FIELDS' ? 'Missing fields' : reason === 'INVALID_ALGO' ? 'Invalid algorithm' : reason === 'INVALID_SIGNATURE' ? 'Invalid signature' : 'Verification error';
                            slot.innerHTML = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800" title="${title}">PQC ×</span>`;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.showError('transactionsTableBody', 'Failed to load transactions');
        }
    }

    async loadValidators() {
        try {
            const response = await fetch(`${this.apiBase}/api/validators`);
            const data = await response.json();
            
            const tbody = document.getElementById('validatorsTableBody');
            tbody.innerHTML = '';

            data.validators.forEach(validator => {
                const row = document.createElement('tr');
                row.classList.add('hover:bg-gray-50');
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        ${this.truncateHash(validator.address)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        ${this.truncateHash(validator.pubKey)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${validator.votingPower.toLocaleString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${validator.proposerPriority.toLocaleString()}
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load validators:', error);
            this.showError('validatorsTableBody', 'Failed to load validators');
        }
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        try {
            const response = await fetch(`${this.apiBase}/api/search/${encodeURIComponent(query)}`);
            const data = await response.json();
            
            this.showSearchResults(data);
        } catch (error) {
            console.error('Search failed:', error);
            this.showSearchResults({ query, results: [], error: 'Search failed' });
        }
    }

    showSearchResults(data) {
        const resultsDiv = document.getElementById('searchResults');
        
        if (data.results && data.results.length > 0) {
            resultsDiv.innerHTML = data.results.map(result => {
                switch (result.type) {
                    case 'block':
                        return `
                            <div class="border rounded p-4 mb-2">
                                <h4 class="font-semibold text-blue-600">Block ${result.data.height}</h4>
                                <p class="text-sm text-gray-600">Hash: ${result.data.hash}</p>
                                <p class="text-sm text-gray-600">Time: ${this.formatTime(result.data.time)}</p>
                                <p class="text-sm text-gray-600">Transactions: ${result.data.txCount}</p>
                            </div>
                        `;
                    case 'transaction':
                        const riskBadge = this.createRiskBadge(result.data.ai_risk_score);
                        return `
                            <div class="border rounded p-4 mb-2">
                                <h4 class="font-semibold text-blue-600">Transaction</h4>
                                <p class="text-sm text-gray-600">Hash: ${result.data.hash}</p>
                                <p class="text-sm text-gray-600">Height: ${result.data.height}</p>
                                <p class="text-sm text-gray-600">Status: ${result.data.success ? 'Success' : 'Failed'}</p>
                                <p class="text-sm text-gray-600">Risk: ${riskBadge}</p>
                            </div>
                        `;
                    case 'address':
                        return `
                            <div class="border rounded p-4 mb-2">
                                <h4 class="font-semibold text-blue-600">Address</h4>
                                <p class="text-sm text-gray-600">Address: ${result.data.address}</p>
                                <p class="text-sm text-gray-600">Balance: ${result.data.balance}</p>
                            </div>
                        `;
                    default:
                        return `<div class="border rounded p-4 mb-2">Unknown result type</div>`;
                }
            }).join('');
        } else {
            resultsDiv.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">No results found for "${data.query}"</p>
                    ${data.error ? `<p class="text-red-600 text-sm mt-2">${data.error}</p>` : ''}
                </div>
            `;
        }
        
        document.getElementById('searchModal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('searchModal').classList.add('hidden');
    }

    showBlockDetails(block) {
        alert(`Block Details:\nHeight: ${block.height}\nHash: ${block.hash}\nTime: ${block.time}\nTransactions: ${block.txCount}\nProposer: ${block.proposer}`);
    }

    showTransactionDetails(tx) {
        const riskInfo = tx.ai_risk_score ? 
            `\nRisk Score: ${(tx.ai_risk_score * 100).toFixed(1)}%\nRisk Level: ${this.getRiskLevel(tx.ai_risk_score)}` : 
            '\nRisk Score: Not available';
        
        alert(`Transaction Details:\nHash: ${tx.hash}\nHeight: ${tx.height}\nTime: ${tx.time}\nStatus: ${tx.success ? 'Success' : 'Failed'}\nGas Used: ${tx.gasUsed}${riskInfo}`);
    }

    createRiskBadge(riskScore) {
        if (riskScore === undefined || riskScore === null) {
            return '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded">N/A</span>';
        }
        
        const percentage = Math.round(riskScore * 100);
        const level = this.getRiskLevel(riskScore);
        
        let badgeClass = 'px-2 py-1 text-xs font-medium rounded ';
        if (level === 'LOW') {
            badgeClass += 'bg-green-100 text-green-700';
        } else if (level === 'MEDIUM') {
            badgeClass += 'bg-yellow-100 text-yellow-700';
        } else {
            badgeClass += 'bg-red-100 text-red-700';
        }
        
        return `<span class="${badgeClass}" title="Risk Score: ${percentage}%">${level} (${percentage}%)</span>`;
    }

    getRiskLevel(riskScore) {
        if (riskScore <= 0.33) return 'LOW';
        if (riskScore <= 0.66) return 'MEDIUM';
        return 'HIGH';
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-4 text-center">
                    <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                    <span class="text-red-600">${message}</span>
                </td>
            </tr>
        `;
    }

    truncateHash(hash, length = 12) {
        if (!hash || hash.length <= length) return hash;
        return `${hash.substring(0, length)}...`;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.autoRefreshInterval = setInterval(() => {
            this.loadNetworkStatus();
            if (this.currentTab === 'blocks' || this.currentTab === 'transactions') {
                this.loadTabData(this.currentTab);
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
}

// Initialize the explorer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DytallixExplorer();
});

// Add CSS for active tab
const style = document.createElement('style');
style.textContent = `
    .tab-button.active {
        border-color: #3B82F6 !important;
        color: #3B82F6 !important;
    }
    .tab-button:not(.active) {
        border-color: transparent;
        color: #6B7280;
    }
    .tab-button:not(.active):hover {
        color: #374151;
        border-color: #D1D5DB;
    }
`;
document.head.appendChild(style);