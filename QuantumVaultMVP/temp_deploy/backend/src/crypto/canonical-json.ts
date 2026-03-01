import * as crypto from 'crypto';

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Cannot canonicalize non-finite numbers');
  }
  if (Object.is(value, -0)) {
    return 0;
  }
  return value;
}

export function canonicalizeJson(value: unknown): CanonicalValue {
  if (value === null) return null;

  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return normalizeNumber(value);
  if (typeof value === 'bigint') return value.toString();

  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (value instanceof Uint8Array) return Buffer.from(value).toString('base64');

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }

  if (!isPlainObject(value)) {
    return String(value);
  }

  const output: { [key: string]: CanonicalValue } = {};
  const keys = Object.keys(value).sort();
  for (const key of keys) {
    const entry = value[key];
    if (entry === undefined) {
      continue;
    }
    output[key] = canonicalizeJson(entry);
  }
  return output;
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value));
}

export function canonicalJsonBuffer(value: unknown): Buffer {
  return Buffer.from(canonicalJsonStringify(value), 'utf8');
}

export function canonicalJsonSha256Hex(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalJsonBuffer(value)).digest('hex');
}
