#!/usr/bin/env python3
"""Export, verify and summarize the Dytallix testnet's full block history.

  testnet_history.py export  --out DIR [--api URL] [--rate N] [--chunk N] [--follow]
  testnet_history.py verify  --out DIR
  testnet_history.py summary --out DIR

export   Reads every block from height 1 through the public API
         (GET /api/blockchain/block/N), in order, at most --rate requests a
         second, and writes them as JSON lines in gzip chunks of --chunk
         blocks (blocks-START-END.jsonl.gz), each listed with its SHA-256 in
         manifest.json once complete. It resumes from the files themselves
         (the manifest's chunks and the partial current.jsonl), stops cleanly
         on SIGTERM or Ctrl-C, and records any block whose height or parent
         link is wrong in anomalies.jsonl without stopping. With --follow it
         keeps exporting new blocks after reaching the head, until stopped.
verify   Rechecks every chunk's digest, that heights are contiguous from 1 and
         that each block's parent is the previous block's hash.
summary  Writes summary.json: block count and time span, block interval
         statistics, transactions and gas, empty blocks, proposers and epochs.

Standard library only. The testnet is the old node, retired before mainnet
staging; this archive is its record.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import signal
import sys
import time
import urllib.error
import urllib.request

AGENT = 'dytallix-testnet-history/1'


def fetch(api, height, timeout=20):
    """One block, or None when the height is past the head."""
    request = urllib.request.Request(f'{api}/api/blockchain/block/{height}', headers={'User-Agent': AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def head(api):
    block = fetch(api, 'latest')
    return int(block['height'])


def read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    os.replace(temporary, path)


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            digest.update(block)
    return digest.hexdigest()


def chunk_name(start, size):
    return f'blocks-{start:09d}-{start + size - 1:09d}.jsonl.gz'


def resume(out, manifest, size):
    """The next height and the previous hash, from the files: complete chunks,
    then the partial chunk's whole, valid lines (a torn last line is dropped)."""
    chunks = manifest['chunks']
    done = chunks[-1]['last'] if chunks else 0
    last_hash = chunks[-1]['last_hash'] if chunks else 'genesis'
    current = out / 'current.jsonl'
    kept = []
    if current.exists():
        for line in current.read_text().split('\n'):
            try:
                block = json.loads(line)
            except ValueError:
                break
            if int(block.get('height', -1)) != done + len(kept) + 1 or len(kept) >= size:
                break
            kept.append(line)
        current.write_text(''.join(line + '\n' for line in kept))
        if kept:
            last_hash = json.loads(kept[-1]).get('hash')
    return done + len(kept) + 1, last_hash


def export(out, api, rate, size, follow, say=print):
    out.mkdir(parents=True, exist_ok=True)
    state_path, manifest_path = out / 'state.json', out / 'manifest.json'
    manifest = read_json(manifest_path, {'schema': 'dytallix.testnet-history.v1', 'api': api, 'chunk_size': size, 'chunks': []})
    if manifest['chunk_size'] != size:
        raise SystemExit(f'this archive uses chunks of {manifest["chunk_size"]} blocks')
    current = out / 'current.jsonl'
    next_height, last_hash = resume(out, manifest, size)
    state = {'next_height': next_height, 'last_hash': last_hash, 'api': api, 'chunk_size': size}
    stopping = []
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stopping.append(True))
    interval, last = 1.0 / rate, 0.0
    tip, failures = head(api), 0
    say(f'exporting from height {state["next_height"]}, head {tip}')
    with (out / 'anomalies.jsonl').open('a') as anomalies:
        while not stopping:
            height = state['next_height']
            if height > tip:
                if not follow:
                    break
                for _ in range(15):
                    if stopping:
                        break
                    time.sleep(1)
                tip = head(api)
                continue
            wait = last + interval - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            last = time.monotonic()
            try:
                block = fetch(api, height)
                failures = 0
            except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
                failures += 1
                pause = min(300, 2 ** min(failures, 8))
                say(f'height {height}: {error}; retrying in {pause} s')
                time.sleep(pause)
                continue
            if block is None:
                tip = head(api)
                continue
            if int(block.get('height', -1)) != height:
                anomalies.write(json.dumps({'height': height, 'problem': 'wrong height', 'got': block.get('height')}) + '\n')
            expected = 'genesis' if height == 1 else state['last_hash']
            if expected is not None and block.get('parent') != expected:
                anomalies.write(json.dumps({'height': height, 'problem': 'parent link', 'parent': block.get('parent'),
                                            'expected': expected}) + '\n')
            anomalies.flush()
            with current.open('a') as f:
                f.write(json.dumps(block, separators=(',', ':'), sort_keys=True) + '\n')
            state['next_height'], state['last_hash'] = height + 1, block.get('hash')
            if height % size == 0:
                name = chunk_name(height - size + 1, size)
                with current.open('rb') as src, gzip.open(out / (name + '.tmp'), 'wb', compresslevel=9) as dst:
                    dst.write(src.read())
                os.replace(out / (name + '.tmp'), out / name)
                manifest['chunks'].append({'file': name, 'first': height - size + 1, 'last': height, 'blocks': size,
                                           'last_hash': block.get('hash'), 'sha256': sha256(out / name)})
                write_json(manifest_path, manifest)
                write_json(state_path, state)
                current.unlink()
                say(f'{name} written; head {tip}')
            elif height % 100 == 0:
                write_json(state_path, state)
    write_json(state_path, state)
    say(f'{"stopped" if stopping else "exported"} through height {state["next_height"] - 1}')


