export interface Range {
  start: number;
  end: number;
}

export interface Ref {
  section: number;
  paragraph: number;
}

export type Quote = Range & Ref;

export type SectionContent =
  | string
  | { type: "break" }
  | { text: string; type: "info" | "call" | "framing" }
  | { text: string; lines: number[] }
  | (string | Quote)[];

export interface Section {
  path: [string, string, number][];
  years: [number, number];
  translated?: string;
  meta?: string;
  reference?: string;
  source?: string;
  summary?: string;
  purpose?: string;
  prayer?: string;
  quoted?: Record<string, Quote[]>;
  content: SectionContent[];
}

export interface FlatPara {
  type?: "break" | "info" | "call" | "framing";
  text: string;
  lines?: number[];
  quotes?: Quote[];
  quoted: Quote[];
  highlights: Range[];
  sourceQuotes: Quote[];
  allSpecial: boolean;
}

export interface SemiPara {
  type?: "break" | "info" | "call" | "framing";
  text: string;
  lines?: number[];
  quotes?: { base: Quote; quote: RenderQuote }[];
  quoted: Quote[];
  highlights: Range[];
  sourceQuotes: Quote[];
  allSpecial: boolean;
}

export interface MultiRef {
  section: number;
  paragraph: number[];
}

export interface RenderQuote {
  path: [string, string][];
  author: string;
}

export type RenderContent =
  | { type: "break" }
  | {
      text: string;
      quoted: number;
      highlight: boolean;
      quote?: true | RenderQuote;
    }[]
  | {
      type: "info" | "call" | "framing" | "lines" | "quote";
      lines: { text: string; quoted: number; highlight: boolean }[][];
      allSpecial: boolean;
    };
