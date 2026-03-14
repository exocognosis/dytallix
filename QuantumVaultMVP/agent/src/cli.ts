#!/usr/bin/env node

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  canonicalJsonBuffer,
  canonicalJsonSha256Hex,
} from './lib/canonical-json';
import {
  deriveAes256Key,
  getMlKemByAlgorithm,
  ML_KEM_768_ALGORITHM,
  normalizeKemAlgorithmName,
  sha256Hex,
} from './lib/mlkem';
import { getMlDsa65, ML_DSA_65_ALGORITHM } from './lib/mldsa';
import {
  ensureSecureDir,
  getAgentRoot,
  readJsonFile,
  resolveWorkspaceStatePath,
  safeBasename,
  sanitizePathSegment,
  wipePath,
  writeSecureJson,
} from './lib/io';

const AGENT_VERSION = 'qv-agent/1.0.0';

type ParsedArgs = {
  command: string | null;
  flags: Record<string, string | boolean>;
  positionals: string[];
};

type DeviceProfile = {
  schemaVersion: 'qv.agent.device-profile.v1';
  profile: string;
  deviceId: string;
  deviceLabel?: string | null;
  deviceKeyAlgorithm: string;
  devicePublicKeyHash: string;
  networkZone: string;
  locationLabel?: string | null;
  locationCode?: string | null;
  createdAt: string;
};

type DeviceKeyRecord = {
  schemaVersion: 'qv.agent.device-key.v1';
  profile: string;
  deviceKeyAlgorithm: string;
  publicKeyBase64: string;
  secretKeyBase64: string;
  publicKeyHashHex: string;
  createdAt: string;
};

type TrustBundle = {
  protocolVersion: string;
  signingEnvelopeVersion: string;
  algorithm: string;
  signerKeyId: string;
  signerKeyHashHex: string;
  publicKeyBase64: string;
  exportedAt: string;
};

type CheckoutBundle = {
  schemaVersion: 'qv.checkout.bundle.v1';
  bundleId: string;
  issuedAt: string;
  expiresAt: string;
  sessionId: string;
  accessRequestId: string;
  pipelineAssetId: string;
  classificationLevel: string;
  allowedAction: string;
  relativePath: string;
  filename: string;
  mimeType: string;
  requester: {
    id: string;
    email: string;
    department?: string | null;
    role: string;
  };
  device: {
    deviceId?: string | null;
    credentialId?: string;
    credentialName?: string;
    deviceLabel?: string | null;
    publicKeyHash: string;
    keyAlgorithm: string;
    agentVersion?: string | null;
    workspaceId?: string | null;
  };
  assetEnvelope: {
    schemaVersion: 'qv.checkout.asset-envelope.v1';
    algorithm: string;
    kemAlgorithm: string;
    anchorId: string;
    ciphertext: string;
    nonce: string;
    aeadTag: string;
    aadContext: Record<string, unknown>;
    source?: Record<string, unknown> | null;
    contentHash: string;
  };
  contentKeyEnvelope: {
    schemaVersion: 'qv.checkout.content-key-envelope.v1';
    kemAlgorithm: string;
    kemCiphertext: string;
    salt: string;
    nonce: string;
    aeadTag: string;
    aadContext: Record<string, unknown>;
    encryptedContentKey: string;
  };
  sessionTokenEnvelope: {
    schemaVersion: 'qv.checkout.session-token-envelope.v1';
    kemAlgorithm: string;
    salt: string;
    nonce: string;
    aeadTag: string;
    aadContext: Record<string, unknown>;
    encryptedSessionToken: string;
  };
  checkin: {
    schemaVersion: 'qv.checkin.manifest.v1';
    endpointPath: string;
    checkoutBundleId: string;
  };
  policy: {
    version: string;
    hash: string;
  };
  lineage: {
    sourceAssetId: string;
    sourceContentHash: string;
  };
  location?: {
    networkZone?: string;
    locationLabel?: string | null;
    locationCode?: string | null;
  };
  reason?: string | null;
  signature: {
    algorithm: string;
    domain: string;
    signingDigestHex: string;
    signatureHex: string;
    signerKeyId: string;
    signerKeyHashHex: string;
  };
};

