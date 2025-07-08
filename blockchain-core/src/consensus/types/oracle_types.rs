//! Oracle-specific Type Definitions
//!
//! This module contains all type definitions related to AI oracles, signatures,
//! certificates, and cryptographic verification.

use serde::{Deserialize, Serialize};
use dytallix_pqc::SignatureAlgorithm;
use super::ai_types::{AIResponsePayload, AIServiceType};

/// Post-Quantum Cryptographic signature for AI oracle responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponseSignature {
    /// Signature algorithm used (Dilithium5, Falcon1024, etc.)
    pub algorithm: SignatureAlgorithm,
    /// The actual signature bytes
    pub signature: Vec<u8>,
    /// Public key used for verification (oracle's public key)
    pub public_key: Vec<u8>,
    /// Signature creation timestamp (Unix timestamp in seconds)
    pub signature_timestamp: u64,
    /// Version of the signature format for forward compatibility
    pub signature_version: u8,
    /// Additional signature metadata
    pub metadata: Option<SignatureMetadata>,
}

/// Additional metadata for signatures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureMetadata {
    /// Key identifier or fingerprint
    pub key_id: Option<String>,
    /// Certificate chain for verification
    pub cert_chain: Option<Vec<String>>,
    /// Additional signature parameters
    pub parameters: Option<serde_json::Value>,
}

/// Oracle identity and certificate information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OracleIdentity {
    /// Unique oracle identifier
    pub oracle_id: String,
    /// Oracle name or description
    pub name: String,
    /// Oracle's public key for signature verification
    pub public_key: Vec<u8>,
    /// Signature algorithm used by this oracle
    pub signature_algorithm: SignatureAlgorithm,
    /// Oracle registration timestamp
    pub registered_at: u64,
    /// Oracle reputation score (0.0 to 1.0)
    pub reputation_score: f64,
    /// Whether the oracle is currently active
    pub is_active: bool,
    /// Oracle's certificate chain
    pub certificate_chain: Vec<OracleCertificate>,
}

/// Oracle certificate for identity verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OracleCertificate {
    /// Certificate version
    pub version: u8,
    /// Subject oracle ID
    pub subject_oracle_id: String,
    /// Issuer oracle ID (for chain of trust)
    pub issuer_oracle_id: String,
    /// Certificate validity start time
    pub valid_from: u64,
    /// Certificate validity end time
    pub valid_until: u64,
    /// Public key in this certificate
    pub public_key: Vec<u8>,
    /// Signature algorithm
    pub signature_algorithm: SignatureAlgorithm,
    /// Certificate signature (signed by issuer)
    pub signature: Vec<u8>,
    /// Additional certificate extensions
    pub extensions: Option<serde_json::Value>,
}

/// Signed AI Oracle Response with cryptographic verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedAIOracleResponse {
    /// The underlying AI response payload
    pub response: AIResponsePayload,
    /// Cryptographic signature of the response
    pub signature: AIResponseSignature,
    /// Nonce for replay protection (must be unique)
    pub nonce: u64,
    /// Response expiration timestamp (for freshness)
    pub expires_at: u64,
    /// Oracle identity information
    pub oracle_identity: OracleIdentity,
    /// Additional verification data
    pub verification_data: Option<VerificationData>,
}

/// Additional data for response verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationData {
    /// Hash of the original request (for request-response binding)
    pub request_hash: Vec<u8>,
    /// Merkle proof if response is part of a batch
    pub merkle_proof: Option<Vec<Vec<u8>>>,
    /// Timestamp verification data
    pub timestamp_proof: Option<TimestampProof>,
    /// Additional verification metadata
    pub metadata: Option<serde_json::Value>,
}

/// Timestamp proof for response freshness verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimestampProof {
    /// Timestamp authority identifier
    pub authority_id: String,
    /// Timestamp token or proof
    pub proof: Vec<u8>,
    /// Timestamp algorithm used
    pub algorithm: String,
    /// Timestamp creation time
    pub created_at: u64,
}

