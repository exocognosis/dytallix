#!/bin/bash

# Demo script showing the new PQC CLI functionality
# This simulates the CLI commands without actually building/running them

echo "🔐 Dytallix PQC Wallet CLI Demo"
echo "==============================="
echo

echo "1. Creating a new PQC wallet (default behavior):"
echo "$ dcli keys new alice"
echo
echo "Output:"
echo "Created alice dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3 (pqc)"
echo

echo "2. Creating a legacy secp256k1 wallet (deprecated):"
echo "$ dcli keys new bob --legacy-secp"
echo
echo "Output:"
echo "⚠️  Using deprecated legacy secp256k1 algorithm"
echo "Created bob dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6 (secp256k1)"
echo

echo "3. Listing wallets with algorithm information:"
echo "$ dcli keys list"
echo
echo "Output:"
echo "NAME    ADDRESS                                        ALGORITHM   CREATED"
echo "alice   dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k...  pqc         1643723400"
echo "bob     dyt1e1c820e653bb12629306be2af671e2aab83074c...  secp256k1   1643723450"
echo

echo "4. Creating wallet with explicit algorithm selection:"
echo "$ dcli keys new charlie --algo pqc"
echo
echo "Output:"
echo "Created charlie dytallix1receiver123456789abcdef123456789... (pqc)"
echo

echo "5. Showing wallet information in JSON format:"
echo "$ dcli keys list --output json"
echo
echo "Output:"
echo '['
echo '  {'
echo '    "name": "alice",'
echo '    "address": "dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3",'
echo '    "algorithm": "pqc",'
echo '    "created": 1643723400'
echo '  },'
echo '  {'
echo '    "name": "bob",'
echo '    "address": "dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6",'
echo '    "algorithm": "secp256k1",'
echo '    "created": 1643723450'
echo '  }'
echo ']'
echo

echo "6. Signing a transaction with PQC wallet:"
echo "$ dcli tx transfer alice dytallix1receiver... 1000udyt"
echo
echo "Output:"
echo "🔐 Using PQC (Dilithium5) signature"
echo "📝 Transaction signed with quantum-resistant cryptography"
echo "✅ Transaction broadcast successfully: 0xabc123..."
echo "📊 Gas used: 73,450 (PQC signature overhead: ~10x)"
echo

echo "7. Address format comparison:"
echo
echo "Legacy format (Blake3-based):"
echo "  dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6"
echo "  ├─ Prefix: dyt1 (4 chars)"
echo "  ├─ Body: 40 hex chars (20 bytes Blake3 hash)"
echo "  └─ Checksum: 4 hex chars (2 bytes SHA3)"
echo
echo "PQC format (bech32-style):"
echo "  dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3"
echo "  ├─ Prefix: dytallix (8 chars)"
echo "  └─ Hash: 40 hex chars (20 bytes RIPEMD160(SHA256(pubkey)))"
echo

echo "8. Testing deterministic wallet generation:"
echo "$ echo 'test passphrase' | dcli keys new test1 --deterministic"
echo "$ echo 'test passphrase' | dcli keys new test2 --deterministic"
echo
echo "Output:"
echo "test1   dytallix1abc123...  pqc  1643723500"
echo "test2   dytallix1abc123...  pqc  1643723501"
echo "✅ Same passphrase produces identical addresses"
echo

echo "9. Security recommendations:"
echo
echo "✅ Best Practices:"
echo "  • Use PQC wallets for new accounts (quantum-resistant)"
echo "  • Migrate legacy wallets to PQC format"
echo "  • Use strong passphrases (12+ words)"
echo "  • Enable random salt mode for production"
echo
echo "⚠️  Legacy Support:"
echo "  • --legacy-secp flag for backward compatibility"
echo "  • Hidden in help (deprecated)"
echo "  • Will be removed in future versions"
echo

echo "10. Feature comparison:"
echo
echo "| Feature              | Legacy (secp256k1) | PQC (Dilithium5) |"
echo "|----------------------|-------------------|------------------|"
echo "| Quantum Resistant    | ❌ No             | ✅ Yes           |"
echo "| Signature Size       | ~64 bytes         | ~4,595 bytes     |"
echo "| Public Key Size      | ~33 bytes         | ~2,592 bytes     |"
echo "| Gas Cost Multiplier  | 1x                | ~10x             |"
echo "| Address Format       | dyt1...           | dytallix...      |"
echo "| Default in CLI       | ❌ No             | ✅ Yes           |"
echo "| NIST Standardized    | ❌ No             | ✅ Yes           |"
echo

echo "🎯 Summary:"
echo "   • PQC wallets are now the default for new accounts"
echo "   • Legacy secp256k1 support via --legacy-secp flag"
echo "   • Deterministic key derivation for test vectors"
echo "   • Standardized dytallix address format"
echo "   • Quantum-resistant signature algorithm (Dilithium5)"
echo "   • Comprehensive documentation and testing"
echo
echo "📖 For detailed information, see docs/WALLET.md"
echo "🧪 For testing, run: scripts/validate_pqc_implementation.sh"
echo
echo "✨ The future is quantum-safe! ✨"