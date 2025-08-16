//! Query Analysis and Performance Monitoring Module
//!
//! Provides comprehensive query analysis, performance tracking, and AI-driven insights
//! for database optimization in the Dytallix bridge system.

use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use tracing::{info, warn, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryStatistics {
    pub query_hash: String,
    pub query_text: String,
    pub calls: i64,
    pub total_time_ms: f64,
    pub mean_time_ms: f64,
    pub min_time_ms: f64,
    pub max_time_ms: f64,
    pub stddev_time_ms: f64,
    pub rows_affected: i64,
    pub hit_ratio: f64,
    pub last_executed: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexUsageStats {
    pub schema_name: String,
    pub table_name: String,
    pub index_name: String,
    pub index_size: i64,
    pub index_scans: i64,
    pub tuples_read: i64,
    pub tuples_fetched: i64,
    pub usage_ratio: f64,
    pub efficiency_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseHealthMetrics {
    pub total_connections: i32,
    pub active_connections: i32,
    pub idle_connections: i32,
    pub connection_utilization: f64,
    pub cache_hit_ratio: f64,
    pub deadlocks_count: i64,
    pub slow_queries_count: i64,
    pub avg_query_time_ms: f64,
    pub database_size_mb: f64,
    pub index_size_mb: f64,
    pub table_bloat_ratio: f64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryOptimizationRecommendation {
    pub query_hash: String,
    pub recommendation_type: String,
    pub priority: String, // high, medium, low
    pub description: String,
    pub expected_improvement: String,
    pub implementation_difficulty: String,
    pub suggested_action: String,
    pub ai_confidence_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceAnalysisReport {
    pub analysis_timestamp: DateTime<Utc>,
    pub database_health: DatabaseHealthMetrics,
    pub top_slow_queries: Vec<QueryStatistics>,
    pub underutilized_indexes: Vec<IndexUsageStats>,
    pub optimization_recommendations: Vec<QueryOptimizationRecommendation>,
    pub performance_trends: HashMap<String, f64>,
    pub ai_insights: String,
}

#[derive(Debug, Clone)]
pub struct QueryAnalyzer {
    pool: PgPool,
    ai_insights_enabled: bool,
}

impl QueryAnalyzer {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            ai_insights_enabled: true,
        }
    }

    /// Enable or disable AI-driven insights
    pub fn set_ai_insights(&mut self, enabled: bool) {
        self.ai_insights_enabled = enabled;
    }

    /// Enable pg_stat_statements extension for query tracking
    pub async fn enable_query_tracking(&self) -> Result<(), sqlx::Error> {
        info!("Enabling pg_stat_statements extension for query tracking");

        // Create extension if not exists
        sqlx::query("CREATE EXTENSION IF NOT EXISTS pg_stat_statements")
            .execute(&self.pool)
            .await?;

        // Reset statistics to start fresh
        sqlx::query("SELECT pg_stat_statements_reset()")
            .execute(&self.pool)
            .await?;

        info!("Query tracking enabled successfully");
        Ok(())
    }

    /// Get comprehensive query statistics
    pub async fn get_query_statistics(&self, limit: Option<i32>) -> Result<Vec<QueryStatistics>, sqlx::Error> {
        let limit = limit.unwrap_or(50);
        
        let query = r#"
            SELECT 
                encode(sha256(query::bytea), 'hex') as query_hash,
                query as query_text,
                calls,
                total_exec_time as total_time_ms,
                mean_exec_time as mean_time_ms,
                min_exec_time as min_time_ms,
                max_exec_time as max_time_ms,
                stddev_exec_time as stddev_time_ms,
                rows,
                100.0 * shared_blks_hit / 
                    nullif(shared_blks_hit + shared_blks_read, 0) as hit_ratio
            FROM pg_stat_statements 
            WHERE query NOT LIKE '%pg_stat_statements%'
            ORDER BY total_exec_time DESC
            LIMIT $1
        "#;

        let rows = sqlx::query(query)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        let mut statistics = Vec::new();
        for row in rows {
            let stat = QueryStatistics {
                query_hash: row.get("query_hash"),
                query_text: row.get("query_text"),
                calls: row.get("calls"),
                total_time_ms: row.get("total_time_ms"),
                mean_time_ms: row.get("mean_time_ms"),
                min_time_ms: row.get("min_time_ms"),
                max_time_ms: row.get("max_time_ms"),
                stddev_time_ms: row.get::<Option<f64>, _>("stddev_time_ms").unwrap_or(0.0),
                rows_affected: row.get("rows"),
                hit_ratio: row.get::<Option<f64>, _>("hit_ratio").unwrap_or(0.0),
                last_executed: Utc::now(), // pg_stat_statements doesn't track this, using current time
            };
            statistics.push(stat);
        }

        Ok(statistics)
    }

    /// Get index usage statistics
    pub async fn get_index_usage_stats(&self) -> Result<Vec<IndexUsageStats>, sqlx::Error> {
        let query = r#"
            SELECT 
                schemaname as schema_name,
                tablename as table_name,
                indexname as index_name,
                pg_size_pretty(pg_relation_size(indexrelid))::text as index_size_text,
                pg_relation_size(indexrelid) as index_size,
                idx_scan as index_scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched,
                CASE 
                    WHEN idx_scan = 0 THEN 0
                    ELSE round((idx_tup_fetch::numeric / idx_tup_read::numeric) * 100, 2)
                END as usage_ratio,
                CASE 
                    WHEN idx_scan = 0 THEN 0
                    WHEN pg_relation_size(indexrelid) = 0 THEN 100
                    ELSE round((idx_scan::numeric / (pg_relation_size(indexrelid) / 1024.0 / 1024.0)) * 100, 2)
                END as efficiency_score
            FROM pg_stat_user_indexes 
            JOIN pg_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexname
            WHERE schemaname = 'public'
            ORDER BY index_scans DESC, index_size DESC
        "#;

        let rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await?;

        let mut stats = Vec::new();
        for row in rows {
            let stat = IndexUsageStats {
                schema_name: row.get("schema_name"),
                table_name: row.get("table_name"),
                index_name: row.get("index_name"),
                index_size: row.get("index_size"),
                index_scans: row.get("index_scans"),
                tuples_read: row.get("tuples_read"),
                tuples_fetched: row.get("tuples_fetched"),
                usage_ratio: row.get("usage_ratio"),
                efficiency_score: row.get("efficiency_score"),
            };
            stats.push(stat);
        }

        Ok(stats)
    }

    /// Get comprehensive database health metrics
    pub async fn get_database_health_metrics(&self) -> Result<DatabaseHealthMetrics, sqlx::Error> {
        // Get connection statistics
        let connection_query = r#"
            SELECT 
                sum(numbackends) as total_connections,
                sum(xact_commit + xact_rollback) as total_transactions,
                sum(deadlocks) as deadlocks_count
            FROM pg_stat_database
            WHERE datname = current_database()
        "#;

        let conn_row = sqlx::query(connection_query)
            .fetch_one(&self.pool)
            .await?;

        // Get cache hit ratio
        let cache_query = r#"
            SELECT 
                sum(blks_hit) as cache_hits,
                sum(blks_read) as disk_reads,
                round(
                    100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2
                ) as cache_hit_ratio
            FROM pg_stat_database
            WHERE datname = current_database()
        "#;

        let cache_row = sqlx::query(cache_query)
            .fetch_one(&self.pool)
            .await?;

        // Get database size
        let size_query = r#"
            SELECT 
                round(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) as db_size_mb,
                round(
                    (SELECT sum(pg_relation_size(indexrelid)) 
                     FROM pg_stat_user_indexes) / 1024.0 / 1024.0, 2
                ) as index_size_mb
        "#;

        let size_row = sqlx::query(size_query)
            .fetch_one(&self.pool)
            .await?;

        // Get slow queries count (queries taking more than 100ms on average)
        let slow_query_count = sqlx::query(
            "SELECT count(*) as slow_queries FROM pg_stat_statements WHERE mean_exec_time > 100"
        )
        .fetch_one(&self.pool)
        .await?
        .get::<i64, _>("slow_queries");

        // Get average query time
        let avg_query_time = sqlx::query(
            "SELECT coalesce(avg(mean_exec_time), 0) as avg_time FROM pg_stat_statements"
        )
        .fetch_one(&self.pool)
        .await?
        .get::<f64, _>("avg_time");

        // Get current connection info from pg_stat_activity
        let activity_query = r#"
            SELECT 
                count(*) as total_active,
                count(*) FILTER (WHERE state = 'active') as active_connections,
                count(*) FILTER (WHERE state = 'idle') as idle_connections
            FROM pg_stat_activity
            WHERE datname = current_database()
        "#;

        let activity_row = sqlx::query(activity_query)
            .fetch_one(&self.pool)
            .await?;

        let total_active: i64 = activity_row.get("total_active");
        let active_connections: i64 = activity_row.get("active_connections");
        let idle_connections: i64 = activity_row.get("idle_connections");

        Ok(DatabaseHealthMetrics {
            total_connections: total_active as i32,
            active_connections: active_connections as i32,
            idle_connections: idle_connections as i32,
            connection_utilization: if total_active > 0 {
                (active_connections as f64 / total_active as f64) * 100.0
            } else {
                0.0
            },
            cache_hit_ratio: cache_row.get::<Option<f64>, _>("cache_hit_ratio").unwrap_or(0.0),
            deadlocks_count: conn_row.get::<Option<i64>, _>("deadlocks_count").unwrap_or(0),
            slow_queries_count: slow_query_count,
            avg_query_time_ms: avg_query_time,
            database_size_mb: size_row.get::<Option<f64>, _>("db_size_mb").unwrap_or(0.0),
            index_size_mb: size_row.get::<Option<f64>, _>("index_size_mb").unwrap_or(0.0),
            table_bloat_ratio: 0.0, // Would require more complex calculation
            timestamp: Utc::now(),
        })
    }

    /// Generate AI-driven optimization recommendations
    pub async fn generate_optimization_recommendations(
        &self,
        query_stats: &[QueryStatistics],
        index_stats: &[IndexUsageStats],
        health_metrics: &DatabaseHealthMetrics,
    ) -> Vec<QueryOptimizationRecommendation> {
        let mut recommendations = Vec::new();

        // Analyze slow queries
        for query in query_stats.iter().take(10) {
            if query.mean_time_ms > 100.0 {
                let recommendation = QueryOptimizationRecommendation {
                    query_hash: query.query_hash.clone(),
                    recommendation_type: "query_optimization".to_string(),
                    priority: if query.mean_time_ms > 1000.0 { "high" } else { "medium" }.to_string(),
                    description: format!(
                        "Query takes {:.2}ms on average and has been called {} times. Consider optimization.",
                        query.mean_time_ms, query.calls
                    ),
                    expected_improvement: format!("Potential 30-70% query time reduction"),
                    implementation_difficulty: "medium".to_string(),
                    suggested_action: self.generate_query_optimization_suggestion(query),
                    ai_confidence_score: self.calculate_confidence_score(query),
                };
                recommendations.push(recommendation);
            }
        }

        // Analyze unused indexes
        for index in index_stats.iter() {
            if index.index_scans < 10 && index.index_size > 10_000_000 { // Less than 10 scans and > 10MB
                let recommendation = QueryOptimizationRecommendation {
                    query_hash: format!("index_{}", index.index_name),
                    recommendation_type: "index_removal".to_string(),
                    priority: "low".to_string(),
                    description: format!(
                        "Index '{}' on table '{}' is rarely used ({} scans) but consumes {:.2}MB of space.",
                        index.index_name, index.table_name, index.index_scans, 
                        index.index_size as f64 / 1024.0 / 1024.0
                    ),
                    expected_improvement: "Reduced storage overhead and faster writes".to_string(),
                    implementation_difficulty: "low".to_string(),
                    suggested_action: format!("Consider dropping index: DROP INDEX IF EXISTS {}", index.index_name),
                    ai_confidence_score: 0.8,
                };
                recommendations.push(recommendation);
            }
        }

        // Analyze cache hit ratio
        if health_metrics.cache_hit_ratio < 95.0 {
            let recommendation = QueryOptimizationRecommendation {
                query_hash: "cache_hit_ratio".to_string(),
                recommendation_type: "memory_optimization".to_string(),
                priority: "high".to_string(),
                description: format!(
                    "Cache hit ratio is {:.2}%, which is below the recommended 95%+",
                    health_metrics.cache_hit_ratio
                ),
                expected_improvement: "Improved query performance and reduced I/O".to_string(),
                implementation_difficulty: "medium".to_string(),
                suggested_action: "Increase shared_buffers or effective_cache_size in PostgreSQL configuration".to_string(),
                ai_confidence_score: 0.9,
            };
            recommendations.push(recommendation);
        }

        // Analyze connection utilization
        if health_metrics.connection_utilization > 80.0 {
            let recommendation = QueryOptimizationRecommendation {
                query_hash: "connection_pool".to_string(),
                recommendation_type: "connection_optimization".to_string(),
                priority: "medium".to_string(),
                description: format!(
                    "Connection utilization is {:.1}%, which may indicate connection pool pressure",
                    health_metrics.connection_utilization
                ),
                expected_improvement: "Better connection management and throughput".to_string(),
                implementation_difficulty: "low".to_string(),
                suggested_action: "Consider increasing connection pool size or implementing connection pooling".to_string(),
                ai_confidence_score: 0.7,
            };
            recommendations.push(recommendation);
        }

        recommendations
    }

    /// Generate a comprehensive performance analysis report
    pub async fn generate_performance_report(&self) -> Result<PerformanceAnalysisReport, sqlx::Error> {
        info!("Generating comprehensive performance analysis report");

        let query_stats = self.get_query_statistics(Some(20)).await?;
        let index_stats = self.get_index_usage_stats().await?;
        let health_metrics = self.get_database_health_metrics().await?;

        let optimization_recommendations = self.generate_optimization_recommendations(
            &query_stats,
            &index_stats,
            &health_metrics,
        ).await;

        let mut performance_trends = HashMap::new();
        performance_trends.insert("avg_query_time_ms".to_string(), health_metrics.avg_query_time_ms);
        performance_trends.insert("cache_hit_ratio".to_string(), health_metrics.cache_hit_ratio);
        performance_trends.insert("connection_utilization".to_string(), health_metrics.connection_utilization);
        performance_trends.insert("slow_queries_count".to_string(), health_metrics.slow_queries_count as f64);

        let ai_insights = self.generate_ai_insights(&query_stats, &health_metrics).await;

        Ok(PerformanceAnalysisReport {
            analysis_timestamp: Utc::now(),
            database_health: health_metrics,
            top_slow_queries: query_stats,
            underutilized_indexes: index_stats.into_iter().filter(|idx| idx.efficiency_score < 50.0).collect(),
            optimization_recommendations,
            performance_trends,
            ai_insights,
        })
    }

    /// Generate AI-driven insights based on performance data
    async fn generate_ai_insights(
        &self,
        query_stats: &[QueryStatistics],
        health_metrics: &DatabaseHealthMetrics,
    ) -> String {
        if !self.ai_insights_enabled {
            return "AI insights disabled".to_string();
        }

        let mut insights = Vec::new();

        // Analyze query patterns
        let avg_query_time = query_stats.iter().map(|q| q.mean_time_ms).sum::<f64>() / query_stats.len() as f64;
        if avg_query_time > 50.0 {
            insights.push(format!(
                "⚠️ Average query time ({:.2}ms) is above optimal threshold (50ms). Consider query optimization.",
                avg_query_time
            ));
        }

        // Analyze high-frequency queries
        let high_freq_queries = query_stats.iter().filter(|q| q.calls > 1000).count();
        if high_freq_queries > 0 {
            insights.push(format!(
                "🔄 {} high-frequency queries detected. These are prime candidates for caching.",
                high_freq_queries
            ));
        }

        // Analyze cache performance
        if health_metrics.cache_hit_ratio < 90.0 {
            insights.push(format!(
                "💾 Cache hit ratio ({:.2}%) suggests memory configuration tuning needed.",
                health_metrics.cache_hit_ratio
            ));
        }

        // Analyze deadlocks
        if health_metrics.deadlocks_count > 0 {
            insights.push(format!(
                "🔒 {} deadlocks detected. Review transaction isolation and locking strategies.",
                health_metrics.deadlocks_count
            ));
        }

        // Overall assessment
        let overall_score = self.calculate_overall_performance_score(health_metrics, query_stats);
        insights.push(format!(
            "📊 Overall database performance score: {:.1}/100. {}",
            overall_score,
            if overall_score >= 80.0 {
                "Excellent performance!"
            } else if overall_score >= 60.0 {
                "Good performance with room for improvement."
            } else {
                "Performance optimization recommended."
            }
        ));

        insights.join("\n")
    }

    fn generate_query_optimization_suggestion(&self, query: &QueryStatistics) -> String {
        let query_text = query.query_text.to_lowercase();
        
        if query_text.contains("select") && query_text.contains("where") {
            if query_text.contains("like") {
                "Consider using full-text search or GIN index for text search operations".to_string()
            } else if query_text.contains("order by") {
                "Consider adding an index on the ORDER BY columns".to_string()
            } else if query_text.contains("join") {
                "Ensure foreign key columns are indexed for efficient joins".to_string()
            } else {
                "Consider adding indexes on WHERE clause columns".to_string()
            }
        } else if query_text.contains("insert") || query_text.contains("update") {
            "Consider batching operations or using prepared statements".to_string()
        } else {
            "Analyze query execution plan for optimization opportunities".to_string()
        }
    }

    fn calculate_confidence_score(&self, query: &QueryStatistics) -> f64 {
        let mut score: f64 = 0.5; // Base score with explicit type
        
        // Higher confidence for frequently called queries
        if query.calls > 100 {
            score += 0.2;
        }
        
        // Higher confidence for consistently slow queries
        if query.stddev_time_ms < query.mean_time_ms * 0.5 {
            score += 0.2;
        }
        
        // Adjust based on cache hit ratio
        if query.hit_ratio < 90.0 {
            score += 0.1;
        }
        
        score = score.min(1.0_f64);
        score
    }

    fn calculate_overall_performance_score(
        &self,
        health_metrics: &DatabaseHealthMetrics,
        query_stats: &[QueryStatistics],
    ) -> f64 {
        let mut score = 0.0;
        let mut factors = 0;

        // Cache hit ratio (25% of score)
        score += (health_metrics.cache_hit_ratio / 100.0) * 25.0;
        factors += 1;

        // Average query time (25% of score)
        let avg_query_time = if query_stats.is_empty() {
            0.0
        } else {
            query_stats.iter().map(|q| q.mean_time_ms).sum::<f64>() / query_stats.len() as f64
        };
        let query_score = if avg_query_time <= 10.0 {
            25.0
        } else if avg_query_time <= 50.0 {
            20.0
        } else if avg_query_time <= 100.0 {
            15.0
        } else {
            5.0
        };
        score += query_score;
        factors += 1;

        // Connection utilization (20% of score)
        let conn_score = if health_metrics.connection_utilization <= 70.0 {
            20.0
        } else if health_metrics.connection_utilization <= 85.0 {
            15.0
        } else {
            5.0
        };
        score += conn_score;
        factors += 1;

        // Deadlocks (15% of score)
        let deadlock_score = if health_metrics.deadlocks_count == 0 {
            15.0
        } else if health_metrics.deadlocks_count <= 5 {
            10.0
        } else {
            0.0
        };
        score += deadlock_score;
        factors += 1;

        // Slow queries (15% of score)
        let slow_query_score = if health_metrics.slow_queries_count == 0 {
            15.0
        } else if health_metrics.slow_queries_count <= 10 {
            10.0
        } else {
            0.0
        };
        score += slow_query_score;

        score
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;

    #[tokio::test]
    #[ignore] // Requires database setup
    async fn test_query_analyzer() {
        let database_url = "postgresql://postgres:password@localhost/dytallix_test";
        let pool = PgPool::connect(database_url).await.unwrap();
        
        let analyzer = QueryAnalyzer::new(pool);
        
        // Test enabling query tracking
        analyzer.enable_query_tracking().await.unwrap();
        
        // Test getting query statistics
        let stats = analyzer.get_query_statistics(Some(10)).await.unwrap();
        assert!(stats.len() <= 10);
        
        // Test getting health metrics
        let health = analyzer.get_database_health_metrics().await.unwrap();
        assert!(health.total_connections >= 0);
        
        // Test generating performance report
        let report = analyzer.generate_performance_report().await.unwrap();
        assert!(!report.ai_insights.is_empty());
    }
}