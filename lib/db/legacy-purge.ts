import Dexie from "dexie";

const PURGE_FLAG = "pharmagestion_legacy_purge_v1";
const LEGACY_DB_NAME = "ObasaLocalDB";
const LEGACY_KEY_PREFIX = "obasa_";

export function purgeLegacyObasaData(): void {
  if (typeof window === "undefined") return;
  if (typeof localStorage === "undefined") return;

  try {
    if (localStorage.getItem(PURGE_FLAG)) return;

    const obsoleteKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_KEY_PREFIX)) {
        obsoleteKeys.push(key);
      }
    }
    obsoleteKeys.forEach((key) => localStorage.removeItem(key));

    if (typeof caches !== "undefined") {
      void caches.keys().then((names) =>
        Promise.all(names.map((name) => caches.delete(name)))
      );
    }

    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((reg) => reg.unregister()))
        );
    }

    void Dexie.delete(LEGACY_DB_NAME)
      .then(() => localStorage.setItem(PURGE_FLAG, "1"))
      .catch(() => undefined);
  } catch {
    return;
  }
}
