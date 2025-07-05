export interface Ref {
  section: number;
  paragraph: number;
}

export interface Quote {
  section: number;
  paragraph: number;
  start: number;
  end: number;
}
export interface RefQuote extends Quote {
  refStart: number;
  refEnd: number;
}

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
  quoted?: Record<string, RefQuote[]>;
  content: SectionContent[];
}
