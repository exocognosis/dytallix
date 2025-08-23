class DytallixExplorer {
    constructor() {
        this.apiBase = window.location.origin;
        this.currentTab = 'blocks';
        this.currentPage = 'blocks';
        this.autoRefreshInterval = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupTabSwitching();
        this.setupModals();
        await this.loadInitialData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Account search
        document.getElementById('accountSearchBtn').addEventListener('click', () => this.handleAccountSearch());
        document.getElementById('accountSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAccountSearch();
        });

        // Modal close
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('searchModal').addEventListener('click', (e) => {
            if (e.target.id === 'searchModal') this.closeModal();
        });
    }

    setupNavigation() {
        // Main navigation links
        const navLinks = ['navBlocks', 'navGovernance', 'navContracts', 'navAccounts'];
        
        navLinks.forEach(navId => {
            document.getElementById(navId).addEventListener('click', (e) => {
                e.preventDefault();
                const pageName = navId.replace('nav', '').toLowerCase();
                this.switchPage(pageName);
            });
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

    setupModals() {
        // Create proposal modal
        document.getElementById('createProposalBtn').addEventListener('click', () => {
            document.getElementById('createProposalModal').classList.remove('hidden');
        });
        
        document.getElementById('closeProposalModal').addEventListener('click', () => {
            document.getElementById('createProposalModal').classList.add('hidden');
        });
        
        document.getElementById('cancelProposal').addEventListener('click', () => {
            document.getElementById('createProposalModal').classList.add('hidden');
        });

        document.getElementById('proposalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateProposal();
        });

        // Deploy contract modal
        document.getElementById('deployContractBtn').addEventListener('click', () => {
            document.getElementById('deployContractModal').classList.remove('hidden');
        });
        
        document.getElementById('closeContractModal').addEventListener('click', () => {
            document.getElementById('deployContractModal').classList.add('hidden');
        });
        
        document.getElementById('cancelContract').addEventListener('click', () => {
            document.getElementById('deployContractModal').classList.add('hidden');
        });

        document.getElementById('contractForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDeployContract();
        });
    }

    switchPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('bg-blue-700');
        });
        document.getElementById(`nav${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`).classList.add('bg-blue-700');

        // Update page content
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.add('hidden');
        });
        document.getElementById(`${pageName}Page`).classList.remove('hidden');

        this.currentPage = pageName;
        this.loadPageData(pageName);
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

    async loadPageData(pageName) {
        switch (pageName) {
            case 'governance':
                await this.loadGovernanceProposals();
                break;
            case 'contracts':
                await this.loadContracts();
                break;
            case 'accounts':
                // Account page starts empty
                break;
            case 'blocks':
                await this.loadTabData(this.currentTab);
                break;
        }
    }

    async loadNetworkStatus() {
        try {
            const response = await fetch(`${this.apiBase}/api/status`);
            const status = await response.json();

            document.getElementById('latestBlock').textContent = `Block: ${status.latestHeight}`;
            document.getElementById('statsLatestBlock').textContent = status.latestHeight;
            document.getElementById('statsChainId').textContent = status.chainId;
            
            // Load validators count
            const validatorsResponse = await fetch(`${this.apiBase}/api/validators`);
            const validatorsData = await validatorsResponse.json();
            document.getElementById('statsValidators').textContent = validatorsData.total;
            
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
            const response = await fetch(`${this.apiBase}/api/blocks?limit=10`);
            const data = await response.json();
            
            const tableBody = document.getElementById('blocksTableBody');
            tableBody.innerHTML = '';
            
            data.blocks.forEach(block => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${block.height}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${this.truncateHash(block.hash)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatTime(block.time)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${block.txCount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${this.truncateAddress(block.proposer)}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load blocks:', error);
        }
    }

    async loadTransactions() {
        try {
            const response = await fetch(`${this.apiBase}/api/transactions?limit=10`);
            const data = await response.json();
            
            const tableBody = document.getElementById('transactionsTableBody');
            tableBody.innerHTML = '';
            
            data.transactions.forEach(tx => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                const riskLevel = this.getRiskLevel(tx.ai_risk_score);
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${this.truncateHash(tx.hash)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tx.height}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatTime(tx.time)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${tx.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${tx.success ? 'Success' : 'Failed'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tx.gasUsed?.toLocaleString() || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${riskLevel.class}">
                            ${riskLevel.text}
                        </span>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    }

    async loadValidators() {
        try {
            const response = await fetch(`${this.apiBase}/api/validators`);
            const data = await response.json();
            
            const tableBody = document.getElementById('validatorsTableBody');
            tableBody.innerHTML = '';
            
            data.validators.forEach(validator => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${this.truncateAddress(validator.address)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${this.truncateHash(validator.pubKey)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${validator.votingPower}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${validator.proposerPriority}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load validators:', error);
        }
    }

    async loadGovernanceProposals() {
        try {
            const response = await fetch(`${this.apiBase}/api/governance/proposals`);
            const data = await response.json();
            
            const container = document.getElementById('proposalsContainer');
            container.innerHTML = '';
            
            if (data.proposals.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500">No proposals found</div>';
                return;
            }
            
            data.proposals.forEach(proposal => {
                const proposalCard = document.createElement('div');
                proposalCard.className = 'border border-gray-200 rounded-lg p-6 mb-4 hover:shadow-lg transition-shadow';
                
                const statusClass = this.getProposalStatusClass(proposal.status);
                const totalVotes = proposal.votes.yes + proposal.votes.no + proposal.votes.abstain;
                const turnout = totalVotes > 0 ? ((totalVotes / 1000000) * 100).toFixed(1) : '0.0'; // Assume 1M total possible votes
                
                proposalCard.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">${proposal.title}</h3>
                            <p class="text-gray-600 mb-3">${proposal.description}</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${statusClass}">
                            ${proposal.status.toUpperCase()}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div class="text-center">
                            <div class="text-sm text-gray-500">Yes Votes</div>
                            <div class="text-lg font-semibold text-green-600">${proposal.votes.yes}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm text-gray-500">No Votes</div>
                            <div class="text-lg font-semibold text-red-600">${proposal.votes.no}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm text-gray-500">Abstain</div>
                            <div class="text-lg font-semibold text-gray-600">${proposal.votes.abstain}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm text-gray-500">Turnout</div>
                            <div class="text-lg font-semibold text-blue-600">${turnout}%</div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-sm text-gray-500">
                        <span>Proposal #${proposal.id}</span>
                        <span>Created: ${this.formatTime(proposal.createdAt)}</span>
                    </div>
                `;
                
                container.appendChild(proposalCard);
            });
        } catch (error) {
            console.error('Failed to load governance proposals:', error);
            document.getElementById('proposalsContainer').innerHTML = 
                '<div class="text-center text-red-500">Failed to load proposals</div>';
        }
    }

    async loadContracts() {
        try {
            const response = await fetch(`${this.apiBase}/api/contracts`);
            const data = await response.json();
            
            const container = document.getElementById('contractsContainer');
            container.innerHTML = '';
            
            if (data.contracts.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500">No contracts deployed yet</div>';
                return;
            }
            
            data.contracts.forEach(contract => {
                const contractCard = document.createElement('div');
                contractCard.className = 'border border-gray-200 rounded-lg p-6 mb-4 hover:shadow-lg transition-shadow';
                
                contractCard.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-900 mb-2 font-mono">${contract.address}</h3>
                            <p class="text-gray-600 mb-3">Creator: <span class="font-mono">${this.truncateAddress(contract.creator)}</span></p>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-500">Gas Last Used</div>
                            <div class="text-lg font-semibold text-blue-600">${contract.gasLast?.toLocaleString() || 'N/A'}</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <div class="text-sm text-gray-500">Executions</div>
                            <div class="text-lg font-semibold">${contract.executionCount}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-500">Created</div>
                            <div class="text-lg font-semibold">${this.formatTime(contract.createdAt)}</div>
                        </div>
                    </div>
                `;
                
                container.appendChild(contractCard);
            });
        } catch (error) {
            console.error('Failed to load contracts:', error);
            document.getElementById('contractsContainer').innerHTML = 
                '<div class="text-center text-red-500">Failed to load contracts</div>';
        }
    }

    async handleAccountSearch() {
        const address = document.getElementById('accountSearchInput').value.trim();
        if (!address) return;
        
        if (!address.startsWith('dyt')) {
            alert('Please enter a valid Dytallix address starting with "dyt"');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/api/accounts/${address}`);
            if (!response.ok) {
                throw new Error('Account not found');
            }
            
            const data = await response.json();
            this.displayAccountDetails(data);
        } catch (error) {
            console.error('Failed to load account:', error);
            document.getElementById('accountDetailsContainer').innerHTML = 
                '<div class="text-center text-red-500">Failed to load account details</div>';
        }
    }

    displayAccountDetails(account) {
        const container = document.getElementById('accountDetailsContainer');
        container.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
                    <div class="mb-4">
                        <div class="text-sm text-gray-500">Address</div>
                        <div class="text-lg font-mono font-semibold text-gray-900">${account.address}</div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">${account.balances.DGT}</div>
                            <div class="text-sm text-gray-500">DGT Balance</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${account.balances.DRT}</div>
                            <div class="text-sm text-gray-500">DRT Balance</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600">${account.txCount}</div>
                            <div class="text-sm text-gray-500">Transactions</div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Staking Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-indigo-600">${account.staking.staked}</div>
                            <div class="text-sm text-gray-500">DGT Staked</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-yellow-600">${account.staking.pendingRewards}</div>
                            <div class="text-sm text-gray-500">Pending Rewards</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${account.staking.apr}</div>
                            <div class="text-sm text-gray-500">APR</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async handleCreateProposal() {
        const title = document.getElementById('proposalTitle').value;
        const description = document.getElementById('proposalDescription').value;
        const submitter = document.getElementById('proposalSubmitter').value || 'dyt1anonymous';
        
        try {
            const response = await fetch(`${this.apiBase}/api/governance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    submitter,
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to create proposal');
            }
            
            const result = await response.json();
            console.log('Proposal created:', result);
            
            // Close modal and refresh proposals
            document.getElementById('createProposalModal').classList.add('hidden');
            document.getElementById('proposalForm').reset();
            
            if (this.currentPage === 'governance') {
                await this.loadGovernanceProposals();
            }
            
            alert('Proposal created successfully!');
        } catch (error) {
            console.error('Failed to create proposal:', error);
            alert('Failed to create proposal. Please try again.');
        }
    }

    async handleDeployContract() {
        const code = document.getElementById('contractCode').value;
        const initMsg = document.getElementById('contractInitMsg').value;
        const from = document.getElementById('contractFrom').value;
        
        try {
            let parsedInitMsg = {};
            if (initMsg.trim()) {
                parsedInitMsg = JSON.parse(initMsg);
            }
            
            const response = await fetch(`${this.apiBase}/api/contracts/deploy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceCode: code,
                    initMsg: parsedInitMsg,
                    from,
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to deploy contract');
            }
            
            const result = await response.json();
            console.log('Contract deployed:', result);
            
            // Close modal and refresh contracts
            document.getElementById('deployContractModal').classList.add('hidden');
            document.getElementById('contractForm').reset();
            
            if (this.currentPage === 'contracts') {
                await this.loadContracts();
            }
            
            alert(`Contract deployed successfully to ${result.address}!`);
        } catch (error) {
            console.error('Failed to deploy contract:', error);
            alert('Failed to deploy contract. Please check your input and try again.');
        }
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        try {
            const response = await fetch(`${this.apiBase}/api/search/${encodeURIComponent(query)}`);
            const data = await response.json();
            
            this.displaySearchResults(data);
            document.getElementById('searchModal').classList.remove('hidden');
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    displaySearchResults(data) {
        const container = document.getElementById('searchResults');
        
        if (!data.results || data.results.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No results found</p>';
            return;
        }

        container.innerHTML = data.results.map(result => `
            <div class="border-b border-gray-200 last:border-b-0 py-3">
                <div class="font-medium">${result.type}</div>
                <div class="text-sm text-gray-600">${result.summary}</div>
            </div>
        `).join('');
    }

    closeModal() {
        document.getElementById('searchModal').classList.add('hidden');
    }

    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentPage === 'blocks') {
                this.loadTabData(this.currentTab);
            }
            this.loadNetworkStatus();
        }, 10000); // Refresh every 10 seconds
    }

    // Utility methods
    truncateHash(hash) {
        if (!hash) return 'N/A';
        return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
    }

    truncateAddress(address) {
        if (!address) return 'N/A';
        return `${address.slice(0, 10)}...${address.slice(-6)}`;
    }

    formatTime(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    }

    getRiskLevel(score) {
        if (!score) return { text: 'Unknown', class: 'bg-gray-100 text-gray-800' };
        
        if (score < 0.3) {
            return { text: 'Low', class: 'bg-green-100 text-green-800' };
        } else if (score < 0.7) {
            return { text: 'Medium', class: 'bg-yellow-100 text-yellow-800' };
        } else {
            return { text: 'High', class: 'bg-red-100 text-red-800' };
        }
    }

    getProposalStatusClass(status) {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'passed':
                return 'bg-blue-100 text-blue-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }
}

// Initialize the explorer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DytallixExplorer();
});