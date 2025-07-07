import type React from "react";
import { createContext, useContext } from "react";
import { Link } from "react-router";

export const authorColours = {
  "The Báb": "#27ae60",
  "Bahá’u’lláh": "#c0392b",
  "‘Abdu’l‑Bahá": "#2980b9",
  Prayers: "#8e44ad",
  "Shoghi Effendi": "#f39c12",
  "The Universal House of Justice": "#4834d4",
  Documents: "#8e44ad",
  Compilations: "#8e44ad",
  Books: "#8e44ad",
  Stories: "#8e44ad",
} as Record<string, string>;

export const SizeContext = createContext(16);

export function Column({
  gap = 0,
  id,
  style,
  children,
}: {
  gap?: number | string;
  id?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{ display: "flex", flexDirection: "column", gap, ...style }}
    >
      {children}
    </div>
  );
}

export function Row({
  gap = 0,
  id,
  style,
  children,
}: {
  gap?: number | string;
  id?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Text({
  size,
  to,
  id,
  onClick,
  style,
  children,
}: {
  size?: number;
  to?: string;
  id?: string;
  onClick?: React.MouseEventHandler<any>;
  style?: React.CSSProperties;
  children: any;
}) {
  const textSize = size || useContext(SizeContext);
  if (to) {
    return (
      <div
        id={id}
        style={{ ...style, display: "flex", fontSize: textSize, flexGrow: 1 }}
        onClick={onClick}
      >
        <Link
          to={to}
          style={{
            margin: -5,
            padding: 5,
          }}
        >
          <p
            style={{
              margin: `-${(textSize * 0.5) / 2}px 0`,
              whiteSpace: "inherit",
            }}
          >
            {children}
          </p>
        </Link>
      </div>
    );
  }
  return (
    <div
      id={id}
      style={{ ...style, display: "flex", fontSize: textSize }}
      onClick={onClick}
    >
      <p style={{ margin: `-${(textSize * 0.5) / 2}px 0` }}>{children}</p>
    </div>
  );
}

export function RightArrow({
  size,
  color,
  padding,
}: {
  size: number;
  color: string;
  padding?: number | string;
}) {
  return (
    <svg
      style={{
        flexShrink: 0,
        height: size,
        padding,
      }}
      viewBox="-0.5 -1 1.5 2"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="-0.5,0.866 -0.5,-0.866 1.0,0.0" fill={color} />
    </svg>
  );
}
