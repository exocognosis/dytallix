#!/usr/bin/env python3
"""Dytallix Telemetry High-ROI Analysis Prototype.

Stages:
 1. Extract & manifest build
 2. Schema inference & normalization -> curated parquet facts
 3. KPI calculations
 4. Anomaly & error pattern detection
 5. Reporting artifacts

Keep fast, simple, and profile before expanding.
"""
from __future__ import annotations
import argparse
import tarfile
import tempfile
import shutil
import os
import re
import json
import math
from pathlib import Path
from typing import List, Dict, Any, Iterable

import polars as pl
import duckdb
from tqdm import tqdm

# ------------------------------ Helpers ------------------------------ #

def safe_mkdir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def is_probably_jsonl(sample: str) -> bool:
    # crude heuristic: lines beginning with { and ending with }
    lines = [l for l in sample.splitlines() if l.strip()][:5]
    score = sum(1 for l in lines if l.strip().startswith('{') and l.strip().endswith('}'))
    return score >= max(2, len(lines)//2)


def detect_format(path: Path) -> str:
    if path.suffix in {'.parquet'}:
        return 'parquet'
    if path.suffix in {'.json', '.ndjson', '.jsonl'}:
        return 'json'
    if path.suffix in {'.csv'}:
        return 'csv'
    # Peek
    try:
        with path.open('r', errors='ignore') as f:
            head = ''.join([next(f) for _ in range(5)])
            if is_probably_jsonl(head):
                return 'json'
            if ',' in head:
                return 'csv'
    except Exception:
        pass
    return 'text'

# ------------------------------ Stage 1: Extract & Manifest ------------------------------ #

def build_manifest(archive: Path, work_dir: Path) -> pl.DataFrame:
    extract_dir = work_dir / 'extracted'
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir()
    with tarfile.open(archive, 'r:gz') as tf:
        tf.extractall(extract_dir)

    rows = []
    for p in extract_dir.rglob('*'):
        if p.is_file():
            try:
                size = p.stat().st_size
            except OSError:
                size = None
            ftype = detect_format(p)
            rows.append({'path': str(p), 'rel_path': p.relative_to(extract_dir).as_posix(), 'size_bytes': size, 'format': ftype})
    df = pl.DataFrame(rows)
    return df

# ------------------------------ Stage 2: Curate Facts ------------------------------ #

# Expect (heuristics) file name patterns; adapt as needed
BLOCK_PAT = re.compile(r'block', re.I)
TX_PAT = re.compile(r'transaction|tx_', re.I)
ERROR_PAT = re.compile(r'error|err|fatal|panic', re.I)
RESOURCE_PAT = re.compile(r'cpu|mem|resource|usage', re.I)


def load_json_lines(path: Path, columns: List[str] | None = None, limit: int | None = None) -> pl.DataFrame:
    # Polars can infer json lines via read_ndjson
    try:
        return pl.read_ndjson(str(path)) if limit is None else pl.read_ndjson(str(path))[:limit]
    except Exception:
        return pl.DataFrame()


def curate_blocks(manifest: pl.DataFrame) -> pl.DataFrame:
    candidates = manifest.filter(pl.col('rel_path').str.contains('block'))
    dfs = []
    for row in candidates.iter_rows(named=True):
        p = Path(row['path'])
        if row['format'] == 'json':
            df = load_json_lines(p)
        elif row['format'] == 'parquet':
            df = pl.read_parquet(p)
        else:
            continue
        if df.is_empty():
            continue
        # Heuristic column mapping
        rename_map = {}
        for c in df.columns:
            lc = c.lower()
            if lc in {'height','block_height'}:
                rename_map[c] = 'height'
            elif lc in {'timestamp','time','block_time'}:
                rename_map[c] = 'timestamp'
            elif lc in {'hash','block_hash'}:
                rename_map[c] = 'block_hash'
            elif lc in {'tx_count','num_txs'}:
                rename_map[c] = 'tx_count'
        df = df.rename(rename_map)
        needed = [c for c in ['height','timestamp','tx_count'] if c in df.columns]
        df = df.select([c for c in df.columns if c in needed + ['block_hash']])
        dfs.append(df)
    if not dfs:
        return pl.DataFrame()
    blocks = pl.concat(dfs, how='vertical').unique(subset=['height'])
    # Normalize timestamp to int ms
    if 'timestamp' in blocks.columns:
        if blocks['timestamp'].dtype == pl.Utf8:
            blocks = blocks.with_columns(pl.col('timestamp').str.strptime(pl.Datetime, strict=False).cast(pl.Datetime).alias('timestamp'))
        if blocks['timestamp'].dtype == pl.Datetime:
            # Convert polars datetime (ns) to integer ms epoch
            blocks = blocks.with_columns(
                (pl.col('timestamp').cast(pl.Int64) // 1_000_000).alias('timestamp_ms')
            ).drop('timestamp').rename({'timestamp_ms': 'timestamp'})
    return blocks


def curate_transactions(manifest: pl.DataFrame) -> pl.DataFrame:
    candidates = manifest.filter(pl.col('rel_path').str.contains('tx') | pl.col('rel_path').str.contains('transaction'))
    dfs = []
    for row in candidates.iter_rows(named=True):
        p = Path(row['path'])
        if row['format'] == 'json':
            df = load_json_lines(p, limit=None)
        elif row['format'] == 'parquet':
            df = pl.read_parquet(p)
        else:
            continue
        if df.is_empty():
            continue
        rename_map = {}
        for c in df.columns:
            lc = c.lower()
            if lc in {'tx_hash','hash'}:
                rename_map[c] = 'tx_hash'
            elif lc in {'block_height','height'}:
                rename_map[c] = 'height'
            elif lc in {'timestamp','time'}:
                rename_map[c] = 'timestamp'
            elif lc in {'sender','from','from_address'}:
                rename_map[c] = 'from_address'
            elif lc in {'to','to_address','recipient'}:
                rename_map[c] = 'to_address'
            elif lc in {'gas_used'}:
                rename_map[c] = 'gas_used'
            elif lc in {'gas_limit'}:
                rename_map[c] = 'gas_limit'
            elif lc in {'fee','fees'}:
                rename_map[c] = 'fee'
            elif lc in {'status','success'}:
                rename_map[c] = 'status'
        df = df.rename(rename_map)
        keep = [c for c in ['tx_hash','height','timestamp','from_address','to_address','gas_used','gas_limit','fee','status'] if c in df.columns]
        dfs.append(df.select(keep))
    if not dfs:
        return pl.DataFrame()
    tx = pl.concat(dfs, how='vertical').unique(subset=['tx_hash'])
    return tx


def curate_errors(manifest: pl.DataFrame) -> pl.DataFrame:
    candidates = manifest.filter(pl.col('rel_path').str.contains('error') | pl.col('rel_path').str.contains('panic'))
    dfs = []
    for row in candidates.iter_rows(named=True):
        p = Path(row['path'])
        if row['format'] == 'json':
            df = load_json_lines(p)
        else:
            # treat as plain text lines
            try:
                lines = p.read_text(errors='ignore').splitlines()
            except Exception:
                continue
            df = pl.DataFrame({'line': lines})
        if df.is_empty():
            continue
        if 'message' in df.columns:
            df = df.select(pl.col('message').alias('line'))
        dfs.append(df.select('line'))
    if not dfs:
        return pl.DataFrame()
    err = pl.concat(dfs, how='vertical')
    # Normalize messages (strip variable hex / numbers)
    norm = err.with_columns(
        pl.col('line')
        .str.replace_all(r'0x[0-9a-fA-F]+','0xHEX')
        .str.replace_all(r'\b[0-9]{2,}\b','<NUM>')
        .alias('normalized')
    )
    top = (
        norm.group_by('normalized')
        .agg(count=pl.len())
        .sort('count', descending=True)
    )
    return top

# ------------------------------ Stage 3: KPIs ------------------------------ #

def compute_kpis(blocks: pl.DataFrame, tx: pl.DataFrame) -> Dict[str, Any]:
    k: Dict[str, Any] = {}
    if not blocks.is_empty() and 'height' in blocks.columns:
        k['block_count'] = int(blocks.height)
        if 'timestamp' in blocks.columns:
            b = blocks.sort('timestamp')
            if b.height > 1:
                intervals = b['timestamp'].diff().drop_nulls()
                k['block_time_ms_mean'] = float(intervals.mean())
                k['block_time_ms_p95'] = float(intervals.quantile(0.95))
                k['block_time_ms_jitter'] = float(intervals.std())
    if not tx.is_empty():
        k['tx_count'] = int(tx.height)
        if 'gas_used' in tx.columns:
            k['gas_used_sum'] = int(tx['gas_used'].drop_nulls().sum())
        if all(c in tx.columns for c in ['gas_used','gas_limit']):
            eff = (tx['gas_used'] / tx['gas_limit']).drop_nulls()
            if eff.len() > 0:
                k['gas_efficiency_mean'] = float(eff.mean())
                k['gas_efficiency_p95'] = float(eff.quantile(0.95))
        if 'fee' in tx.columns:
            fees = tx['fee'].drop_nulls()
            if fees.len():
                k['fee_p50'] = float(fees.quantile(0.5))
                k['fee_p95'] = float(fees.quantile(0.95))
                k['fee_p99'] = float(fees.quantile(0.99))
        if 'from_address' in tx.columns:
            addr_counts = tx.group_by('from_address').agg(pl.len().alias('n')).sort('n', descending=True)
            total = addr_counts['n'].sum()
            top5 = addr_counts.head(5)
            share_top5 = float(top5['n'].sum() / total) if total else None
            k['address_concentration_top5_share'] = share_top5
    return k

# ------------------------------ Stage 4: Anomalies ------------------------------ #

def detect_block_time_anomalies(blocks: pl.DataFrame, z_thresh: float = 4.0) -> pl.DataFrame:
    if blocks.is_empty() or 'timestamp' not in blocks.columns:
        return pl.DataFrame()
    b = blocks.sort('timestamp')
    if b.height < 3:
        return pl.DataFrame()
    intervals = b.with_columns(
        pl.col('timestamp').diff().alias('interval_ms')
    ).drop_nulls()
    iv = intervals['interval_ms']
    mu = iv.mean()
    sigma = iv.std()
    if sigma == 0 or math.isnan(sigma):
        return pl.DataFrame()
    intervals = intervals.with_columns(((pl.col('interval_ms') - mu)/sigma).alias('z'))
    return intervals.filter(pl.col('z').abs() >= z_thresh)

# ------------------------------ Stage 5: Reporting ------------------------------ #

def write_json(obj: Any, path: Path):
    path.write_text(json.dumps(obj, indent=2))


def run_pipeline(archive: Path, out_dir: Path, keep_tmp: bool=False):
    safe_mkdir(out_dir)
    work_dir = out_dir / 'tmp'
    if work_dir.exists():
        shutil.rmtree(work_dir)
    work_dir.mkdir()

    print('[1] Building manifest...')
    manifest = build_manifest(archive, work_dir)
    manifest.write_parquet(out_dir / 'manifest.parquet')
    print(f'Manifest rows: {manifest.height}')

    print('[2] Curating facts...')
    blocks = curate_blocks(manifest)
    tx = curate_transactions(manifest)
    errors = curate_errors(manifest)
    if not blocks.is_empty():
        blocks.write_parquet(out_dir / 'fact_blocks.parquet')
    if not tx.is_empty():
        tx.write_parquet(out_dir / 'fact_transactions.parquet')
    if not errors.is_empty():
        errors.write_parquet(out_dir / 'top_errors.parquet')

    print('[3] Computing KPIs...')
    kpis = compute_kpis(blocks, tx)
    write_json(kpis, out_dir / 'kpi_summary.json')

    print('[4] Detecting anomalies...')
    anomalies = detect_block_time_anomalies(blocks)
    if not anomalies.is_empty():
        anomalies.write_parquet(out_dir / 'anomalies.parquet')

    # Address concentration CSV
    if not tx.is_empty() and 'from_address' in tx.columns:
        addr_counts = tx.group_by('from_address').agg(pl.len().alias('n')).sort('n', descending=True)
        addr_counts.write_csv(out_dir / 'address_concentration.csv')

    # Simple markdown report
    report_lines = [
        '# Telemetry Report',
        '',
        '## KPIs',
        '```',
        json.dumps(kpis, indent=2),
        '```',
        '## Files',
        f'Manifest entries: {manifest.height}',
        f'Blocks: {blocks.height if not blocks.is_empty() else 0}',
        f'Transactions: {tx.height if not tx.is_empty() else 0}',
        f'Errors (unique normalized): {errors.height if not errors.is_empty() else 0}',
        f'Block time anomalies: {anomalies.height if not anomalies.is_empty() else 0}',
        '',
        '---',
        'Generated by telemetry_pipeline.py'
    ]
    (out_dir / 'report.md').write_text('\n'.join(report_lines))

    if not keep_tmp:
        shutil.rmtree(work_dir, ignore_errors=True)
    print('Done.')

# ------------------------------ CLI ------------------------------ #

def parse_args():
    ap = argparse.ArgumentParser(description='Dytallix telemetry analysis pipeline (prototype)')
    ap.add_argument('--archive', required=True, type=Path, help='Path to telemetry tgz')
    ap.add_argument('--out', required=True, type=Path, help='Output directory')
    ap.add_argument('--keep-tmp', action='store_true')
    return ap.parse_args()

if __name__ == '__main__':
    args = parse_args()
    run_pipeline(args.archive, args.out, keep_tmp=args.keep_tmp)
