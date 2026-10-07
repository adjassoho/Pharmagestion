import React from "react";

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "full" | "mark";
  height?: number;
}

/**
 * Logo — Logo officiel PharmaGestion / PharmaPlus vectoriel.
 * - variant="full" : Croix médicale stylisée + Typographie PharmaPlus
 * - variant="mark" : Croix médicale stylisée néomorphique
 */
export function Logo({ variant = "full", height = 36, style, ...rest }: LogoProps) {
  if (variant === "mark") {
    return (
      <span
        className="pharma-logo"
        style={{ display: "inline-flex", alignItems: "center", lineHeight: 0, ...style }}
        {...rest}
      >
        <svg
          height={height}
          width={height}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="PharmaPlus Mark"
        >
          <rect width="48" height="48" rx="14" fill="#2563eb" />
          <path
            d="M21 12H27V21H36V27H27V36H21V27H12V21H21V12Z"
            fill="#FFFFFF"
          />
          <circle cx="35" cy="13" r="3" fill="#6366f1" />
        </svg>
      </span>
    );
  }

  const width = Math.round(height * 4.2);

  return (
    <span
      className="pharma-logo"
      style={{ display: "inline-flex", alignItems: "center", lineHeight: 0, ...style }}
      {...rest}
    >
      <svg
        height={height}
        width={width}
        viewBox="0 0 190 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="PharmaPlus Logo"
      >
        {/* Croix / Insigne */}
        <rect width="44" height="44" rx="12" fill="#2563eb" />
        <path
          d="M19 11H25V19H33V25H25V33H19V25H11V19H19V11Z"
          fill="#FFFFFF"
        />
        <circle cx="33" cy="11" r="3" fill="#6366f1" />

        {/* Texte PharmaPlus */}
        <text
          x="54"
          y="28"
          fill="var(--text-primary, #0b1c30)"
          fontFamily="var(--font-sans, Inter, sans-serif)"
          fontSize="20"
          fontWeight="700"
          letterSpacing="-0.02em"
        >
          Pharma<tspan fill="#2563eb">Plus</tspan>
        </text>
      </svg>
    </span>
  );
}
