import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "var(--font-sans)",
        background: "var(--surface-app)",
        color: "var(--text-primary)",
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 900, color: "var(--color-primary)", margin: 0 }}>
        404
      </h1>
      <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: 0 }}>
        Page introuvable
      </p>
      <Link
        href="/"
        style={{
          padding: "10px 18px",
          background: "var(--color-primary)",
          color: "#fff",
          borderRadius: "var(--radius-sm)",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Retourner au tableau de bord
      </Link>
    </div>
  );
}