type WorkspaceState = {
  schemaVersion: 'qv.agent.workspace.v1';
  createdAt: string;
  profile: string;
  workspacePath: string;
  plaintextPath: string;
  bundlePath: string;
  bundleDigestSha256: string;
  sessionId: string;
  pipelineAssetId: string;
  checkoutBundleId: string;
  checkinEndpointPath: string;
  serverBaseUrl?: string | null;
  sessionToken: string;
  credentialId?: string;
  mimeType: string;
  filename: string;
  contentSha256: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let command: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
      if (inlineValue !== undefined) {
        flags[rawKey] = inlineValue;
        continue;
      }

      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        flags[rawKey] = next;
        index += 1;
      } else {
        flags[rawKey] = true;
      }
      continue;
    }

    if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }

  return { command, flags, positionals };
}

function flagString(flags: Record<string, string | boolean>, name: string, fallback = ''): string {
  const value = flags[name];
  return typeof value === 'string' ? value : fallback;
}

function flagBool(flags: Record<string, string | boolean>, name: string): boolean {
  return flags[name] === true || flags[name] === 'true';
}

function requireFlag(flags: Record<string, string | boolean>, name: string): string {
  const value = flagString(flags, name);
  if (!value.trim()) {
    throw new Error(`Missing required --${name}`);
  }
  return value.trim();
}

function normalizeServerBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function agentHomePaths(root: string, profile: string) {
  const baseRoot = getAgentRoot(root);
  const profileRoot = path.join(baseRoot, 'profiles', sanitizePathSegment(profile));
  return {
    baseRoot,
    profileRoot,
    profilePath: path.join(profileRoot, 'profile.json'),
    keyPath: path.join(profileRoot, 'device-key.json'),
    trustBundlePath: path.join(profileRoot, 'trust-bundle.json'),
  };
}

function printUsage() {
  const usage = [
    'QuantumVault Managed Endpoint Agent',
    '',
    'Commands:',
    '  init        Generate a managed device ML-KEM keypair and emit enrollment JSON',
    '  trust-sync  Fetch and cache the attestation trust bundle from QuantumVault',
    '  open        Verify a checkout bundle and materialize a protected workspace',
    '  checkin     Upload an edited workspace file back through the agent check-in endpoint',
    '  cleanup     Securely delete a protected workspace',
    '',
    'Examples:',
    '  qv-agent init --profile finance-phx --device-id phx-secure-01 --device-label "Finance Secure Workstation"',
    '  qv-agent trust-sync --profile finance-phx --server-base-url http://127.0.0.1:13000',
    '  qv-agent open --profile finance-phx --bundle ./checkout.json --server-base-url http://127.0.0.1:13000',
    '  qv-agent checkin --workspace ~/.quantumvault-agent/workspaces/session-bundle',
  ].join('\n');

  process.stdout.write(`${usage}\n`);
}

function readProfile(paths: ReturnType<typeof agentHomePaths>) {
  if (!fs.existsSync(paths.profilePath) || !fs.existsSync(paths.keyPath)) {
    throw new Error(`Device profile not initialized at ${paths.profileRoot}`);
  }

  return {
    profile: readJsonFile<DeviceProfile>(paths.profilePath),
    keys: readJsonFile<DeviceKeyRecord>(paths.keyPath),
  };
}

function validateTrustBundle(bundle: TrustBundle): TrustBundle {
  const publicKeyHash = `0x${sha256Hex(Buffer.from(bundle.publicKeyBase64, 'base64'))}`;
  if (bundle.algorithm !== ML_DSA_65_ALGORITHM) {
    throw new Error(`Unsupported verifier algorithm ${bundle.algorithm}`);
  }
  if (publicKeyHash.toLowerCase() !== bundle.signerKeyHashHex.toLowerCase()) {
    throw new Error('Trust bundle signerKeyHashHex does not match the exported public key');
  }
  return bundle;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.message || response.statusText || 'Request failed';
    throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
  }
  return payload;
}

