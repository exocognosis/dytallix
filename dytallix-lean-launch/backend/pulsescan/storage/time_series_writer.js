/**
 * Time Series Storage Abstraction
 * Provides interface for storing and querying time-series metrics
 */

class TimeSeriesWriter {
  /**
   * Write transaction metrics
   * @param {Array} metrics Array of transaction metric events
   */
  async writeTxMetrics(metrics) {
    throw new Error('writeTxMetrics must be implemented by subclass');
  }

  /**
   * Write block metrics
   * @param {Array} metrics Array of block metric events
   */
  async writeBlockMetrics(metrics) {
    throw new Error('writeBlockMetrics must be implemented by subclass');
  }

  /**
   * Write validator metrics
   * @param {Array} metrics Array of validator metric events
   */
  async writeValidatorMetrics(metrics) {
    throw new Error('writeValidatorMetrics must be implemented by subclass');
  }

  /**
   * Query metrics within time range
   * @param {string} metricType Type of metric (tx, block, vote)
   * @param {number} startTime Start timestamp
   * @param {number} endTime End timestamp
   * @param {Object} options Query options
   */
  async queryRange(metricType, startTime, endTime, options = {}) {
    throw new Error('queryRange must be implemented by subclass');
  }

  /**
   * Get recent metrics
   * @param {string} metricType Type of metric
   * @param {number} count Number of recent points to return
   */
  async getRecent(metricType, count = 100) {
    const endTime = Date.now();
    const startTime = endTime - (count * 60 * 1000); // Assume 1 minute intervals
    return this.queryRange(metricType, startTime, endTime, { limit: count });
  }

  /**
   * Close storage connection
   */
  async close() {
    // Default implementation - subclasses can override
  }
}

export { TimeSeriesWriter };