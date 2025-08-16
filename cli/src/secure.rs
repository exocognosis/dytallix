use std::sync::Once;
use tokio::sync::oneshot;
use crate::keystore;
use tokio::signal::unix::{signal, SignalKind};

static INIT: Once = Once::new();

pub fn install_signal_handlers() {
    INIT.call_once(|| {
        // Spawn tasks to listen for SIGINT and SIGTERM
        tokio::spawn(async move {
            let mut sigint = signal(SignalKind::interrupt()).expect("sigint");
            let mut sigterm = signal(SignalKind::terminate()).expect("sigterm");
            loop {
                tokio::select! {
                    _ = sigint.recv() => {
                        keystore::purge();
                        eprintln!("[secure] purged keystore cache on SIGINT");
                        break;
                    },
                    _ = sigterm.recv() => {
                        keystore::purge();
                        eprintln!("[secure] purged keystore cache on SIGTERM");
                        break;
                    }
                }
            }
        });
    });
}
