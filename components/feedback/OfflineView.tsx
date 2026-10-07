"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds/core/Button";
import { navigateOfflineFirst } from "@/lib/pwa/offline-navigation";

interface OfflineViewProps {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}

export function OfflineView({
  title = "Vous êtes hors-ligne",
  subtitle = "Vos données et votre caisse restent accessibles en toute sécurité.",
  onRetry,
}: OfflineViewProps) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : false
  );
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (onRetry) {
        onRetry();
      } else {
        router.refresh();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router, onRetry]);

  const handleManualRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      if (navigator.onLine) {
        setIsOnline(true);
        if (onRetry) {
          onRetry();
        } else {
          router.refresh();
        }
      }
    }, 600);
  };

  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        textAlign: "center",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      {/* ── Illustration Vectorielle Animée PharmaGestion ── */}
      <div style={{ width: "100%", maxWidth: 300, marginBottom: 12 }}>
        <svg
          viewBox="0 0 400 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 10px 24px rgba(0, 0, 0, 0.35))" }}
        >
          <defs>
            <linearGradient id="storeGrad" x1="100" y1="120" x2="300" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="roofGrad" x1="120" y1="90" x2="280" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="cementGrad" x1="60" y1="190" x2="110" y2="240" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="steelGrad" x1="290" y1="160" x2="340" y2="250" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* Sol et Ombre */}
          <ellipse cx="200" cy="245" rx="170" ry="24" fill="#0B132B" opacity="0.8" />
          <ellipse cx="200" cy="245" rx="140" ry="18" fill="#1E293B" opacity="0.4" />

          {/* Ondes Radio Antenne (Animées) */}
          <circle cx="200" cy="85" r="14" stroke="#38BDF8" fill="none" opacity="0.6" strokeWidth="2">
            <animate attributeName="r" values="8;36;48" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.4;0" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="85" r="22" stroke="#F59E0B" fill="none" opacity="0.5" strokeWidth="2">
            <animate attributeName="r" values="8;36;48" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.4;0" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
          </circle>

          {/* Bâtiment Pharmacie PharmaPlus */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,-6; 0,0"
              dur="4s"
              repeatCount="indefinite"
            />
            {/* Murs */}
            <path d="M120 125 L280 125 L280 240 L120 240 Z" fill="url(#storeGrad)" stroke="#334155" strokeWidth="2" />
            {/* Toit */}
            <path d="M105 125 L200 85 L295 125 Z" fill="url(#roofGrad)" stroke="#60A5FA" strokeWidth="2" />

            {/* Enseigne avec Croix Pharmacie */}
            <rect x="135" y="103" width="130" height="28" rx="6" fill="#0F172A" stroke="#34D399" strokeWidth="1.5" />
            <rect x="145" y="110" width="14" height="14" rx="3" fill="#10B981" />
            <path d="M150 112 H154 V116 H158 V120 H154 V124 H150 V120 H146 V116 H150 Z" fill="#FFFFFF" />
            <text x="210" y="122" fill="#F8FAFC" fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="1.5">
              PHARMAPLUS
            </text>

            {/* Vitrine Comptoir Officine */}
            <rect x="135" y="145" width="60" height="50" rx="4" fill="#090D16" stroke="#38BDF8" strokeWidth="1.5" />
            <rect x="140" y="150" width="50" height="30" rx="2" fill="#1E3A8A" />
            <line x1="145" y1="158" x2="175" y2="158" stroke="#38BDF8" strokeWidth="2" />
            <line x1="145" y1="164" x2="168" y2="164" stroke="#93C5FD" strokeWidth="1.5" />
            <line x1="145" y1="170" x2="182" y2="170" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="180" cy="158" r="3" fill="#10B981" />

            {/* Porte Arrière-Boutique */}
            <rect x="210" y="145" width="55" height="95" rx="3" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
            <line x1="210" y1="165" x2="265" y2="165" stroke="#334155" strokeWidth="1.5" />
            <line x1="210" y1="185" x2="265" y2="185" stroke="#334155" strokeWidth="1.5" />
            <line x1="210" y1="205" x2="265" y2="205" stroke="#334155" strokeWidth="1.5" />
            <circle cx="218" cy="195" r="3" fill="#F59E0B" />

            {/* Antenne */}
            <line x1="200" y1="85" x2="200" y2="60" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <circle cx="200" cy="58" r="5" fill="#10B981" />
          </g>

          {/* Flacon de médicaments & Boîte de comprimés */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,-5; 0,0"
              dur="4.5s"
              begin="1s"
              repeatCount="indefinite"
            />
            <rect x="58" y="199" width="30" height="40" rx="5" transform="rotate(-6 58 199)" fill="url(#cementGrad)" stroke="#A7F3D0" strokeWidth="1.2" />
            <rect x="56" y="193" width="34" height="7" rx="2" transform="rotate(-6 58 199)" fill="#E2E8F0" />
            <rect x="78" y="206" width="42" height="38" rx="4" transform="rotate(4 78 206)" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="1.2" />
            <rect x="86" y="216" width="26" height="4" rx="2" transform="rotate(4 78 206)" fill="#93C5FD" />
            <rect x="86" y="224" width="20" height="4" rx="2" transform="rotate(4 78 206)" fill="#60A5FA" />
            <path d="M104 214 H109 V219 H114 V224 H109 V229 H104 V224 H99 V219 H104 Z" transform="rotate(4 78 206)" fill="#FFFFFF" opacity="0.9" />
            <rect x="95" y="192" width="26" height="28" rx="3" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.2" />
            <rect x="93" y="189" width="30" height="4" rx="1.5" fill="#E2E8F0" />
          </g>

          {/* Gélules & Mortier Pharmacien */}
          <g>
            <line x1="292" y1="238" x2="318" y2="182" stroke="url(#steelGrad)" strokeWidth="5" strokeLinecap="round" />
            <path d="M312 186 Q314 178 322 180 L332 183 Q338 185 336 191 Q334 197 327 195 L317 192 Z" fill="url(#steelGrad)" />
            <path d="M288 214 Q296 208 304 214 Q296 220 288 214 Z" fill="#F59E0B" stroke="#FBBF24" strokeWidth="1" />
            <path d="M304 214 Q312 208 320 214 Q312 220 304 214 Z" fill="#38BDF8" stroke="#7DD3FC" strokeWidth="1" />
            <path d="M296 228 Q304 222 312 228 Q304 234 296 228 Z" fill="#38BDF8" stroke="#7DD3FC" strokeWidth="1" />
          </g>

          {/* Badge Mode Local */}
          <g transform="translate(110, 240)">
            <rect x="0" y="0" width="180" height="26" rx="13" fill="#064E3B" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="16" cy="13" r="5" fill="#34D399" />
            <circle cx="16" cy="13" r="2" fill="#FFFFFF" />
            <text x="30" y="17" fill="#ECFDF5" fontSize="9" fontWeight="700" letterSpacing="0.5">
              MODE LOCAL ACTIF
            </text>
          </g>
        </svg>
      </div>

      {/* ── Badge Statut Épuré ── */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 9999,
          background: isOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
          border: isOnline ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.25)",
          color: isOnline ? "#34D399" : "#FBBF24",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: isOnline ? "#10B981" : "#F59E0B",
          }}
        />
        <span>{isOnline ? "Connexion rétablie" : "Hors-ligne"}</span>
      </div>

      {/* ── Titre & Sous-titre Minimaliste ── */}
      <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary, #FFF)", margin: "0 0 6px 0" }}>
        {title}
      </h1>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #94A3B8)", lineHeight: 1.45, margin: "0 0 24px 0" }}>
        {subtitle}
      </p>

      {/* ── Boutons d'Action ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <Button
          variant="primary"
          size="lg"
          iconLeft={isChecking ? "loader" : "refresh-cw"}
          onClick={handleManualRetry}
          disabled={isChecking}
        >
          {isChecking ? "Vérification…" : "Réessayer"}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          iconLeft="shopping-cart"
          onClick={() => navigateOfflineFirst(router, "/caisse")}
        >
          Ouvrir la Caisse
        </Button>
      </div>
    </div>
  );
}
