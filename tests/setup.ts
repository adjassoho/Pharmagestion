import "fake-indexeddb/auto";

process.env.NEXT_PUBLIC_OBASA_DEMO_MODE = "true";

/**
 * Vitest setup — configuration globale pour les tests unitaires Obasa.
 * fake-indexeddb simule l'API IndexedDB pour Dexie.js dans Node.js.
 */

// Mock de navigator.onLine pour les tests offline
Object.defineProperty(globalThis, "navigator", {
  value: {
    ...globalThis.navigator,
    onLine: true,
  },
  writable: true,
  configurable: true,
});
