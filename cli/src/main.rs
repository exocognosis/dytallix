use anyhow::{bail, Context, Result};
use clap::{Args, Parser, Subcommand, ValueEnum};
use regex::Regex;

use dcli::{
    cmd::{contract, gov, keys, oracle, pqc, query, secrets, stake, tx as txcmd},
    config,
    output::OutputFormat,
};
use std::fs;
use std::path::Path;

#[derive(Parser, Debug)]
#[command(name="dcli", version, about="Dytallix Unified CLI (dual-token DGT/DRT)", long_about=None)]
struct Cli {
    #[arg(long, global = true)]
    rpc: Option<String>,
    #[arg(long, global = true)]
    chain_id: Option<String>,
    #[arg(long, global = true, env = "DX_HOME", default_value = "~/.dcli")]
    home: String, // old: DYT_HOME ~/.dyt
    #[arg(long, global = true, value_enum, default_value = "text")]
    output: OutputArg,
    #[arg(long = "gov.quorum", global = true, value_parser = clap::value_parser!(f64), env = "GOV_QUORUM", help = "Governance quorum fraction (e.g. 0.33). Default: value from config/governance.toml or 0.33 if absent. Overrides config if supplied.")]
    gov_quorum: Option<f64>,
    #[arg(long = "gov.threshold", global = true, value_parser = clap::value_parser!(f64), env = "GOV_THRESHOLD", help = "Governance threshold fraction (e.g. 0.50). Default: value from config/governance.toml or 0.50 if absent. Overrides config if supplied.")]
    gov_threshold: Option<f64>,
    #[arg(long = "gov.veto", global = true, value_parser = clap::value_parser!(f64), env = "GOV_VETO", help = "Governance veto fraction (e.g. 0.334). Default: value from config/governance.toml or 0.334 if absent. Overrides config if supplied.")]
    gov_veto: Option<f64>,
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Copy, Clone, Debug, ValueEnum)]
enum OutputArg {
    Text,
    Json,
}
impl From<OutputArg> for OutputFormat {
    fn from(o: OutputArg) -> Self {
        match o {
            OutputArg::Text => OutputFormat::Text,
            OutputArg::Json => OutputFormat::Json,
        }
    }
}

#[derive(Subcommand, Debug, Clone)]
enum Commands {
    Keys(keys::KeysCmd),
    Tx(TxGroup),
    Transfer(txcmd::TransferCmd),
    Batch(txcmd::BatchCmd),
    Config(ConfigCmd),
    Query(query::QueryCmd),
    Gov(gov::GovCmd),
    Stake(stake::StakeCmd),
    Contract(contract::ContractArgs),
    Oracle(oracle::OracleCmd),
    Pqc(pqc::PQCCmd),
    Secrets(secrets::SecretsCmd),
    Init(InitCmd),
    Governance(GovernanceCmd),
}

#[derive(Args, Debug, Clone)]
struct TxGroup {
    #[command(subcommand)]
    action: TxAction,
}
#[derive(clap::Subcommand, Debug, Clone)]
enum TxAction {
    Transfer(txcmd::TransferCmd),
    Batch(txcmd::BatchCmd),
    Broadcast(txcmd::BroadcastCmd),
}

#[derive(Args, Debug, Clone)]
struct ConfigCmd {
    #[command(subcommand)]
    action: ConfigAction,
}
#[derive(clap::Subcommand, Debug, Clone)]
enum ConfigAction {
    Show,
    Set { key: String, value: String },
}

#[derive(Args, Debug, Clone)]
struct InitCmd {
    #[arg(
        long,
        default_value = "genesis.json",
        help = "Output genesis file path (will be created or updated)"
    )]
    genesis_out: String,
    #[arg(
        long,
        help = "Force overwrite existing genesis file instead of patching",
        default_value_t = false
    )]
    force: bool,
}

#[derive(Args, Debug, Clone)]
struct GovernanceCmd {
    #[command(subcommand)]
    action: GovernanceAction,
}

#[derive(Subcommand, Debug, Clone)]
enum GovernanceAction {
    Validate,
    PrintEffective,
}

// Track source of each param for transparency
#[derive(Debug, Clone)]
struct ParamWithSource<T> {
    value: T,
    source: &'static str,
}

#[derive(Debug, Clone)]
struct GovernanceParams {
    quorum: ParamWithSource<f64>,
    threshold: ParamWithSource<f64>,
    veto: ParamWithSource<f64>,
    min_deposit_udgt: ParamWithSource<u64>,
    voting_period: ParamWithSource<u64>,
}

impl GovernanceParams {
    fn from_config(path: &str) -> Result<Option<toml::Value>> {
        if !Path::new(path).exists() {
            return Ok(None);
        }
        let s = std::fs::read_to_string(path)
            .with_context(|| format!("reading governance config {path}"))?;
        let v: toml::Value = toml::from_str(&s).with_context(|| "parsing governance.toml")?;
        Ok(Some(v))
    }

