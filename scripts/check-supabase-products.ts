import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url, anonKey } = requireSupabaseConfig();
const supabase = createClient(url, anonKey);

async function main() {
  const { data: products, error } = await supabase.from("products").select("id, name, reference");
  console.log("Products in Supabase Cloud:", products, "Error:", error);
}

main().catch(console.error);
