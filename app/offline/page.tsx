import React from "react";
import { OfflineView } from "@/components/feedback/OfflineView";

export const metadata = {
  title: "Mode Hors-Ligne — PharmaGestion",
  description:
    "Système de gestion d'officine et caisse hors-ligne pour pharmacies.",
};

export default function OfflineRoutePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--surface-ground, #090D16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <OfflineView />
    </main>
  );
}
