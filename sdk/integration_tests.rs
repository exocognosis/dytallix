//! Integration test for PQC transaction signing
//!
//! This test validates that PQC-signed transactions can be properly created
//! and would be accepted by the node (using mock implementation).

use anyhow::Result;
use dytallix_sdk::{PQCWallet, PublicKeyProto};
use serde_json::json;

/// Mock transaction structure for testing
#[derive(Debug, Clone)]
pub struct MockTransaction {
    pub from_address: String,
    pub to_address: String,
    pub amount: u64,
    pub fee: u64,
    pub sequence: u64,
    pub chain_id: String,
}

/// Mock sign document structure
#[derive(Debug, Clone)]
pub struct SignDoc {
    pub account_number: String,
    pub chain_id: String,
    pub fee: serde_json::Value,
    pub memo: String,
    pub msgs: Vec<serde_json::Value>,
    pub sequence: String,
}

/// Mock signed transaction result
#[derive(Debug, Clone)]
pub struct SignedTransaction {
    pub tx: MockTransaction,
    pub signature: Vec<u8>,
    pub public_key: PublicKeyProto,
    pub sign_doc: SignDoc,
}

impl MockTransaction {
    pub fn new(from: &str, to: &str, amount: u64) -> Self {
        Self {
            from_address: from.to_string(),
            to_address: to.to_string(),
            amount,
            fee: 1000,
            sequence: 0,
            chain_id: "dytallix-testnet-1".to_string(),
        }
    }

    /// Create Cosmos SDK sign document
    pub fn to_sign_doc(&self) -> SignDoc {
        let msg = json!({
            "@type": "/cosmos.bank.v1beta1.MsgSend",
            "from_address": self.from_address,
            "to_address": self.to_address,
            "amount": [{
                "denom": "udyt",
                "amount": self.amount.to_string()
            }]
        });

        let fee = json!({
            "amount": [{
                "denom": "udyt",
                "amount": self.fee.to_string()
            }],
            "gas": "200000"
        });

        SignDoc {
            account_number: "0".to_string(),
            chain_id: self.chain_id.clone(),
            fee,
            memo: "".to_string(),
            msgs: vec![msg],
            sequence: self.sequence.to_string(),
        }
    }

    /// Sign transaction with PQC wallet
    pub fn sign_with_pqc(&self, wallet: &PQCWallet) -> Result<SignedTransaction> {
        let sign_doc = self.to_sign_doc();

        // Serialize sign doc to canonical JSON
        let sign_bytes = canonical_json(&sign_doc)?;

        // Sign the transaction
        let signature_obj = wallet.sign_transaction(sign_bytes.as_bytes())?;
        let public_key = wallet.public_key_proto();

        Ok(SignedTransaction {
            tx: self.clone(),
            signature: signature_obj.data,
            public_key,
            sign_doc,
        })
    }
}

/// Convert sign doc to canonical JSON for signing
fn canonical_json(sign_doc: &SignDoc) -> Result<String> {
    let json_obj = json!({
        "account_number": sign_doc.account_number,
        "chain_id": sign_doc.chain_id,
        "fee": sign_doc.fee,
        "memo": sign_doc.memo,
        "msgs": sign_doc.msgs,
        "sequence": sign_doc.sequence
    });

    Ok(serde_json::to_string(&json_obj)?)
}

/// Mock node that validates transactions
pub struct MockNode {
    pub accepted_transactions: Vec<SignedTransaction>,
}

impl MockNode {
    pub fn new() -> Self {
        Self {
            accepted_transactions: Vec::new(),
        }
    }

