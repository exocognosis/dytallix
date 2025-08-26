/**
 * Configuration Loader
 * Loads and validates PulseScan configuration from YAML files and environment variables
 */

import fs from 'fs';
import path from 'path';

class ConfigLoader {
  constructor() {
    this.defaults = {
      storage: {
        type: 'memory',
        maxPoints: 10000,
        retentionMs: 24 * 60 * 60 * 1000
      },
      detectors: {
        tx_spike: {
          enabled: true,
          windowSize: 300,
          zThreshold: 4.0,
          ewmaAlpha: 0.1,
          ewmaDeltaThreshold: 0.5,
          minRate: 10,
          cooldownMs: 60000
        },
        validator_downtime: {
          enabled: true,
          missThreshold: 3,
          criticalMissThreshold: 10,
          blockWindow: 100,
          cooldownMs: 300000
        },
        double_sign: {
          enabled: true,
          lookbackBlocks: 1000,
          slashingWindow: 100
        }
      },
      collectors: {
        mempool: {
          enabled: true,
          pollInterval: 1000,
          batchSize: 100,
          flushInterval: 5000,
          rpcUrl: 'http://localhost:26657'
        },
        block: {
          enabled: true,
          pollInterval: 5000,
          batchSize: 50,
          flushInterval: 10000,
          rpcUrl: 'http://localhost:26657'
        }
      },
      anomalies: {
        maxRecent: 1000,
        retentionMs: 24 * 60 * 60 * 1000
      },
      alerts: {
        minSeverity: 'medium',
        webhook: {
          enabled: false,
          url: null,
          timeout: 5000,
          headers: {}
        },
        slack: {
          enabled: false,
          webhookUrl: null,
          channel: '#alerts',
          username: 'PulseScan',
          timeout: 5000
        }
      }
    };
  }

  /**
   * Load configuration from file and environment variables
   */
  load(configPath = null) {
    let config = JSON.parse(JSON.stringify(this.defaults));

    // Try to load from YAML file if provided or found
    if (configPath) {
      config = this.loadFromFile(configPath, config);
    } else {
      // Try default locations
      const defaultPaths = [
        './pulsescan.config.yaml',
        './backend/pulsescan/pulsescan.config.yaml',
        '../backend/pulsescan/pulsescan.config.yaml'
      ];

      for (const defaultPath of defaultPaths) {
        if (fs.existsSync(defaultPath)) {
          config = this.loadFromFile(defaultPath, config);
          break;
        }
      }
    }

    // Override with environment variables
    config = this.loadFromEnvironment(config);

    // Validate configuration
    this.validate(config);

    console.log('[ConfigLoader] Configuration loaded successfully');
    return config;
  }

  /**
   * Load configuration from YAML file
   */
  loadFromFile(filePath, baseConfig) {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`[ConfigLoader] Config file not found: ${filePath}`);
        return baseConfig;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Simple YAML parsing for basic structure
      // In production, consider using a proper YAML library
      const yamlConfig = this.parseSimpleYaml(fileContent);
      
      // Deep merge with base config
      const merged = this.deepMerge(baseConfig, yamlConfig);
      
