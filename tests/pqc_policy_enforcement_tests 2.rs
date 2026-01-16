//! Tests for PQC signature policy enforcement
//!
//! This test module validates that the signature policy layer correctly
//! enforces PQC-only transactions across mempool and consensus.

use dytallix_node::policy::{PolicyError, PolicyManager, SignaturePolicy};
use dytallix_pqc::SignatureAlgorithm;
use std::collections::HashSet;

#[cfg(test)]
mod signature_policy_tests {
    use super::*;

    #[test]
    fn test_default_policy_allows_all_pqc() {
        let policy = SignaturePolicy::default();

        // Should allow all PQC algorithms by default
        assert!(policy
            .validate_algorithm(&SignatureAlgorithm::Dilithium5)
            .is_ok());
        assert!(policy
            .validate_algorithm(&SignatureAlgorithm::Falcon1024)
            .is_ok());
        assert!(policy
            .validate_algorithm(&SignatureAlgorithm::SphincsSha256128s)
            .is_ok());

        // Should reject legacy algorithms
        assert!(policy.validate_algorithm_name("ecdsa").is_err());
        assert!(policy.validate_algorithm_name("rsa").is_err());
    }

    #[test]
    fn test_dilithium_only_policy() {
        let mut allowed = HashSet::new();
        allowed.insert(SignatureAlgorithm::Dilithium5);
        let policy = SignaturePolicy::new(allowed);

        // Should only allow Dilithium5
        assert!(policy
            .validate_algorithm(&SignatureAlgorithm::Dilithium5)
            .is_ok());
        assert!(policy
            .validate_algorithm(&SignatureAlgorithm::Falcon1024)
            .is_err());
        assert!(policy
            .validate_algorithm(&SignatureAlgorithm::SphincsSha256128s)
            .is_err());
    }

    #[test]
    fn test_legacy_algorithm_detection() {
        assert!(SignaturePolicy::is_legacy_algorithm("ecdsa"));
        assert!(SignaturePolicy::is_legacy_algorithm("ECDSA"));
        assert!(SignaturePolicy::is_legacy_algorithm("rsa"));
        assert!(SignaturePolicy::is_legacy_algorithm("RSA"));
        assert!(SignaturePolicy::is_legacy_algorithm("ed25519"));
        assert!(SignaturePolicy::is_legacy_algorithm("secp256k1"));
        assert!(SignaturePolicy::is_legacy_algorithm("p256"));

        // Should not consider PQC algorithms as legacy
        assert!(!SignaturePolicy::is_legacy_algorithm("dilithium5"));
        assert!(!SignaturePolicy::is_legacy_algorithm("falcon1024"));
        assert!(!SignaturePolicy::is_legacy_algorithm("sphincssha256128s"));
    }

    #[test]
    fn test_algorithm_name_parsing() {
        let policy = SignaturePolicy::default();

        // Test different case variations
        assert_eq!(
            policy.validate_algorithm_name("dilithium5").unwrap(),
            SignatureAlgorithm::Dilithium5
        );
        assert_eq!(
            policy.validate_algorithm_name("DILITHIUM5").unwrap(),
            SignatureAlgorithm::Dilithium5
        );
        assert_eq!(
            policy.validate_algorithm_name("dilithium").unwrap(),
            SignatureAlgorithm::Dilithium5
        );

        assert_eq!(
            policy.validate_algorithm_name("falcon1024").unwrap(),
            SignatureAlgorithm::Falcon1024
        );
        assert_eq!(
            policy.validate_algorithm_name("falcon").unwrap(),
            SignatureAlgorithm::Falcon1024
        );

        assert_eq!(
            policy.validate_algorithm_name("sphincs+").unwrap(),
            SignatureAlgorithm::SphincsSha256128s
        );
        assert_eq!(
            policy.validate_algorithm_name("sphincssha256128s").unwrap(),
            SignatureAlgorithm::SphincsSha256128s
        );
    }

    #[test]
    fn test_legacy_rejection() {
        let policy = SignaturePolicy::default();

        // Should reject legacy algorithms when reject_legacy is true (default)
        assert!(matches!(
            policy.validate_algorithm_name("ecdsa"),
            Err(PolicyError::LegacyAlgorithmRejected(_))
        ));

        assert!(matches!(
            policy.validate_algorithm_name("rsa"),
            Err(PolicyError::LegacyAlgorithmRejected(_))
        ));

        assert!(matches!(
            policy.validate_algorithm_name("ed25519"),
            Err(PolicyError::LegacyAlgorithmRejected(_))
        ));
    }

