use colored::*;

pub fn print_welcome() {
    println!(
        "{}",
        r#"
██████╗ ██╗   ██╗████████╗ █████╗ ██╗     ██╗     ██╗██╗  ██╗
██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔══██╗██║     ██║     ██║╚██╗██╔╝
██║  ██║ ╚████╔╝    ██║   ███████║██║     ██║     ██║ ╚███╔╝ 
██║  ██║  ╚██╔╝     ██║   ██╔══██║██║     ██║     ██║ ██╔██╗ 
██████╔╝   ██║      ██║   ██║  ██║███████╗███████╗██║██╔╝ ██╗
╚═════╝    ╚═╝      ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═╝
    "#
        .bright_cyan()
    );

    println!("{}", "🚀 Dytallix Developer CLI".bright_cyan().bold());
    println!(
        "{}",
        "Post-Quantum AI-Enhanced Cryptocurrency Platform".bright_blue()
    );
    println!(
        "{}",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━".bright_blue()
    );
    println!();
}

pub fn print_quick_start() {
    println!("{}", "🎯 Quick Start Guide".bright_green().bold());
    println!();

    println!("{}", "1. Initialize Configuration:".bright_cyan());
    println!("   {}", "dytallix-cli init".bright_white());
    println!();

    println!("{}", "2. Create Your First Account:".bright_cyan());
    println!(
        "   {}",
        "dytallix-cli account create --name my-account".bright_white()
    );
    println!();

    println!("{}", "3. Start Development Node:".bright_cyan());
    println!("   {}", "dytallix-cli node start".bright_white());
    println!();

    println!("{}", "4. Check Node Status:".bright_cyan());
    println!("   {}", "dytallix-cli node status".bright_white());
    println!();

    println!("{}", "5. Send a Transaction:".bright_cyan());
    println!(
        "   {}",
        "dytallix-cli transaction send dyt1recipient123... 1000".bright_white()
    );
    println!();

    println!("{}", "6. Deploy a Smart Contract:".bright_cyan());
    println!(
        "   {}",
        "dytallix-cli contract deploy my_contract.wasm".bright_white()
    );
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
    println!(
        "   {} - Start development node",
        "node start".bright_white()
    );
    println!("   {} - Stop running node", "node stop".bright_white());
    println!("   {} - Check node status", "node status".bright_white());
    println!("   {} - View node logs", "node logs".bright_white());
    println!("   {} - Show node information", "node info".bright_white());
    println!();

    println!("{}", "Account Management:".bright_cyan());
    println!(
        "   {} - Create new PQC account",
        "account create".bright_white()
    );
    println!("   {} - List all accounts", "account list".bright_white());
    println!(
        "   {} - Check account balance",
        "account balance <address>".bright_white()
    );
    println!(
        "   {} - Export account keys",
        "account export <account>".bright_white()
    );
    println!(
        "   {} - Import account keys",
        "account import <file>".bright_white()
    );
    println!(
        "   {} - Sign a message",
        "account sign <account> <message>".bright_white()
    );
    println!(
        "   {} - Verify a signature",
        "account verify <message> <signature> <pubkey>".bright_white()
    );
    println!();

    println!("{}", "Smart Contracts:".bright_cyan());
    println!(
        "   {} - Deploy WASM contract",
        "contract deploy <file>".bright_white()
    );
    println!(
        "   {} - Call contract method",
        "contract call <address> <method>".bright_white()
    );
    println!(
        "   {} - Query contract state",
        "contract query <address> <method>".bright_white()
    );
    println!(
        "   {} - List contract events",
        "contract events <address>".bright_white()
    );
    println!();

    println!("{}", "AI Services:".bright_cyan());
    println!(
        "   {} - Analyze transaction fraud",
        "ai analyze-fraud <input>".bright_white()
    );
    println!(
        "   {} - Calculate risk score",
        "ai score-risk <input>".bright_white()
    );
    println!(
        "   {} - Generate smart contract",
        "ai generate-contract <description>".bright_white()
    );
    println!(
        "   {} - Check oracle status",
        "ai oracle-status".bright_white()
    );
    println!("   {} - Test AI services", "ai test".bright_white());
    println!();

    println!("{}", "Transactions:".bright_cyan());
    println!(
        "   {} - Send tokens",
        "transaction send <to> <amount>".bright_white()
    );
    println!(
        "   {} - Get transaction details",
        "transaction get <hash>".bright_white()
    );
    println!(
        "   {} - List transactions",
        "transaction list".bright_white()
    );
    println!();
}

