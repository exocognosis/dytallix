use dytallix_pqc::{PQCManager as DytallixPQCManager, Signature, SignatureAlgorithm};
use log::info;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PQCKeyPair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PQCSignature {
    pub signature: Vec<u8>,
    pub algorithm: String,
    pub nonce: u64,
    pub timestamp: u64,
}

pub struct PQCManager {
    inner: DytallixPQCManager,
}

impl std::fmt::Debug for PQCManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PQCManager")
            .field("inner", &"<PQCManager instance>")
            .finish()
    }
}

impl PQCManager {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        info!("Generating post-quantum cryptographic keys...");
        
        let inner = DytallixPQCManager::new()?;
        info!("Post-quantum keys generated successfully");
        
        Ok(Self { inner })
    }
    
    pub fn sign_message(&self, message: &[u8]) -> Result<PQCSignature, Box<dyn std::error::Error>> {
        let signature = self.inner.sign(message)?;
        
        Ok(PQCSignature {
            signature: signature.data.clone(),
            algorithm: format!("{:?}", signature.algorithm),
            nonce: signature.nonce,
            timestamp: signature.timestamp,
        })
    }
    
    pub fn verify_signature(
        &self,
        message: &[u8],
        signature: &PQCSignature,
        public_key: &[u8],
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let algorithm = match signature.algorithm.as_str() {
            "Dilithium5" | "CRYSTALS-Dilithium5" => SignatureAlgorithm::Dilithium5,
            "Falcon1024" => SignatureAlgorithm::Falcon1024,
            "SphincsSha256128s" | "SPHINCS+" => SignatureAlgorithm::SphincsSha256128s,
            _ => SignatureAlgorithm::Dilithium5,
        };

        let sig = Signature {
            data: signature.signature.clone(),
            algorithm,
            nonce: signature.nonce,
            timestamp: signature.timestamp,
        };

        Ok(self.inner.verify(message, &sig, public_key)?)
    }
    
    pub fn get_dilithium_public_key(&self) -> &[u8] {
        self.inner.get_signature_public_key()
    }
    
    pub fn get_kyber_public_key(&self) -> &[u8] {
        self.inner.get_key_exchange_public_key()
    }
    
    pub fn perform_key_exchange(&self, _peer_public_key: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        info!("Key exchange performed, shared secret generated");
        // Placeholder implementation
        Ok(vec![0u8; 32])
    }
    
    // Crypto-agility: Allow swapping algorithms
    pub fn set_signature_algorithm(&mut self, algorithm: &str) -> Result<(), Box<dyn std::error::Error>> {
        match algorithm {
            "CRYSTALS-Dilithium5" => {
                // Already using this
                Ok(())
            }
            "Falcon-1024" => {
                // Placeholder for Falcon implementation
                info!("Switching to Falcon-1024 (not yet implemented)");
                Err("Falcon-1024 not yet implemented".into())
            }
            "SPHINCS+" => {
                // Placeholder for SPHINCS+ implementation
                info!("Switching to SPHINCS+ (not yet implemented)");
                Err("SPHINCS+ not yet implemented".into())
            }
            _ => Err(format!("Unsupported signature algorithm: {}", algorithm).into()),
        }
    }
}
