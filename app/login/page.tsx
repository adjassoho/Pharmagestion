"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ds/core/Logo";
import { Icon } from "@/components/ds/core/Icon";
import { Input } from "@/components/ds/forms/Input";
import { Button } from "@/components/ds/core/Button";
import { Dialog } from "@/components/ds/overlay/Dialog";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { useAuth } from "@/lib/auth/auth-context";
import { authService } from "@/lib/auth/auth-service";
import { navigateOfflineFirst } from "@/lib/pwa/offline-navigation";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [demoRole, setDemoRole] = useState<"admin" | "caissier">("admin");

  useEffect(() => {
    // Précharger et synchroniser les utilisateurs locaux et distants
    authService.ensureSeed().catch(() => {});
    authService.syncUsersFromServer().catch(() => {});

    if (user) {
      navigateOfflineFirst(router, "/");
    }
  }, [user, router]);

  const submitWithCredentials = (idToUse: string, passToUse: string) => {
    if (loading) return;

    if (!idToUse.trim() || !passToUse.trim()) {
      setError("Veuillez renseigner votre identifiant et votre mot de passe.");
      return;
    }

    setError("");
    setLoading(true);

    // La vérification est asynchrone : la dérivation PBKDF2 du mot de passe
    // prend quelques centaines de millisecondes.
    login(idToUse, passToUse)
      .then((res) => {
        if (res.success) {
          navigateOfflineFirst(router, "/");
        } else {
          setError(res.message || "Identifiant ou mot de passe incorrect.");
        }
      })
      .catch((err: unknown) => {
        console.error("Erreur de connexion :", err);
        setError("Connexion impossible. Veuillez réessayer.");
      })
      .finally(() => setLoading(false));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    submitWithCredentials(identifiant, password);
  };

  const handleUseDemo = (role: "admin" | "caissier" = "admin", autoLogin = false) => {
    setDemoRole(role);
    const chosenId = role === "admin" ? "demo" : "serge.a";
    const chosenPass = "obasa2026";
    setIdentifiant(chosenId);
    setPassword(chosenPass);
    setError("");

    if (autoLogin) {
      submitWithCredentials(chosenId, chosenPass);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px",
        background: "radial-gradient(ellipse at 50% 30%, var(--surface-sunken) 0%, var(--surface-app) 100%)",
        fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
        color: "var(--text-primary)",
        position: "relative",
      }}
    >
      {/* Barre PWA d'installation accessible dès la page de connexion */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 100,
        }}
      >
        <PwaInstallPrompt />
      </div>

      <Dialog
        open={forgotModalOpen}
        title="Réinitialisation du mot de passe"
        onClose={() => setForgotModalOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setForgotModalOpen(false)}>
            Compris
          </Button>
        }
      >
        <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.6, fontFamily: "inherit" }}>
          Pour réinitialiser votre mot de passe ou débloquer votre accès, veuillez contacter l'administrateur principal de votre officine ou le responsable informatique PharmaGestion.
        </p>
      </Dialog>

      <form
        onSubmit={submit}
        className="neumorphic-raised"
        style={{
          width: "min(440px, 100%)",
          background: "var(--surface-card)",
          border: "1px solid rgba(255,255,255,0.6)",
          borderRadius: "1.25rem",
          padding: "36px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      >
        {/* En-tête Marque PharmaGestion Vectorielle */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Logo variant="full" height={46} />
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginTop: 12,
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            Accès sécurisé à votre espace d'officine
          </div>
        </div>

        {/* Message d'erreur stylisé */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--status-out-bg)",
              border: "1px solid var(--status-out-border)",
              color: "var(--status-out-fg)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            <Icon
              name="alert-circle"
              size={18}
              color="var(--status-out-fg)"
              style={{ flexShrink: 0 }}
            />
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire de connexion */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "inherit" }}>
          <Input
            label="Identifiant ou E-mail *"
            placeholder="ex: demo ou pharmacien@pharmagestion.bj"
            value={identifiant}
            onChange={(e: any) => setIdentifiant(e.target.value)}
            autoComplete="username"
          />
          <Input
            label="Mot de passe *"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            autoComplete="current-password"
            suffix={
              <Icon
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                onClick={() => setShowPassword((s) => !s)}
                style={{ cursor: "pointer", color: "var(--text-tertiary)" }}
              />
            }
          />
        </div>

        {/* Bouton de connexion standard */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
          style={{
            height: 46,
            fontSize: 14,
            fontWeight: 600,
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontFamily: "inherit",
            marginTop: 2,
          }}
        >
          {loading ? (
            <>
              <Icon name="loader-circle" size={18} className="ds-spin" />
              Connexion en cours…
            </>
          ) : (
            "Se connecter à l'espace"
          )}
        </Button>

        {/* Encadré Compte Démo / Test pour Nouveaux Visiteurs */}
        <div
          className="neo-inset"
          style={{
            padding: "16px",
            borderRadius: "1rem",
            background: "rgba(239, 246, 255, 0.65)",
            border: "1px solid rgba(191, 219, 254, 0.9)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>science</span>
              <span>Compte de Test / Démo</span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "2px 8px",
                borderRadius: 9999,
                background: "#dbeafe",
                color: "#1e40af",
              }}
            >
              Nouveau visiteur
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            Testez directement l'application sans créer de compte :
          </p>

          {/* Sélecteur de rôle de test */}
          <div style={{ display: "flex", gap: 6, background: "rgba(255, 255, 255, 0.7)", padding: 3, borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <button
              type="button"
              onClick={() => handleUseDemo("admin", false)}
              style={{
                flex: 1,
                padding: "5px 8px",
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: demoRole === "admin" ? "#2563eb" : "transparent",
                color: demoRole === "admin" ? "#ffffff" : "#64748b",
                transition: "all 0.2s ease",
              }}
            >
              Titulaire (Admin)
            </button>
            <button
              type="button"
              onClick={() => handleUseDemo("caissier", false)}
              style={{
                flex: 1,
                padding: "5px 8px",
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: demoRole === "caissier" ? "#2563eb" : "transparent",
                color: demoRole === "caissier" ? "#ffffff" : "#64748b",
                transition: "all 0.2s ease",
              }}
            >
              Caissier Comptoir
            </button>
          </div>

          {/* Détails des identifiants */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)" }}>Identifiant :</span>
              <code style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#1e293b", background: "rgba(255,255,255,0.9)", padding: "2px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                {demoRole === "admin" ? "demo" : "serge.a"}
              </code>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)" }}>Mot de passe :</span>
              <code style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#1e293b", background: "rgba(255,255,255,0.9)", padding: "2px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                obasa2026
              </code>
            </div>
          </div>

          {/* Boutons d'action rapide */}
          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
            <button
              type="button"
              onClick={() => handleUseDemo(demoRole, false)}
              className="neo-btn-raised"
              style={{
                flex: 1,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
              Remplir
            </button>
            <button
              type="button"
              onClick={() => handleUseDemo(demoRole, true)}
              disabled={loading}
              style={{
                flex: 1.4,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffff",
                background: "#2563eb",
                borderRadius: 9999,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
              Connexion 1-clic
            </button>
          </div>
        </div>

        {/* Lien Mot de passe oublié */}
        <div style={{ textAlign: "center", marginTop: -6 }}>
          <button
            type="button"
            onClick={() => setForgotModalOpen(true)}
            style={{
              all: "unset",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--color-primary)",
              fontFamily: "inherit",
              transition: "opacity 0.2s ease",
            }}
          >
            Mot de passe oublié ?
          </button>
        </div>
      </form>
    </div>
  );
}
