import * as crypto from 'crypto';
import { getMlDsa65 } from '../src/crypto/mldsa';
import { getMlKem1024 } from '../src/crypto/mlkem';
import { canonicalJsonBuffer } from '../src/crypto/canonical-json';

type Json = Record<string, unknown>;

const API_BASE = (process.env.QV_API_BASE_URL || 'http://localhost:13000/api/v1').replace(/\/$/, '');
const TEST_EMAIL = process.env.QV_TEST_EMAIL || 'admin@quantumvault.local';
const TEST_PASSWORD = process.env.QV_TEST_PASSWORD || 'QuantumVault2024!';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function parseJsonSafe(response: Response): Promise<Json | null> {
  try {
    return (await response.json()) as Json;
  } catch {
    return null;
  }
}

async function request(
  path: string,
  init: RequestInit = {},
  cookie?: string,
): Promise<{ response: Response; body: Json | null }> {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', headers.get('content-type') || 'application/json');
  if (cookie) {
    headers.set('cookie', cookie);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  const body = await parseJsonSafe(response);
  return { response, body };
}

async function login(): Promise<string> {
  const { response, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  assert(response.ok, `Login failed with status ${response.status}`);

  const setCookie = response.headers.get('set-cookie');
  assert(setCookie, 'Login response did not include Set-Cookie');
  const tokenCookie = setCookie.split(';')[0];
  assert(tokenCookie.includes('qv_access_token='), 'Auth cookie missing qv_access_token');

  const role = body?.user && typeof body.user === 'object' ? (body.user as Json).role : undefined;
  console.log(`✅ Logged in as ${TEST_EMAIL} (${String(role || 'unknown role')})`);

  return tokenCookie;
}

async function runNegativeSignatureTest() {
  const dsa = await getMlDsa65();
  const keys = await dsa.generateKeyPair();

  const message = Buffer.from('qv.crypto.integration.negative.signature', 'utf8');
  const messageDigest = crypto.createHash('sha256').update(message).digest();
  const signature = await dsa.sign(new Uint8Array(messageDigest), keys.secretKey);
  const validOriginal = await dsa.verify(new Uint8Array(messageDigest), signature, keys.publicKey);
  assert(validOriginal, 'Expected original signature verification to pass');

  const tamperedDigest = crypto.createHash('sha256').update(`${message.toString('utf8')}.tampered`).digest();
  const validTamperedMessage = await dsa.verify(new Uint8Array(tamperedDigest), signature, keys.publicKey);
  assert(!validTamperedMessage, 'Tampered message should fail signature verification');

  const tamperedSignature = new Uint8Array(signature);
  tamperedSignature[0] = tamperedSignature[0] ^ 0x01;
  const validTamperedSignature = await dsa.verify(new Uint8Array(messageDigest), tamperedSignature, keys.publicKey);
  assert(!validTamperedSignature, 'Tampered signature should fail verification');

  console.log('✅ Negative signature checks passed');
}

async function createTransportSession(cookie: string): Promise<{
  sessionId: string;
  sessionKey: Buffer;
}> {
  const serverInfoResult = await request('/transport/pqc/server-info', { method: 'GET' }, cookie);
  assert(serverInfoResult.response.ok, `Failed to fetch PQC server info: ${serverInfoResult.response.status}`);

  const kemPublicKeyB64 = serverInfoResult.body?.kemPublicKey;
  assert(typeof kemPublicKeyB64 === 'string', 'Invalid PQC server-info payload (kemPublicKey missing)');

  const kem = await getMlKem1024();
  const encapsulated = await kem.encapsulate(Buffer.from(kemPublicKeyB64, 'base64'));
  const salt = crypto.randomBytes(32);
  const sessionKey = Buffer.from(
    crypto.hkdfSync(
      'sha256',
      Buffer.from(encapsulated.sharedSecret),
      salt,
      Buffer.from('QuantumVaultMVP:transport:v1:ML-KEM-1024', 'utf8'),
      32,
    ),
  );

  const handshakeResult = await request(
    '/transport/pqc/handshake',
    {
      method: 'POST',
      body: JSON.stringify({
        kemCiphertextB64: Buffer.from(encapsulated.ciphertext).toString('base64'),
        saltB64: salt.toString('base64'),
      }),
    },
    cookie,
  );
  assert(handshakeResult.response.ok, `PQC handshake failed: ${handshakeResult.response.status}`);

  const sessionId = handshakeResult.body?.sessionId;
  assert(typeof sessionId === 'string', 'Handshake response missing sessionId');

  console.log(`✅ Transport session established (${sessionId.slice(0, 16)}...)`);
  return { sessionId, sessionKey };
}

function buildSecureEchoBody(params: {
  sessionId: string;
  sessionKey: Buffer;
  counter: number;
  plaintext: string;
  nonceLength?: number;
}): Json {
  const nonce = crypto.randomBytes(params.nonceLength ?? 12);
  const aadContext = {
    protocolVersion: 'qv.transport.v1',
    sessionId: params.sessionId,
    direction: 'client_request',
    counter: params.counter,
    algorithm: 'AES-256-GCM',
    kemAlgorithm: 'ML-KEM-1024',
    identityAlgorithm: 'ML-DSA-65',
    scope: null,
  };

  const cipher = crypto.createCipheriv('aes-256-gcm', params.sessionKey, nonce);
  cipher.setAAD(canonicalJsonBuffer(aadContext));
  const ciphertext = Buffer.concat([cipher.update(params.plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    sessionId: params.sessionId,
    counter: params.counter,
    nonceB64: nonce.toString('base64'),
    ciphertextB64: ciphertext.toString('base64'),
    tagB64: tag.toString('base64'),
  };
}

async function runReplayAndNonceTests(cookie: string) {
  const { sessionId, sessionKey } = await createTransportSession(cookie);

  const validRequest = buildSecureEchoBody({
    sessionId,
    sessionKey,
    counter: 1,
    plaintext: 'qv-integration-transport',
  });

  const first = await request(
    '/transport/pqc/secure-echo',
    { method: 'POST', body: JSON.stringify(validRequest) },
    cookie,
  );
  assert(first.response.ok, `Expected first secure-echo to succeed (got ${first.response.status})`);

  const replay = await request(
    '/transport/pqc/secure-echo',
    { method: 'POST', body: JSON.stringify(validRequest) },
    cookie,
  );
  assert(!replay.response.ok, `Replay request unexpectedly succeeded (${replay.response.status})`);
  console.log('✅ Replay attack rejected');

  const nonceMisuseRequest = buildSecureEchoBody({
    sessionId,
    sessionKey,
    counter: 2,
    plaintext: 'nonce-misuse-check',
    nonceLength: 8,
  });
  const nonceMisuse = await request(
    '/transport/pqc/secure-echo',
    { method: 'POST', body: JSON.stringify(nonceMisuseRequest) },
    cookie,
  );
  assert(!nonceMisuse.response.ok, `Nonce misuse request unexpectedly succeeded (${nonceMisuse.response.status})`);
  console.log('✅ Nonce misuse rejected');

  await request('/transport/pqc/close', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  }, cookie);
}

async function main() {
  console.log(`Running crypto integration tests against ${API_BASE}`);
  const cookie = await login();
  await runNegativeSignatureTest();
  await runReplayAndNonceTests(cookie);
  console.log('🎉 Crypto integration suite passed');
}

main().catch((error) => {
  console.error('❌ Crypto integration suite failed');
  console.error(error);
  process.exit(1);
});
