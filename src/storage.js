// localStorage can be missing or throw, even on access (private mode, blocked
// storage). Reads then fall back and writes are dropped; nothing stored here is
// essential. Tests pass their own `storage`.
export function readStoredJson(key, fallback, storage) {
  try {
    return JSON.parse((storage ?? localStorage).getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key, value, storage) {
  try {
    (storage ?? localStorage).setItem(key, JSON.stringify(value));
  } catch {
    // Unavailable storage just means the value won't persist.
  }
}
