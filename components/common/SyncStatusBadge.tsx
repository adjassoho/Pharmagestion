"use client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatusBadgeProps {
  pendingCount?: number;
  className?: string;
}

export function SyncStatusBadge({
  pendingCount = 0,
  className,
}: SyncStatusBadgeProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Initialise l'état initial
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (pendingCount > 0) {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pendingCount]);

  if (!isOnline) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800/40",
          className
        )}
        title="Aucune connexion internet — Mode Hors-Ligne actif"
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span>Hors-ligne</span>
        {pendingCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 font-bold text-[10px]">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (isSyncing || pendingCount > 0) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40",
          className
        )}
        title={`${pendingCount} opération(s) en attente de synchronisation`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Sync...</span>
        {pendingCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold text-[10px]">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40",
        className
      )}
      title="Connecté au réseau — Synchronisé"
    >
      <Wifi className="w-3.5 h-3.5" />
      <span>En ligne</span>
    </div>
  );
}
