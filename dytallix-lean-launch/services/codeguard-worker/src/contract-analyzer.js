const { StaticAnalyzer } = require('./analyzers/static-analyzer');
const { DynamicAnalyzer } = require('./analyzers/dynamic-analyzer');
const { CodeQualityAnalyzer } = require('./analyzers/quality-analyzer');
const axios = require('axios');

class ContractAnalyzer {
  constructor({ aiModelEndpoint, staticAnalyzerEnabled = true, dynamicAnalyzerEnabled = true }) {
    this.aiModelEndpoint = aiModelEndpoint;
    this.staticEnabled = staticAnalyzerEnabled;
    this.dynamicEnabled = dynamicAnalyzerEnabled;
    
    this.staticAnalyzer = new StaticAnalyzer();
    this.dynamicAnalyzer = new DynamicAnalyzer();
    this.qualityAnalyzer = new CodeQualityAnalyzer();
  }

  async analyzeContract({ contractAddress, codeHash, sourceCode, bytecode }) {
    const startTime = Date.now();
    const results = {
      contractAddress,
      codeHash,
      analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: new Date().toISOString(),
    };

    try {
      // Parallel analysis execution
      const analysisPromises = [];

      if (this.staticEnabled && sourceCode) {
        analysisPromises.push(
          this.performStaticAnalysis(sourceCode).then(result => ({ static: result }))
        );
      }

      if (this.dynamicEnabled && bytecode) {
        analysisPromises.push(
          this.performDynamicAnalysis(bytecode).then(result => ({ dynamic: result }))
        );
      }

      if (sourceCode) {
        analysisPromises.push(
          this.performQualityAnalysis(sourceCode).then(result => ({ quality: result }))
        );
      }

      // Wait for all analyses to complete
      const analysisResults = await Promise.allSettled(analysisPromises);
      
      // Combine results
      for (const result of analysisResults) {
        if (result.status === 'fulfilled') {
          Object.assign(results, result.value);
        } else {
          console.error('Analysis failed:', result.reason);
        }
      }

      // AI model inference if available
      if (this.aiModelEndpoint) {
        try {
          results.aiAnalysis = await this.performAIAnalysis({
            sourceCode,
            bytecode,
            staticResults: results.static,
            dynamicResults: results.dynamic,
          });
        } catch (error) {
          console.error('AI analysis failed:', error);
          results.aiAnalysis = { error: 'AI analysis unavailable' };
        }
      }

      // Calculate overall scores
      results.scores = this.calculateScores(results);
      results.completedAt = new Date().toISOString();
      results.durationMs = Date.now() - startTime;

      return results;
    } catch (error) {
      console.error('Contract analysis failed:', error);
      throw error;
    }
  }

  async performStaticAnalysis(sourceCode) {
    try {
      return await this.staticAnalyzer.analyze(sourceCode);
    } catch (error) {
      console.error('Static analysis failed:', error);
      return {
        error: 'Static analysis failed',
        issues: [],
        score: 0,
      };
    }
  }

  async performDynamicAnalysis(bytecode) {
    try {
      return await this.dynamicAnalyzer.analyze(bytecode);
    } catch (error) {
      console.error('Dynamic analysis failed:', error);
      return {
        error: 'Dynamic analysis failed',
        vulnerabilities: [],
        score: 0,
      };
    }
  }

  async performQualityAnalysis(sourceCode) {
    try {
      return await this.qualityAnalyzer.analyze(sourceCode);
    } catch (error) {
      console.error('Quality analysis failed:', error);
      return {
        error: 'Quality analysis failed',
        metrics: {},
        score: 0,
      };
    }
  }

  async performAIAnalysis({ sourceCode, bytecode, staticResults, dynamicResults }) {
    if (!this.aiModelEndpoint) {
      throw new Error('AI model endpoint not configured');
    }

    const payload = {
      sourceCode,
      bytecode: bytecode ? bytecode.substring(0, 1000) : null, // Limit size
      context: {
        staticIssues: staticResults?.issues?.slice(0, 10) || [],
        dynamicVulns: dynamicResults?.vulnerabilities?.slice(0, 10) || [],
      },
    };

    try {
      const response = await axios.post(`${this.aiModelEndpoint}/analyze`, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('AI model service unavailable');
      }
      throw error;
    }
  }

  calculateScores(results) {
    const scores = {
      static: results.static?.score || 0,
      dynamic: results.dynamic?.score || 0,
      quality: results.quality?.score || 0,
      ai: results.aiAnalysis?.score || 0,
    };

    // Weighted overall score
    const weights = {
      static: 0.35,
      dynamic: 0.35,
      quality: 0.20,
      ai: 0.10,
    };

    scores.overall = Math.round(
      scores.static * weights.static +
      scores.dynamic * weights.dynamic +
      scores.quality * weights.quality +
      scores.ai * weights.ai
    );

    scores.confidence = this.calculateConfidence(results);

    return scores;
  }

  calculateConfidence(results) {
    let confidence = 100;
    
    // Reduce confidence for missing analysis types
    if (!results.static) confidence -= 25;
    if (!results.dynamic) confidence -= 25;
    if (!results.quality) confidence -= 15;
    if (!results.aiAnalysis) confidence -= 10;

    // Reduce confidence for analysis errors
    if (results.static?.error) confidence -= 20;
    if (results.dynamic?.error) confidence -= 20;
    if (results.quality?.error) confidence -= 10;
    if (results.aiAnalysis?.error) confidence -= 5;

    return Math.max(0, confidence);
  }

  async getAvailableModels() {
    const models = [
      {
        name: 'static-analyzer',
        version: '1.0.0',
        type: 'static',
        enabled: this.staticEnabled,
      },
      {
        name: 'dynamic-analyzer',
        version: '1.0.0',
        type: 'dynamic',
        enabled: this.dynamicEnabled,
      },
      {
        name: 'quality-analyzer',
        version: '1.0.0',
        type: 'quality',
        enabled: true,
      },
    ];

    if (this.aiModelEndpoint) {
      try {
        const response = await axios.get(`${this.aiModelEndpoint}/models`, { timeout: 5000 });
        models.push(...response.data.models);
      } catch (error) {
        console.error('Failed to get AI models:', error);
      }
    }

    return models;
  }

  isStaticEnabled() {
    return this.staticEnabled;
  }

  isDynamicEnabled() {
    return this.dynamicEnabled;
  }
}

module.exports = { ContractAnalyzer };