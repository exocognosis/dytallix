use crate::keystore;
use anyhow::{anyhow, Result};
use rpassword::read_password;
use std::sync::Once;
use std::{thread, time::Duration};
use tokio::signal::unix::{signal, SignalKind};
use tracing::{info, warn};
use zeroize::Zeroize;

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
                        warn!("event=signal kind=SIGINT action=purge_keystore");
                        break;
                    },
                    _ = sigterm.recv() => {
                        keystore::purge();
                        warn!("event=signal kind=SIGTERM action=purge_keystore");
                        break;
                    }
                }
            }
        });
    });
}

/// Prompt user for passphrase with optional confirmation and bounded retries.
/// `verify_fn` can apply additional policy (length/complexity). It must NOT leak secrets.
pub fn prompt_passphrase_with_retry<F>(
    confirm: bool,
    max_retries: u8,
    backoff_ms: u64,
    verify_fn: F,
) -> Result<String>
where
    F: Fn(&str) -> bool,
{
    let _hidden = true; // always hidden for now; could add env toggle
    let mut attempt: u8 = 0;
    loop {
        attempt += 1;
        print_prompt("Enter passphrase: ")?;
        let mut pass = read_password().map_err(|e| anyhow!(e))?;
        if !verify_fn(&pass) {
            warn!(
                "event=passphrase_verify_failed attempt={} max={}",
                attempt, max_retries
            );
            pass.zeroize();
            if attempt >= max_retries {
                return Err(anyhow!("passphrase verification failed"));
            }
            backoff(backoff_ms);
            continue;
        }
        if confirm {
            print_prompt("Confirm passphrase: ")?;
            let confirm_v = read_password().map_err(|e| anyhow!(e))?;
            if confirm_v != pass {
                warn!(
                    "event=passphrase_mismatch attempt={} max={}",
                    attempt, max_retries
                );
                let mut c = confirm_v;
                c.zeroize();
                pass.zeroize();
                if attempt >= max_retries {
                    return Err(anyhow!("passphrase mismatch"));
                }
                backoff(backoff_ms);
                continue;
            } else {
                let mut c = confirm_v;
                c.zeroize();
            }
        }
        info!(
            "event=passphrase_accepted attempts={} confirm={} hidden=1",
            attempt, confirm as i32
        );
        return Ok(pass); // caller must zeroize after use
    }
}

fn backoff(ms: u64) {
    if ms > 0 {
        thread::sleep(Duration::from_millis(ms));
    }
}
fn print_prompt(s: &str) -> Result<()> {
    use std::io::Write;
    print!("{}", s);
    std::io::stdout().flush().map_err(|e| anyhow!(e))
}