    #[test]
    fn test_unknown_algorithm_rejection() {
        let policy = SignaturePolicy::default();

        assert!(matches!(
            policy.validate_algorithm_name("unknown_algorithm"),
            Err(PolicyError::UnknownAlgorithm(_))
        ));

        assert!(matches!(
            policy.validate_algorithm_name(""),
            Err(PolicyError::UnknownAlgorithm(_))
        ));
    }

    #[test]
    fn test_policy_manager() {
        let mut manager = PolicyManager::default();

        // Should allow Dilithium5 by default
        assert!(manager
            .validate_transaction_algorithm(&SignatureAlgorithm::Dilithium5)
            .is_ok());
        assert!(manager
            .validate_transaction_algorithm(&SignatureAlgorithm::Falcon1024)
            .is_ok());

        // Update to a more restrictive policy
        let mut allowed = HashSet::new();
        allowed.insert(SignatureAlgorithm::Dilithium5);
        let restrictive_policy = SignaturePolicy::new(allowed);
        manager.update_policy(restrictive_policy);

        // Should now only allow Dilithium5
        assert!(manager
            .validate_transaction_algorithm(&SignatureAlgorithm::Dilithium5)
            .is_ok());
        assert!(manager
            .validate_transaction_algorithm(&SignatureAlgorithm::Falcon1024)
            .is_err());
    }

    #[test]
    fn test_enforcement_flags() {
        let mut policy = SignaturePolicy::default();

        // Test enforcement flags
        assert!(policy.should_enforce_at_mempool());
        assert!(policy.should_enforce_at_consensus());

        // Disable mempool enforcement
        policy.enforce_at_mempool = false;
        assert!(!policy.should_enforce_at_mempool());
        assert!(policy.should_enforce_at_consensus());

        // Disable consensus enforcement
        policy.enforce_at_consensus = false;
        assert!(!policy.should_enforce_at_mempool());
        assert!(!policy.should_enforce_at_consensus());
    }

    #[test]
    fn test_allowed_algorithm_names() {
        let policy = SignaturePolicy::default();
        let allowed_names = policy.allowed_algorithm_names();

        // Should contain all default PQC algorithms
        assert!(allowed_names.contains(&"Dilithium5".to_string()));
        assert!(allowed_names.contains(&"Falcon1024".to_string()));
        assert!(allowed_names.contains(&"SphincsSha256128s".to_string()));
        assert_eq!(allowed_names.len(), 3);
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_mempool_policy_integration() {
        // This would test the actual mempool integration
        // For now, just test that policy manager can be created and used
        let policy_manager = PolicyManager::default();

        // Simulate mempool validation
        let transaction_algorithm = SignatureAlgorithm::Dilithium5;
        let result = policy_manager.validate_transaction_algorithm(&transaction_algorithm);
        assert!(result.is_ok());

        // Test with disallowed algorithm in restrictive policy
        let mut allowed = HashSet::new();
        allowed.insert(SignatureAlgorithm::Falcon1024);
        let restrictive_policy = SignaturePolicy::new(allowed);
        let restrictive_manager = PolicyManager::new(restrictive_policy);

        let result =
            restrictive_manager.validate_transaction_algorithm(&SignatureAlgorithm::Dilithium5);
        assert!(result.is_err());
    }

    #[test]
    fn test_consensus_policy_integration() {
        // This would test the actual consensus integration
        // For now, just test that policy enforcement works
        let policy_manager = PolicyManager::default();

        // All PQC algorithms should be allowed by default
        assert!(policy_manager.policy().should_enforce_at_consensus());
        assert!(policy_manager
            .validate_transaction_algorithm(&SignatureAlgorithm::Dilithium5)
            .is_ok());
        assert!(policy_manager
            .validate_transaction_algorithm(&SignatureAlgorithm::Falcon1024)
            .is_ok());
        assert!(policy_manager
            .validate_transaction_algorithm(&SignatureAlgorithm::SphincsSha256128s)
            .is_ok());
    }
}
