use dytallix_node::types::{PQCTransactionSignature, Transaction};
use dytallix_pqc::{PQCError, PQCManager, SignatureAlgorithm};
use sha2::{Digest, Sha256};

pub struct Wallet {
    manager: PQCManager,
    address: String,
}

impl Wallet {
    /// Create a new wallet with a fresh keypair (Dilithium3 default)
    pub fn new() -> Result<Self, PQCError> {
        let manager = PQCManager::new()?;
        let address = Self::derive_address(manager.get_signature_public_key());
        Ok(Self { manager, address })
    }

    /// Load or create wallet from file (auto-generated if missing)
    pub fn load_or_generate<P: AsRef<std::path::Path>>(path: P) -> Result<Self, PQCError> {
        let manager = PQCManager::load_or_generate(path)?;
        let address = Self::derive_address(manager.get_signature_public_key());
        Ok(Self { manager, address })
    }

    pub fn address(&self) -> &str {
        &self.address
    }

    pub fn public_key(&self) -> &[u8] {
        self.manager.get_signature_public_key()
    }

    /// Sign data and return a PQCTransactionSignature
    pub fn sign(&self, message: &[u8]) -> Result<PQCTransactionSignature, PQCError> {
        let signature = self.manager.sign(message)?;
        Ok(PQCTransactionSignature {
            signature,
            public_key: self.manager.get_signature_public_key().to_vec(),
        })
    }

    /// Switch signature algorithm (e.g. to Falcon1024)
    pub fn switch_algorithm(&mut self, alg: SignatureAlgorithm) -> Result<(), PQCError> {
        self.manager.switch_signature_algorithm(alg)?;
        // Address changes when public key changes!
        self.address = Self::derive_address(self.manager.get_signature_public_key());
        Ok(())
    }

    /// Derive address from public key (matches Node implementation)
    /// Format: dyt1 + hex(blake3(pubkey)[..20] + checksum[..4])
    fn derive_address(pubkey: &[u8]) -> String {
        // Step 1: Hash the public key using Blake3
        let hash = blake3::hash(pubkey);
        let hash_bytes = hash.as_bytes();

        // Step 2: Take first 20 bytes
        let address_bytes = &hash_bytes[..20];

        // Step 3: Calculate checksum using SHA256
        let mut sha256 = Sha256::new();
        sha256.update(address_bytes);
        let checksum = sha256.finalize();

        // Step 4: Append first 4 bytes of checksum
        let checksum_bytes = &checksum[..4];

        // Step 5: Combine
        let mut full_bytes = Vec::with_capacity(24);
        full_bytes.extend_from_slice(address_bytes);
        full_bytes.extend_from_slice(checksum_bytes);

        // Step 6: Encode and prefix
        format!("dyt1{}", hex::encode(full_bytes))
    }
}
