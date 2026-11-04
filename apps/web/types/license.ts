export type LocalLicenseStatus = 'pending' | 'active';

export interface LocalLicense {
  id: 'primary';
  status: LocalLicenseStatus;
  publicKey: JsonWebKey;
  privateKey: CryptoKey;
  licenseToken?: string;
  licenseId?: string;
  activatedAt?: string;
}

export interface LicensePayload {
  version: 1;
  product: 'task-manager-local';
  licenseId: string;
  deviceKeyHash: string;
  issuedAt: string;
  entitlements: ['full'];
  expiresAt: null;
}

export interface ActivationResponse {
  license: string;
  algorithm: 'ES256';
  recovered?: boolean;
}

export type LicenseCheckResult =
  | { status: 'licensed'; payload?: LicensePayload }
  | { status: 'unlicensed' }
  | { status: 'configuration-error'; message: string };
