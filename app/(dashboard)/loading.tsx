"use client";

import React from "react";

export default function DashboardLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "24px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div
            style={{
              width: 280,
              height: 28,
              borderRadius: 8,
              background: "var(--surface-sunken, #1e293b)",
            }}
          />
          <div
            style={{
              width: 200,
              height: 14,
              borderRadius: 6,
              background: "var(--surface-sunken, #1e293b)",
              marginTop: 8,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 120, height: 38, borderRadius: 8, background: "var(--surface-sunken, #1e293b)" }} />
          <div style={{ width: 120, height: 38, borderRadius: 8, background: "var(--surface-sunken, #1e293b)" }} />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 100,
              borderRadius: 12,
              background: "var(--surface-card, #0f172a)",
              border: "1px solid var(--border-default, #1e293b)",
            }}
          />
        ))}
      </div>

      {/* Main content skeleton */}
      <div
        style={{
          height: 400,
          borderRadius: 12,
          background: "var(--surface-card, #0f172a)",
          border: "1px solid var(--border-default, #1e293b)",
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
