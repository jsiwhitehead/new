import fs from "fs-extra";
import * as prettier from "prettier";

export const prettify = (
  s: string,
  format: prettier.BuiltInParserName
): Promise<string> => prettier.format(s, { parser: format });

export const readText = (category: string, id: string): Promise<string> =>
  fs.promises.readFile(`./data/${category}/${id}.txt`, "utf-8");

export const readJSON = async <T = unknown>(
  category: string,
  id: string
): Promise<T> => {
  const fileContent = await fs.promises.readFile(
    `./data/${category}/${id}.json`,
    "utf-8"
  );
  return JSON.parse(fileContent) as T;
};

export const writeText = (
  category: string,
  id: string,
  data: string
): Promise<void> =>
  fs.promises.writeFile(`./data/${category}/${id}.txt`, data, "utf-8");

export const writeJSON = async <T>(
  category: string,
  id: string,
  data: T
): Promise<void> => {
  const prettyData = await prettify(JSON.stringify(data, null, 2), "json");
  return fs.promises.writeFile(
    `./data/${category}/${id}.json`,
    prettyData,
    "utf-8"
  );
};
