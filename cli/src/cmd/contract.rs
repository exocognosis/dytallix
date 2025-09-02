/*
CLI Commands for Smart Contract Operations

Provides commands for:
- Deploying WASM contracts
- Instantiating deployed contracts
- Executing contract functions
- Querying contract state and information
*/

use anyhow::{anyhow, Result};
use base64::Engine;
use clap::{Args, Subcommand};
use serde_json::Value;
use std::path::PathBuf;
use tracing::info;

use crate::output::OutputFormat;
use crate::rpc::RpcClient;

#[derive(Debug, Clone, Args)]
pub struct ContractArgs {
    #[command(subcommand)]
    pub command: ContractCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ContractCommand {
    /// Deploy a WASM contract from a file
    Deploy {
        /// Path to the WASM contract file
        #[arg(short, long)]
        code: PathBuf,

        /// Contract deployer address
        #[arg(short, long)]
        from: String,

        /// Gas limit for deployment
        #[arg(short, long, default_value = "1000000")]
        gas: u64,

        /// Initial state data (JSON)
        #[arg(short, long, default_value = "{}")]
        state: String,

        /// Output format
        #[arg(short, long, default_value = "json")]
        output: OutputFormat,
    },

    /// WASM-specific commands
    Wasm {
        #[command(subcommand)]
        wasm_command: WasmCommand,
    },

    /// Instantiate a deployed contract
    Instantiate {
        /// Contract code hash to instantiate
        #[arg(short, long)]
        code_hash: String,

        /// Instantiator address
        #[arg(short, long)]
        from: String,

        /// Constructor arguments (JSON)
        #[arg(short, long, default_value = "{}")]
        args: String,

        /// Gas limit for instantiation
        #[arg(short, long, default_value = "500000")]
        gas: u64,

        /// Output format
        #[arg(short, long, default_value = "json")]
        output: OutputFormat,
    },

    /// Execute a function on an instantiated contract
    Execute {
        /// Contract instance address
        #[arg(short, long)]
        contract: String,

        /// Function name to execute
        #[arg(short, long, default_value = "execute")]
        function: String,

        /// Function arguments (JSON)
        #[arg(short, long, default_value = "{}")]
        args: String,

        /// Caller address
        #[arg(short = 'f', long)]
        from: String,

        /// Gas limit for execution
        #[arg(short, long, default_value = "300000")]
        gas: u64,

        /// Output format
        #[arg(short, long, default_value = "json")]
        output: OutputFormat,
    },

    /// Query contract information
    Query {
        #[command(subcommand)]
        query: QueryCommand,
    },
}

#[derive(Debug, Clone, Subcommand)]
pub enum QueryCommand {
    /// Get contract code by hash
    Code {
        /// Contract code hash
        hash: String,

        /// Output format
        #[arg(short, long, default_value = "json")]
        output: OutputFormat,
    },

    /// Get contract instance information
    Instance {
        /// Contract instance address
        address: String,

        /// Output format
        #[arg(short, long, default_value = "json")]
        output: OutputFormat,
    },

    /// Get contract storage value
    Storage {
        /// Contract instance address
        #[arg(short, long)]
        contract: String,

        /// Storage key (hex)
        #[arg(short, long)]
        key: String,

        /// Output format
        #[arg(short, long, default_value = "json")]
        output: OutputFormat,
    },

    /// List all deployed contracts
    List {
        /// Output format
        #[arg(short, long, default_value = "json")]
        output: OutputFormat,
    },
}

#[derive(Debug, Clone, Subcommand)]
pub enum WasmCommand {
    /// Deploy a WASM contract
    Deploy {
        /// Path to the WASM contract file
        wasm_file: PathBuf,

        /// Gas limit for deployment
        #[arg(long, default_value = "500000")]
        gas: u64,
    },

    /// Execute a WASM contract method
    Exec {
        /// Contract address
        address: String,

        /// Method name to execute
        method: String,

        /// Gas limit for execution
        #[arg(long, default_value = "20000")]
        gas: u64,
    },

    /// Query a WASM contract state
    Query {
        /// Contract address
        address: String,
    },
}

impl ContractArgs {
    pub async fn run(&self, rpc_client: &RpcClient) -> Result<()> {
        match &self.command {
            ContractCommand::Deploy {
                code,
                from,
                gas,
                state,
                output,
            } => {
                self.deploy_contract(rpc_client, code, from, *gas, state, output)
                    .await
            }
            ContractCommand::Wasm { wasm_command } => {
                self.handle_wasm_command(rpc_client, wasm_command).await
            }
            ContractCommand::Instantiate {
                code_hash,
                from,
                args,
                gas,
                output,
            } => {
                self.instantiate_contract(rpc_client, code_hash, from, args, *gas, output)
                    .await
            }
            ContractCommand::Execute {
                contract,
                function,
                args,
                from,
                gas,
                output,
            } => {
                self.execute_contract(rpc_client, contract, function, args, from, *gas, output)
                    .await
            }
            ContractCommand::Query { query } => self.query_contract(rpc_client, query).await,
        }
    }

