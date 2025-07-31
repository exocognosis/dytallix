//! Dytallix Security & Monitoring Module
//!
//! Provides audit logging, real-time monitoring, and incident response.

use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub event_type: String,
    pub details: String,
    pub timestamp: u64,
    pub source: Option<String>,
    pub severity: EventSeverity,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone)]
pub struct AuditFilter {
    pub event_type: Option<String>,
    pub severity: Option<EventSeverity>,
    pub start_timestamp: Option<u64>,
    pub end_timestamp: Option<u64>,
    pub source: Option<String>,
    pub limit: Option<usize>,
}

impl AuditFilter {
    pub fn new() -> Self {
        Self {
            event_type: None,
            severity: None,
            start_timestamp: None,
            end_timestamp: None,
            source: None,
            limit: None,
        }
    }
    
    pub fn with_event_type(mut self, event_type: String) -> Self {
        self.event_type = Some(event_type);
        self
    }
    
    pub fn with_severity(mut self, severity: EventSeverity) -> Self {
        self.severity = Some(severity);
        self
    }
    
    pub fn with_time_range(mut self, start: u64, end: u64) -> Self {
        self.start_timestamp = Some(start);
        self.end_timestamp = Some(end);
        self
    }
    
    pub fn matches(&self, event: &AuditEvent) -> bool {
        if let Some(ref event_type) = self.event_type {
            if &event.event_type != event_type {
                return false;
            }
        }
        
        if let Some(ref severity) = self.severity {
            if std::mem::discriminant(&event.severity) != std::mem::discriminant(severity) {
                return false;
            }
        }
        
        if let Some(start) = self.start_timestamp {
            if event.timestamp < start {
                return false;
            }
        }
        
        if let Some(end) = self.end_timestamp {
            if event.timestamp > end {
                return false;
            }
        }
        
        if let Some(ref source) = self.source {
            if let Some(ref event_source) = event.source {
                if event_source != source {
                    return false;
                }
            } else {
                return false;
            }
        }
        
        true
    }
}

pub trait AuditLogger {
    fn log_event(&self, event: AuditEvent) -> Result<(), SecurityError>;
    fn get_events(&self, filter: AuditFilter) -> Result<Vec<AuditEvent>, SecurityError>;
}

#[derive(Debug)]
pub enum SecurityError {
    IoError(std::io::Error),
    SerializationError(serde_json::Error),
    InvalidData(String),
}

impl From<std::io::Error> for SecurityError {
    fn from(error: std::io::Error) -> Self {
        SecurityError::IoError(error)
    }
}

impl From<serde_json::Error> for SecurityError {
    fn from(error: serde_json::Error) -> Self {
        SecurityError::SerializationError(error)
    }
}

pub struct FileAuditLogger {
    log_file_path: PathBuf,
    file_handle: Arc<Mutex<File>>,
}

impl FileAuditLogger {
    pub fn new<P: AsRef<Path>>(log_file_path: P) -> Result<Self, SecurityError> {
        let path = log_file_path.as_ref().to_path_buf();
        
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // Open file in append mode, create if it doesn't exist
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        
        Ok(Self {
            log_file_path: path,
            file_handle: Arc::new(Mutex::new(file)),
        })
    }
}

impl AuditLogger for FileAuditLogger {
    fn log_event(&self, event: AuditEvent) -> Result<(), SecurityError> {
        let event_json = serde_json::to_string(&event)?;
        
        let mut file = self.file_handle.lock().unwrap();
        writeln!(file, "{}", event_json)?;
        file.flush()?;
        
        // Log to stdout for debugging
        println!("AUDIT: [{}] {} - {}", 
            match event.severity {
                EventSeverity::Low => "LOW",
                EventSeverity::Medium => "MED",
                EventSeverity::High => "HIGH",
                EventSeverity::Critical => "CRIT",
            },
            event.event_type,
            event.details
        );
        
        Ok(())
    }
    
