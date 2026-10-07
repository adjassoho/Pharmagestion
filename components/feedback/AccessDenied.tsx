"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { navigateOfflineFirst } from "@/lib/pwa/offline-navigation";

interface AccessDeniedProps {
  moduleName?: string;
}

export function AccessDenied({ moduleName }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
        padding: 32,
        textAlign: "center",
        background: "var(--surface-app)",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "var(--status-out-bg, #FEF2F2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 4px 12px rgba(225, 29, 72, 0.15)",
        }}
      >
        <Icon name="shield-alert" size={40} color="var(--color-danger, #E11D48)" />
      </div>

      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          marginBottom: 10,
        }}
      >
        Accès Refusé
      </h1>

      <p
        style={{
          fontSize: "0.95rem",
          color: "var(--text-secondary)",
          maxWidth: 460,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        Vous ne disposez pas des permissions requises pour accéder au module{" "}
        {moduleName ? <strong>« {moduleName} »</strong> : "demandé"}. Veuillez contacter votre administrateur (Gérant) si vous pensez qu'il s'agit d'une erreur.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <Button
          variant="primary"
          size="lg"
          iconLeft="home"
          onClick={() => navigateOfflineFirst(router, "/")}
        >
          Retour au Tableau de bord
        </Button>
      </div>
    </div>
  );
}