    fn parse_fraction(raw: Option<&toml::Value>, key: &str) -> Option<f64> {
        raw.and_then(|v| v.get(key))
            .and_then(|x| x.as_str())
            .and_then(|s| s.parse::<f64>().ok())
    }

    fn parse_deposit(raw: Option<&toml::Value>) -> Option<(u64, String)> {
        let dep = raw
            .and_then(|v| v.get("deposit_min"))
            .and_then(|x| x.as_str())?;
        let re = Regex::new(r"^(?P<amount>[0-9]+)(?P<denom>[a-zA-Z][a-zA-Z0-9]*)$").ok()?;
        let caps = re.captures(dep)?;
        let amount: u64 = caps.name("amount")?.as_str().parse().ok()?;
        let denom = caps.name("denom")?.as_str().to_string();
        Some((amount, denom))
    }

    fn load(cli: &Cli) -> Result<Self> {
        let cfg_path = "config/governance.toml";
        let cfg_val = Self::from_config(cfg_path)?;
        if cfg_val.is_none() {
            bail!("governance config missing at {cfg_path}");
        }
        let cfg_val_ref = cfg_val.as_ref();
        let quorum = if let Some(v) = cli.gov_quorum {
            ParamWithSource {
                value: v,
                source: "flag",
            }
        } else if let Some(v) = Self::parse_fraction(cfg_val_ref, "quorum") {
            ParamWithSource {
                value: v,
                source: "config",
            }
        } else {
            ParamWithSource {
                value: 0.33,
                source: "default",
            }
        };
        let threshold = if let Some(v) = cli.gov_threshold {
            ParamWithSource {
                value: v,
                source: "flag",
            }
        } else if let Some(v) = Self::parse_fraction(cfg_val_ref, "threshold") {
            ParamWithSource {
                value: v,
                source: "config",
            }
        } else {
            ParamWithSource {
                value: 0.50,
                source: "default",
            }
        };
        let veto = if let Some(v) = cli.gov_veto {
            ParamWithSource {
                value: v,
                source: "flag",
            }
        } else if let Some(v) = Self::parse_fraction(cfg_val_ref, "veto") {
            ParamWithSource {
                value: v,
                source: "config",
            }
        } else {
            ParamWithSource {
                value: 0.334,
                source: "default",
            }
        };

        // deposit
        let (dep_amt, dep_src) = if let Some(_c) = cfg_val_ref {
            if let Some((amt, denom)) = Self::parse_deposit(cfg_val_ref) {
                if denom != "udgt" {
                    bail!("unexpected denom {denom} (expected udgt)");
                }
                (amt, "config")
            } else {
                (1000, "default")
            }
        } else {
            (1000, "default")
        };
        let voting_period = if let Some(c) = cfg_val_ref {
            c.get("voting_period")
                .and_then(|x| x.as_str())
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(100)
        } else {
            100
        };
        let vp_src = if cfg_val_ref.is_some() {
            "config"
        } else {
            "default"
        };

        let params = GovernanceParams {
            quorum,
            threshold,
            veto,
            min_deposit_udgt: ParamWithSource {
                value: dep_amt,
                source: dep_src,
            },
            voting_period: ParamWithSource {
                value: voting_period,
                source: vp_src,
            },
        };
        params.validate()?;
        Ok(params)
    }

    fn validate(&self) -> Result<()> {
        let q = self.quorum.value;
        let t = self.threshold.value;
        let v = self.veto.value;
        if !(q > 0.0 && q < 1.0) {
            bail!("invalid quorum {q} (must be 0.0<q<1.0)");
        }
        if !(t > 0.0 && t <= 1.0) {
            bail!("invalid threshold {t} (must be 0.0<t<=1.0)");
        }
        if !(v > 0.0 && v < 1.0) {
            bail!("invalid veto {v} (must be 0.0<v<1.0)");
        }
        if q > t {
            bail!("quorum {q} cannot exceed threshold {t}");
        }
        if v >= 1.0 {
            bail!("veto must be < 1.0");
        }
        // Optional: reject more than 4 decimal places
        for (name, val) in [("quorum", q), ("threshold", t), ("veto", v)] {
            let scaled = (val * 10_000.0).round();
            let back = scaled / 10_000.0;
            if (val - back).abs() > 1e-9 {
                bail!("{name} has more than 4 decimal places: {val}");
            }
        }
        Ok(())
    }

    fn as_bps_floor(val: f64) -> u64 {
        (val * 10_000.0).floor() as u64
    }
}

