use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::fs::OpenOptions;
use std::io::Write;
use sha2::{Sha256, Digest};

#[derive(Debug, Deserialize)]
pub struct FeedbackRequest {
    pub message: String,
    pub contact: Option<String>,
    pub bot_field: Option<String>, // Honeypot field
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedbackEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub message: String,
    pub contact: Option<String>,
    pub ip_hash: String,
}

#[derive(Debug, Serialize)]
pub struct FeedbackResponse {
    pub success: bool,
    pub id: Option<String>,
    pub message: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FeedbackStats {
    pub total_count: usize,
    pub today_count: usize,
    pub last_updated: DateTime<Utc>,
}

pub struct FeedbackService {
    storage_path: String,
    ip_salt: String,
}

impl FeedbackService {
    pub fn new() -> Self {
        Self {
            storage_path: std::env::var("FEEDBACK_LOG_PATH")
                .unwrap_or_else(|_| "data/feedback.log".to_string()),
            ip_salt: std::env::var("IP_SALT")
                .unwrap_or_else(|_| "default-salt-change-in-production".to_string()),
        }
    }

    fn validate_feedback(&self, feedback: &FeedbackRequest) -> Result<(), String> {
        // Validate message
        if feedback.message.len() < 5 {
            return Err("Message must be at least 5 characters long".to_string());
        }
        if feedback.message.len() > 1000 {
            return Err("Message must be less than 1000 characters".to_string());
        }

        // Validate contact if provided
        if let Some(contact) = &feedback.contact {
            if contact.len() > 100 {
                return Err("Contact must be less than 100 characters".to_string());
            }
            
            // Basic email or handle validation
            let email_regex = regex::Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
            let handle_regex = regex::Regex::new(r"^[a-zA-Z0-9_-]{2,30}$").unwrap();
            
            if !email_regex.is_match(contact) && !handle_regex.is_match(contact) {
                return Err("Contact must be a valid email address or handle".to_string());
            }
        }

        Ok(())
    }

    fn check_honeypot(&self, feedback: &FeedbackRequest) -> bool {
        // If bot_field has content, it's likely a bot
        feedback.bot_field.as_ref().map_or(true, |field| field.is_empty())
    }

    fn check_spam(&self, feedback: &FeedbackRequest) -> bool {
        let message = feedback.message.to_lowercase();
        
        // Simple spam patterns
        let spam_patterns = [
            r"\b(viagra|cialis|casino|lottery|winner|congratulations)\b",
            r"\b(click here|free money|make money|earn money)\b", 
            r"https?://[^\s]{10,}",  // Excessive URLs
            r"(.)\1{5,}",            // Repeated characters
        ];

        for pattern in spam_patterns.iter() {
            if let Ok(regex) = regex::Regex::new(pattern) {
                if regex.is_match(&message) {
                    return false;
                }
            }
        }

        true
    }

    fn hash_ip(&self, ip: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(format!("{}{}", ip, self.ip_salt));
        format!("{:x}", hasher.finalize())[..16].to_string()
    }

    pub async fn process_feedback(&self, feedback: FeedbackRequest, client_ip: &str) -> FeedbackResponse {
        // Validate input
        if let Err(err) = self.validate_feedback(&feedback) {
            return FeedbackResponse {
                success: false,
                id: None,
                message: err,
                error: Some("Validation failed".to_string()),
            };
        }

        // Check honeypot
        if !self.check_honeypot(&feedback) {
            log::warn!("Honeypot triggered in feedback submission");
            return FeedbackResponse {
                success: false,
                id: None,
                message: "Request appears to be automated".to_string(),
                error: Some("Bot detected".to_string()),
            };
        }

        // Check spam
        if !self.check_spam(&feedback) {
            log::warn!("Potential spam detected in feedback");
            return FeedbackResponse {
                success: false,
                id: None,
                message: "Content not allowed".to_string(),
                error: Some("Spam detected".to_string()),
            };
        }

        // Store feedback
        let entry = FeedbackEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            message: feedback.message,
            contact: feedback.contact,
            ip_hash: self.hash_ip(client_ip),
        };

        match self.store_feedback(&entry).await {
            Ok(_) => {
                log::info!("Feedback stored successfully: {}", entry.id);
                FeedbackResponse {
                    success: true,
                    id: Some(entry.id),
                    message: "Feedback received successfully".to_string(),
                    error: None,
                }
            }
            Err(err) => {
                log::error!("Failed to store feedback: {}", err);
                FeedbackResponse {
                    success: false,
                    id: None,
                    message: "Failed to store feedback".to_string(),
                    error: Some(err.to_string()),
                }
            }
        }
    }

    async fn store_feedback(&self, entry: &FeedbackEntry) -> Result<(), Box<dyn std::error::Error>> {
        // Ensure directory exists
        if let Some(dir) = std::path::Path::new(&self.storage_path).parent() {
            tokio::fs::create_dir_all(dir).await?;
        }

        // Serialize and append to JSONL file
        let json_line = format!("{}\n", serde_json::to_string(entry)?);
        
        tokio::task::spawn_blocking({
            let storage_path = self.storage_path.clone();
            move || -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
                let mut file = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(storage_path)?;
                file.write_all(json_line.as_bytes())?;
                file.flush()?;
                Ok(())
            }
        }).await??;

        Ok(())
    }

    pub async fn get_stats(&self) -> FeedbackStats {
        match self.read_feedback_file().await {
            Ok(entries) => {
                let today = Utc::now().date_naive();
                let today_count = entries
                    .iter()
                    .filter(|entry| entry.timestamp.date_naive() == today)
                    .count();

                FeedbackStats {
                    total_count: entries.len(),
                    today_count,
                    last_updated: Utc::now(),
                }
            }
            Err(_) => FeedbackStats {
                total_count: 0,
                today_count: 0,
                last_updated: Utc::now(),
            },
        }
    }

    async fn read_feedback_file(&self) -> Result<Vec<FeedbackEntry>, Box<dyn std::error::Error>> {
        let content = tokio::fs::read_to_string(&self.storage_path).await?;
        let mut entries = Vec::new();

        for line in content.lines() {
            if !line.trim().is_empty() {
                if let Ok(entry) = serde_json::from_str::<FeedbackEntry>(line) {
                    entries.push(entry);
                }
            }
        }

        Ok(entries)
    }
}

// Global feedback service instance
static FEEDBACK_SERVICE: once_cell::sync::Lazy<Arc<FeedbackService>> = 
    once_cell::sync::Lazy::new(|| Arc::new(FeedbackService::new()));

pub fn get_feedback_service() -> Arc<FeedbackService> {
    FEEDBACK_SERVICE.clone()
}