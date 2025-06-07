import type React from "react";
import { createContext, useContext } from "react";
import { Link } from "react-router";

export const SizeContext = createContext(16);

export function Column({
  gap = 0,
  style,
  children,
}: {
  gap?: number | string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div style={{ ...style, display: "flex", flexDirection: "column", gap }}>
      {children}
    </div>
  );
}

export function Row({
  gap = 0,
  style,
  children,
}: {
  gap?: number | string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap,
      }}
    >
      {children}
    </div>
  );
}

export function Text({
  size,
  to,
  style,
  children,
}: {
  size?: number;
  to?: string;
  style?: React.CSSProperties;
  children: string;
}) {
  const textSize = size || useContext(SizeContext);
  if (to) {
    return (
      <div
        style={{ ...style, display: "flex", fontSize: textSize, flexGrow: 1 }}
      >
        <Link
          to={to}
          style={{
            margin: -5,
            padding: 5,
          }}
        >
          <p style={{ margin: `-${(textSize * 0.5) / 2}px 0` }}>{children}</p>
        </Link>
      </div>
    );
  }
  return (
    <div style={{ ...style, display: "flex", fontSize: textSize }}>
      <p style={{ margin: `-${(textSize * 0.5) / 2}px 0` }}>{children}</p>
    </div>
  );
}
