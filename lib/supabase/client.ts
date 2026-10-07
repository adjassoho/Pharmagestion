import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

/**
 * Indique si Supabase est explicitement et valablement configuré via les variables d'environnement.
 * Règle P1-07 : Aucun identifiant cloud codé en dur en fallback.
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    !!rawUrl &&
    !!rawAnonKey &&
    rawUrl.startsWith("http") &&
    rawUrl !== "https://unconfigured.local" &&
    rawUrl !== "https://placeholder-obasa.supabase.co" &&
    rawUrl !== "https://votre-projet.supabase.co" &&
    rawAnonKey !== "unconfigured" &&
    rawAnonKey !== "unconfigured-anon-key" &&
    rawAnonKey !== "placeholder-anon-key" &&
    rawAnonKey !== "votre-cle-publique-anon"
  );
};

const configured = isSupabaseConfigured();
const supabaseUrl = configured ? rawUrl : "https://unconfigured.local";
const supabaseAnonKey = configured ? rawAnonKey : "unconfigured-anon-key";

/**
 * Instance du client Supabase pour l'application OBASA.
 * Si les variables d'environnement ne sont pas fournies, l'application fonctionne
 * en mode 100% hors-ligne local (Dexie IndexedDB) sans contacter aucun serveur distant par inadvertance.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
