const { SigningCosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');

class ContractClient {
  constructor({ rpcEndpoint, contractAddress, mnemonic }) {
    this.rpcEndpoint = rpcEndpoint;
    this.contractAddress = contractAddress;
    this.mnemonic = mnemonic || process.env.CODEGUARD_MNEMONIC;
    this.client = null;
    this.senderAddress = null;
  }

  async initialize() {
    if (this.client) return;

    try {
      // Create wallet from mnemonic
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
        this.mnemonic || 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        { prefix: 'dytallix' }
      );

      // Get first account
      const [firstAccount] = await wallet.getAccounts();
      this.senderAddress = firstAccount.address;

      // Create signing client
      this.client = await SigningCosmWasmClient.connectWithSigner(
        this.rpcEndpoint,
        wallet,
        { gasPrice: '0.025udatt' }
      );

      console.log(`Contract client initialized for ${this.senderAddress}`);
    } catch (error) {
      console.error('Failed to initialize contract client:', error);
      throw error;
    }
  }

  async submitScan({ contractAddress, codeHash, securityScore, vulnerabilityReport, modelVersion }) {
    await this.initialize();

    const executeMsg = {
      submit_scan: {
        contract_address: contractAddress,
        code_hash: codeHash,
        security_score: securityScore.toString(),
        vulnerability_report: vulnerabilityReport,
        model_version: modelVersion,
        pq_signature: 'demo_signature_' + Date.now(), // TODO: Implement real PQ signature
      },
    };

    try {
      const result = await this.client.execute(
        this.senderAddress,
        this.contractAddress,
        executeMsg,
        'auto'
      );

      console.log('Scan submitted to contract:', result.transactionHash);
      return result;
    } catch (error) {
      console.error('Failed to submit scan to contract:', error);
      throw error;
    }
  }

  async getScan(contractAddress) {
    await this.initialize();

    const queryMsg = {
      get_scan: {
        contract_address: contractAddress,
      },
    };

    try {
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      return result;
    } catch (error) {
      console.error('Failed to query scan from contract:', error);
      throw error;
    }
  }

  async verifyContract(contractAddress) {
    await this.initialize();

    const queryMsg = {
      verify_contract: {
        contract_address: contractAddress,
      },
    };

    try {
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      return result;
    } catch (error) {
      console.error('Failed to verify contract:', error);
      throw error;
    }
  }

  async getConfig() {
    await this.initialize();

    const queryMsg = { config: {} };

    try {
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      return result;
    } catch (error) {
      console.error('Failed to get contract config:', error);
      throw error;
    }
  }

  async getScanStats() {
    await this.initialize();

    const queryMsg = { scan_stats: {} };

    try {
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      return result;
    } catch (error) {
      console.error('Failed to get scan stats:', error);
      throw error;
    }
  }
}

module.exports = { ContractClient };