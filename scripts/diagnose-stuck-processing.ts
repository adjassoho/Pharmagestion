import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url, anonKey } = requireSupabaseConfig();
const supabase = createClient(url, anonKey);

/**
 * Wrapper de sécurité avec Timeout (10 secondes) pour éviter qu'une requête
 * Supabase ne reste suspendue indéfiniment en mode offline/PWA.
 */
export async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 10000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout de connexion (${timeoutMs / 1000}s)`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

async function testWithTimeout() {
  console.log("=== TEST WRAPPER TIMEOUT SUPABASE ===");

  try {
    const res = await withTimeout(
      supabase.from("sales").select("id").limit(1),
      5000
    );
    console.log("✔ Supabase request with timeout succeeded:", res.data);
  } catch (err: any) {
    console.error("❌ Supabase request failed/timed out:", err.message);
  }
}

testWithTimeout().catch(console.error);
