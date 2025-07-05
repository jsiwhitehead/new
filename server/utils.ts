import type { Range, Ref, Section, SectionContent } from "../utils/types";

import baseData from "../data/data.json";
export const data = baseData as Section[];

export interface ParaText {
  type?: "break" | "info" | "call" | "framing";
  text: string;
  lines?: number[];
  quotes?: { start: number; end: number; quote: Ref }[];
  quoted: { start: number; end: number; quote: Ref }[];
  highlights: Range[];
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

export const getAllSpecial = (content: SectionContent[]) =>
  content.every((para) => !Array.isArray(para) && typeof para !== "string");

export const getParagraphIds = (content: SectionContent[]) => {
  let currentMain = 1;
  let currentSpecial = 0;
  const allIds = content.map((para) => {
    if (typeof para === "string" || !("type" in para)) {
      currentSpecial = 0;
      return `${currentMain++}`;
    }
    return `${currentMain}${["a", "b", "c", "d", "e", "f", "g", "h", "i"][currentSpecial++]}`;
  });
  return allIds;
};

export const mergeQuotes = (quotes: Ref[]) => {
  const res: MultiRef[] = [];
  for (const { section, paragraph } of quotes) {
    if (!res.find((s) => s.section === section)) {
      res.push({ section, paragraph: [paragraph] });
    } else {
      const s = res.find((s) => s.section === section)!;
      s.paragraph.push(paragraph);
    }
  }
  return res;
};