    fn get_events(&self, filter: AuditFilter) -> Result<Vec<AuditEvent>, SecurityError> {
        let file = File::open(&self.log_file_path)?;
        let reader = BufReader::new(file);
        
        let mut events = Vec::new();
        let mut count = 0;
        
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            
            match serde_json::from_str::<AuditEvent>(&line) {
                Ok(event) => {
                    if filter.matches(&event) {
                        events.push(event);
                        count += 1;
                        
                        if let Some(limit) = filter.limit {
                            if count >= limit {
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Warning: Failed to parse audit log line: {} - Error: {}", line, e);
                }
            }
        }
        
        Ok(events)
    }
}

// Helper functions for common event types
impl FileAuditLogger {
    pub fn log_transaction_event(&self, tx_hash: &str, event_type: &str, details: &str) -> Result<(), SecurityError> {
        let mut metadata = HashMap::new();
        metadata.insert("transaction_hash".to_string(), tx_hash.to_string());
        metadata.insert("category".to_string(), "transaction".to_string());
        
        let event = AuditEvent {
            event_type: event_type.to_string(),
            details: details.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            source: Some("blockchain_core".to_string()),
            severity: EventSeverity::Medium,
            metadata,
        };
        
        self.log_event(event)
    }
    
    pub fn log_security_event(&self, event_type: &str, details: &str, severity: EventSeverity) -> Result<(), SecurityError> {
        let mut metadata = HashMap::new();
        metadata.insert("category".to_string(), "security".to_string());
        
        let event = AuditEvent {
            event_type: event_type.to_string(),
            details: details.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            source: Some("security_module".to_string()),
            severity,
            metadata,
        };
        
        self.log_event(event)
    }
    
    pub fn log_pqc_event(&self, event_type: &str, algorithm: &str, details: &str) -> Result<(), SecurityError> {
        let mut metadata = HashMap::new();
        metadata.insert("category".to_string(), "pqc".to_string());
        metadata.insert("algorithm".to_string(), algorithm.to_string());
        
        let event = AuditEvent {
            event_type: event_type.to_string(),
            details: details.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            source: Some("pqc_crypto".to_string()),
            severity: EventSeverity::Medium,
            metadata,
        };
        
        self.log_event(event)
    }
}

// Legacy compatibility
pub struct DummyLogger;

impl AuditLogger for DummyLogger {
    fn log_event(&self, event: AuditEvent) -> Result<(), SecurityError> {
        // Create default logger if none exists
        let logger = FileAuditLogger::new("./logs/audit.log")
            .unwrap_or_else(|_| {
                eprintln!("Warning: Could not create audit log file, events will be lost");
                return FileAuditLogger::new("/tmp/dytallix_audit.log").unwrap();
            });
        
        logger.log_event(event)
    }
    
    fn get_events(&self, filter: AuditFilter) -> Result<Vec<AuditEvent>, SecurityError> {
        let logger = FileAuditLogger::new("./logs/audit.log")
            .or_else(|_| FileAuditLogger::new("/tmp/dytallix_audit.log"))?;
        
        logger.get_events(filter)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    
    #[test]
    fn test_file_audit_logger() {
        let temp_file = NamedTempFile::new().unwrap();
        let logger = FileAuditLogger::new(temp_file.path()).unwrap();
        
        let event = AuditEvent {
            event_type: "test_event".to_string(),
            details: "Test event details".to_string(),
            timestamp: 1234567890,
            source: Some("test".to_string()),
            severity: EventSeverity::Medium,
            metadata: HashMap::new(),
        };
        
        logger.log_event(event.clone()).unwrap();
        
        let filter = AuditFilter::new().with_event_type("test_event".to_string());
        let events = logger.get_events(filter).unwrap();
        
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_type, "test_event");
    }
    
    #[test]
    fn test_audit_filter() {
        let event = AuditEvent {
            event_type: "security_alert".to_string(),
            details: "Suspicious activity detected".to_string(),
            timestamp: 1234567890,
            source: Some("monitor".to_string()),
            severity: EventSeverity::High,
            metadata: HashMap::new(),
        };
        
        let filter = AuditFilter::new()
            .with_event_type("security_alert".to_string())
            .with_severity(EventSeverity::High);
        
        assert!(filter.matches(&event));
        
        let wrong_filter = AuditFilter::new()
            .with_event_type("other_event".to_string());
        
        assert!(!wrong_filter.matches(&event));
    }
}
