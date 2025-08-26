/**
 * Statistical utilities for anomaly detection
 * Provides rolling window statistics, z-score, EWMA calculations
 */

class RollingWindow {
  constructor(size = 100) {
    this.size = size;
    this.data = [];
  }

  add(value) {
    this.data.push(value);
    if (this.data.length > this.size) {
      this.data.shift();
    }
  }

  get length() {
    return this.data.length;
  }

  get values() {
    return [...this.data];
  }

  mean() {
    if (this.data.length === 0) return 0;
    return this.data.reduce((sum, val) => sum + val, 0) / this.data.length;
  }

  stddev() {
    if (this.data.length < 2) return 0;
    const mean = this.mean();
    const variance = this.data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (this.data.length - 1);
    return Math.sqrt(variance);
  }

  min() {
    return this.data.length > 0 ? Math.min(...this.data) : 0;
  }

  max() {
    return this.data.length > 0 ? Math.max(...this.data) : 0;
  }

  percentile(p) {
    if (this.data.length === 0) return 0;
    const sorted = [...this.data].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  clear() {
    this.data = [];
  }
}

class EWMA {
  constructor(alpha = 0.1) {
    this.alpha = alpha;
    this.value = null;
    this.initialized = false;
  }

  update(newValue) {
    if (!this.initialized) {
      this.value = newValue;
      this.initialized = true;
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  get() {
    return this.value;
  }

  reset() {
    this.value = null;
    this.initialized = false;
  }
}

class StatisticalUtils {
  /**
   * Calculate z-score for a value against a window
   */
  static zScore(value, window) {
    const mean = window.mean();
    const stddev = window.stddev();
    
    if (stddev === 0) return 0;
    return (value - mean) / stddev;
  }

  /**
   * Check if z-score indicates anomaly
   */
  static isAnomalousZScore(zScore, threshold = 3.0) {
    return Math.abs(zScore) >= threshold;
  }

  /**
   * Calculate rate of change
   */
  static rateOfChange(current, previous) {
    if (previous === 0) return current > 0 ? Infinity : 0;
    return (current - previous) / previous;
  }

  /**
   * Detect spike in time series
   */
  static detectSpike(values, threshold = 2.0) {
    if (values.length < 2) return false;
    
    const recent = values.slice(-5); // Last 5 values
    const baseline = values.slice(0, -5); // Everything except last 5
    
    if (baseline.length === 0) return false;
    
    const baselineMean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const baselineStddev = Math.sqrt(
      baseline.reduce((sum, val) => sum + Math.pow(val - baselineMean, 2), 0) / (baseline.length - 1)
    );
    
    if (baselineStddev === 0) return false;
    
    // Check if any recent value is anomalous
    for (const value of recent) {
      const z = (value - baselineMean) / baselineStddev;
      if (Math.abs(z) >= threshold) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Smooth time series using moving average
   */
  static movingAverage(values, windowSize = 5) {
    if (values.length < windowSize) return values;
    
    const smoothed = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(avg);
    }
    
    return smoothed;
  }

  /**
   * Calculate correlation between two time series
   */
  static correlation(series1, series2) {
    if (series1.length !== series2.length || series1.length === 0) {
      return 0;
    }
    
    const n = series1.length;
    const mean1 = series1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = series2.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1;
      const diff2 = series2[i] - mean2;
      
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    
    if (denominator === 0) return 0;
    return numerator / denominator;
  }
}

export {
  RollingWindow,
  EWMA,
  StatisticalUtils
};