import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { INITIAL_DEMO_USERS } from "@/lib/auth/auth-service";
import { hashPassword } from "@/lib/auth/credentials";

// En mémoire serveur (fallback si Supabase n'est pas configuré)
let memoryUsersRegistry: any[] | null = null;

async function getInitialRegistry() {
  if (memoryUsersRegistry && memoryUsersRegistry.length > 0) {
    return memoryUsersRegistry;
  }
  const seeded = [];
  for (const u of INITIAL_DEMO_USERS) {
    const hash = await hashPassword(u.plainPassword);
    seeded.push({
      id: u.id,
      name: u.displayName,
      email: u.email,
      username: u.username,
      role: u.role,
      organizationId: u.organizationId,
      siteId: u.siteId,
      site: "Magasin Principal",
      active: u.isActive,
      lastLogin: null,
      initials: u.displayName.slice(0, 2).toUpperCase(),
      passwordHash: hash,
    });
  }
  memoryUsersRegistry = seeded;
  return seeded;
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      // 1. Lire depuis app_config (accessible publiquement)
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "obasa_users_registry")
        .maybeSingle();

      if (!error && data?.value) {
        try {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanList = parsed.filter((u: any) => u.active !== false);
            memoryUsersRegistry = cleanList;
            return NextResponse.json({ success: true, users: cleanList });
          }
        } catch {
          // fallback
        }
      }
    }

    const fallback = await getInitialRegistry();
    return NextResponse.json({ success: true, users: fallback });
  } catch (err: any) {
    console.error("[API AUTH USERS GET ERR]", err);
    const fallback = await getInitialRegistry();
    return NextResponse.json({ success: true, users: fallback });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, user, users, userId } = body;

    let currentList = await getInitialRegistry();

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "obasa_users_registry")
        .maybeSingle();

      if (data?.value) {
        try {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentList = parsed;
          }
        } catch {}
      }
    }

    if (action === "sync_all" && Array.isArray(users)) {
      currentList = users;
    } else if (action === "create" && user) {
      // Éviter les doublons
      const idx = currentList.findIndex((u: any) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...user };
      } else {
        currentList.push(user);
      }
    } else if (action === "update" && user) {
      const idx = currentList.findIndex((u: any) => u.id === user.id);
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...user };
      }
    } else if (action === "delete" && userId) {
      currentList = currentList.filter((u: any) => String(u.id) !== String(userId));
    }

    memoryUsersRegistry = currentList;

    if (supabase) {
      await supabase
        .from("app_config")
        .upsert({
          key: "obasa_users_registry",
          value: JSON.stringify(currentList),
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
    }

    return NextResponse.json({ success: true, users: currentList });
  } catch (err: any) {
    console.error("[API AUTH USERS POST ERR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