def blocks(out):
    """Every exported block, in height order, complete chunks then the current one."""
    manifest = read_json(out / 'manifest.json', {'chunks': []})
    for chunk in manifest['chunks']:
        with gzip.open(out / chunk['file'], 'rt') as f:
            for line in f:
                yield json.loads(line)
    current = out / 'current.jsonl'
    if current.exists():
        for line in current.read_text().splitlines():
            yield json.loads(line)


def verify(out, say=print):
    manifest = read_json(out / 'manifest.json', {'chunks': []})
    problems = []
    for chunk in manifest['chunks']:
        if sha256(out / chunk['file']) != chunk['sha256']:
            problems.append(f'{chunk["file"]}: digest differs')
    expected_height, last_hash, count = 1, 'genesis', 0
    for block in blocks(out):
        if int(block['height']) != expected_height:
            problems.append(f'height {expected_height}: found {block["height"]}')
            expected_height = int(block['height'])
        if block.get('parent') != last_hash:
            problems.append(f'height {expected_height}: parent link broken')
        last_hash, expected_height, count = block.get('hash'), expected_height + 1, count + 1
    report = {'status': 'PASS' if not problems else 'FAIL', 'blocks': count, 'chunks': len(manifest['chunks']),
              'problems': problems[:50], 'problem_count': len(problems)}
    say(json.dumps(report, indent=2))
    return report


def percentile(values, q):
    if not values:
        return None
    index = min(len(values) - 1, max(0, round(q / 100 * (len(values) - 1))))
    return values[index]


def summary(out, say=print):
    count = txs = empty = gas = 0
    first = last = previous = None
    intervals, per_block, proposers, epochs = [], {}, {}, set()
    for block in blocks(out):
        count += 1
        n = len(block.get('txs') or [])
        txs += n
        empty += n == 0
        per_block[n] = per_block.get(n, 0) + 1
        gas += int(block.get('gas_used') or 0)
        proposers[block.get('proposer')] = proposers.get(block.get('proposer'), 0) + 1
        epochs.add(block.get('epoch'))
        stamp = int(block['timestamp'])
        first = stamp if first is None else first
        if previous is not None:
            intervals.append(stamp - previous)
        previous = last = stamp
    intervals.sort()
    result = {
        'blocks': count, 'first_timestamp': first, 'last_timestamp': last,
        'span_days': round((last - first) / 86400, 2) if count > 1 else 0,
        'block_interval_seconds': None if not intervals else {
            'mean': round(sum(intervals) / len(intervals), 3), 'median': percentile(intervals, 50),
            'p95': percentile(intervals, 95), 'p99': percentile(intervals, 99), 'p99_9': percentile(intervals, 99.9),
            'min': intervals[0], 'max': intervals[-1],
            'over_60_s': sum(1 for i in intervals if i > 60)},
        'transactions': txs, 'transactions_per_block': {str(k): v for k, v in sorted(per_block.items())},
        'empty_blocks': empty, 'empty_share': round(empty / count, 4) if count else None,
        'gas_used_total': gas, 'proposers': proposers, 'epochs': len(epochs),
    }
    write_json(out / 'summary.json', result)
    say(json.dumps(result, indent=2))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest='command', required=True)
    e = commands.add_parser('export')
    e.add_argument('--out', type=Path, required=True)
    e.add_argument('--api', default='https://dytallix.com')
    e.add_argument('--rate', type=float, default=10.0, help='requests a second (default 10)')
    e.add_argument('--chunk', type=int, default=10000)
    e.add_argument('--follow', action='store_true')
    for name in ('verify', 'summary'):
        commands.add_parser(name).add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'export':
        export(args.out, args.api.rstrip('/'), args.rate, args.chunk, args.follow)
    elif args.command == 'verify':
        return 0 if verify(args.out)['status'] == 'PASS' else 1
    else:
        summary(args.out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