    /// Validate and accept a PQC-signed transaction
    pub fn validate_and_accept(&mut self, signed_tx: SignedTransaction) -> Result<String> {
        // Validate signature format
        if signed_tx.public_key.type_url != "/dytallix.crypto.pqc.v1beta1.PubKey" {
            return Err(anyhow::anyhow!("Invalid public key type"));
        }

        if signed_tx.public_key.algorithm != "dilithium5" {
            return Err(anyhow::anyhow!("Unsupported algorithm"));
        }

        // Validate signature size (Dilithium5 signatures are ~4595 bytes)
        if signed_tx.signature.len() < 4000 || signed_tx.signature.len() > 5000 {
            return Err(anyhow::anyhow!("Invalid signature size"));
        }

        // Validate address format
        if !signed_tx.tx.from_address.starts_with("dytallix") {
            return Err(anyhow::anyhow!("Invalid address format"));
        }

        // Store accepted transaction
        let tx_hash = format!("0x{}", hex::encode(&signed_tx.signature[0..32]));
        self.accepted_transactions.push(signed_tx);

        Ok(tx_hash)
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    /// Integration test: PQC-signed transaction acceptance
    /// Requirement: PQC-signed transactions must be accepted by the node
    #[test]
    fn test_pqc_transaction_acceptance() {
        // Create PQC wallet
        let wallet = PQCWallet::new_deterministic("integration test wallet").unwrap();
        let sender_address = wallet.address();

        // Create transaction
        let tx = MockTransaction::new(
            &sender_address,
            "dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3",
            1000000, // 1 DYT
        );

        // Sign transaction
        let signed_tx = tx.sign_with_pqc(&wallet).unwrap();

        // Validate signature format
        assert_eq!(
            signed_tx.public_key.type_url,
            "/dytallix.crypto.pqc.v1beta1.PubKey"
        );
        assert_eq!(signed_tx.public_key.algorithm, "dilithium5");
        assert!(!signed_tx.signature.is_empty());

        // Submit to mock node
        let mut node = MockNode::new();
        let tx_hash = node.validate_and_accept(signed_tx).unwrap();

        assert!(!tx_hash.is_empty());
        assert_eq!(node.accepted_transactions.len(), 1);
    }

    /// Test transaction with legacy address rejection
    /// Requirement: Legacy addresses should be phased out
    #[test]
    fn test_legacy_address_rejection() {
        let mut node = MockNode::new();

        // Create transaction with legacy address format
        let tx = MockTransaction::new(
            "dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6", // Legacy format
            "dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3",
            1000000,
        );

        // Create mock signed transaction
        let signed_tx = SignedTransaction {
            tx,
            signature: vec![0; 4595], // Mock signature
            public_key: PublicKeyProto {
                type_url: "/dytallix.crypto.pqc.v1beta1.PubKey".to_string(),
                key_bytes: vec![0; 2592], // Mock public key
                algorithm: "dilithium5".to_string(),
            },
            sign_doc: SignDoc {
                account_number: "0".to_string(),
                chain_id: "dytallix-testnet-1".to_string(),
                fee: json!({}),
                memo: "".to_string(),
                msgs: vec![],
                sequence: "0".to_string(),
            },
        };

        // Should reject legacy address format
        let result = node.validate_and_accept(signed_tx);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid address format"));
    }

    /// Test signature verification round-trip
    /// Requirement: Signatures must be verifiable
    #[test]
    fn test_signature_verification_round_trip() {
        let wallet = PQCWallet::new_deterministic("verification test").unwrap();
        let sender_address = wallet.address();

        let tx = MockTransaction::new(
            &sender_address,
            "dytallix1receiver123456789abcdef123456789abcdef12",
            500000,
        );

        let signed_tx = tx.sign_with_pqc(&wallet).unwrap();

        // Re-create sign doc and verify signature
        let sign_bytes = canonical_json(&signed_tx.sign_doc).unwrap();
        let signature_obj = dytallix_pqc::Signature {
            data: signed_tx.signature,
            algorithm: dytallix_pqc::SignatureAlgorithm::Dilithium5,
        };

        let is_valid = wallet
            .verify_signature(sign_bytes.as_bytes(), &signature_obj)
            .unwrap();
        assert!(is_valid);
    }

    /// Test gas estimation for PQC transactions
    /// Requirement: Document gas impact of larger signatures
    #[test]
    fn test_gas_cost_estimation() {
        let wallet = PQCWallet::new_deterministic("gas test").unwrap();
        let signed_tx = MockTransaction::new(
            wallet.address(),
            "dytallix1receiver123456789abcdef123456789abcdef12",
            1000,
        )
        .sign_with_pqc(&wallet)
        .unwrap();

        // Calculate signature overhead
        let signature_size = signed_tx.signature.len();
        let public_key_size = signed_tx.public_key.key_bytes.len();

        // Estimate gas cost (mock calculation)
        let base_gas = 21000; // Base transaction cost
        let signature_gas = signature_size * 16; // ~16 gas per byte for signature verification
        let total_gas = base_gas + signature_gas;

        println!("Gas estimation for PQC transaction:");
        println!("  Signature size: {} bytes", signature_size);
        println!("  Public key size: {} bytes", public_key_size);
        println!("  Estimated gas: {}", total_gas);

        // Verify PQC transactions require significantly more gas
        assert!(
            total_gas > 50000,
            "PQC transactions should require more gas than legacy"
        );

        // Document the gas multiplier
        let gas_multiplier = total_gas as f64 / base_gas as f64;
        assert!(gas_multiplier > 3.0, "PQC gas multiplier should be > 3x");

        println!("  Gas multiplier: {:.1}x", gas_multiplier);
    }

    /// Test multiple wallet deterministic generation
    /// Requirement: Same passphrase always generates same wallet
    #[test]
    fn test_wallet_reproducibility() {
        let passphrase = "reproducibility test passphrase";

        // Generate multiple wallets with same passphrase
        let wallets: Vec<_> = (0..5)
            .map(|_| PQCWallet::new_deterministic(passphrase).unwrap())
            .collect();

        // All wallets should have identical addresses and keys
        let first_address = wallets[0].address();
        let first_pubkey = wallets[0].public_key();

        for wallet in &wallets[1..] {
            assert_eq!(wallet.address(), first_address);
            assert_eq!(wallet.public_key(), first_pubkey);
        }

        // All wallets should produce identical signatures for same message
        let message = b"test message for reproducibility";
        let signatures: Vec<_> = wallets
            .iter()
            .map(|w| w.sign_transaction(message).unwrap())
            .collect();

        let first_signature = &signatures[0];
        for signature in &signatures[1..] {
            assert_eq!(signature.data, first_signature.data);
        }
    }

    /// Test chain ID validation
    /// Requirement: Transactions must be bound to specific chain
    #[test]
    fn test_chain_id_binding() {
        let wallet = PQCWallet::new_deterministic("chain test").unwrap();

        // Create transactions for different chains
        let mut tx1 = MockTransaction::new(
            wallet.address(),
            "dytallix1receiver123456789abcdef123456789abcdef12",
            1000,
        );
        tx1.chain_id = "dytallix-mainnet-1".to_string();

        let mut tx2 = MockTransaction::new(
            wallet.address(),
            "dytallix1receiver123456789abcdef123456789abcdef12",
            1000,
        );
        tx2.chain_id = "dytallix-testnet-1".to_string();

        let signed_tx1 = tx1.sign_with_pqc(&wallet).unwrap();
        let signed_tx2 = tx2.sign_with_pqc(&wallet).unwrap();

        // Signatures should be different due to different chain IDs
        assert_ne!(signed_tx1.signature, signed_tx2.signature);
        assert_ne!(signed_tx1.sign_doc.chain_id, signed_tx2.sign_doc.chain_id);
    }
}
