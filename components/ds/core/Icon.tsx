"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import { OBASA_ICONS } from "./obasaIcons";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

function toPascalCase(name: string): string {
  if (name === "bar-chart-3") return "BarChart3";
  if (name === "trash-2") return "Trash2";
  if (name === "log-out") return "LogOut";
  if (name === "user-cog") return "UserCog";
  if (name === "line-chart") return "LineChart";
  if (name === "shopping-bag") return "ShoppingBag";
  if (name === "shopping-cart") return "ShoppingCart";
  if (name === "trending-up") return "TrendingUp";
  if (name === "chevron-left") return "ChevronLeft";
  if (name === "chevron-right") return "ChevronRight";
  if (name === "arrow-left") return "ArrowLeft";

  return name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  color = "currentColor",
  style,
  className,
  ...rest
}: IconProps) {
  // 1. Vérifier si l'icône fait partie du jeu officiel de marque OBASA
  // @ts-ignore
  const obasa = OBASA_ICONS[name] || (name === "home" ? OBASA_ICONS["dashboard"] : undefined);

  if (obasa) {
    const explicit = color && color !== "currentColor";
    return (
      <svg
        className={className ? `obasa-icon ${className}` : "obasa-icon"}
        width={size}
        height={size}
        viewBox={obasa.viewBox}
        fill="currentColor"
        role="img"
        aria-hidden="true"
        style={{
          display: "inline-block",
          flexShrink: 0,
          verticalAlign: "middle",
          ...(explicit ? { color } : null),
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: obasa.body }}
        {...(rest as any)}
      />
    );
  }

  // 2. Fallback automatique sur les icônes vectorielles Lucide
  const pascalName = toPascalCase(name);
  // @ts-ignore
  const IconComponent = LucideIcons[pascalName] || LucideIcons.HelpCircle;

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      <IconComponent size={size} strokeWidth={strokeWidth} color={color} />
    </span>
  );
}