/// AI Analysis Result structure for consensus engine
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAnalysisResult {
    pub service_type: AIServiceType,
    pub risk_score: f64,
    pub fraud_probability: f64,
    pub reputation_score: u32,
    pub compliance_flags: Vec<String>,
    pub recommendations: Vec<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

/// AI Analysis Request structure for consensus engine
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAnalysisRequest {
    pub request_id: String,
    pub service_type: AIServiceType,
    pub data: std::collections::HashMap<String, serde_json::Value>,
    pub requester_id: String,
    pub timestamp: u64,
    pub priority: u8, // 1-10, where 10 is highest priority
}

/// AI Service Information for discovery
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIServiceInfo {
    pub service_id: String,
    pub service_type: AIServiceType,
    pub endpoint: String,
    pub capabilities: Vec<String>,
    pub supported_algorithms: Vec<String>,
    pub max_request_size: u64,
    pub average_response_time_ms: u64,
    pub availability_score: f64,
}

// Implementation methods for AIResponseSignature
impl AIResponseSignature {
    /// Create a new signature
    pub fn new(
        algorithm: SignatureAlgorithm,
        signature: Vec<u8>,
        public_key: Vec<u8>,
    ) -> Self {
        Self {
            algorithm,
            signature,
            public_key,
            signature_timestamp: chrono::Utc::now().timestamp() as u64,
            signature_version: 1,
            metadata: None,
        }
    }

    /// Add metadata to the signature
    pub fn with_metadata(mut self, metadata: SignatureMetadata) -> Self {
        self.metadata = Some(metadata);
        self
    }

    /// Add key ID to the signature
    pub fn with_key_id(mut self, key_id: String) -> Self {
        if let Some(ref mut metadata) = self.metadata {
            metadata.key_id = Some(key_id);
        } else {
            self.metadata = Some(SignatureMetadata {
                key_id: Some(key_id),
                cert_chain: None,
                parameters: None,
            });
        }
        self
    }

    /// Get the signature age in seconds
    pub fn age_seconds(&self) -> u64 {
        let now = chrono::Utc::now().timestamp() as u64;
        if now > self.signature_timestamp {
            now - self.signature_timestamp
        } else {
            0
        }
    }

    /// Check if the signature is recent (within the given seconds)
    pub fn is_recent(&self, max_age_seconds: u64) -> bool {
        self.age_seconds() <= max_age_seconds
    }
}

impl OracleIdentity {
    /// Create a new oracle identity
    pub fn new(
        oracle_id: String,
        name: String,
        public_key: Vec<u8>,
        signature_algorithm: SignatureAlgorithm,
    ) -> Self {
        Self {
            oracle_id,
            name,
            public_key,
            signature_algorithm,
            registered_at: chrono::Utc::now().timestamp() as u64,
            reputation_score: 0.0,
            is_active: true,
            certificate_chain: Vec::new(),
        }
    }

    /// Add a certificate to the oracle's chain
    pub fn add_certificate(mut self, certificate: OracleCertificate) -> Self {
        self.certificate_chain.push(certificate);
        self
    }

    /// Update reputation score
    pub fn update_reputation(mut self, score: f64) -> Self {
        self.reputation_score = score.clamp(0.0, 1.0);
        self
    }

    /// Deactivate the oracle
    pub fn deactivate(mut self) -> Self {
        self.is_active = false;
        self
    }

    /// Check if the oracle is trusted (high reputation and active)
    pub fn is_trusted(&self, min_reputation: f64) -> bool {
        self.is_active && self.reputation_score >= min_reputation
    }
}

impl OracleCertificate {
    /// Create a new oracle certificate
    pub fn new(
        subject_oracle_id: String,
        issuer_oracle_id: String,
        valid_from: u64,
        valid_until: u64,
        public_key: Vec<u8>,
        signature_algorithm: SignatureAlgorithm,
        signature: Vec<u8>,
    ) -> Self {
        Self {
            version: 1,
            subject_oracle_id,
            issuer_oracle_id,
            valid_from,
            valid_until,
            public_key,
            signature_algorithm,
            signature,
            extensions: None,
        }
    }

    /// Check if the certificate is currently valid
    pub fn is_valid(&self) -> bool {
        let now = chrono::Utc::now().timestamp() as u64;
        now >= self.valid_from && now <= self.valid_until
    }

    /// Check if the certificate is expired
    pub fn is_expired(&self) -> bool {
        let now = chrono::Utc::now().timestamp() as u64;
        now > self.valid_until
    }

    /// Get days until expiration
    pub fn days_until_expiration(&self) -> i64 {
        let now = chrono::Utc::now().timestamp() as u64;
        if self.valid_until > now {
            ((self.valid_until - now) / 86400) as i64
        } else {
            0
        }
    }
}

impl SignedAIOracleResponse {
    /// Create a new signed response
    pub fn new(
        response: AIResponsePayload,
        signature: AIResponseSignature,
        nonce: u64,
        expires_at: u64,
        oracle_identity: OracleIdentity,
    ) -> Self {
        Self {
            response,
            signature,
            nonce,
            expires_at,
            oracle_identity,
            verification_data: None,
        }
    }

    /// Add verification data
    pub fn with_verification_data(mut self, verification_data: VerificationData) -> Self {
        self.verification_data = Some(verification_data);
        self
    }

    /// Check if the response is expired
    pub fn is_expired(&self) -> bool {
        let now = chrono::Utc::now().timestamp() as u64;
        now > self.expires_at
    }

    /// Check if the response is fresh (not expired)
    pub fn is_fresh(&self) -> bool {
        !self.is_expired()
    }

    /// Get seconds until expiration
    pub fn seconds_until_expiration(&self) -> i64 {
        let now = chrono::Utc::now().timestamp() as u64;
        if self.expires_at > now {
            (self.expires_at - now) as i64
        } else {
            0
        }
    }

    /// Get the canonical data for signature verification
    /// This creates a deterministic byte representation of the response for signing/verification
    pub fn get_signable_data(&self) -> anyhow::Result<Vec<u8>> {
        let mut data = Vec::new();
        
        // Serialize response payload
        let response_bytes = serde_json::to_vec(&self.response)?;
        data.extend_from_slice(&response_bytes);
        
        // Add nonce
        data.extend_from_slice(&self.nonce.to_be_bytes());
        
        // Add expiration
        data.extend_from_slice(&self.expires_at.to_be_bytes());
        
        // Add oracle ID
        data.extend_from_slice(self.oracle_identity.oracle_id.as_bytes());
        
        Ok(data)
    }

    /// Create a summary of the signed response for logging/monitoring
    pub fn get_summary(&self) -> serde_json::Value {
        serde_json::json!({
            "oracle_id": self.oracle_identity.oracle_id,
            "response_id": self.response.id,
            "service_type": self.response.service_type,
            "status": self.response.status,
            "timestamp": self.response.timestamp,
            "expires_at": self.expires_at,
            "signature_algorithm": self.signature.algorithm,
            "oracle_reputation": self.oracle_identity.reputation_score,
            "is_expired": self.is_expired(),
            "is_fresh": self.is_fresh()
        })
    }
}
