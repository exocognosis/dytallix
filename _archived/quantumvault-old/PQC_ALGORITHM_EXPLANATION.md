# Post-Quantum Cryptography (PQC) Algorithm Explanation

## Overview
Post-Quantum Cryptography uses different types of algorithms for different purposes. The QuantumVault demo now clearly separates these into two categories:

## Algorithm Categories

### 1. Key Encapsulation Mechanisms (KEM)
**Purpose:** Secure key exchange and encryption
**Used for:** Encrypting symmetric keys that protect your data

#### Available Options:
- **Kyber-512** (Fast, Standard Security - NIST Level 1)
- **Kyber-768** (Balanced, High Security - NIST Level 3) ✨ Recommended
- **Kyber-1024** (Strongest, Maximum Security - NIST Level 5)
- **NTRU** (Alternative Lattice-based)
- **Classic McEliece** (Code-based, very large keys)

### 2. Digital Signature Algorithms
**Purpose:** Authentication and integrity verification
**Used for:** Proving who created/signed the data and detecting tampering

#### Available Options:
- **Dilithium-2** (Fast, NIST Level 2)
- **Dilithium-3** (Balanced, NIST Level 3) ✨ Recommended
- **Dilithium-5** (Maximum Security, NIST Level 5)
- **SPHINCS+-128f** (Hash-based, small signatures)
- **SPHINCS+-256f** (Hash-based, highest security)
- **Falcon-512** (Compact, NIST Level 1)
- **Falcon-1024** (Compact, NIST Level 5)

## Why Two Different Types?

Think of it like a physical mail system:
- **KEM (Key Encapsulation)** = The lock on the mailbox (encryption)
- **Digital Signature** = Your signature on the letter (authentication)

You need both to ensure:
1. Only the intended recipient can read the message (KEM)
2. The recipient knows it's really from you (Signature)

## Hybrid Protection

QuantumVault uses a **hybrid approach** for maximum security:

```
Your File
    ↓
[1] KEM Algorithm (e.g., Kyber-1024)
    → Generates/protects the encryption key
    ↓
[2] Symmetric Encryption (AES-256-GCM)
    → Actually encrypts your data (fast!)
    ↓
[3] Digital Signature (e.g., Dilithium-3)
    → Signs the encrypted data for authentication
    ↓
[4] Hash Function (BLAKE3)
    → Creates integrity fingerprint
    ↓
[5] Blockchain Anchoring
    → Immutable proof of existence
```

## Dashboard Stats vs Selection Dropdown

### Dashboard Stats Section
Shows **encrypted assets** that are already protected:
- Counts assets using each algorithm
- Updates in real-time as you encrypt files
- Shows "Kyber", "Dilithium", "SPHINCS+" generically (all variants)

### File Encryption Dropdown
Shows **specific algorithm variants** you can choose:
- KEM dropdown: Select which Kyber/NTRU/McEliece variant
- Signature dropdown: Select which Dilithium/SPHINCS+/Falcon variant
- Both selections are saved with each encrypted asset

## Why Can't I Select Dilithium for File Encryption?

You **can** now! We've added a separate dropdown for digital signatures. Previously, the UI only showed KEM algorithms because they're used for the actual encryption. But signatures are equally important, so now you can choose both:

1. **KEM Algorithm** → For encrypting the data
2. **Signature Algorithm** → For signing and authenticating the data

## NIST Security Levels

- **Level 1** ≈ Equivalent to AES-128 (128-bit security)
- **Level 2** ≈ Equivalent to SHA-256 (192-bit security)
- **Level 3** ≈ Equivalent to AES-192 (192-bit security) ✨ Sweet spot
- **Level 4** ≈ Equivalent to SHA-384 (256-bit security)
- **Level 5** ≈ Equivalent to AES-256 (256-bit security) 🔒 Maximum

## Recommendations

### For Most Users:
- **KEM:** Kyber-768 (NIST Level 3)
- **Signature:** Dilithium-3 (NIST Level 3)

### For Maximum Security:
- **KEM:** Kyber-1024 (NIST Level 5)
- **Signature:** Dilithium-5 (NIST Level 5)

### For Fastest Performance:
- **KEM:** Kyber-512 (NIST Level 1)
- **Signature:** Dilithium-2 (NIST Level 2)

### For Alternative/Diversity:
- **KEM:** NTRU or Classic McEliece
- **Signature:** SPHINCS+ (hash-based, very conservative)

## Changes Made to UI

1. ✅ Added separate "PQC Digital Signature" dropdown
2. ✅ Renamed "PQC Algorithm" to "PQC Key Encapsulation (KEM)"
3. ✅ Added helper text explaining each field's purpose
4. ✅ Updated dashboard to count encrypted assets (not policies)
5. ✅ Changed "Active policies" to "Encrypted assets" / "Signed assets"
6. ✅ Clarified that dashboard shows "PQC ENCRYPTED ASSETS"
7. ✅ Updated encryption info box to show full hybrid stack

Now users can see and select all available PQC algorithms with clear explanations of what each one does!
