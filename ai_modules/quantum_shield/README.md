# Quantum Shield - Post-Quantum Cryptography Management Module

## Overview
The Quantum Shield module manages post-quantum cryptography transitions and key entropy monitoring using rule-based systems combined with Reinforcement Learning. It ensures quantum-resistant security and optimal cryptographic parameter management.

## Architecture
- **Primary Model**: Rule-Based Expert System for cryptographic decisions
- **Secondary Model**: Reinforcement Learning for parameter optimization
- **Framework**: H(X) = -Σ p(xi) log p(xi) (Shannon entropy)
- **Training**: 5k-50k episodes for RL optimization

## Features
- Post-quantum cryptographic algorithm selection
- Key entropy monitoring and management
- Cryptographic parameter optimization
- Quantum threat assessment
- Migration planning and execution
- Security protocol validation

## Cryptographic Elements
- **Classical Algorithms**: RSA, ECDSA, AES (legacy support)
- **Post-Quantum Algorithms**: CRYSTALS-Kyber, CRYSTALS-Dilithium, FALCON, SPHINCS+
- **Entropy Sources**: Hardware RNG, network randomness, environmental noise
- **Key Management**: Generation, rotation, escrow, recovery

## Input Format
```json
{
  "cryptographic_state": {
    "current_algorithms": [string],
    "key_strengths": {string: int},
    "entropy_sources": [
      {
        "source_id": string,
        "entropy_rate": float,
        "quality_score": float,
        "availability": float
      }
    ],
    "quantum_threat_level": float,
    "migration_status": {
      "classical_usage": float,
      "pq_usage": float,
      "hybrid_usage": float
    }
  },
  "network_context": {
    "transaction_volume": int,
    "signature_operations": int,
    "key_generation_requests": int,
    "performance_requirements": {
      "max_signature_time": float,
      "max_verification_time": float,
      "max_key_size": int
    }
  },
  "security_requirements": {
    "security_level": int,
    "quantum_resistance": boolean,
    "compliance_standards": [string],
    "risk_tolerance": float
  }
}
```

## Output Format
```json
{
  "cryptographic_recommendations": {
    "primary_algorithm": string,
    "backup_algorithms": [string],
    "key_parameters": {
      "key_size": int,
      "security_level": int,
      "rotation_period": int
    },
    "entropy_requirements": {
      "min_entropy_rate": float,
      "required_sources": int,
      "quality_threshold": float
    }
  },
  "quantum_assessment": {
    "threat_level": "low|medium|high|critical",
    "time_to_quantum_advantage": int,
    "vulnerable_algorithms": [string],
    "migration_urgency": "immediate|short_term|medium_term|long_term"
  },
  "migration_plan": {
    "phases": [
      {
        "phase_name": string,
        "duration_days": int,
        "algorithms_to_add": [string],
        "algorithms_to_deprecate": [string],
        "risk_level": string
      }
    ],
    "total_migration_time": int,
    "rollback_plan": boolean
  },
  "performance_impact": {
    "signature_time_increase": float,
    "verification_time_increase": float,
    "key_size_increase": float,
    "storage_requirements": float
  }
}
```

## Usage
```python
from quantum_shield.train import QuantumShieldModel

# Initialize and train
model = QuantumShieldModel()
model.train()

# Assess and optimize
result = model.optimize_cryptography(cryptographic_state)
```

## Training
- Run `python train.py` to train RL agent for parameter optimization
- Rule base is constructed from cryptographic best practices
- Models are saved in the `models/` directory
- Security and performance metrics are logged to `metrics.json`

## Configuration
See `config.json` for cryptographic algorithms, security parameters, migration rules, and optimization settings.

## Dependencies
See `requirements.txt` for required packages including cryptographic libraries.