const fs = require('fs').promises;
const path = require('path');

class RuleSetManager {
  constructor({ configPath }) {
    this.configPath = configPath;
    this.ruleSets = new Map();
    this.rules = new Map();
  }

  async initialize() {
    console.log('Initializing Rule Set Manager...');
    
    try {
      // Load default rule sets
      await this.loadDefaultRuleSets();
      
      // Load custom rule sets from config file if it exists
      await this.loadConfigFile();
      
      console.log(`Loaded ${this.ruleSets.size} rule sets with ${this.rules.size} total rules`);
    } catch (error) {
      console.error('Failed to initialize Rule Set Manager:', error);
      throw error;
    }
  }

  async loadDefaultRuleSets() {
    // Default rule set for general smart contracts
    const defaultRuleSet = {
      name: 'default',
      description: 'Standard security rules for smart contracts',
      version: '1.0.0',
      rules: [
        {
          id: 'min_security_score',
          type: 'min_score_threshold',
          description: 'Contract must meet minimum security score',
          severity: 'high',
          penalty: 20,
          config: {
            category: 'static',
            threshold: 60,
          },
        },
        {
          id: 'max_critical_vulnerabilities',
          type: 'max_vulnerability_count',
          description: 'No critical vulnerabilities allowed',
          severity: 'critical',
          penalty: 30,
          config: {
            maxCount: 0,
          },
        },
        {
          id: 'access_control_required',
          type: 'access_control_check',
          description: 'Contract must have proper access controls',
          severity: 'high',
          penalty: 15,
          config: {},
        },
        {
          id: 'complexity_limit',
          type: 'complexity_limit',
          description: 'Contract complexity must be reasonable',
          severity: 'medium',
          penalty: 10,
          config: {
            maxComplexity: 15,
          },
        },
        {
          id: 'documentation_coverage',
          type: 'documentation_requirement',
          description: 'Contract should have adequate documentation',
          severity: 'low',
          penalty: 5,
          config: {
            minCoverage: 30,
          },
        },
      ],
    };

    // DeFi-specific rule set
    const defiRuleSet = {
      name: 'defi',
      description: 'Enhanced security rules for DeFi contracts',
      version: '1.0.0',
      rules: [
        ...defaultRuleSet.rules,
        {
          id: 'reentrancy_protection',
          type: 'required_patterns',
          description: 'DeFi contracts must have reentrancy protection',
          severity: 'critical',
          penalty: 25,
          config: {
            patterns: [
              {
                name: 'reentrancy_guard',
                regex: 'nonReentrant|ReentrancyGuard|_status',
              },
            ],
          },
        },
        {
          id: 'no_tx_origin',
          type: 'forbidden_patterns',
          description: 'tx.origin usage is forbidden in DeFi',
          severity: 'high',
          penalty: 20,
          config: {
            patterns: [
              {
                name: 'tx_origin',
                regex: 'tx\\.origin',
              },
            ],
          },
        },
        {
          id: 'oracle_usage',
          type: 'required_patterns',
          description: 'Price oracles should be properly implemented',
          severity: 'medium',
          penalty: 10,
          config: {
            warningOnly: true,
            patterns: [
              {
                name: 'oracle_interface',
                regex: 'AggregatorV3Interface|oracle|price',
              },
            ],
          },
        },
      ],
    };

    // NFT-specific rule set
    const nftRuleSet = {
      name: 'nft',
      description: 'Security rules for NFT contracts',
      version: '1.0.0',
      rules: [
        ...defaultRuleSet.rules.filter(rule => rule.id !== 'complexity_limit'), // Less strict on complexity
        {
          id: 'erc721_compliance',
          type: 'required_patterns',
          description: 'NFT contracts must implement ERC721',
          severity: 'high',
          penalty: 15,
          config: {
            patterns: [
              {
                name: 'erc721_interface',
                regex: 'ERC721|IERC721|_safeMint|_transfer',
              },
            ],
          },
        },
        {
          id: 'metadata_security',
          type: 'required_patterns',
          description: 'Metadata handling should be secure',
          severity: 'medium',
          penalty: 8,
          config: {
            warningOnly: true,
            patterns: [
              {
                name: 'metadata_validation',
                regex: 'tokenURI|baseURI|_setTokenURI',
              },
            ],
          },
        },
      ],
    };

    // Store rule sets
    this.ruleSets.set('default', defaultRuleSet);
    this.ruleSets.set('defi', defiRuleSet);
    this.ruleSets.set('nft', nftRuleSet);

    // Index all rules
    this.indexRules();
  }

  async loadConfigFile() {
    try {
      const configExists = await this.fileExists(this.configPath);
      if (!configExists) {
        console.log('Config file not found, using default rules only');
        return;
      }

      const configData = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);

      if (config.ruleSets) {
        for (const ruleSet of config.ruleSets) {
          this.ruleSets.set(ruleSet.name, ruleSet);
        }
      }

      this.indexRules();
    } catch (error) {
      console.error('Failed to load config file:', error);
      // Continue with default rules
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  indexRules() {
    this.rules.clear();
    
    for (const ruleSet of this.ruleSets.values()) {
      for (const rule of ruleSet.rules) {
        this.rules.set(rule.id, {
          ...rule,
          ruleSet: ruleSet.name,
        });
      }
    }
  }

  async getRuleSet(name) {
    return this.ruleSets.get(name) || null;
  }

  async getAvailableRuleSets() {
    return Array.from(this.ruleSets.values()).map(ruleSet => ({
      name: ruleSet.name,
      description: ruleSet.description,
      version: ruleSet.version,
      rulesCount: ruleSet.rules.length,
    }));
  }

  async getAllRules() {
    return Array.from(this.rules.values());
  }

  async getRule(id) {
    return this.rules.get(id) || null;
  }

  getTotalRulesCount() {
    return this.rules.size;
  }

  async addRuleSet(ruleSet) {
    // Validate rule set structure
    if (!ruleSet.name || !ruleSet.rules || !Array.isArray(ruleSet.rules)) {
      throw new Error('Invalid rule set structure');
    }

    this.ruleSets.set(ruleSet.name, ruleSet);
    this.indexRules();

    // Save to config file
    await this.saveConfig();

    return { success: true, ruleSetName: ruleSet.name };
  }

  async removeRuleSet(name) {
    if (name === 'default') {
      throw new Error('Cannot remove default rule set');
    }

    const removed = this.ruleSets.delete(name);
    if (removed) {
      this.indexRules();
      await this.saveConfig();
    }

    return { success: removed };
  }

  async saveConfig() {
    try {
      // Create config directory if it doesn't exist
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Filter out default rule sets from saved config
      const customRuleSets = Array.from(this.ruleSets.values())
        .filter(ruleSet => !['default', 'defi', 'nft'].includes(ruleSet.name));

      const config = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        ruleSets: customRuleSets,
      };

      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      console.log('Rule sets configuration saved');
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  async getStatistics() {
    const stats = {
      totalRuleSets: this.ruleSets.size,
      totalRules: this.rules.size,
      rulesBySeverity: {},
      rulesByType: {},
    };

    // Calculate statistics
    for (const rule of this.rules.values()) {
      // By severity
      stats.rulesBySeverity[rule.severity] = (stats.rulesBySeverity[rule.severity] || 0) + 1;
      
      // By type
      stats.rulesByType[rule.type] = (stats.rulesByType[rule.type] || 0) + 1;
    }

    return stats;
  }
}

module.exports = { RuleSetManager };