      console.log(`[ConfigLoader] Loaded configuration from ${filePath}`);
      return merged;
      
    } catch (error) {
      console.error(`[ConfigLoader] Error loading config file ${filePath}:`, error.message);
      return baseConfig;
    }
  }

  /**
   * Simple YAML parser for basic configuration structure
   * Note: This is a minimal implementation. For complex YAML, use a proper library.
   */
  parseSimpleYaml(yamlContent) {
    const config = {};
    const lines = yamlContent.split('\n');
    let currentSection = config;
    let sectionStack = [config];
    let lastIndent = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Calculate indentation
      const indent = line.length - line.trimStart().length;
      
      // Handle section changes
      if (indent < lastIndent) {
        // Moving back up the hierarchy
        const levels = Math.floor((lastIndent - indent) / 2);
        for (let i = 0; i < levels; i++) {
          sectionStack.pop();
        }
        currentSection = sectionStack[sectionStack.length - 1];
      }
      
      if (trimmed.endsWith(':')) {
        // New section
        const sectionName = trimmed.slice(0, -1);
        currentSection[sectionName] = {};
        sectionStack.push(currentSection[sectionName]);
        currentSection = currentSection[sectionName];
      } else if (trimmed.includes(':')) {
        // Key-value pair
        const [key, ...valueParts] = trimmed.split(':');
        let value = valueParts.join(':').trim();
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Parse value types
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (/^\d+$/.test(value)) value = parseInt(value);
        else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
        
        currentSection[key.trim()] = value;
      }
      
      lastIndent = indent;
    }
    
    return config;
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(config) {
    const envOverrides = {
      // Storage
      'PULSESCAN_STORAGE_TYPE': 'storage.type',
      'PULSESCAN_STORAGE_MAX_POINTS': 'storage.maxPoints',
      'INFLUX_URL': 'storage.influx.url',
      'INFLUX_TOKEN': 'storage.influx.token',
      
      // Collectors  
      'PULSESCAN_RPC_URL': ['collectors.mempool.rpcUrl', 'collectors.block.rpcUrl'],
      'PULSESCAN_MEMPOOL_ENABLED': 'collectors.mempool.enabled',
      'PULSESCAN_BLOCK_ENABLED': 'collectors.block.enabled',
      
      // Detectors
      'PULSESCAN_TX_SPIKE_ENABLED': 'detectors.tx_spike.enabled',
      'PULSESCAN_TX_SPIKE_THRESHOLD': 'detectors.tx_spike.zThreshold',
      'PULSESCAN_VALIDATOR_DOWNTIME_ENABLED': 'detectors.validator_downtime.enabled',
      'PULSESCAN_DOUBLE_SIGN_ENABLED': 'detectors.double_sign.enabled',
      
      // Alerting
      'PULSESCAN_ALERTS_MIN_SEVERITY': 'alerts.minSeverity',
      'WEBHOOK_URL': 'alerts.webhook.url',
      'WEBHOOK_TOKEN': 'alerts.webhook.headers.Authorization',
      'SLACK_WEBHOOK_URL': 'alerts.slack.webhookUrl',
      'SLACK_CHANNEL': 'alerts.slack.channel'
    };

    for (const [envVar, configPath] of Object.entries(envOverrides)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        if (Array.isArray(configPath)) {
          // Set multiple paths
          configPath.forEach(path => this.setNestedValue(config, path, envValue));
        } else {
          this.setNestedValue(config, configPath, envValue);
        }
      }
    }

    // Enable alerting if URLs are provided
    if (process.env.WEBHOOK_URL) {
      config.alerts.webhook.enabled = true;
    }
    if (process.env.SLACK_WEBHOOK_URL) {
      config.alerts.slack.enabled = true;
    }

    return config;
  }

  /**
   * Set nested object value using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // Convert string values to appropriate types
    if (typeof value === 'string') {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^\d+$/.test(value)) value = parseInt(value);
      else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Validate configuration
   */
  validate(config) {
    const errors = [];

    // Validate storage type
    if (!['memory', 'influx'].includes(config.storage.type)) {
      errors.push('Invalid storage.type. Must be "memory" or "influx"');
    }

    // Validate detector thresholds
    if (config.detectors.tx_spike.zThreshold <= 0) {
      errors.push('detectors.tx_spike.zThreshold must be > 0');
    }

    if (config.detectors.validator_downtime.missThreshold <= 0) {
      errors.push('detectors.validator_downtime.missThreshold must be > 0');
    }

    // Validate severity levels
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(config.alerts.minSeverity)) {
      errors.push('alerts.minSeverity must be one of: low, medium, high, critical');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }
}

export { ConfigLoader };