import type { MultiRef, Ref, RenderQuote } from "../utils/types";
import { capitalise } from "../utils/utils";

import { data, getParagraphIds } from "./utils";

const simplifyLinkLabels = {
  "Gleanings from the Writings of Bahá’u’lláh": "Gleanings",
  "Tablets of Bahá’u’lláh": "Tablets",
  "Selections from the Writings of ‘Abdu’l‑Bahá": "Selections",
  "Commissioned by the Universal House of Justice": "Publications",
} as Record<string, string>;

const getParasString = (paras: number[], paraIds: string[]) => {
  const result = [];
  let start = paras[0]!;
  let end = paras[0]!;
  for (let i = 1; i <= paras.length; i++) {
    const current = paras[i]!;
    if (current === end + 1) {
      end = current;
    } else if (current !== end) {
      if (start === end) result.push(`Para ${paraIds[start]}`);
      else result.push(`Paras ${paraIds[start]}-${paraIds[end]}`);
      start = end = current;
    }
  }
  return result.join(", ");
};

export const getUrlQuote = (source: Ref | MultiRef): RenderQuote => {
  let current = "";
  const section = data[source.section]!;
  const res: [string, string][] = section.path.map((p) => {
    current = `${current}/${p[1]}`;
    return [
      simplifyLinkLabels[p[0]] || p[0].replace(/ \([^\)]*\)/, ""),
      current,
    ];
  });
  const paragraphs = Array.isArray(source.paragraph)
    ? source.paragraph
    : [source.paragraph];
  const paraIds = getParagraphIds(section.content);
  if (
    !Array.from({ length: paraIds.length }).every((_, i) =>
      paragraphs.includes(i)
    )
  ) {
    res.push([
      getParasString(paragraphs, paraIds),
      `${current}#${paraIds[Math.min(...paragraphs)]}`,
    ]);
  }

  if (res[1]![0] === "The Hidden Words") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  } else if (res[1]![0] === "The Summons of the Lord of Hosts") {
    res.splice(1, 1);
  } else if (res[1]![0] === "The Promulgation of Universal Peace") {
    res[3]![0] = res[3]![0].split(":")[0]!;
    res.splice(2, 1);
  } else if (res[1]![0] === "Tablets of the Divine Plan") {
    res[2]![0] = res[2]![0].split(":")[0]!;
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
  } else if (res[1]![0] === "Junior Youth Texts") {
    res.splice(1, 1);
  }
  if (res[0]![0] === "Ruhi Institute") {
    res.splice(2);
  }

  for (const chunk of res.slice(1)) {
    if (chunk[0].startsWith("The ")) chunk[0] = capitalise(chunk[0].slice(4));
  }

  return {
    path: res,
    author: section.prayer || section.meta || section.path[0]![0],
  };
};
