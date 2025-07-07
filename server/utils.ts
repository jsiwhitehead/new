import type { Section, SectionContent } from "../utils/types";

import baseData from "../data/data.json";
export const data = baseData as Section[];

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
