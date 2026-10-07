/**
 * Empreintes de mots de passe (PBKDF2-SHA256) via l'API Web Crypto native.
 *
 * Aucune dépendance ajoutée (Règles 3 & 4) : `crypto.subtle` est disponible
 * partout où l'application fonctionne, puisqu'un service worker PWA exige déjà
 * un contexte sécurisé (HTTPS ou localhost).
 *
 * PORTÉE — À LIRE AVANT DE S'APPUYER SUR CE MODULE :
 * l'authentification d'Obasa est aujourd'hui entièrement côté client
 * (`localStorage`). Remplacer le stockage en clair par une empreinte empêche la
 * lecture directe des mots de passe (et leur réutilisation sur d'autres
 * services, très fréquente) et supprime les contournements de connexion, mais
 * ce n'est PAS une frontière de sécurité : n'importe qui ayant accès aux outils
 * de développement peut écrire `obasa_session` à la main. La véritable
 * autorisation demande Supabase Auth côté serveur + des policies RLS basées sur
 * `auth.uid()`. Cette étape reste à faire.
 */

export interface PasswordHash {
  algo: "pbkdf2-sha256";
  iterations: number;
  /** Sel aléatoire, encodé en base64. */
  salt: string;
  /** Empreinte dérivée, encodée en base64. */
  hash: string;
}

const PBKDF2_ITERATIONS = 150_000;
const SALT_BYTES = 16;
const DERIVED_BITS = 256;

/** Longueur minimale imposée à un nouveau mot de passe (cf. libellé « 8 caractères minimum »). */
export const MIN_PASSWORD_LENGTH = 8;

function getCrypto(): Crypto {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    throw new Error(
      "API Web Crypto indisponible : Obasa doit être servi en HTTPS (ou sur localhost) pour vérifier les mots de passe."
    );
  }
  return webCrypto;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(
  plainPassword: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const { subtle } = getCrypto();
  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(plainPassword),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    DERIVED_BITS
  );
  return toBase64(new Uint8Array(bits));
}

/** Calcule l'empreinte d'un mot de passe avec un sel aléatoire neuf. */
export async function hashPassword(plainPassword: string): Promise<PasswordHash> {
  const password = plainPassword.trim();
  if (!password) {
    throw new Error("Impossible de calculer l'empreinte d'un mot de passe vide.");
  }
  const salt = getCrypto().getRandomValues(new Uint8Array(SALT_BYTES));
  return {
    algo: "pbkdf2-sha256",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    hash: await derive(password, salt, PBKDF2_ITERATIONS),
  };
}

/** Vrai si la valeur stockée est bien une empreinte exploitable. */
export function isPasswordHash(value: unknown): value is PasswordHash {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PasswordHash>;
  return (
    candidate.algo === "pbkdf2-sha256" &&
    typeof candidate.iterations === "number" &&
    candidate.iterations > 0 &&
    typeof candidate.salt === "string" &&
    candidate.salt.length > 0 &&
    typeof candidate.hash === "string" &&
    candidate.hash.length > 0
  );
}

/** Comparaison à temps constant : ne divulgue pas le nombre de caractères corrects. */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Vérifie un mot de passe saisi contre une empreinte stockée.
 * Retourne `false` — jamais une exception — si l'empreinte est absente ou
 * corrompue : un enregistrement illisible ne doit pas autoriser la connexion.
 */
export async function verifyPassword(
  plainPassword: string,
  stored: unknown
): Promise<boolean> {
  if (!isPasswordHash(stored)) return false;
  const password = plainPassword.trim();
  if (!password) return false;
  try {
    const candidate = await derive(password, fromBase64(stored.salt), stored.iterations);
    return constantTimeEquals(candidate, stored.hash);
  } catch (err) {
    console.error("Vérification du mot de passe impossible :", err);
    return false;
  }
}
