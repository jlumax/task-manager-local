import type { LicensePayload, LocalLicense } from '@/types/license';

const textEncoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function publicKeyJson(publicKey: JsonWebKey): string {
  if (
    publicKey.kty !== 'EC' ||
    publicKey.crv !== 'P-256' ||
    typeof publicKey.x !== 'string' ||
    typeof publicKey.y !== 'string'
  ) {
    throw new Error('设备密钥格式无效');
  }
  return JSON.stringify({ crv: 'P-256', kty: 'EC', x: publicKey.x, y: publicKey.y });
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function createDeviceLicenseRecord(): Promise<LocalLicense> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign', 'verify'],
  );
  return {
    id: 'primary',
    status: 'pending',
    publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey),
    privateKey: pair.privateKey,
  };
}

export async function deviceKeyHash(publicKey: JsonWebKey): Promise<string> {
  return sha256Base64Url(publicKeyJson(publicKey));
}

export async function verifyLicenseToken(token: string, verificationKey: JsonWebKey): Promise<LicensePayload> {
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) throw new Error('许可证格式无效');
  const key = await crypto.subtle.importKey(
    'jwk',
    verificationKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    decodeBase64Url(encodedSignature),
    textEncoder.encode(encodedPayload),
  );
  if (!valid) throw new Error('许可证签名无效');

  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload))) as Partial<LicensePayload>;
  if (
    payload.version !== 1 ||
    payload.product !== 'task-manager-local' ||
    typeof payload.licenseId !== 'string' ||
    typeof payload.deviceKeyHash !== 'string' ||
    typeof payload.issuedAt !== 'string' ||
    payload.expiresAt !== null ||
    payload.entitlements?.[0] !== 'full'
  ) {
    throw new Error('许可证内容无效');
  }
  return payload as LicensePayload;
}

export async function provePrivateKey(record: LocalLicense): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    record.privateKey,
    challenge,
  );
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    record.publicKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    challenge,
  );
}
