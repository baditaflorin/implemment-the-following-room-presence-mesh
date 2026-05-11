const STORAGE_KEY = "rpm-onboarded:v1";

/**
 * True on the first cold visit, or when localStorage is unavailable
 * (private mode, embedded contexts). We bias toward showing the
 * onboarding when in doubt — strangers expect a brief introduction the
 * very first time they open a mesh/peer-pairing app.
 */
export function shouldShowOnboarding(storage: Pick<Storage, "getItem"> | null): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markOnboarded(storage: Pick<Storage, "setItem"> | null): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, "1");
  } catch {
    // Best effort.
  }
}

/** Reset for tests and a future "show me the intro again" affordance. */
export function resetOnboarding(storage: Pick<Storage, "removeItem"> | null): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
