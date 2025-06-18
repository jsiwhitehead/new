import fs from "fs-extra";
import * as prettier from "prettier";

export const prettify = (
  s: string,
  format: prettier.BuiltInParserName
): Promise<string> => prettier.format(s, { parser: format });

export const readText = (category: string, id: string): Promise<string> =>
  fs.promises.readFile(`./data/${category}/${id}.txt`, "utf-8");

export const readJSON = async (category: string, id: string): Promise<any> => {
  try {
    const fileContent = await fs.promises.readFile(
      category ? `./data/${category}/${id}.json` : `./data/${id}.json`,
      "utf-8"
    );
    return JSON.parse(fileContent);
  } catch {
    return null;
  }
};

export const writeText = (
  category: string,
  id: string,
  data: string
): Promise<void> =>
  fs.promises.writeFile(
    category ? `./data/${category}/${id}.txt` : `./data/${id}.txt`,
    data,
    "utf-8"
  );

export const writeJSON = async <T>(
  category: string,
  id: string,
  data: T
): Promise<void> => {
  const prettyData = await prettify(JSON.stringify(data, null, 2), "json");
  return fs.promises.writeFile(
    category ? `./data/${category}/${id}.json` : `./data/${id}.json`,
    prettyData,
    "utf-8"
  );
};
