import fs from "fs";
import path from "path";

/**
 * Chargement de configuration pour les scripts d'administration.
 *
 * Règle 14 : aucun secret ne doit être commité dans Git. Ces scripts ne
 * contiennent donc aucune valeur de repli — ils lisent l'environnement ou
 * `.env.local` (ignoré par Git) et s'arrêtent avec un message explicite si la
 * variable attendue est absente.
 */

let cachedEnvFile: Record<string, string> | null = null;

/**
 * Lit `.env.local` sans dépendance externe.
 *
 * La découpe se fait sur le PREMIER `=` uniquement : une URL PostgreSQL ou une
 * clé encodée en base64 contient des `=` qui étaient auparavant tronqués.
 */
function readEnvFile(): Record<string, string> {
  if (cachedEnvFile) return cachedEnvFile;

  const envPath = path.join(process.cwd(), ".env.local");
  const parsed: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    for (const rawLine of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^["'](.*)["']$/, "$1");

      if (key) parsed[key] = value;
    }
  }

  cachedEnvFile = parsed;
  return parsed;
}

/**
 * Retourne la variable demandée, ou interrompt le script avec la procédure à
 * suivre. Priorité à l'environnement du processus, puis à `.env.local`.
 */
export function requireEnv(name: string): string {
  const value = process.env[name] || readEnvFile()[name];

  if (!value) {
    console.error(
      [
        "",
        `✖ Variable d'environnement manquante : ${name}`,
        "",
        "  Ce script ne contient aucun identifiant en dur (Règle 14).",
        "  Renseignez la valeur avant de relancer :",
        "",
        `    1. Copiez .env.example vers .env.local (ignoré par Git)`,
        `    2. Renseignez ${name} avec la valeur issue du tableau de bord Supabase`,
        `       (Project Settings → Database pour DATABASE_URL, → API pour les clés)`,
        "",
        `  Ou ponctuellement : ${name}="..." pnpm tsx <script>`,
        "",
      ].join("\n")
    );
    process.exit(1);
  }

  return value;
}

/** Chaîne de connexion PostgreSQL directe (migrations, seeds, maintenance). */
export function requireDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}

/** Couple URL + clé publique (anon) pour les scripts passant par l'API Supabase. */
export function requireSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
