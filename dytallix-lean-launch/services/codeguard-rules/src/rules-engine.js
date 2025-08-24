const Joi = require('joi');
const _ = require('lodash');

class RulesEngine {
  constructor({ ruleSetManager, strictMode = false }) {
    this.ruleSetManager = ruleSetManager;
    this.strictMode = strictMode;
    this.customRules = new Map();
    this.evaluationHistory = [];
  }

  async initialize() {
    console.log('Initializing Rules Engine...');
    // Load custom rules from storage if needed
    console.log(`Rules Engine initialized (strict mode: ${this.strictMode})`);
  }

  async evaluate(analysis, ruleSetName = 'default') {
    const startTime = Date.now();
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get applicable rule set
      const ruleSet = await this.ruleSetManager.getRuleSet(ruleSetName);
      if (!ruleSet) {
        throw new Error(`Rule set '${ruleSetName}' not found`);
      }

      const evaluation = {
        evaluationId,
        ruleSet: ruleSetName,
        startedAt: new Date().toISOString(),
        analysis: {
          static: analysis.static || {},
          dynamic: analysis.dynamic || {},
          quality: analysis.quality || {},
        },
      };

      // Apply rules
      const ruleResults = await this.applyRules(analysis, ruleSet.rules);
      evaluation.ruleResults = ruleResults;

      // Calculate adjusted scores
      const scoreAdjustments = this.calculateScoreAdjustments(ruleResults);
      evaluation.scoreAdjustments = scoreAdjustments;

      // Apply penalties and bonuses
      const adjustedScores = this.applyScoreAdjustments(analysis, scoreAdjustments);
      evaluation.adjustedScores = adjustedScores;

      // Final evaluation summary
      evaluation.summary = this.generateEvaluationSummary(ruleResults, adjustedScores);
      evaluation.completedAt = new Date().toISOString();
      evaluation.durationMs = Date.now() - startTime;

      // Store evaluation history
      this.evaluationHistory.push({
        id: evaluationId,
        timestamp: new Date().toISOString(),
        ruleSet: ruleSetName,
        violations: ruleResults.violations.length,
        finalScore: adjustedScores.final,
      });

      return evaluation;
    } catch (error) {
      console.error('Rules evaluation failed:', error);
      throw error;
    }
  }

  async applyRules(analysis, rules) {
    const results = {
      appliedRules: [],
      violations: [],
      warnings: [],
      bonuses: [],
      totalRulesApplied: 0,
    };

    for (const rule of rules) {
      try {
        const ruleResult = await this.applyRule(analysis, rule);
        results.appliedRules.push(rule.id);
        results.totalRulesApplied++;

        if (ruleResult.violated) {
          results.violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            penalty: rule.penalty || 0,
            description: rule.description,
            details: ruleResult.details,
          });
        }

        if (ruleResult.warning) {
          results.warnings.push({
            ruleId: rule.id,
            description: rule.description,
            details: ruleResult.details,
          });
        }

        if (ruleResult.bonus) {
          results.bonuses.push({
            ruleId: rule.id,
            bonus: rule.bonus || 0,
            description: rule.description,
            details: ruleResult.details,
          });
        }
      } catch (error) {
        console.error(`Failed to apply rule ${rule.id}:`, error);
        if (this.strictMode) {
          throw error;
        }
      }
    }

    return results;
  }

  async applyRule(analysis, rule) {
    const ruleFunction = this.getRuleFunction(rule.type);
    if (!ruleFunction) {
      throw new Error(`Unknown rule type: ${rule.type}`);
    }

    return await ruleFunction(analysis, rule);
  }

  getRuleFunction(ruleType) {
    const ruleFunctions = {
      'min_score_threshold': this.ruleMinScoreThreshold.bind(this),
      'max_vulnerability_count': this.ruleMaxVulnerabilityCount.bind(this),
      'required_patterns': this.ruleRequiredPatterns.bind(this),
      'forbidden_patterns': this.ruleForbiddenPatterns.bind(this),
      'complexity_limit': this.ruleComplexityLimit.bind(this),
      'documentation_requirement': this.ruleDocumentationRequirement.bind(this),
      'gas_efficiency': this.ruleGasEfficiency.bind(this),
      'access_control_check': this.ruleAccessControlCheck.bind(this),
    };

    return ruleFunctions[ruleType];
  }

  async ruleMinScoreThreshold(analysis, rule) {
    const category = rule.config.category || 'static';
    const threshold = rule.config.threshold || 50;
    const score = analysis[category]?.score || 0;

    return {
      violated: score < threshold,
      details: `${category} score: ${score}, threshold: ${threshold}`,
    };
  }

  async ruleMaxVulnerabilityCount(analysis, rule) {
    const maxCount = rule.config.maxCount || 0;
    const vulnerabilities = [
      ...(analysis.static?.issues || []),
      ...(analysis.dynamic?.vulnerabilities || []),
    ];

    const highSeverityVulns = vulnerabilities.filter(v => 
      v.severity === 'high' || v.severity === 'critical'
    );

    return {
      violated: highSeverityVulns.length > maxCount,
      details: `High severity vulnerabilities: ${highSeverityVulns.length}, max allowed: ${maxCount}`,
    };
  }

  async ruleRequiredPatterns(analysis, rule) {
    const patterns = rule.config.patterns || [];
    const sourceCode = analysis.sourceCode || '';
    const missingPatterns = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, pattern.flags || 'g');
      if (!regex.test(sourceCode)) {
        missingPatterns.push(pattern.name);
      }
    }

    return {
      violated: missingPatterns.length > 0,
      warning: missingPatterns.length > 0 && rule.config.warningOnly,
      details: `Missing required patterns: ${missingPatterns.join(', ')}`,
    };
  }

  async ruleForbiddenPatterns(analysis, rule) {
    const patterns = rule.config.patterns || [];
    const sourceCode = analysis.sourceCode || '';
    const foundPatterns = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, pattern.flags || 'g');
      if (regex.test(sourceCode)) {
        foundPatterns.push(pattern.name);
      }
    }

    return {
      violated: foundPatterns.length > 0,
      details: `Found forbidden patterns: ${foundPatterns.join(', ')}`,
    };
  }

  async ruleComplexityLimit(analysis, rule) {
    const maxComplexity = rule.config.maxComplexity || 20;
    const complexity = analysis.quality?.metrics?.complexity?.averageComplexity || 0;

    return {
      violated: complexity > maxComplexity,
      details: `Average complexity: ${complexity}, limit: ${maxComplexity}`,
    };
  }

  async ruleDocumentationRequirement(analysis, rule) {
    const minCoverage = rule.config.minCoverage || 50;
    const coverage = analysis.quality?.metrics?.documentation?.commentRatio || 0;

    return {
      violated: coverage < minCoverage,
      details: `Documentation coverage: ${coverage}%, required: ${minCoverage}%`,
    };
  }

  async ruleGasEfficiency(analysis, rule) {
    const maxGasUsage = rule.config.maxGasUsage || 1000000;
    const gasMetrics = analysis.dynamic?.gasAnalysis || {};
    const estimatedGas = gasMetrics.estimatedGas || 0;

    return {
      violated: estimatedGas > maxGasUsage,
      bonus: estimatedGas < maxGasUsage * 0.5, // Bonus for very efficient contracts
      details: `Estimated gas: ${estimatedGas}, limit: ${maxGasUsage}`,
    };
  }

  async ruleAccessControlCheck(analysis, rule) {
    const issues = analysis.static?.issues || [];
    const accessControlIssues = issues.filter(issue => 
      issue.type.includes('access') || issue.type.includes('authorization')
    );

    return {
      violated: accessControlIssues.length > 0,
      details: `Access control issues found: ${accessControlIssues.length}`,
    };
  }

  calculateScoreAdjustments(ruleResults) {
    const adjustments = {
      penalties: 0,
      bonuses: 0,
      details: [],
    };

    // Calculate penalties
    for (const violation of ruleResults.violations) {
      const penalty = violation.penalty || this.getDefaultPenalty(violation.severity);
      adjustments.penalties += penalty;
      adjustments.details.push({
        type: 'penalty',
        amount: penalty,
        reason: `${violation.ruleId}: ${violation.description}`,
      });
    }

    // Calculate bonuses
    for (const bonus of ruleResults.bonuses) {
      const bonusAmount = bonus.bonus || 5;
      adjustments.bonuses += bonusAmount;
      adjustments.details.push({
        type: 'bonus',
        amount: bonusAmount,
        reason: `${bonus.ruleId}: ${bonus.description}`,
      });
    }

    return adjustments;
  }

  getDefaultPenalty(severity) {
    const penalties = {
      'critical': 25,
      'high': 15,
      'medium': 10,
      'low': 5,
    };
    return penalties[severity] || 5;
  }

  applyScoreAdjustments(analysis, adjustments) {
    const baseScores = {
      static: analysis.static?.score || 0,
      dynamic: analysis.dynamic?.score || 0,
      quality: analysis.quality?.score || 0,
    };

    const averageBase = (baseScores.static + baseScores.dynamic + baseScores.quality) / 3;
    const adjusted = averageBase - adjustments.penalties + adjustments.bonuses;

    return {
      base: averageBase,
      penalties: adjustments.penalties,
      bonuses: adjustments.bonuses,
      final: Math.max(0, Math.min(100, adjusted)),
    };
  }

  generateEvaluationSummary(ruleResults, adjustedScores) {
    return {
      rulesApplied: ruleResults.totalRulesApplied,
      violations: ruleResults.violations.length,
      warnings: ruleResults.warnings.length,
      bonuses: ruleResults.bonuses.length,
      finalScore: adjustedScores.final,
      recommendation: this.getScoreRecommendation(adjustedScores.final),
    };
  }

  getScoreRecommendation(score) {
    if (score >= 80) return 'Approved - High security score';
    if (score >= 60) return 'Conditional approval - Address medium issues';
    if (score >= 40) return 'Review required - Multiple security concerns';
    return 'Rejected - Critical security issues detected';
  }

  async addCustomRule(rule) {
    // Validate rule structure
    const schema = Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
      description: Joi.string().required(),
      severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
      penalty: Joi.number().min(0).max(50),
      bonus: Joi.number().min(0).max(20),
      config: Joi.object(),
    });

    const { error, value } = schema.validate(rule);
    if (error) {
      throw new Error(`Invalid rule: ${error.details[0].message}`);
    }

    this.customRules.set(value.id, value);
    return { success: true, ruleId: value.id };
  }

  async getRules({ category, severity } = {}) {
    const allRules = await this.ruleSetManager.getAllRules();
    let filteredRules = allRules;

    if (category) {
      filteredRules = filteredRules.filter(rule => rule.category === category);
    }

    if (severity) {
      filteredRules = filteredRules.filter(rule => rule.severity === severity);
    }

    return filteredRules;
  }

  getRulesCount() {
    return this.ruleSetManager.getTotalRulesCount() + this.customRules.size;
  }

  isStrictMode() {
    return this.strictMode;
  }

  async getStats() {
    const recentEvaluations = this.evaluationHistory.slice(-100);
    
    return {
      totalEvaluations: this.evaluationHistory.length,
      recentEvaluations: recentEvaluations.length,
      averageScore: recentEvaluations.length > 0 
        ? recentEvaluations.reduce((sum, eval) => sum + eval.finalScore, 0) / recentEvaluations.length
        : 0,
      customRulesCount: this.customRules.size,
      totalRulesCount: this.getRulesCount(),
    };
  }
}

module.exports = { RulesEngine };