export interface Range {
  start: number;
  end: number;
}

export interface Ref {
  section: number;
  paragraph: number;
}

export type Quote = Range & Ref;

export interface RefQuote {
  range: Range;
  quote: Quote;
}

export interface MultiQuote {
  section: number;
  paragraph: number[];
  quotes: Quote[];
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
  additional?: true;
  content: SectionContent[];
  extract?: string;
}

export interface FlatPara {
  type?: "break" | "info" | "call" | "framing";
  text: string;
  lines?: number[];
  quotes?: RefQuote[];
  quoted: RefQuote[];
  highlights: Range[];
  sourceQuotes: RefQuote[];
  allSpecial: boolean;
}

export interface SemiPara {
  type?: "break" | "info" | "call" | "framing";
  text: string;
  lines?: number[];
  quotes?: { quote: RefQuote; render: RenderQuote }[];
  quoted: RefQuote[];
  highlights: Range[];
  sourceQuotes: RefQuote[];
  allSpecial: boolean;
}

export interface RenderQuote {
  path: [string, string][];
  author: string;
}

export interface QuoteLink {
  quotes: Quote[];
  render: RenderQuote;
}

export interface Passage {
  section: number;
  start: number;
  levels: (number | null)[];
  score: number;
  scoreInfo: any;
}

export interface DocSlice {
  title: QuoteLink;
  scoreInfo: any;
  chunks: {
    sources: QuoteLink[];
    content: {
      ref: Ref;
      paraId: string;
      para: SemiPara;
      quotes: QuoteLink[];
      quoted: QuoteLink[];
    }[];
  }[];
}

export type RenderContent =
  | { type: "break" }
  | {
      text: string;
      quoted: number;
      highlight: boolean;
      id?: string;
      quote?: true | QuoteLink;
    }[]
  | {
      type: "info" | "call" | "framing" | "lines" | "quote";
      lines: {
        text: string;
        quoted: number;
        highlight: boolean;
        id?: string;
      }[][];
      allSpecial: boolean;
    };
