import type { MultiQuote, Quote, RenderQuote } from "../utils/types.ts";

import { data, getDocPath, getParagraphIds } from "./utils.ts";

const simplifyLinkLabels = {
  "Gleanings from the Writings of Bahá’u’lláh": "Gleanings",
  "Selections from the Writings of ‘Abdu’l‑Bahá": "Selections",
} as Record<string, string>;

const getParasString = (
  paras: number[],
  paraIds: string[],
  hiddenWords: boolean
) => {
  const result = [];
  let start = paras[0]!;
  let end = paras[0]!;
  for (let i = 1; i <= paras.length; i++) {
    const current = paras[i]!;
    if (current === end + 1) {
      end = current;
    } else if (current !== end) {
      if (start === end) {
        result.push(`${hiddenWords ? "No." : "Para"} ${paraIds[start]}`);
      } else {
        result.push(
          `${hiddenWords ? "Nos." : "Paras"} ${paraIds[start]}-${paraIds[end]}`
        );
      }
      start = end = current;
    }
  }
  return result.join(", ");
};

export const getUrlQuote = (
  ref: Quote | MultiQuote,
  shorten: boolean
): RenderQuote => {
  let current = "";
  const section = data[ref.section]!;
  const path = shorten
    ? getDocPath(section.path) || section.path
    : section.path;
  const res: [string, string][] = path.map((p) => {
    current = `${current}/${p[1]}`;
    return [
      simplifyLinkLabels[p[0]] || p[0].replace(/ \([^\)]*\)/, ""),
      current,
    ];
  });
  const paragraphs = Array.isArray(ref.paragraph)
    ? ref.paragraph
    : [ref.paragraph];
  const paraIds = getParagraphIds(ref.section);
  if (
    !Array.from({ length: paraIds.length }).every((_, i) =>
      paragraphs.includes(i)
    )
  ) {
    if (paragraphs.length > 0) {
      res.push([
        getParasString(
          paragraphs,
          paraIds,
          section.path[1]![0] === "The Hidden Words"
        ),
        current,
      ]);
    }
    const firstQuote =
      "quotes" in ref
        ? ref.quotes.sort(
            (a, b) => a.paragraph - b.paragraph || a.start - b.start
          )[0]!
        : ref;
    if (firstQuote) {
      res[res.length - 1]![1] +=
        `#${paraIds[firstQuote.paragraph]}_${firstQuote.start}`;
    }
  }

  if (shorten) {
    if (res[1]![0] === "The Hidden Words") {
      res[2]![0] = res[2]![0].split(":")[0]!;
    } else if (res[1]![0] === "The Summons of the Lord of Hosts") {
      res.splice(1, 1);
    } else if (res[1]![0] === "Tablets of Bahá’u’lláh") {
      res.splice(1, 1);
    } else if (res[1]![0] === "The Promulgation of Universal Peace") {
      res[2]![0] = res[2]![0].split(",").at(-1)!;
    } else if (res[1]![0] === "Some Answered Questions") {
      res[2]![0] = res[2]![0].split(":")[0]!;
    } else if (res[1]![0] === "The World Order of Bahá’u’lláh") {
      res.splice(1, 1);
    } else if (res[1]![0] === "God Passes By") {
      res[2]![0] = res[2]![0].split(":")[0]!;
    } else if (
      res[0]![0] === "The Universal House of Justice" &&
      res[1]![0] === "Selected Messages"
    ) {
      res[2]![0] = res[2]![0].split(",")[0]!;
      res.splice(1, 1);
    } else if (res[0]![0] === "Ruhi Institute") {
      res[1]![0] = res[1]![0].split(":")[0]!;
      res[2]![0] = res[2]![0].split(":")[0]!;
      res.splice(3);
    }
    if (res[1]![0] === "Junior Youth Texts") {
      res.splice(1, 1);
    }
  }

  return {
    path: res,
    author: section.prayer || section.meta || section.path[0]![0],
  };
};
