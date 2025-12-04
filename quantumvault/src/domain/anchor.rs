use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "anchor_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum AnchorType {
    RootOfTrust,
    KeyHierarchy,
    PolicyBundle,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EncryptionAnchor {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub anchor_type: AnchorType,
    pub associated_policy_ids: serde_json::Value, // Vec<Uuid>
    pub root_public_key_reference: Option<String>,
    pub root_key_algorithm: Option<String>,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl EncryptionAnchor {
    pub fn new(
        name: String,
        description: Option<String>,
        anchor_type: AnchorType,
        created_by: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            description,
            anchor_type,
            associated_policy_ids: serde_json::json!([]),
            root_public_key_reference: None,
            root_key_algorithm: None,
            is_active: false,
            created_by,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn activate(&mut self) {
        self.is_active = true;
        self.updated_at = Utc::now();
    }

    pub fn deactivate(&mut self) {
        self.is_active = false;
        self.updated_at = Utc::now();
    }

    pub fn set_root_key(&mut self, reference: String, algorithm: String) {
        self.root_public_key_reference = Some(reference);
        self.root_key_algorithm = Some(algorithm);
        self.updated_at = Utc::now();
    }
}
