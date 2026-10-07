"use client";

import React, { useEffect, useState } from "react";
import { OfflineView } from "@/components/feedback/OfflineView";
import { Button } from "@/components/ds/core/Button";
import { Icon } from "@/components/ds/core/Icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    console.error("Application Error:", error);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [error]);

  if (isOffline) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--surface-ground, #090D16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <OfflineView onRetry={reset} />
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--surface-ground, #090D16)",
        color: "var(--text-primary, #F8FAFC)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ background: "rgba(239, 68, 68, 0.12)", padding: 16, borderRadius: "50%", color: "#EF4444" }}>
          <Icon name="alert-triangle" size={36} />
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Une interruption est survenue</h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #94A3B8)", margin: 0, lineHeight: 1.5 }}>
          Vos données locales et ventes en cours restent en parfaite sécurité. Vous pouvez recharger la page ou revenir à la caisse.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <Button variant="primary" size="md" iconLeft="refresh-cw" onClick={reset}>
            Réessayer
          </Button>
          <Button variant="secondary" size="md" iconLeft="home" onClick={() => (window.location.href = "/")}>
            Tableau de bord
          </Button>
        </div>
      </div>
    </main>
  );
}
