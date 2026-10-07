"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { Input } from "@/components/ds/forms/Input";
import { Badge } from "@/components/ds/feedback/Badge";
import { useAuth, ROLE_META } from "@/lib/auth/auth-context";
import { siteRepository } from "@/lib/repositories/site.repository";
import { saleRepository } from "@/lib/repositories/sale.repository";
import { logAuditEvent, getAuditLogs } from "@/lib/utils/auditLogger";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ActivityItem {
  id: string | number;
  at: string;
  action: string;
  icon: string;
}

export default function ProfilPage() {
  const { user, logout, updateUser, changePassword } = useAuth();

  /* ── Découper le nom en Prénom / Nom ── */
  const nameParts = (user?.name || "").split(" ");
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";

  const [info, setInfo] = useState({
    firstName: initialFirstName,
    lastName: initialLastName,
    email: user?.email || "",
    phone: user?.phone || "",
  });

  /* ── Magasin principal (dynamique depuis siteRepository) ── */
  const [storeName, setStoreName] = useState("Chargement…");

  /* ── Activités récentes (dynamiques depuis saleRepository) ── */
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  /* ── Charger le magasin + activités depuis Dexie ── */
  useEffect(() => {
    async function loadDynamicData() {
      // 1. Magasin principal
      try {
        const mainSite = await siteRepository.getMain();
        if (mainSite) {
          setStoreName(`${mainSite.name} — ${mainSite.city || "Cotonou"}`);
        } else {
          const allSites = await siteRepository.getAll();
          if (allSites.length > 0) {
            setStoreName(`${allSites[0].name} — ${allSites[0].city || "Cotonou"}`);
          } else {
            setStoreName("Aucun magasin configuré");
          }
        }
      } catch {
        setStoreName("Magasin Principal — Cotonou");
      }

      // 2. Activités récentes de l'utilisateur courant (audit logs + ventes)
      try {
        const orgId = user?.organizationId || "00000000-0000-4000-a000-000000000001";
        const combinedSales = await saleRepository.getLocalSales(orgId, 100);

        // Ventes effectuées par l'utilisateur courant
        const userSales = combinedSales.filter(
          (s) =>
            (s.created_by && user?.name && s.created_by.toLowerCase().includes(user.name.toLowerCase())) ||
            (s.created_by && user?.username && s.created_by.toLowerCase().includes(user.username.toLowerCase()))
        );

        const saleActivities: ActivityItem[] = userSales.map((sale) => ({
          id: `sale-${sale.id}`,
          at: sale.created_at,
          action: `Encaissement ${sale.sale_number} — ${sale.total_cents.toLocaleString("fr-FR")} FCFA`,
          icon: "receipt",
        }));

        // Audit logs filtrés pour l'utilisateur courant
        const userAuditLogs = getAuditLogs()
          .filter(
            (log) =>
              (log.userName && user?.name && log.userName.toLowerCase().includes(user.name.toLowerCase())) ||
              log.userId === user?.id
          )
          .map((log) => ({
            id: log.id,
            at: log.at,
            action: log.action,
            icon: log.type === "vente" ? "receipt" : log.module === "Utilisateurs" ? "user-check" : "activity",
          }));

        // Session active actuelle
        const roleMeta = user ? ROLE_META[user.role] : null;
        const currentSession: ActivityItem = {
          id: "session-active",
          at: new Date().toISOString(),
          action: `Session active — Connexion en tant que ${roleMeta?.label || "Utilisateur"}`,
          icon: "shield-check",
        };

        const initialAuth: ActivityItem | null = user?.lastLogin
          ? {
              id: "last-auth",
              at: user.lastLogin,
              action: "Dernière authentification système PharmaGestion",
              icon: "log-in",
            }
          : null;

        const allItems = [
          currentSession,
          ...(initialAuth ? [initialAuth] : []),
          ...userAuditLogs,
          ...saleActivities,
        ];

        // Dé-doublonner et trier par date récente
        const uniqueMap = new Map();
        allItems.forEach((item) => {
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        });

        const sorted = Array.from(uniqueMap.values())
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 6);

        setRecentActivities(sorted);
      } catch (err) {
        console.error("Erreur chargement activités profil:", err);
      }
      setLoadingActivities(false);
    }

    loadDynamicData();
    const handler = () => loadDynamicData();
    window.addEventListener("obasa_data_synced", handler);
    window.addEventListener("obasa_audit_changed", handler);
    return () => {
      window.removeEventListener("obasa_data_synced", handler);
      window.removeEventListener("obasa_audit_changed", handler);
    };
  }, [user]);

  /* ── Sync state si le context user change ── */
  useEffect(() => {
    if (user) {
      const parts = user.name.split(" ");
      setInfo({
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const updateInfoField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInfo((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const updatePasswordField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords((prev) => ({ ...prev, [field]: e.target.value }));
    if (passwordError) setPasswordError("");
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.firstName.trim() || !info.lastName.trim() || !info.email.trim()) {
      showToast("Veuillez renseigner prénom, nom et e-mail.");
      return;
    }
    const fullName = `${info.firstName.trim()} ${info.lastName.trim()}`;
    const initials = (info.firstName[0] + (info.lastName[0] || "")).toUpperCase();

    setIsSaving(true);
    try {
      await updateUser({
        name: fullName,
        email: info.email.trim(),
        phone: info.phone.trim(),
        initials,
      });

      logAuditEvent({
        userId: user?.id || 1,
        userName: fullName,
        module: "Utilisateurs",
        action: "Mise à jour des informations personnelles du profil",
        type: "admin",
      });

      showToast("Informations personnelles mises à jour et sauvegardées avec succès.");
    } catch (err) {
      console.error("Erreur mise à jour profil:", err);
      showToast("Erreur lors de la sauvegarde du profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwords.current.trim()) {
      setPasswordError("Le mot de passe actuel est requis.");
      return;
    }

    if (passwords.next !== passwords.confirm) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    // La vérification du mot de passe actuel et le calcul de la nouvelle
    // empreinte sont délégués au contexte d'authentification : la page n'a
    // jamais accès à un mot de passe stocké.
    setPasswordError("");
    changePassword(passwords.current, passwords.next)
      .then((res) => {
        if (!res.success) {
          setPasswordError(res.message || "Modification du mot de passe impossible.");
          return;
        }

        setPasswords({ current: "", next: "", confirm: "" });

        logAuditEvent({
          userId: user?.id || 1,
          userName: user?.name || "Utilisateur",
          module: "Utilisateurs",
          action: "Modification du mot de passe de session",
          type: "admin",
        });

        showToast("Votre mot de passe a été modifié et sauvegardé avec succès.");
      })
      .catch((err: unknown) => {
        console.error("Erreur lors du changement de mot de passe :", err);
        setPasswordError("Modification du mot de passe impossible. Veuillez réessayer.");
      });
  };

  const roleMeta = user ? ROLE_META[user.role] : null;
  const roleLabel = roleMeta ? roleMeta.label : "Utilisateur";
  const roleTone = (roleMeta?.tone as "primary" | "success" | "warning") || "primary";
  const displayUsername = user?.username ? user.username.replace(/^@+/, "") : "—";

  return (
    <div className="ds-profile-container">
      <div className="ds-profile-scroll" style={{ padding: "24px 24px 100px", overflowY: "auto" }}>
        <div className="ds-profile-inner" style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Toast de confirmation */}
          {toastMessage && (
            <div
              style={{
                position: "fixed",
                bottom: 80,
                right: 24,
                zIndex: 999,
                background: "var(--surface-overlay, #1E293B)",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 8,
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <Icon name="check-circle" size={18} color="var(--color-success)" />
              <span>{toastMessage}</span>
            </div>
          )}

          <header className="ds-profile-header">
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
              <span>Paramètres</span>
              <Icon name="chevron-right" size={12} />
              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Mon profil</span>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "4px 0 0 0" }}>Profil utilisateur</h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
              Consultez votre identité, mettez à jour vos informations et sécurisez votre accès.
            </p>
          </header>

          {/* ── Carte d'identité ── */}
          <section
            style={{
              background: "var(--surface-card)",
              borderRadius: 12,
              border: "1px solid var(--border-default)",
              padding: 24,
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--color-primary)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(29, 78, 216, 0.25)",
              }}
            >
              {user?.initials || "??"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                {info.firstName} {info.lastName.toUpperCase()}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Badge tone={roleTone}>{roleLabel}</Badge>
                <Badge tone={user?.active ? "success" : "danger"}>{user?.active ? "Actif" : "Inactif"}</Badge>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 4, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="store" size={14} color="var(--color-primary)" />
                  {storeName}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="at-sign" size={14} color="var(--text-tertiary)" />
                  <span>{displayUsername}</span>
                </span>
                {user?.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="phone" size={14} color="var(--text-tertiary)" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* ── Infos personnelles ── */}
            <section style={{ background: "var(--surface-card)", borderRadius: 12, border: "1px solid var(--border-default)", padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 14 }}>
                  <div style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 8 }}>
                    <Icon name="user" size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>Informations personnelles</h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Coordonnées affichées sur votre compte PharmaGestion.</span>
                  </div>
                </div>

                <form onSubmit={handleUpdateInfo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input
                      label="Prénom *"
                      value={info.firstName}
                      onChange={updateInfoField("firstName")}
                    />
                    <Input
                      label="Nom *"
                      value={info.lastName}
                      onChange={updateInfoField("lastName")}
                    />
                  </div>
                  <Input
                    label="Adresse e-mail *"
                    value={info.email}
                    onChange={updateInfoField("email")}
                    prefix={<Icon name="mail" size={14} color="var(--text-tertiary)" />}
                  />
                  <Input
                    label="Téléphone"
                    value={info.phone}
                    onChange={updateInfoField("phone")}
                    prefix={<Icon name="phone" size={14} color="var(--text-tertiary)" />}
                  />
                  <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--border-default)" }}>
                    <Button type="submit" variant="primary" size="md" iconLeft={isSaving ? "activity" : "check"} disabled={isSaving}>
                      {isSaving ? "Enregistrement en cours…" : "Mettre à jour les informations"}
                    </Button>
                  </div>
                </form>
              </div>
            </section>

            {/* ── Mot de passe ── */}
            <section style={{ background: "var(--surface-card)", borderRadius: 12, border: "1px solid var(--border-default)", padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 14 }}>
                  <div style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 8 }}>
                    <Icon name="key" size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>Sécurité & mot de passe</h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Mot de passe actuel + nouveau mot de passe.</span>
                  </div>
                </div>

                <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Input
                    label="Mot de passe actuel *"
                    type="password"
                    value={passwords.current}
                    onChange={updatePasswordField("current")}
                    prefix={<Icon name="lock" size={14} color="var(--text-tertiary)" />}
                  />
                  <Input
                    label="Nouveau mot de passe *"
                    type="password"
                    value={passwords.next}
                    onChange={updatePasswordField("next")}
                    prefix={<Icon name="shield" size={14} color="var(--text-tertiary)" />}
                    hint="8 caractères minimum"
                  />
                  <Input
                    label="Confirmer le nouveau mot de passe *"
                    type="password"
                    value={passwords.confirm}
                    onChange={updatePasswordField("confirm")}
                    prefix={<Icon name="shield-check" size={14} color="var(--text-tertiary)" />}
                    error={passwordError || undefined}
                  />
                  <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--border-default)" }}>
                    <Button type="submit" variant="primary" size="md" iconLeft="key">
                      Modifier le mot de passe
                    </Button>
                  </div>
                </form>
              </div>
            </section>
          </div>

          {/* ── Activité récente (dynamique depuis Dexie) ── */}
          <section style={{ background: "var(--surface-card)", borderRadius: 12, border: "1px solid var(--border-default)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid var(--border-default)", paddingBottom: 14 }}>
              <div style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 8 }}>
                <Icon name="history" size={18} color="var(--color-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>Mon activité récente</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Dernières opérations rattachées à votre compte (ventes, connexions).</span>
              </div>
            </div>

            {loadingActivities ? (
              <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                <Icon name="loader" size={18} color="var(--text-tertiary)" /> Chargement de l&apos;activité…
              </div>
            ) : recentActivities.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                Aucune activité récente enregistrée.
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {recentActivities.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: "var(--surface-sunken)",
                      borderRadius: 8,
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <div style={{ background: "var(--color-primary-subtle)", padding: 6, borderRadius: 6, display: "flex" }}>
                      <Icon name={item.icon} size={16} color="var(--color-primary)" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.action}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{formatDateTime(item.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Déconnexion ── */}
          <section
            style={{
              background: "var(--surface-sunken)",
              borderRadius: 12,
              border: "1px solid var(--border-default)",
              padding: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                <Icon name="log-out" size={18} color="var(--color-danger, #EF4444)" /> Déconnexion de session
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", margin: 0 }}>
                Termine votre session active PharmaGestion sur cet appareil.
              </p>
            </div>
            <Button
              variant="danger"
              size="md"
              iconLeft="log-out"
              onClick={logout}
            >
              Se déconnecter
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