    async fn deploy_contract(
        &self,
        rpc_client: &RpcClient,
        code_path: &PathBuf,
        from: &str,
        gas: u64,
        state: &str,
        output: &OutputFormat,
    ) -> Result<()> {
        info!("Deploying contract from: {}", code_path.display());

        // Read contract code
        let code =
            std::fs::read(code_path).map_err(|e| anyhow!("Failed to read contract file: {}", e))?;

        // Parse initial state
        let initial_state: Value =
            serde_json::from_str(state).map_err(|e| anyhow!("Invalid state JSON: {}", e))?;

        // Create deployment request
        let request = serde_json::json!({
            "code": hex::encode(&code),
            "from": from,
            "gas_limit": gas,
            "initial_state": initial_state,
        });

        // Submit deployment transaction
        let response = rpc_client.call("contract_deploy", &[request]).await?;

        match output {
            OutputFormat::Json => {
                println!("{}", serde_json::to_string_pretty(&response)?);
            }
            OutputFormat::Text => {
                if let Some(result) = response.as_object() {
                    println!("Contract Deployment Result:");
                    println!(
                        "  Address: {}",
                        result.get("address").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Code Hash: {}",
                        result.get("code_hash").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Gas Used: {}",
                        result.get("gas_used").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Success: {}",
                        result.get("success").unwrap_or(&Value::Bool(false))
                    );
                }
            }
        }

        Ok(())
    }

    async fn instantiate_contract(
        &self,
        rpc_client: &RpcClient,
        code_hash: &str,
        from: &str,
        args: &str,
        gas: u64,
        output: &OutputFormat,
    ) -> Result<()> {
        info!("Instantiating contract with code hash: {}", code_hash);

        // Parse constructor arguments
        let constructor_args: Value =
            serde_json::from_str(args).map_err(|e| anyhow!("Invalid args JSON: {}", e))?;

        // Create instantiation request
        let request = serde_json::json!({
            "code_hash": code_hash,
            "from": from,
            "gas_limit": gas,
            "constructor_args": constructor_args,
        });

        // Submit instantiation transaction
        let response = rpc_client.call("contract_instantiate", &[request]).await?;

        match output {
            OutputFormat::Json => {
                println!("{}", serde_json::to_string_pretty(&response)?);
            }
            OutputFormat::Text => {
                if let Some(result) = response.as_object() {
                    println!("Contract Instantiation Result:");
                    println!(
                        "  Instance Address: {}",
                        result.get("instance_address").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Gas Used: {}",
                        result.get("gas_used").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Success: {}",
                        result.get("success").unwrap_or(&Value::Bool(false))
                    );
                }
            }
        }

        Ok(())
    }

    async fn execute_contract(
        &self,
        rpc_client: &RpcClient,
        contract: &str,
        function: &str,
        args: &str,
        from: &str,
        gas: u64,
        output: &OutputFormat,
    ) -> Result<()> {
        info!("Executing contract {} function: {}", contract, function);

        // Parse function arguments
        let function_args: Value =
            serde_json::from_str(args).map_err(|e| anyhow!("Invalid args JSON: {}", e))?;

        // Create execution request
        let request = serde_json::json!({
            "contract_address": contract,
            "function": function,
            "args": function_args,
            "from": from,
            "gas_limit": gas,
        });

        // Submit execution transaction
        let response = rpc_client.call("contract_execute", &[request]).await?;

        match output {
            OutputFormat::Json => {
                println!("{}", serde_json::to_string_pretty(&response)?);
            }
            OutputFormat::Text => {
                if let Some(result) = response.as_object() {
                    println!("Contract Execution Result:");
                    println!(
                        "  Success: {}",
                        result.get("success").unwrap_or(&Value::Bool(false))
                    );
                    println!(
                        "  Return Value: {}",
                        result.get("return_value").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Gas Used: {}",
                        result.get("gas_used").unwrap_or(&Value::Null)
                    );
                    if let Some(events) = result.get("events").and_then(|e| e.as_array()) {
                        println!("  Events: {} emitted", events.len());
                    }
                }
            }
        }

        Ok(())
    }