fn expand_home(p: &str) -> String {
    if let Some(stripped) = p.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return format!("{}/{}", home.display(), stripped);
        }
    }
    p.to_string()
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing subscriber once (env RUST_LOG controls level, default info)
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .try_init();

    let cli = Cli::parse();

    // Expand home path ~
    let _home_expanded = expand_home(&cli.home);

    // Governance params load early for commands needing them
    let gov_params_res = GovernanceParams::load(&cli);

    let mut cfg = config::load()?;
    if let Some(r) = cli.rpc.as_ref() {
        cfg.rpc = r.clone();
    }
    if let Some(c) = cli.chain_id.as_ref() {
        cfg.chain_id = c.clone();
    }
    let fmt: OutputFormat = cli.output.into();

    match cli.cmd.clone() {
        Commands::Governance(gc) => match gc.action {
            GovernanceAction::Validate => match gov_params_res {
                Ok(p) => {
                    println!("governance parameters valid: quorum={} ({}), threshold={} ({}), veto={} ({})", p.quorum.value, p.quorum.source, p.threshold.value, p.threshold.source, p.veto.value, p.veto.source);
                }
                Err(e) => {
                    eprintln!("validation error: {e}");
                    std::process::exit(1);
                }
            },
            GovernanceAction::PrintEffective => match gov_params_res {
                Ok(p) => {
                    println!("quorum={} source={} threshold={} source={} veto={} source={} min_deposit_udgt={} source={} voting_period={} source={}", p.quorum.value, p.quorum.source, p.threshold.value, p.threshold.source, p.veto.value, p.veto.source, p.min_deposit_udgt.value, p.min_deposit_udgt.source, p.voting_period.value, p.voting_period.source);
                }
                Err(e) => {
                    eprintln!("error loading governance params: {e}");
                    std::process::exit(1);
                }
            },
        },
        Commands::Init(ic) => {
            let params = gov_params_res?; // fail fast if invalid
            let qb = GovernanceParams::as_bps_floor(params.quorum.value);
            let tb = GovernanceParams::as_bps_floor(params.threshold.value);
            let vb = GovernanceParams::as_bps_floor(params.veto.value);
            let min_dep_micro = params.min_deposit_udgt.value.to_string();
            let voting_period_blocks = params.voting_period.value;
            let path = &ic.genesis_out;
            let path_exists = Path::new(path).exists();
            let mut genesis: serde_json::Value = if path_exists && !ic.force {
                serde_json::from_str(&fs::read_to_string(path)?)
                    .unwrap_or_else(|_| serde_json::json!({}))
            } else {
                serde_json::json!({})
            };
            if genesis.get("chain_id").is_none() {
                genesis["chain_id"] = serde_json::Value::String(cfg.chain_id.clone());
            }
            let mut gov = genesis
                .get("governance")
                .cloned()
                .unwrap_or_else(|| serde_json::json!({}));
            if !gov.is_object() {
                gov = serde_json::json!({});
            }
            gov["min_deposit_udgt"] = serde_json::Value::String(min_dep_micro.clone());
            gov["deposit_period"] = gov
                .get("deposit_period")
                .cloned()
                .unwrap_or(serde_json::Value::Number(5u64.into()));
            gov["voting_period"] = serde_json::Value::Number(voting_period_blocks.into());
            gov["quorum_bps"] = serde_json::Value::String(qb.to_string());
            gov["threshold_bps"] = serde_json::Value::String(tb.to_string());
            gov["veto_threshold_bps"] = serde_json::Value::String(vb.to_string());
            genesis["governance"] = gov;
            fs::write(path, serde_json::to_string_pretty(&genesis)? + "\n")?;
            println!("Genesis written: {path} (quorum_bps={qb}, threshold_bps={tb}, veto_threshold_bps={vb})");
        }
        Commands::Keys(k) => keys::handle(&cli.home, fmt, k).await?,
        Commands::Tx(tg) => match tg.action {
            TxAction::Transfer(c) => {
                txcmd::handle_transfer(&cfg.rpc, &cfg.chain_id, &cli.home, c, fmt).await?
            }
            TxAction::Batch(bc) => {
                txcmd::handle_batch(&cfg.rpc, &cfg.chain_id, &cli.home, bc, fmt).await?
            }
            TxAction::Broadcast(bc) => {
                txcmd::handle_broadcast(&cfg.rpc, &cfg.chain_id, &cli.home, bc, fmt).await?
            }
        },
        Commands::Transfer(c) => {
            txcmd::handle_transfer(&cfg.rpc, &cfg.chain_id, &cli.home, c, fmt).await?
        }
        Commands::Batch(bc) => {
            txcmd::handle_batch(&cfg.rpc, &cfg.chain_id, &cli.home, bc, fmt).await?
        }
        Commands::Query(qc) => query::run(&cfg.rpc, fmt, qc).await?,
        Commands::Gov(gc) => gov::run(&cfg.rpc, fmt, gc).await?,
        Commands::Stake(sc) => stake::run(&cfg.rpc, fmt, sc).await?,
        Commands::Contract(cc) => {
            let rpc_client = dcli::rpc::RpcClient::new(&cfg.rpc);
            cc.run(&rpc_client).await?;
        }
        Commands::Oracle(oc) => oracle::run(&cfg.rpc, fmt, oc).await?,
        Commands::Pqc(pc) => pqc::handle_pqc(fmt, pc).await?,
        Commands::Secrets(sc) => secrets::run(sc).await?,
        _ => {}
    }
    Ok(())
}
