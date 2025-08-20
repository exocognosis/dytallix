pub mod mempool;
pub mod rpc;
pub mod runtime;
pub mod state;
pub mod storage;
pub mod util;
pub mod ws; // added util module
pub mod crypto; // new crypto module
pub mod types; // canonical transaction types
pub mod addr; // address derivation
pub mod gas; // gas accounting system
pub mod execution; // deterministic execution engine
pub mod metrics; // observability module
pub mod alerts; // alerting subsystem
pub mod p2p; // p2p networking and gossip
            // re-export emission types
pub use runtime::emission::*;