    async fn query_contract(&self, rpc_client: &RpcClient, query: &QueryCommand) -> Result<()> {
        match query {
            QueryCommand::Code { hash, output } => {
                let request = serde_json::json!({ "hash": hash });
                let response = rpc_client.call("contract_get_code", &[request]).await?;

                match output {
                    OutputFormat::Json => {
                        println!("{}", serde_json::to_string_pretty(&response)?);
                    }
                    OutputFormat::Text => {
                        if let Some(result) = response.as_object() {
                            println!("Contract Code Information:");
                            println!("  Hash: {hash}");
                            println!(
                                "  Size: {} bytes",
                                result.get("size").unwrap_or(&Value::Number(0.into()))
                            );
                            println!(
                                "  Deployed: {}",
                                result.get("deployed_at").unwrap_or(&Value::Null)
                            );
                        }
                    }
                }
            }

            QueryCommand::Instance { address, output } => {
                let request = serde_json::json!({ "address": address });
                let response = rpc_client.call("contract_get_instance", &[request]).await?;

                match output {
                    OutputFormat::Json => {
                        println!("{}", serde_json::to_string_pretty(&response)?);
                    }
                    OutputFormat::Text => {
                        if let Some(result) = response.as_object() {
                            println!("Contract Instance Information:");
                            println!("  Address: {address}");
                            println!(
                                "  Code Hash: {}",
                                result.get("code_hash").unwrap_or(&Value::Null)
                            );
                            println!(
                                "  Call Count: {}",
                                result.get("call_count").unwrap_or(&Value::Number(0.into()))
                            );
                            println!(
                                "  Last Called: {}",
                                result.get("last_called").unwrap_or(&Value::Null)
                            );
                        }
                    }
                }
            }

            QueryCommand::Storage {
                contract,
                key,
                output,
            } => {
                let request = serde_json::json!({
                    "contract_address": contract,
                    "key": key
                });
                let response = rpc_client.call("contract_get_storage", &[request]).await?;

                match output {
                    OutputFormat::Json => {
                        println!("{}", serde_json::to_string_pretty(&response)?);
                    }
                    OutputFormat::Text => {
                        if let Some(result) = response.as_object() {
                            println!("Contract Storage:");
                            println!("  Contract: {contract}");
                            println!("  Key: {key}");
                            println!("  Value: {}", result.get("value").unwrap_or(&Value::Null));
                        }
                    }
                }
            }

            QueryCommand::List { output } => {
                let response = rpc_client.call("contract_list", &[]).await?;

                match output {
                    OutputFormat::Json => {
                        println!("{}", serde_json::to_string_pretty(&response)?);
                    }
                    OutputFormat::Text => {
                        if let Some(contracts) = response.as_array() {
                            println!("Deployed Contracts ({}):", contracts.len());
                            for (i, contract) in contracts.iter().enumerate() {
                                if let Some(contract_obj) = contract.as_object() {
                                    println!(
                                        "  {}. Address: {} | Code Hash: {}",
                                        i + 1,
                                        contract_obj.get("address").unwrap_or(&Value::Null),
                                        contract_obj.get("code_hash").unwrap_or(&Value::Null)
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    async fn handle_wasm_command(
        &self,
        rpc_client: &RpcClient,
        wasm_command: &WasmCommand,
    ) -> Result<()> {
        match wasm_command {
            WasmCommand::Deploy { wasm_file, gas } => {
                info!("Deploying WASM contract from: {}", wasm_file.display());

                // Read WASM file
                let code = std::fs::read(wasm_file)
                    .map_err(|e| anyhow!("Failed to read WASM file: {}", e))?;

                // Create deployment request
                let request = serde_json::json!({
                    "code_base64": base64::engine::general_purpose::STANDARD.encode(&code),
                    "gas_limit": gas,
                });

                // Submit to WASM deploy endpoint
                let response = rpc_client.call("wasm_deploy", &[request]).await?;

                if let Some(result) = response.as_object() {
                    println!("WASM Contract Deployment:");
                    println!(
                        "  Address: {}",
                        result.get("address").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Code Hash: {}",
                        result.get("code_hash").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Gas Used: {}",
                        result.get("gas_used").unwrap_or(&Value::Null)
                    );
                }
            }

            WasmCommand::Exec {
                address,
                method,
                gas,
            } => {
                info!("Executing WASM contract {} method: {}", address, method);

                // Create execution request
                let request = serde_json::json!({
                    "address": address,
                    "method": method,
                    "args_json": {},
                    "gas_limit": gas,
                });

                // Submit to WASM execute endpoint
                let response = rpc_client.call("wasm_execute", &[request]).await?;

                if let Some(result) = response.as_object() {
                    println!("WASM Contract Execution:");
                    println!(
                        "  Result: {}",
                        result.get("result_json").unwrap_or(&Value::Null)
                    );
                    println!(
                        "  Gas Used: {}",
                        result.get("gas_used").unwrap_or(&Value::Null)
                    );
                    println!("  Height: {}", result.get("height").unwrap_or(&Value::Null));
                }
            }

            WasmCommand::Query { address } => {
                info!("Querying WASM contract state: {}", address);

                // Create query request for get() method (counter-specific)
                let request = serde_json::json!({
                    "address": address,
                    "method": "get",
                    "args_json": {},
                    "gas_limit": 10000,
                });

                // Submit to WASM execute endpoint (get is an execution)
                let response = rpc_client.call("wasm_execute", &[request]).await?;

                if let Some(result) = response.as_object() {
                    println!("WASM Contract State:");
                    println!("  Contract: {address}");
                    println!(
                        "  Value: {}",
                        result.get("result_json").unwrap_or(&Value::Null)
                    );
                }
            }
        }

        Ok(())
    }
}
