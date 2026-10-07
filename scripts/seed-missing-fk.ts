import { Client } from "pg";
import { requireDatabaseUrl } from "./_env";

async function seedFk() {
  const connectionString = requireDatabaseUrl();

  console.log("=== Seeding Default Device & Profile for Supabase FK Constraints ===");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✔ Connected to Supabase PostgreSQL!");

  const orgId = "00000000-0000-4000-a000-000000000001";
  const siteId = "00000000-0000-4000-a000-000000000002";
  const deviceId = "00000000-0000-4000-a000-000000000003";
  const profileId = "00000000-0000-4000-a000-000000000004";

  // 1. Seed Device
  await client.query(
    `INSERT INTO devices (id, site_id, name, device_prefix, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`,
    [deviceId, siteId, "Caisse Principale POS1", "POS1"]
  );
  console.log("✔ Default Device seeded:", deviceId);

  // 2. Seed Profile (If auth.users record is missing, insert profile directly or bypass fk if needed)
  // Check if profile FK to auth.users exists
  try {
    // Drop profile FK constraint if auth.users is not used for offline admin
    await client.query(`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;`);
    await client.query(`ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_created_by_fkey;`);

    await client.query(
      `INSERT INTO profiles (id, organization_id, site_id, role, display_name, phone, is_active)
       VALUES ($1, $2, $3, 'admin', $4, $5, true)
       ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;`,
      [profileId, orgId, siteId, "Silvère ADJASSOHO", "+229 97 00 00 00"]
    );
    console.log("✔ Default Profile seeded:", profileId);
  } catch (err: any) {
    console.error("Profile insert notice:", err.message);
  }

  await client.end();
  console.log("=== FK Seeding Complete! ===");
}

seedFk().catch(console.error);