async function verifyCheckoutBundleSignature(bundle: CheckoutBundle, trustBundle: TrustBundle) {
  validateTrustBundle(trustBundle);

  const unsignedBundle = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;
  delete unsignedBundle.signature;
  const digestHex = `0x${canonicalJsonSha256Hex(unsignedBundle)}`;
  const expectedSigningDigest = `0x${canonicalJsonSha256Hex({
    protocolVersion: trustBundle.signingEnvelopeVersion,
    domain: bundle.signature.domain,
    digest: digestHex,
  })}`;

  if (bundle.signature.algorithm !== ML_DSA_65_ALGORITHM) {
    throw new Error(`Unsupported bundle signature algorithm ${bundle.signature.algorithm}`);
  }
  if (bundle.signature.signerKeyHashHex.toLowerCase() !== trustBundle.signerKeyHashHex.toLowerCase()) {
    throw new Error('Checkout bundle signer key does not match the local trust bundle');
  }
  if (bundle.signature.signerKeyId !== trustBundle.signerKeyId) {
    throw new Error('Checkout bundle signer key-id does not match the local trust bundle');
  }
  if (bundle.signature.signingDigestHex.toLowerCase() !== expectedSigningDigest.toLowerCase()) {
    throw new Error('Checkout bundle signing digest does not match the canonical bundle payload');
  }

  const verifier = await getMlDsa65();
  const verified = await verifier.verify(
    new Uint8Array(Buffer.from(expectedSigningDigest.slice(2), 'hex')),
    new Uint8Array(Buffer.from(bundle.signature.signatureHex.slice(2), 'hex')),
    new Uint8Array(Buffer.from(trustBundle.publicKeyBase64, 'base64')),
  );

  if (!verified) {
    throw new Error('Checkout bundle detached signature verification failed');
  }
}

function decryptAesGcm(params: {
  key: Buffer;
  nonceBase64: string;
  aad: Record<string, unknown>;
  tagBase64: string;
  ciphertextBase64: string;
}): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-gcm', params.key, Buffer.from(params.nonceBase64, 'base64'));
  decipher.setAAD(canonicalJsonBuffer(params.aad));
  decipher.setAuthTag(Buffer.from(params.tagBase64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(params.ciphertextBase64, 'base64')),
    decipher.final(),
  ]);
}

async function deriveSharedSecret(bundle: CheckoutBundle, keys: DeviceKeyRecord) {
  const kem = await getMlKemByAlgorithm(bundle.contentKeyEnvelope.kemAlgorithm);
  return kem.decapsulate(
    new Uint8Array(Buffer.from(bundle.contentKeyEnvelope.kemCiphertext, 'base64')),
    new Uint8Array(Buffer.from(keys.secretKeyBase64, 'base64')),
  );
}

async function decryptCheckoutBundle(bundle: CheckoutBundle, keys: DeviceKeyRecord) {
  if (normalizeKemAlgorithmName(bundle.device.keyAlgorithm) !== normalizeKemAlgorithmName(keys.deviceKeyAlgorithm)) {
    throw new Error('The checkout bundle algorithm does not match the local device key algorithm');
  }
  if (bundle.device.publicKeyHash.toLowerCase() !== keys.publicKeyHashHex.toLowerCase()) {
    throw new Error('The checkout bundle is not bound to this managed device profile');
  }

  const sharedSecret = await deriveSharedSecret(bundle, keys);
  const contentWrapKey = deriveAes256Key(
    sharedSecret,
    Buffer.from(bundle.contentKeyEnvelope.salt, 'base64'),
    bundle.contentKeyEnvelope.kemAlgorithm,
  );
  const contentKey = decryptAesGcm({
    key: contentWrapKey,
    nonceBase64: bundle.contentKeyEnvelope.nonce,
    aad: bundle.contentKeyEnvelope.aadContext,
    tagBase64: bundle.contentKeyEnvelope.aeadTag,
    ciphertextBase64: bundle.contentKeyEnvelope.encryptedContentKey,
  });

  const sessionWrapKey = deriveAes256Key(
    sharedSecret,
    Buffer.from(bundle.sessionTokenEnvelope.salt, 'base64'),
    bundle.sessionTokenEnvelope.kemAlgorithm,
  );
  const sessionToken = decryptAesGcm({
    key: sessionWrapKey,
    nonceBase64: bundle.sessionTokenEnvelope.nonce,
    aad: bundle.sessionTokenEnvelope.aadContext,
    tagBase64: bundle.sessionTokenEnvelope.aeadTag,
    ciphertextBase64: bundle.sessionTokenEnvelope.encryptedSessionToken,
  }).toString('utf8');

  const plaintext = decryptAesGcm({
    key: contentKey,
    nonceBase64: bundle.assetEnvelope.nonce,
    aad: bundle.assetEnvelope.aadContext,
    tagBase64: bundle.assetEnvelope.aeadTag,
    ciphertextBase64: bundle.assetEnvelope.ciphertext,
  });

  return {
    contentKey,
    sessionToken,
    plaintext,
  };
}

