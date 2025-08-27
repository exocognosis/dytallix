use anyhow::anyhow;
use rusqlite::{Connection, Result};

pub fn create_schema(conn: &Connection) -> Result<()> {
    // Create blocks table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS blocks (
            height INTEGER PRIMARY KEY,
            hash TEXT NOT NULL,
            time TEXT NOT NULL,
            tx_count INTEGER NOT NULL DEFAULT 0
        )",
        [],
    )?;

    // Create transactions table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS txs (
            hash TEXT PRIMARY KEY,
            height INTEGER NOT NULL,
            sender TEXT,
            recipient TEXT,
            amount TEXT,
            denom TEXT,
            status INTEGER NOT NULL DEFAULT 0,
            gas_used INTEGER DEFAULT 0,
            FOREIGN KEY (height) REFERENCES blocks (height)
        )",
        [],
    )?;

    // Create indexes for better query performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks(height DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_txs_height ON txs(height DESC)",
        [],
    )?;

    conn.execute("CREATE INDEX IF NOT EXISTS idx_txs_hash ON txs(hash)", [])?;

    Ok(())
}

pub fn apply_migrations(conn: &Connection) -> anyhow::Result<()> {
    create_schema(conn).map_err(|e| anyhow!("Failed to apply migrations: {}", e))
}
