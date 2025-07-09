use colored::*;

pub fn print_welcome() {
    println!("{}", r#"
██████╗ ██╗   ██╗████████╗ █████╗ ██╗     ██╗     ██╗██╗  ██╗
██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔══██╗██║     ██║     ██║╚██╗██╔╝
██║  ██║ ╚████╔╝    ██║   ███████║██║     ██║     ██║ ╚███╔╝ 
██║  ██║  ╚██╔╝     ██║   ██╔══██║██║     ██║     ██║ ██╔██╗ 
██████╔╝   ██║      ██║   ██║  ██║███████╗███████╗██║██╔╝ ██╗
╚═════╝    ╚═╝      ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═╝
    "#.bright_cyan());
    
    println!("{}", "🚀 Dytallix Developer CLI".bright_cyan().bold());
    println!("{}", "Post-Quantum AI-Enhanced Cryptocurrency Platform".bright_blue());
    println!("{}", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━".bright_blue());
    println!();
}

pub fn print_quick_start() {
    println!("{}", "🎯 Quick Start Guide".bright_green().bold());
    println!();
    
    println!("{}", "1. Initialize Configuration:".bright_cyan());
    println!("   {}", "dytallix-cli init".bright_white());
    println!();
    
    println!("{}", "2. Create Your First Account:".bright_cyan());
    println!("   {}", "dytallix-cli account create --name my-account".bright_white());
    println!();
    
    println!("{}", "3. Start Development Node:".bright_cyan());
    println!("   {}", "dytallix-cli node start".bright_white());
    println!();
    
    println!("{}", "4. Check Node Status:".bright_cyan());
    println!("   {}", "dytallix-cli node status".bright_white());
    println!();
    
    println!("{}", "5. Send a Transaction:".bright_cyan());
    println!("   {}", "dytallix-cli transaction send dyt1recipient123... 1000".bright_white());
    println!();
    
    println!("{}", "6. Deploy a Smart Contract:".bright_cyan());
    println!("   {}", "dytallix-cli contract deploy my_contract.wasm".bright_white());
    println!();
}

pub fn print_features() {
    println!("{}", "✨ Key Features".bright_green().bold());
    println!();
    
    println!("{}", "🔐 Post-Quantum Cryptography".bright_cyan());
    println!("   • CRYSTALS-Dilithium5 signatures");
    println!("   • Kyber1024 key exchange");
    println!("   • Quantum-resistant by design");
    println!();
    
    println!("{}", "🤖 AI-Enhanced Security".bright_cyan());
    println!("   • Real-time fraud detection");
    println!("   • Automated risk scoring");
    println!("   • Smart contract vulnerability analysis");
    println!("   • Natural language contract generation");
    println!();
    
    println!("{}", "⚡ High Performance".bright_cyan());
    println!("   • 6-second block times");
    println!("   • Instant finality");
    println!("   • Efficient consensus mechanism");
    println!("   • Scalable architecture");
    println!();
    
    println!("{}", "🛠️ Developer-Friendly".bright_cyan());
    println!("   • Comprehensive CLI tools");
    println!("   • WASM smart contracts");
    println!("   • Rich API ecosystem");
    println!("   • Easy integration");
    println!();
}

pub fn print_command_overview() {
    println!("{}", "📋 Command Overview".bright_green().bold());
    println!();
    
    println!("{}", "Node Management:".bright_cyan());
    println!("   {} - Start development node", "node start".bright_white());
    println!("   {} - Stop running node", "node stop".bright_white());
    println!("   {} - Check node status", "node status".bright_white());
    println!("   {} - View node logs", "node logs".bright_white());
    println!("   {} - Show node information", "node info".bright_white());
    println!();
    
    println!("{}", "Account Management:".bright_cyan());
    println!("   {} - Create new PQC account", "account create".bright_white());
    println!("   {} - List all accounts", "account list".bright_white());
    println!("   {} - Check account balance", "account balance <address>".bright_white());
    println!("   {} - Export account keys", "account export <account>".bright_white());
    println!("   {} - Import account keys", "account import <file>".bright_white());
    println!("   {} - Sign a message", "account sign <account> <message>".bright_white());
    println!("   {} - Verify a signature", "account verify <message> <signature> <pubkey>".bright_white());
    println!();
    
    println!("{}", "Smart Contracts:".bright_cyan());
    println!("   {} - Deploy WASM contract", "contract deploy <file>".bright_white());
    println!("   {} - Call contract method", "contract call <address> <method>".bright_white());
    println!("   {} - Query contract state", "contract query <address> <method>".bright_white());
    println!("   {} - List contract events", "contract events <address>".bright_white());
    println!();
    
    println!("{}", "AI Services:".bright_cyan());
    println!("   {} - Analyze transaction fraud", "ai analyze-fraud <input>".bright_white());
    println!("   {} - Calculate risk score", "ai score-risk <input>".bright_white());
    println!("   {} - Generate smart contract", "ai generate-contract <description>".bright_white());
    println!("   {} - Check oracle status", "ai oracle-status".bright_white());
    println!("   {} - Test AI services", "ai test".bright_white());
    println!();
    
    println!("{}", "Transactions:".bright_cyan());
    println!("   {} - Send tokens", "transaction send <to> <amount>".bright_white());
    println!("   {} - Get transaction details", "transaction get <hash>".bright_white());
    println!("   {} - List transactions", "transaction list".bright_white());
    println!();
}

pub fn print_examples() {
    println!("{}", "💡 Usage Examples".bright_green().bold());
    println!();
    
    println!("{}", "Creating and Using an Account:".bright_cyan());
    println!("   {}", "# Create a new account".bright_green());
    println!("   {}", "dytallix-cli account create --name alice".bright_white());
    println!();
    println!("   {}", "# List all accounts".bright_green());
    println!("   {}", "dytallix-cli account list".bright_white());
    println!();
    println!("   {}", "# Check account balance".bright_green());
    println!("   {}", "dytallix-cli account balance dyt1alice123...".bright_white());
    println!();
    
    println!("{}", "Smart Contract Development:".bright_cyan());
    println!("   {}", "# Generate a contract from description".bright_green());
    println!("   {}", "dytallix-cli ai generate-contract \"A simple token contract\"".bright_white());
    println!();
    println!("   {}", "# Deploy the contract".bright_green());
    println!("   {}", "dytallix-cli contract deploy token_contract.wasm".bright_white());
    println!();
    println!("   {}", "# Call a contract method".bright_green());
    println!("   {}", "dytallix-cli contract call dyt1contract123... transfer '{\"to\":\"dyt1bob456...\",\"amount\":100}'".bright_white());
    println!();
    
    println!("{}", "AI-Enhanced Security:".bright_cyan());
    println!("   {}", "# Analyze a transaction for fraud".bright_green());
    println!("   {}", "dytallix-cli ai analyze-fraud 0x123456789abcdef".bright_white());
    println!();
    println!("   {}", "# Calculate risk score for transaction data".bright_green());
    println!("   {}", "dytallix-cli ai score-risk '{\"amount\":10000,\"from\":\"dyt1alice...\",\"to\":\"dyt1bob...\"}'".bright_white());
    println!();
    
    println!("{}", "Node Operations:".bright_cyan());
    println!("   {}", "# Start a development node".bright_green());
    println!("   {}", "dytallix-cli node start".bright_white());
    println!();
    println!("   {}", "# Monitor node status".bright_green());
    println!("   {}", "dytallix-cli node status".bright_white());
    println!();
    println!("   {}", "# View recent logs".bright_green());
    println!("   {}", "dytallix-cli node logs".bright_white());
    println!();
}

pub fn print_advanced_usage() {
    println!("{}", "🔧 Advanced Usage".bright_green().bold());
    println!();
    
    println!("{}", "Configuration Management:".bright_cyan());
    println!("   {}", "# Initialize configuration".bright_green());
    println!("   {}", "dytallix-cli init".bright_white());
    println!();
    println!("   {}", "# View current configuration".bright_green());
    println!("   {}", "dytallix-cli config".bright_white());
    println!();
    println!("   {}", "# Use custom node URL".bright_green());
    println!("   {}", "dytallix-cli --node-url http://testnet.dytallix.com:3030 node status".bright_white());
    println!();
    
    println!("{}", "Verbose Mode:".bright_cyan());
    println!("   {}", "# Enable verbose output for debugging".bright_green());
    println!("   {}", "dytallix-cli --verbose transaction send dyt1recipient123... 1000".bright_white());
    println!();
    
    println!("{}", "Batch Operations:".bright_cyan());
    println!("   {}", "# Deploy multiple contracts".bright_green());
    println!("   {}", "for contract in *.wasm; do dytallix-cli contract deploy $contract; done".bright_white());
    println!();
    
    println!("{}", "Integration with Scripts:".bright_cyan());
    println!("   {}", "# Check if node is running in a script".bright_green());
    println!("   {}", "if dytallix-cli node status > /dev/null 2>&1; then".bright_white());
    println!("   {}", "  echo \"Node is running\"".bright_white());
    println!("   {}", "else".bright_white());
    println!("   {}", "  echo \"Node is not running\"".bright_white());
    println!("   {}", "fi".bright_white());
    println!();
}

pub fn print_help_footer() {
    println!("{}", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━".bright_blue());
    println!();
    println!("{}", "📚 Documentation:".bright_cyan());
    println!("   • Project Website: https://dytallix.com");
    println!("   • Developer Docs: https://docs.dytallix.com");
    println!("   • GitHub: https://github.com/dytallix/dytallix");
    println!("   • Community: https://discord.gg/dytallix");
    println!();
    println!("{}", "🆘 Support:".bright_cyan());
    println!("   • Use {} for command-specific help", "--help".bright_white());
    println!("   • Use {} for detailed output", "--verbose".bright_white());
    println!("   • Report issues on GitHub");
    println!();
    println!("{}", "Made with ❤️ by the Dytallix team".bright_blue());
    println!();
}

pub fn print_full_help() {
    print_welcome();
    print_quick_start();
    print_features();
    print_command_overview();
    print_examples();
    print_advanced_usage();
    print_help_footer();
}