function defaultMimeType(filename: string, fallback?: string): string {
  if (fallback && fallback !== 'application/octet-stream') return fallback;
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

async function runInit(flags: Record<string, string | boolean>) {
  const root = flagString(flags, 'root');
  const profileName = flagString(flags, 'profile', 'default');
  const paths = agentHomePaths(root, profileName);
  const force = flagBool(flags, 'force');
  if (!force && (fs.existsSync(paths.profilePath) || fs.existsSync(paths.keyPath))) {
    throw new Error(`Profile ${profileName} already exists at ${paths.profileRoot}. Use --force to overwrite.`);
  }

  const deviceKeyAlgorithm = normalizeKemAlgorithmName(flagString(flags, 'algorithm', ML_KEM_768_ALGORITHM));
  const deviceId = requireFlag(flags, 'device-id');
  const deviceLabel = flagString(flags, 'device-label') || null;
  const networkZone = flagString(flags, 'network-zone', 'INTERNAL').toUpperCase() || 'INTERNAL';
  const locationLabel = flagString(flags, 'location-label') || null;
  const locationCode = flagString(flags, 'location-code') || null;

  ensureSecureDir(paths.profileRoot);
  const kem = await getMlKemByAlgorithm(deviceKeyAlgorithm);
  const keyPair = await kem.generateKeyPair();
  const publicKeyBase64 = Buffer.from(keyPair.publicKey).toString('base64');
  const secretKeyBase64 = Buffer.from(keyPair.secretKey).toString('base64');
  const publicKeyHashHex = `0x${sha256Hex(Buffer.from(keyPair.publicKey))}`;
  const createdAt = new Date().toISOString();

  const profile: DeviceProfile = {
    schemaVersion: 'qv.agent.device-profile.v1',
    profile: profileName,
    deviceId,
    deviceLabel,
    deviceKeyAlgorithm,
    devicePublicKeyHash: publicKeyHashHex,
    networkZone,
    locationLabel,
    locationCode,
    createdAt,
  };

  const keys: DeviceKeyRecord = {
    schemaVersion: 'qv.agent.device-key.v1',
    profile: profileName,
    deviceKeyAlgorithm,
    publicKeyBase64,
    secretKeyBase64,
    publicKeyHashHex,
    createdAt,
  };

  writeSecureJson(paths.profilePath, profile);
  writeSecureJson(paths.keyPath, keys);

  const enrollment = {
    schemaVersion: 'qv.agent.enrollment.v1',
    profile: profileName,
    agentVersion: AGENT_VERSION,
    deviceId,
    deviceLabel,
    deviceKeyAlgorithm,
    devicePublicKey: publicKeyBase64,
    devicePublicKeyHash: publicKeyHashHex,
    networkZone,
    locationLabel,
    locationCode,
    generatedAt: createdAt,
  };

  const outputPath = flagString(flags, 'output');
  if (outputPath) {
    writeSecureJson(path.resolve(outputPath), enrollment);
  }

  process.stdout.write(`${JSON.stringify({
    profileRoot: paths.profileRoot,
    profilePath: paths.profilePath,
    keyPath: paths.keyPath,
    enrollmentPath: outputPath ? path.resolve(outputPath) : null,
    enrollment,
  }, null, 2)}\n`);
}

async function runTrustSync(flags: Record<string, string | boolean>) {
  const root = flagString(flags, 'root');
  const profileName = flagString(flags, 'profile', 'default');
  const paths = agentHomePaths(root, profileName);
  const serverBaseUrl = normalizeServerBaseUrl(requireFlag(flags, 'server-base-url'));
  ensureSecureDir(paths.profileRoot);

  const bundle = validateTrustBundle(
    await fetchJson(`${serverBaseUrl}/api/v1/access/agent/trust-bundle`) as TrustBundle,
  );
  writeSecureJson(paths.trustBundlePath, bundle);

  process.stdout.write(`${JSON.stringify({
    profile: profileName,
    trustBundlePath: paths.trustBundlePath,
    trustBundle: bundle,
  }, null, 2)}\n`);
}

async function resolveTrustBundle(
  paths: ReturnType<typeof agentHomePaths>,
  flags: Record<string, string | boolean>,
): Promise<{ trustBundle: TrustBundle; trustBundlePath: string }> {
  const explicitPath = flagString(flags, 'trust-bundle');
  if (explicitPath) {
    const trustBundlePath = path.resolve(explicitPath);
    return {
      trustBundle: validateTrustBundle(readJsonFile<TrustBundle>(trustBundlePath)),
      trustBundlePath,
    };
  }

  const serverBaseUrl = flagString(flags, 'server-base-url');
  if (serverBaseUrl) {
    const trustBundle = validateTrustBundle(
      await fetchJson(`${normalizeServerBaseUrl(serverBaseUrl)}/api/v1/access/agent/trust-bundle`) as TrustBundle,
    );
    writeSecureJson(paths.trustBundlePath, trustBundle);
    return {
      trustBundle,
      trustBundlePath: paths.trustBundlePath,
    };
  }

  if (!fs.existsSync(paths.trustBundlePath)) {
    throw new Error(`No trust bundle cached for profile ${paths.profileRoot}. Run trust-sync or provide --trust-bundle.`);
  }

  return {
    trustBundle: validateTrustBundle(readJsonFile<TrustBundle>(paths.trustBundlePath)),
    trustBundlePath: paths.trustBundlePath,
  };
}

async function runOpen(flags: Record<string, string | boolean>) {
  const root = flagString(flags, 'root');
  const profileName = flagString(flags, 'profile', 'default');
  const bundlePath = path.resolve(requireFlag(flags, 'bundle'));
  const workspaceRoot = path.resolve(flagString(flags, 'workspace-root', path.join(getAgentRoot(root), 'workspaces')));
  const serverBaseUrl = flagString(flags, 'server-base-url')
    ? normalizeServerBaseUrl(flagString(flags, 'server-base-url'))
    : null;
  const paths = agentHomePaths(root, profileName);
  const { profile, keys } = readProfile(paths);
  const { trustBundle, trustBundlePath } = await resolveTrustBundle(paths, flags);
  const bundle = readJsonFile<CheckoutBundle>(bundlePath);

  if (bundle.schemaVersion !== 'qv.checkout.bundle.v1') {
    throw new Error(`Unsupported checkout bundle schema ${bundle.schemaVersion}`);
  }
  await verifyCheckoutBundleSignature(bundle, trustBundle);

  const { sessionToken, plaintext } = await decryptCheckoutBundle(bundle, keys);
  const plaintextSha256 = sha256Hex(plaintext);
  if (bundle.assetEnvelope.contentHash && plaintextSha256.toLowerCase() !== bundle.assetEnvelope.contentHash.toLowerCase()) {
    throw new Error('Decrypted plaintext hash does not match the checkout bundle content hash');
  }
  if (bundle.expiresAt && new Date(bundle.expiresAt).getTime() <= Date.now()) {
    throw new Error('The checkout bundle has already expired');
  }
  if (profile.devicePublicKeyHash.toLowerCase() !== bundle.device.publicKeyHash.toLowerCase()) {
    throw new Error('The local device profile does not match the bundle public-key binding');
  }

  ensureSecureDir(workspaceRoot);
  const workspaceName = `${sanitizePathSegment(bundle.sessionId)}-${sanitizePathSegment(bundle.bundleId)}`;
  const workspacePath = path.join(workspaceRoot, workspaceName);
  if (fs.existsSync(workspacePath)) {
    throw new Error(`Workspace already exists at ${workspacePath}. Remove it or run cleanup first.`);
  }
  ensureSecureDir(workspacePath);

  const filename = safeBasename(bundle.filename || path.basename(bundle.relativePath));
  const plaintextPath = path.join(workspacePath, filename);
  fs.writeFileSync(plaintextPath, plaintext, { mode: 0o600 });
  fs.chmodSync(plaintextPath, 0o600);

  const workspaceState: WorkspaceState = {
    schemaVersion: 'qv.agent.workspace.v1',
    createdAt: new Date().toISOString(),
    profile: profileName,
    workspacePath,
    plaintextPath,
    bundlePath,
    bundleDigestSha256: `0x${canonicalJsonSha256Hex(bundle)}`,
    sessionId: bundle.sessionId,
    pipelineAssetId: bundle.pipelineAssetId,
    checkoutBundleId: bundle.checkin.checkoutBundleId,
    checkinEndpointPath: bundle.checkin.endpointPath,
    serverBaseUrl,
    sessionToken,
    credentialId: bundle.device.credentialId,
    mimeType: defaultMimeType(filename, bundle.mimeType),
    filename,
    contentSha256: plaintextSha256,
  };

  const workspaceStatePath = resolveWorkspaceStatePath(workspacePath);
  writeSecureJson(workspaceStatePath, workspaceState);

  process.stdout.write(`${JSON.stringify({
    workspacePath,
    workspaceStatePath,
    plaintextPath,
    filename,
    contentSha256: plaintextSha256,
    trustBundlePath,
    bundleId: bundle.bundleId,
    sessionId: bundle.sessionId,
    credentialId: bundle.device.credentialId || null,
    expiresAt: bundle.expiresAt,
  }, null, 2)}\n`);
}

async function runCheckin(flags: Record<string, string | boolean>) {
  const workspacePath = path.resolve(requireFlag(flags, 'workspace'));
  const workspaceStatePath = resolveWorkspaceStatePath(workspacePath);
  const state = readJsonFile<WorkspaceState>(workspaceStatePath);
  const filePath = path.resolve(flagString(flags, 'file', state.plaintextPath));
  const serverBaseUrl = normalizeServerBaseUrl(flagString(flags, 'server-base-url', state.serverBaseUrl || ''));
  if (!serverBaseUrl) {
    throw new Error('Missing --server-base-url and no cached serverBaseUrl in workspace state');
  }

  const fileContent = fs.readFileSync(filePath);
  const contentSha256 = sha256Hex(fileContent);
  const response = await fetchJson(`${serverBaseUrl}${state.checkinEndpointPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sessionToken: state.sessionToken,
      checkoutBundleId: state.checkoutBundleId,
      contentBase64: fileContent.toString('base64'),
      contentSha256,
      mediaType: defaultMimeType(path.basename(filePath), state.mimeType),
      agentVersion: flagString(flags, 'agent-version', AGENT_VERSION),
      editor: flagString(flags, 'editor') || undefined,
      reason: flagString(flags, 'reason') || undefined,
    }),
  });

  if (!flagBool(flags, 'keep-workspace')) {
    wipePath(workspacePath);
  }

  process.stdout.write(`${JSON.stringify({
    workspacePath,
    filePath,
    cleanedUp: !flagBool(flags, 'keep-workspace'),
    response,
  }, null, 2)}\n`);
}

async function runCleanup(flags: Record<string, string | boolean>) {
  const workspacePath = path.resolve(requireFlag(flags, 'workspace'));
  wipePath(workspacePath);
  process.stdout.write(`${JSON.stringify({ cleanedUp: true, workspacePath }, null, 2)}\n`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.command || parsed.flags.help === true) {
    printUsage();
    process.exit(parsed.command ? 0 : 1);
  }

  switch (parsed.command) {
    case 'init':
      await runInit(parsed.flags);
      return;
    case 'trust-sync':
      await runTrustSync(parsed.flags);
      return;
    case 'open':
      await runOpen(parsed.flags);
      return;
    case 'checkin':
      await runCheckin(parsed.flags);
      return;
    case 'cleanup':
      await runCleanup(parsed.flags);
      return;
    default:
      throw new Error(`Unknown command ${parsed.command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
