export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probeKey = 'vector-control:storage-probe';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

export async function requestPersistentBrowserStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) {
    return null;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
