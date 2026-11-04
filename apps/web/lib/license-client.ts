import { db } from '@/db';
import {
  createDeviceLicenseRecord,
  deviceKeyHash,
  provePrivateKey,
  verifyLicenseToken,
} from '@/lib/license-crypto';
import type { ActivationResponse, LicenseCheckResult, LocalLicense } from '@/types/license';

export const isLicenseRequired = process.env.NEXT_PUBLIC_LICENSE_REQUIRED === 'true';
const licenseApiUrl = (process.env.NEXT_PUBLIC_LICENSE_API_URL || '').replace(/\/$/, '');
const verificationKeyText = process.env.NEXT_PUBLIC_LICENSE_VERIFY_KEY || '';
const LICENSE_STORAGE_TIMEOUT_MS = 8000;

async function readStoredLicense(): Promise<LocalLicense | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      db.licenses.get('primary'),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('LICENSE_STORAGE_TIMEOUT')), LICENSE_STORAGE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function verificationKey(): JsonWebKey {
  if (!verificationKeyText) throw new Error('缺少许可证验证公钥');
  const parsed = JSON.parse(verificationKeyText) as JsonWebKey;
  if (parsed.kty !== 'EC' || parsed.crv !== 'P-256' || !parsed.x || !parsed.y) {
    throw new Error('许可证验证公钥无效');
  }
  return parsed;
}

async function verifyRecord(record: LocalLicense) {
  if (record.status !== 'active' || !record.licenseToken) throw new Error('尚未激活');
  const payload = await verifyLicenseToken(record.licenseToken, verificationKey());
  if (payload.deviceKeyHash !== await deviceKeyHash(record.publicKey)) throw new Error('许可证与本机不匹配');
  if (!(await provePrivateKey(record))) throw new Error('本机许可证密钥无效');
  return payload;
}

export async function checkLocalLicense(): Promise<LicenseCheckResult> {
  if (!isLicenseRequired) return { status: 'licensed' };
  if (!licenseApiUrl || !verificationKeyText) {
    return { status: 'configuration-error', message: '激活服务尚未完成配置，请联系作者。' };
  }
  let record: LocalLicense | undefined;
  try {
    record = await readStoredLicense();
  } catch {
    return { status: 'configuration-error', message: '无法读取本机许可证，请关闭其他页签后刷新重试。' };
  }
  if (!record || record.status !== 'active') return { status: 'unlicensed' };
  try {
    return { status: 'licensed', payload: await verifyRecord(record) };
  } catch {
    return { status: 'unlicensed' };
  }
}

async function getOrCreateDeviceRecord(): Promise<LocalLicense> {
  const existing = await db.licenses.get('primary');
  if (existing) return existing;
  const created = await createDeviceLicenseRecord();
  await db.licenses.put(created);
  return created;
}

function isActivationResponse(value: unknown): value is ActivationResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.license === 'string' && record.algorithm === 'ES256';
}

function responseError(value: unknown): string {
  if (!value || typeof value !== 'object') return '激活失败，请稍后重试';
  const error = (value as Record<string, unknown>).error;
  return typeof error === 'string' ? error : '激活失败，请稍后重试';
}

export async function activateLocalLicense(code: string): Promise<void> {
  if (!licenseApiUrl) throw new Error('激活服务尚未配置');
  const device = await getOrCreateDeviceRecord();
  const response = await fetch(`${licenseApiUrl}/v1/activate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      code,
      devicePublicKey: device.publicKey,
      appVersion: 'local-v1',
    }),
  });
  const body = await response.json() as unknown;
  if (!response.ok) throw new Error(responseError(body));
  if (!isActivationResponse(body)) throw new Error('激活服务返回了无效许可证');

  const payload = await verifyLicenseToken(body.license, verificationKey());
  if (payload.deviceKeyHash !== await deviceKeyHash(device.publicKey)) {
    throw new Error('许可证与本机不匹配');
  }
  const activeRecord: LocalLicense = {
    ...device,
    status: 'active',
    licenseToken: body.license,
    licenseId: payload.licenseId,
    activatedAt: payload.issuedAt,
  };
  if (!(await provePrivateKey(activeRecord))) throw new Error('本机密钥验证失败');
  await db.licenses.put(activeRecord);
}