pub fn print_examples() {
    println!("{}", "📚 Common Usage Examples".bright_green().bold());
    println!();

    println!("{}", "📂 Account Management:".bright_cyan());
    println!("   # Create a new account with interactive prompts");
    println!("   {}", "dytallix-cli account create".bright_white());
    println!("   # List all accounts");
    println!("   {}", "dytallix-cli account list".bright_white());
    println!("   # Check account balance");
    println!(
        "   {}",
        "dytallix-cli account balance my-account".bright_white()
    );
    println!("   # Export account for backup");
    println!(
        "   {}",
        "dytallix-cli account export my-account --output backup.json".bright_white()
    );
    println!();

    println!("{}", "🔗 Smart Contract Operations:".bright_cyan());
    println!("   # List available contract templates");
    println!("   {}", "dytallix-cli contract templates".bright_white());
    println!("   # Initialize contract from template");
    println!(
        "   {}",
        "dytallix-cli contract init token --output ./my-token".bright_white()
    );
    println!("   # Deploy contract with parameters");
    println!(
        "   {}",
        r#"dytallix-cli contract deploy token.wasm --params '{"name":"MyToken","symbol":"MTK"}'"#
            .bright_white()
    );
    println!("   # Call contract method");
    println!("   {}", r#"dytallix-cli contract call dyt1contract123... transfer --params '{"to":"dyt1addr...","amount":100}'"#.bright_white());
    println!("   # Query contract state");
    println!("   {}", r#"dytallix-cli contract query dyt1contract123... balance --params '{"account":"dyt1addr..."}'"#.bright_white());
    println!();

    println!("{}", "🤖 AI-Enhanced Security:".bright_cyan());
    println!("   # Analyze transaction for fraud");
    println!(
        "   {}",
        "dytallix-cli ai analyze-fraud 0x123456789abcdef".bright_white()
    );
    println!("   # Calculate risk score for transaction data");
    println!(
        "   {}",
        r#"dytallix-cli ai score-risk '{"amount":10000,"from":"dyt1alice...","to":"dyt1bob..."}'"#
            .bright_white()
    );
    println!("   # Generate smart contract from description");
    println!(
        "   {}",
        r#"dytallix-cli ai generate-contract "A simple voting contract with proposals""#
            .bright_white()
    );
    println!("   # Check AI oracle status");
    println!("   {}", "dytallix-cli ai oracle-status".bright_white());
    println!();

    println!("{}", "💸 Transaction Management:".bright_cyan());
    println!("   # Send tokens with interactive account selection");
    println!(
        "   {}",
        "dytallix-cli transaction send dyt1recipient... 1000".bright_white()
    );
    println!("   # Get transaction details");
    println!(
        "   {}",
        "dytallix-cli transaction get 0x123456789abcdef".bright_white()
    );
    println!("   # List recent transactions");
    println!(
        "   {}",
        "dytallix-cli transaction list --account dyt1addr... --limit 20".bright_white()
    );
    println!();

    println!("{}", "⚙️  Node Management:".bright_cyan());
    println!("   # Start local development node");
    println!("   {}", "dytallix-cli node start".bright_white());
    println!("   # Check node health and status");
    println!("   {}", "dytallix-cli node status".bright_white());
    println!("   # View node information");
    println!("   {}", "dytallix-cli node info".bright_white());
    println!("   # View recent logs");
    println!("   {}", "dytallix-cli node logs".bright_white());
    println!();
}

pub fn print_troubleshooting() {
    println!("{}", "🔧 Troubleshooting".bright_yellow().bold());
    println!();

    println!("{}", "Common Issues:".bright_cyan());
    println!();

    println!("{}", "❌ \"Node connection failed\"".bright_red());
    println!("   Solutions:");
    println!(
        "   • Start the development node: {}",
        "dytallix-cli node start".bright_white()
    );
    println!(
        "   • Check if node is running: {}",
        "dytallix-cli node status".bright_white()
    );
    println!(
        "   • Verify node URL: {}",
        "dytallix-cli config".bright_white()
    );
    println!(
        "   • Use custom node URL: {}",
        "--node-url http://localhost:3030".bright_white()
    );
    println!();

    println!("{}", "❌ \"AI service unavailable\"".bright_red());
    println!("   Solutions:");
    println!("   • The CLI will fall back to offline analysis automatically");
    println!(
        "   • Check AI service URL: {}",
        "dytallix-cli config".bright_white()
    );
    println!(
        "   • Use custom AI URL: {}",
        "--ai-url http://localhost:8000".bright_white()
    );
    println!(
        "   • Test AI services: {}",
        "dytallix-cli ai test".bright_white()
    );
    println!();

    println!("{}", "❌ \"Account not found\"".bright_red());
    println!("   Solutions:");
    println!(
        "   • List all accounts: {}",
        "dytallix-cli account list".bright_white()
    );
    println!(
        "   • Create new account: {}",
        "dytallix-cli account create".bright_white()
    );
    println!(
        "   • Import existing account: {}",
        "dytallix-cli account import backup.json".bright_white()
    );
    println!();

    println!("{}", "❌ \"Contract deployment failed\"".bright_red());
    println!("   Solutions:");
    println!("   • Verify WASM file exists and is valid");
    println!("   • Check contract file size (must be reasonable)");
    println!("   • Ensure node is running and accessible");
    println!("   • Use simulation mode for testing");
    println!();
}

pub fn print_resources() {
    println!("{}", "📖 Additional Resources".bright_blue().bold());
    println!();

    println!("{}", "Documentation:".bright_cyan());
    println!("   • Project README: docs/README.md");
    println!("   • Developer Guide: docs/developer-tools/README.md");
    println!("   • CLI Examples: docs/developer-tools/CLI_EXAMPLES.md");
    println!("   • Architecture: docs/TECHNICAL_ARCHITECTURE.md");
    println!();

    println!("{}", "Configuration:".bright_cyan());
    println!(
        "   • View current config: {}",
        "dytallix-cli config".bright_white()
    );
    println!(
        "   • Initialize config: {}",
        "dytallix-cli init".bright_white()
    );
    println!("   • Config directory: ~/.config/dytallix/");
    println!("   • Data directory: ~/.local/share/dytallix/");
    println!();

    println!("{}", "Getting Help:".bright_cyan());
    println!(
        "   • Command help: {}",
        "dytallix-cli <command> --help".bright_white()
    );
    println!("   • Full guide: {}", "dytallix-cli guide".bright_white());
    println!("   • Verbose output: {}", "--verbose".bright_white());
    println!("   • Skip confirmations: {}", "--yes".bright_white());
    println!();

    println!(
        "{}",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━".bright_blue()
    );
    println!(
        "{}",
        "🎉 Welcome to the Dytallix ecosystem! Happy developing!"
            .bright_green()
            .bold()
    );
    println!();
}

pub fn print_full_help() {
    print_welcome();
    print_quick_start();
    print_features();
    print_examples();
    print_troubleshooting();
    print_resources();
}
