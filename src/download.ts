import fs from "fs-extra";
import * as cheerio from "cheerio";
import type { ChildNode, Element } from "domhandler";

import { writeText } from "./utils";
import sources from "./sources";

const inline = [
  "span",
  "wbr",
  "u",
  "b",
  "i",
  "em",
  "strong",
  "sub",
  "cite",
  "br",
];

const fetchHtml = async (url: string): Promise<cheerio.CheerioAPI> => {
  while (true) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      return cheerio.load(text);
    } catch (error) {
      console.log(error);
    }
  }
};

const getText = (root: Element): string => {
  let result = "";
  const walk = (el: ChildNode) => {
    if (el.type === "text") {
      result += el.data || "";
    } else if (el.type === "tag") {
      if (el.name === "br") {
        result += " ";
      } else if (el.name === "hr") {
        result += "\n***\n";
      } else if (!["a", "script", "sup", "nav"].includes(el.name)) {
        if (!inline.includes(el.name)) result += "\n";
        if (el.name === "ul") result += "+ ";
        el.children.forEach(walk);
      }
    }
  };
  root.children.forEach(walk);
  return result
    .replace(/[^\S\n]+/g, " ")
    .replace(/\s*\n+\s*/g, "\n\n")
    .trim();
};

(async () => {
  fs.emptyDirSync("./data/download");

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        if (id !== "the-universal-house-of-justice-messages") {
          const $ = await fetchHtml(
            `https://www.bahai.org/library/${
              [
                "official-statements-commentaries",
                "publications-individual-authors",
              ].includes(author)
                ? "other-literature"
                : "authoritative-texts"
            }/${author}/${file}/${
              file === "additional-tablets-extracts-talks"
                ? `${file}-abdul-baha`
                : file
            }.xhtml`
          );
          const body = $("body").get(0);
          if (body) {
            await writeText("download", id, getText(body));
          }
        }
      })
    );
  }

  const $messages = await fetchHtml(
    "https://www.bahai.org/library/authoritative-texts/the-universal-house-of-justice/messages/"
  );

  const messageRows = $messages("tbody > tr[id]").toArray().reverse();

  const messages = await Promise.all(
    messageRows.map(async (row) => {
      const id = row.attribs["id"];
      const tds = cheerio.load(row)("td").toArray();
      const [title, addressee, summary] = tds.map((td) =>
        cheerio.load(td)("td").text().trim()
      );

      const $ = await fetchHtml(
        `https://www.bahai.org/library/authoritative-texts/the-universal-house-of-justice/messages/${id}/${id}.xhtml`
      );
      const body = $("body").get(0);
      const text = body ? getText(body) : "";
      return ["#", id, title, addressee, summary, "", text].join("\n");
    })
  );

  await writeText(
    "download",
    "the-universal-house-of-justice-messages",
    messages.join("\n\n")
  );
})();
