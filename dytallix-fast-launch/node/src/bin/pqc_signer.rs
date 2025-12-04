use std::env;
use std::io::{self, Read};
use fips204::ml_dsa_65; // Dilithium3 equivalent (NIST Level 3) - or check what node uses.
// Node uses fips204. Let's check which parameter set is standard. Usually 65 or 87.
// Let's use ml_dsa_65 as a safe default for "Dilithium5" equivalent or similar.
// Wait, Dilithium5 is Level 5, which is ml_dsa_87. Dilithium3 is ml_dsa_65.
// The user asked for "Dilithium".
// Let's check what `node` uses. It just imports `fips204`.
// I'll use ml_dsa_87 (Level 5) to be safe and "strongest".

use fips204::ml_dsa_87; 
use fips204::traits::{KeyGen, Signer, Verifier, SerDes};
use base64::{engine::general_purpose::STANDARD as B64, Engine};

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: pqc_signer <command> [args...]");
        eprintln!("Commands:");
        eprintln!("  keygen              -> prints sk_b64 pk_b64");
        eprintln!("  sign <sk_b64> <msg> -> prints sig_b64");
        std::process::exit(1);
    }

    let command = &args[1];

    match command.as_str() {
        "keygen" => {
            let (pk, sk) = ml_dsa_87::KG::try_keygen().unwrap();
            println!("{} {}", B64.encode(sk.into_bytes()), B64.encode(pk.into_bytes()));
        }
        "sign" => {
            if args.len() < 4 {
                eprintln!("Usage: pqc_signer sign <sk_b64> <msg>");
                std::process::exit(1);
            }
            let sk_b64 = &args[2];
            let msg = &args[3];

            let sk_bytes_vec = B64.decode(sk_b64).expect("Invalid base64 SK");
            if sk_bytes_vec.len() != 4896 {
                eprintln!("Invalid SK length: expected 4896, got {}", sk_bytes_vec.len());
                std::process::exit(1);
            }
            let mut sk_arr = [0u8; 4896];
            sk_arr.copy_from_slice(&sk_bytes_vec);
            
            let sk = ml_dsa_87::PrivateKey::try_from_bytes(sk_arr).expect("Invalid SK bytes");
            
            // ML-DSA requires a context string (domain separation). We use empty for now or specific.
            let ctx = b"dytallix-oracle";
            let sig = sk.try_sign(msg.as_bytes(), ctx).expect("Signing failed");
            println!("{}", B64.encode(sig));
        }
        _ => {
            eprintln!("Unknown command: {}", command);
            std::process::exit(1);
        }
    }
}
