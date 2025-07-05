import fs from "fs-extra";
import * as prettier from "prettier";

export const prettify = (s: string, format: prettier.BuiltInParserName) =>
  prettier.format(s, { parser: format });

export const emptyDir = (dir: string) => fs.emptyDir(dir);

export const readText = (category: string, id: string) =>
  fs.promises.readFile(`./data/${category}/${id}.txt`, "utf-8");

export const readJSON = async (category: string, id: string) => {
  try {
    return JSON.parse(
      await fs.promises.readFile(
        category ? `./data/${category}/${id}.json` : `./data/${id}.json`,
        "utf-8"
      )
    );
  } catch {
    return null;
  }
};

export const writeText = (category: string, id: string, data: string) =>
  fs.promises.writeFile(
    category ? `./data/${category}/${id}.txt` : `./data/${id}.txt`,
    data,
    "utf-8"
  );

export const writeJSON = async <T>(category: string, id: string, data: T) =>
  fs.promises.writeFile(
    category ? `./data/${category}/${id}.json` : `./data/${id}.json`,
    await prettify(JSON.stringify(data, null, 2), "json"),
    "utf-8"
  );
