"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth/auth-context";
import { AccessDenied } from "@/components/feedback/AccessDenied";
import { navigateOfflineFirst } from "@/lib/pwa/offline-navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, canAccess } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigateOfflineFirst(router, "/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  // Vérifier si l'utilisateur courant a le droit d'accéder à cette route
  const isAllowed = canAccess(pathname);

  return (
    <AppShell>
      {isAllowed ? children : <AccessDenied moduleName={pathname.replace("/", "").toUpperCase()} />}
    </AppShell>
  );
}
