"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { Dialog } from "@/components/ds/overlay/Dialog";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Détecter si l'application s'exécute déjà en mode PWA autonome (Standalone)
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      // 2. Détecter si l'utilisateur est sur iOS / iPadOS (Safari)
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isIosDevice);

      // 3. Écouter l'événement Chrome/Edge/Android beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Ne rien afficher si déjà installée en Standalone
  if (isInstalled) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-success)",
          background: "var(--status-instock-bg)",
          padding: "4px 10px",
          borderRadius: "var(--radius-pill)",
        }}
      >
        <Icon name="check-circle" size={14} /> App Installée
      </span>
    );
  }

  // Si pas encore installable et pas iOS, afficher quand même un bouton discret
  if (!isInstallable && !isIos) {
    return null;
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        iconLeft="download"
        onClick={handleInstallClick}
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, #1e40af 100%)",
          color: "#ffffff",
          fontWeight: 700,
          boxShadow: "0 2px 8px rgba(29,78,216,0.3)",
          whiteSpace: "nowrap",
        }}
      >
        <span className="ds-pwa-text-full">Installer l'application PharmaGestion</span>
        <span className="ds-pwa-text-short" style={{ display: "none" }}>Installer</span>
      </Button>

      {/* Modal d'instructions d'installation pour iOS Safari */}
      <Dialog
        open={showIosGuide}
        title="📲 Installer PharmaGestion sur votre iPhone / iPad"
        onClose={() => setShowIosGuide(false)}
        footer={
          <Button variant="primary" onClick={() => setShowIosGuide(false)}>
            Compris
          </Button>
        }
      >
        <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>
            Pour installer l'application PharmaGestion sur iOS :
          </p>
          <ol style={{ paddingLeft: 20, margin: "12px 0" }}>
            <li style={{ marginBottom: 8 }}>
              Appuyez sur le bouton <strong>Partager</strong> <Icon name="share" size={14} /> dans la barre Safari au bas de votre écran.
            </li>
            <li style={{ marginBottom: 8 }}>
              Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong> <Icon name="plus-square" size={14} />.
            </li>
            <li>
              Appuyez sur <strong>Ajouter</strong> en haut à droite.
            </li>
          </ol>
          <div style={{ background: "var(--surface-card)", padding: 10, borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 12, color: "var(--text-tertiary)" }}>
            💡 L'icône <strong>PharmaGestion</strong> apparaîtra sur votre écran d'accueil et fonctionnera à 100% hors-ligne.
          </div>
        </div>
      </Dialog>
    </>
  );
}
