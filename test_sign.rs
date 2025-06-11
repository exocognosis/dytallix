// Simple test to debug the signing issue
use std::io::{self, Write};

fn main() {
    println!("🚀 Dytallix Sign Test");
    println!("Post-Quantum AI-Enhanced Cryptocurrency");
    println!();
    
    print!("Enter account passphrase (leave empty if none): ");
    io::stdout().flush().unwrap();
    
    let mut passphrase = String::new();
    match io::stdin().read_line(&mut passphrase) {
        Ok(_) => {
            passphrase = passphrase.trim().to_string();
            println!("You entered: '{}'", passphrase);
            println!("Passphrase length: {}", passphrase.len());
            
            if passphrase.is_empty() {
                println!("No passphrase provided");
            } else {
                println!("Passphrase provided");
            }
        }
        Err(error) => {
            println!("Error reading input: {}", error);
        }
    }
    
    println!("Test completed successfully!");
}
