use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditEvent {
    pub id: Uuid,
    pub event_type: String,
    pub asset_id: Option<Uuid>,
    pub policy_id: Option<Uuid>,
    pub job_id: Option<Uuid>,
    pub actor: String,
    pub payload_json: serde_json::Value,
    pub prev_hash: String,
    pub current_hash: String,
    pub created_at: DateTime<Utc>,
}

impl AuditEvent {
    pub fn new(
        event_type: String,
        actor: String,
        payload_json: serde_json::Value,
        asset_id: Option<Uuid>,
        policy_id: Option<Uuid>,
        job_id: Option<Uuid>,
        prev_hash: String,
    ) -> Self {
        let now = Utc::now();
        let id = Uuid::new_v4();
        
        let current_hash = compute_event_hash(
            &id,
            &event_type,
            &actor,
            &payload_json,
            &prev_hash,
            &now,
        );

        Self {
            id,
            event_type,
            asset_id,
            policy_id,
            job_id,
            actor,
            payload_json,
            prev_hash,
            current_hash,
            created_at: now,
        }
    }

    pub fn verify_hash(&self) -> bool {
        let computed = compute_event_hash(
            &self.id,
            &self.event_type,
            &self.actor,
            &self.payload_json,
            &self.prev_hash,
            &self.created_at,
        );
        computed == self.current_hash
    }
}

pub fn compute_event_hash(
    id: &Uuid,
    event_type: &str,
    actor: &str,
    payload: &serde_json::Value,
    prev_hash: &str,
    timestamp: &DateTime<Utc>,
) -> String {
    let mut hasher = Sha3_256::new();
    hasher.update(id.as_bytes());
    hasher.update(event_type.as_bytes());
    hasher.update(actor.as_bytes());
    hasher.update(payload.to_string().as_bytes());
    hasher.update(prev_hash.as_bytes());
    hasher.update(timestamp.to_rfc3339().as_bytes());
    hex::encode(hasher.finalize())
}

pub fn verify_chain(events: &[AuditEvent]) -> bool {
    if events.is_empty() {
        return true;
    }

    for (i, event) in events.iter().enumerate() {
        if !event.verify_hash() {
            return false;
        }

        if i > 0 && events[i - 1].current_hash != event.prev_hash {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_event_hash_verification() {
        let event = AuditEvent::new(
            "asset.created".to_string(),
            "admin".to_string(),
            serde_json::json!({"asset_name": "test"}),
            Some(Uuid::new_v4()),
            None,
            None,
            "genesis".to_string(),
        );

        assert!(event.verify_hash());
    }

    #[test]
    fn test_audit_chain_verification() {
        let event1 = AuditEvent::new(
            "test.event1".to_string(),
            "user1".to_string(),
            serde_json::json!({}),
            None,
            None,
            None,
            "genesis".to_string(),
        );

        let event2 = AuditEvent::new(
            "test.event2".to_string(),
            "user2".to_string(),
            serde_json::json!({}),
            None,
            None,
            None,
            event1.current_hash.clone(),
        );

        let event3 = AuditEvent::new(
            "test.event3".to_string(),
            "user3".to_string(),
            serde_json::json!({}),
            None,
            None,
            None,
            event2.current_hash.clone(),
        );

        assert!(verify_chain(&[event1.clone(), event2.clone(), event3.clone()]));

        let mut tampered_event2 = event2.clone();
        tampered_event2.payload_json = serde_json::json!({"tampered": true});
        
        assert!(!verify_chain(&[event1, tampered_event2, event3]));
    }
}
