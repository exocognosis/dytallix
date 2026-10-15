# Testnet history export

Exports the Dytallix testnet's full block history (every block from height 1) before the testnet is retired, so it can be archived and analyzed. The testnet is the old node at `dytallix.com`; mainnet staging replaces it.

- `testnet_history.py`: the exporter (Python standard library only).
- `testnet-history.service`: the systemd unit it runs under on the Ashburn server.

## On Ashburn

Installed at `/opt/testnet-history/testnet_history.py`, data in `/var/lib/testnet-history`. The service runs as a throwaway system user, at low CPU and disk priority, capped at 256 MB, reading at most 10 blocks a second through the public API. The first pass takes about 21 hours; then it follows new blocks every 15 seconds until stopped.

```bash
ssh root@ASHBURN 'systemctl status testnet-history --no-pager | head -5; journalctl -u testnet-history -n 5 -o cat'
```

```bash
ssh root@ASHBURN 'python3 -c "import json; print(json.load(open(\"/var/lib/testnet-history/state.json\"))[\"next_height\"])"'
```

## Files

- `blocks-START-END.jsonl.gz`: 10,000 blocks each, one JSON block per line, exactly as the API returned it (keys sorted).
- `manifest.json`: each complete chunk with its heights, last block hash and SHA-256.
- `current.jsonl`: the chunk in progress.
- `anomalies.jsonl`: any block whose height or parent link was wrong (empty so far).
- `state.json`: progress, for reading only; the exporter resumes from the files themselves.

## Verify and summarize

```bash
ssh root@ASHBURN 'python3 /opt/testnet-history/testnet_history.py verify --out /var/lib/testnet-history'
```

```bash
ssh root@ASHBURN 'python3 /opt/testnet-history/testnet_history.py summary --out /var/lib/testnet-history'
```

`verify` rechecks every chunk's digest, that heights run contiguously from 1, and every parent link. `summary` writes `summary.json`: block count and span, block interval statistics (mean, median, p95, p99, p99.9, gaps over 60 s), transactions and transactions per block, empty blocks, gas, proposers and epochs.

## At retirement

1. Stop the service and take a final verify and summary.
2. Pack and checksum the archive, encrypt it with a passphrase (symmetric AES-256), and copy it off the server:

   ```bash
   ssh root@ASHBURN 'systemctl stop testnet-history && cd /var/lib && tar -czf /root/testnet-history.tar.gz testnet-history && sha256sum /root/testnet-history.tar.gz && gpg --symmetric --cipher-algo AES256 -o /root/testnet-history.tar.gz.gpg /root/testnet-history.tar.gz'
   ```

3. Remove the service: `systemctl disable --now testnet-history`, then delete `/etc/systemd/system/testnet-history.service`, `/opt/testnet-history` and, once the archive is safely copied, `/var/lib/testnet-history`.
