import { isDemoMode } from "@/lib/config/runtime";

export interface InstallationContext {
  organizationId: string;
  siteId: string;
  deviceId: string;
  userId: string;
  userName: string;
}

const DEMO_ORG_ID = "00000000-0000-4000-a000-000000000001";
const DEMO_SITE_ID = "00000000-0000-4000-a000-000000000002";
const DEMO_DEVICE_ID = "00000000-0000-4000-a000-000000000003";
const DEMO_USER_ID = "00000000-0000-4000-a000-000000000004";

interface SessionLike {
  id?: string | number;
  name?: string;
  organizationId?: string;
  siteId?: string;
}

function readStoredSession(): SessionLike | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("obasa_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return DEMO_DEVICE_ID;

  let deviceId = localStorage.getItem("obasa_device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("obasa_device_id", deviceId);
  }
  return deviceId;
}

export function setDeviceId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("obasa_device_id", id);
  }
}

export function getInstallationContext(user?: SessionLike | null): InstallationContext {
  const effectiveUser = user ?? readStoredSession();
  const demo = isDemoMode();

  const organizationId = effectiveUser?.organizationId || (demo ? DEMO_ORG_ID : "");
  const siteId = effectiveUser?.siteId || (demo ? DEMO_SITE_ID : "");
  const userId = effectiveUser?.id ? String(effectiveUser.id) : (demo ? DEMO_USER_ID : "");
  const userName = effectiveUser?.name || (demo ? "Utilisateur démonstration" : "");

  if (!organizationId || !siteId || !userId) {
    throw new Error("Contexte d'installation incomplet. Une connexion en ligne initiale est requise.");
  }

  return {
    organizationId,
    siteId,
    deviceId: getDeviceId(),
    userId,
    userName,
  };
}
