import baseData from "../data/data.json";

const data = baseData as Section[];

import type { Section } from "./structure";

export default function getData(...urlPath: string[]): Section[] {
  return data.filter(
    (d) => !d.meta && urlPath.every((p, i) => d.path[i]?.[1] === p)
  );
}
