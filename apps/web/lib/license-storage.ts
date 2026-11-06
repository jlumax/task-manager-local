import type { LocalLicense } from '@/types/license';

const LICENSE_DB_NAME = 'TaskManagerLicenseDB';
const LEGACY_DB_NAME = 'TaskManagerDB';
const LICENSE_STORE_NAME = 'licenses';
const PRIMARY_LICENSE_ID = 'primary';
const STORAGE_TIMEOUT_MS = 12000;

function storageError(code: string): Error {
  return new Error(code);
}

function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(storageError('LICENSE_STORAGE_TIMEOUT')), STORAGE_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function openLicenseDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LICENSE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LICENSE_STORE_NAME)) {
        database.createObjectStore(LICENSE_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onblocked = () => reject(storageError('LICENSE_STORAGE_BLOCKED'));
    request.onerror = () => reject(request.error || storageError('LICENSE_STORAGE_OPEN_FAILED'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function openExistingDatabase(name: string): Promise<IDBDatabase | undefined> {
  if (indexedDB.databases) {
    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === name)) return undefined;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let databaseMissing = false;
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        databaseMissing = true;
      }
    };
    request.onblocked = () => reject(storageError('LICENSE_STORAGE_BLOCKED'));
    request.onerror = () => reject(request.error || storageError('LICENSE_STORAGE_OPEN_FAILED'));
    request.onsuccess = () => {
      if (!databaseMissing) {
        resolve(request.result);
        return;
      }

      request.result.close();
      const cleanup = indexedDB.deleteDatabase(name);
      cleanup.onerror = () => reject(cleanup.error || storageError('LICENSE_STORAGE_OPEN_FAILED'));
      cleanup.onsuccess = () => resolve(undefined);
    };
  });
}

async function readFromDatabase(open: () => Promise<IDBDatabase | undefined>): Promise<LocalLicense | undefined> {
  const database = await open();
  if (!database) return undefined;
  try {
    if (!database.objectStoreNames.contains(LICENSE_STORE_NAME)) return undefined;
    return await new Promise<LocalLicense | undefined>((resolve, reject) => {
      const transaction = database.transaction(LICENSE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(LICENSE_STORE_NAME).get(PRIMARY_LICENSE_ID);
      request.onerror = () => reject(request.error || storageError('LICENSE_STORAGE_READ_FAILED'));
      request.onsuccess = () => resolve(request.result as LocalLicense | undefined);
      transaction.onabort = () => reject(transaction.error || storageError('LICENSE_STORAGE_READ_FAILED'));
    });
  } finally {
    database.close();
  }
}

async function writeToLicenseDatabase(record: LocalLicense): Promise<void> {
  const database = await openLicenseDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(LICENSE_STORE_NAME, 'readwrite');
      transaction.objectStore(LICENSE_STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || storageError('LICENSE_STORAGE_WRITE_FAILED'));
      transaction.onerror = () => reject(transaction.error || storageError('LICENSE_STORAGE_WRITE_FAILED'));
    });
  } finally {
    database.close();
  }
}

export async function readLocalLicense(): Promise<LocalLicense | undefined> {
  return withTimeout((async () => {
    const current = await readFromDatabase(openLicenseDatabase);
    if (current) return current;

    const legacy = await readFromDatabase(() => openExistingDatabase(LEGACY_DB_NAME));
    if (!legacy) return undefined;

    await writeToLicenseDatabase(legacy);
    return legacy;
  })());
}

export async function writeLocalLicense(record: LocalLicense): Promise<void> {
  await withTimeout(writeToLicenseDatabase(record));
  if (navigator.storage?.persist) {
    void navigator.storage.persist().catch(() => undefined);
  }
}
