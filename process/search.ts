import { readJSON, writeJSON, writeText } from "../utils/files";
import stem from "../utils/searchStem";
import type { Section } from "../utils/types";
import { getText } from "../utils/utils";

const data = (await readJSON("", "data")) as Section[];

const getLayersString = (values: number[]) => {
  const res = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i]! > 0) {
      res.push(`${i}=${values[i]!}`);
    }
  }
  return res.join(",");
};

let totalParas = 0;
const paraLengths: string[][] = [];
const searchIndex = new Map<string, string[]>();
const tokenCounts: Record<string, number> = {};
data.forEach(({ path, content, quoted }, section) => {
  console.log(path.map((p) => p[0]).join(", "));
  paraLengths[section] = content.map((_, paragraph) => {
    totalParas++;
    const key = `${section}:${paragraph}`;
    const text = getText(data, { section, paragraph });
    const words = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/([‑— ]+)/g);
    let current = 0;
    const tokens: { token: string; score: number }[] = [];
    for (const word of words) {
      const token = stem(word.replace(/’s$/g, "").replace(/[^a-z0-9]/g, ""));
      if (token) {
        const score = ((quoted || {})[paragraph] || []).filter(
          (q) => q.start < current + word.length && current < q.end
        ).length;
        tokens.push({ token, score });
      }
      current += word.length;
    }

    for (const token of [...new Set(tokens.map((t) => t.token))]) {
      const scores = tokens
        .filter((t) => t.token === token)
        .map((t) => t.score);
      const counts = Array.from<number>({
        length: Math.max(...scores) + 1,
      }).fill(0);
      for (const score of scores) counts[score]!++;
      let countCurr = 0;
      for (let i = counts.length - 1; i >= 0; i--) {
        if (counts[i]! > 0) {
          counts[i]! = countCurr = counts[i]! * (i + 1) + countCurr;
        }
      }
      let v = key;
      if (counts[0]! > 1 || counts.length > 1) {
        v += `,${getLayersString(counts)}`;
      }
      searchIndex.set(token, [...(searchIndex.get(token) || []), v]);
      tokenCounts[token] = (tokenCounts[token] || 0) + 1;
    }

    const lengths = Array.from<number>({
      length: Math.max(...tokens.map((t) => t.score)) + 1,
    }).fill(0);
    for (const token of tokens) lengths[token.score]!++;
    let lenCurr = 0;
    for (let i = lengths.length - 1; i >= 0; i--) {
      if (lengths[i]! > 0) {
        lengths[i]! = lenCurr = lengths[i]! * (i + 1) + lenCurr;
      }
    }
    return getLayersString(lengths);
  });
});

const sortedTokens = Object.keys(tokenCounts).sort(
  (a, b) => tokenCounts[b]! - tokenCounts[a]!
);
const searchIndexData = sortedTokens
  .map((k) => `${k}_${searchIndex.get(k)!.join("|")}`)
  .join("\n");
await writeJSON("", "lengths", { total: totalParas, lengths: paraLengths });
await writeText("", "search", searchIndexData);

// import { promises as fs } from "fs";

// import getTokens from "./tokens.js";
// import { compileDoc, getDocByKey } from "./utils.js";

// import data from "./data.json" assert { type: "json" };

// const french = [
//   /“C’est un des.*contempler,”/,
//   /“et c’est aussi.*du prochain.”/,
//   "“Un fait étrange, unique dans les annales de l’humanité,”",
//   "“Prodige de science, mais aussi prodige de beauté”",
//   "“Des milliers de martyrs,”",
//   "“Les Apôtres,”",
//   /“sont accourus.*rán.”/,
//   "“J’avoue même,”",
//   /“que, si je voyais.*de ces grands avantages.”/,
//   /“L’opinion générale.*âmes a peu près.”/,
//   /“. . . Le Bábisme a pris.*grandes religions.”/,
//   /“La Behá’isme est.*ne craignez rien.”/,
//   /“Ce fut une.*notre Grand Gazi\?’”/,
// ];

// const getParts = (para, removeFrench) => {
//   if (para.section) return [];
//   if (!para.lines) {
//     if (!removeFrench) return para.parts;
//     return para.parts.map((p) => ({
//       ...p,
//       text: french.reduce((res, f) => res.replace(f, ""), p.text),
//     }));
//   }
//   return para.lines.reduce(
//     (res, x) => (res.length === 0 ? x : [...res, { text: " " }, ...x]),
//     []
//   );
// };

// const fullStems = {};
// const getStemWord = (stem) => {
//   const opts = Object.keys(fullStems[stem]);
//   const counts = opts.map((o) => fullStems[stem][o]);
//   const max = Math.max(...counts);
//   return opts[counts.findIndex((c) => c === max)];
// };

// const itemFactors = {};
// const itemLengths = {};
// const tokenPairs = {
//   "All Writings and Prayers": new Map(),
//   "All Prayers": new Map(),
//   "Bahá’u’lláh": new Map(),
//   "The Báb": new Map(),
//   "‘Abdu’l‑Bahá": new Map(),
//   "Shoghi Effendi": new Map(),
//   "The Universal House of Justice": new Map(),
// };
// const tokenTotals = {
//   "All Writings and Prayers": {},
//   "All Prayers": {},
//   "Bahá’u’lláh": {},
//   "The Báb": {},
//   "‘Abdu’l‑Bahá": {},
//   "Shoghi Effendi": {},
//   "The Universal House of Justice": {},
// };
// let totalParaCount = 0;

// const updateTokens = (distinct, key) => {
//   for (let i = 0; i < distinct.length; i++) {
//     if (!tokenTotals[key][distinct[i]]) tokenTotals[key][distinct[i]] = 0;
//     tokenTotals[key][distinct[i]]++;
//     for (let j = i + 1; j < distinct.length; j++) {
//       const pairKey = `${distinct[i]}_${distinct[j]}`;
//       if (!/[0A-Z]/.test(pairKey)) {
//         tokenPairs[key].set(pairKey, (tokenPairs[key].get(pairKey) || 0) + 1);
//       }
//     }
//   }
// };

// const getDateValue = (years) => {
//   if (years[0] !== years[1] || !`${years[0]}`.includes(".")) {
//     return new Date((years[0] + years[1]) / 2, 0, 1);
//   }
//   const [y, x] = `${years[0]}`.split(".");
//   const m = x.slice(0, 2);
//   const d = x.slice(2, 4);
//   return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
// };
// const getDateFactor = (years) => {
//   const diff =
//     (new Date() - getDateValue(years)) / (1000 * 60 * 60 * 24 * 365.25);
//   return 0.6 + 2 / (diff + 5);
// };

// const searchIndex = new Map();
// const counts = {};
// const scoredParas = [];
// const specialPrayers = {};
// const updateIndex = (
//   docIndex,
//   paraIndex,
//   parts,
//   paraCitations,
//   author,
//   isPrayer
// ) => {
//   if (parts.length > 0) {
//     totalParaCount++;
//     const key = `${docIndex}_${paraIndex}`;
//     const scores = {};
//     const levels = {};
//     const allTokens = [];
//     const tokens = [];
//     const maxCitation = Math.round(
//       Math.max(...parts.map((part) => part.allCitations || 0)) * (1 / 2)
//     );
//     if (paraCitations) {
//       scoredParas.push({
//         doc: docIndex,
//         para: paraIndex,
//         score: paraCitations,
//         level: maxCitation,
//       });
//     }
//     for (const part of parts) {
//       const partTokens = getTokens(part.text, (word, stem) => {
//         if (!fullStems[stem]) fullStems[stem] = {};
//         fullStems[stem][word] = (fullStems[stem][word] || 0) + 1;
//       }).map((token) => ({
//         token,
//         citations: (part.citations || 0) + 2,
//         level: Math.min(part.allCitations || 0, maxCitation),
//       }));
//       allTokens.push(...partTokens);
//       if (!part.doc) tokens.push(...partTokens);
//     }
//     if (isPrayer && allTokens.some((t) => /[0A-Z]/.test(t.token))) {
//       specialPrayers[docIndex] = true;
//     }
//     const doubleTokens = tokens.slice(0, -1).flatMap((t1, i) => {
//       const t2 = tokens[i + 1];
//       const t = {
//         token: [t1.token, t2.token].sort().join("_"),
//         citations: t1.citations + t2.citations,
//         level: 0,
//       };
//       if (/[0A-Z]/.test(t.token)) return [];
//       return [t];
//     });
//     for (const t of [...tokens, ...doubleTokens]) {
//       if (counts[t.token] === undefined) counts[t.token] = 0;
//       counts[t.token]++;
//       if (scores[t.token] === undefined) scores[t.token] = 0;
//       scores[t.token] += t.citations;
//       if (levels[t.token] === undefined) levels[t.token] = t.level;
//       levels[t.token] = Math.min(t.level, levels[t.token]);
//     }

//     const distinct = [...new Set(tokens.map((t) => t.token))].sort();
//     updateTokens(distinct, "All Writings and Prayers");
//     if (tokenTotals[author]) updateTokens(distinct, author);
//     if (isPrayer) updateTokens(distinct, "All Prayers");

//     for (const t of Object.keys(scores)) {
//       let v = `${key}`;
//       if (scores[t] !== 2) v += `:${scores[t]}`;
//       if (levels[t]) v += `|${levels[t]}`;
//       searchIndex.set(t, [...(searchIndex.get(t) || []), v]);
//     }
//     itemLengths[docIndex][paraIndex] = {};
//     for (let lev = 0; lev <= maxCitation; lev++) {
//       itemLengths[docIndex][paraIndex][lev] = allTokens.filter(
//         (t) => t.level >= lev
//       ).length;
//     }
//   } else {
//     itemLengths[docIndex][paraIndex] = { 0: 0 };
//   }
// };

// const docRefs = [];
// const docScores = [];

// data.forEach(({ id }, index) => {
//   console.log(id);
//   docRefs[index] = {};
//   const doc = compileDoc(data, index, false, (refDoc) => {
//     docRefs[index][refDoc] = true;
//   });
//   let maxCitations = 0;
//   itemLengths[index] = [];
//   doc.paragraphs.forEach((para, i) => {
//     if (!para.quote) {
//       maxCitations = Math.max(maxCitations, para.citations || 0);
//       updateIndex(
//         index,
//         i,
//         getParts(
//           para,
//           id.startsWith("shoghi-effendi-god-passes-by-002") ||
//             id.startsWith("shoghi-effendi-bahai-administration")
//         ),
//         para.citations,
//         doc.author,
//         doc.type === "Prayer"
//       );
//       if (doc.epoch && doc.author !== "Shoghi Effendi") {
//         itemFactors[index] = getDateFactor(doc.years);
//         if (doc.author !== "The Universal House of Justice") {
//           itemFactors[index] *= 0.7;
//         }
//       }
//     } else {
//       itemLengths[index][i] = {
//         0: getParts(para).flatMap((part) => getTokens(part.text)).length,
//       };
//     }
//   });
//   docScores.push({ index, score: maxCitations });
// });
// // for (const k of Object.keys(counts)) {
// //   // if (counts[k] === 1) delete counts[k];
// //   if (k.includes("_") && counts[k] > 50) {
// //     // console.log(k, counts[k]);
// //     searchIndex.delete(k);
// //     // delete counts[k];
// //   }
// // }

// const ordered = [];
// const covered = {};
// for (const { index } of docScores.sort(
//   (a, b) => b.score - a.score || a.index - b.index
// )) {
//   for (const d of [
//     ...Object.keys(docRefs[index]).map((r) => parseInt(r, 10)),
//     index,
//   ]) {
//     if (!covered[d]) ordered.push(d);
//     covered[d] = true;
//   }
// }

// const sortedTokens = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

// const searchIndexData = sortedTokens
//   .map((k) => {
//     let res = "";
//     res += `${k}=${searchIndex.get(k).join(",")}`;
//     if (counts[k] > 1) res += `=${counts[k]}`;
//     return res;
//   })
//   .join("\n");

// const stemWords = {};
// const getPairs = (filter) => {
//   const allPairs = {};
//   for (const [key, count] of tokenPairs[filter].entries()) {
//     if (count > 1) {
//       const [k1, k2] = key.split("_");
//       const observed = count / totalParaCount;
//       const expected =
//         (tokenTotals[filter][k1] / totalParaCount) *
//         (tokenTotals[filter][k2] / totalParaCount);
//       // const score = count / (tokenTotals[filter][k1] + tokenTotals[filter][k2]);
//       const score = Math.log2(Math.pow(observed, 3) / expected);
//       // const score = (observed - expected) / Math.sqrt(observed);
//       if (!allPairs[k1]) allPairs[k1] = [];
//       allPairs[k1].push({
//         key: k2,
//         score,
//         // score: count / (tokenTotals[filter][k1] + tokenTotals[filter][k2]),
//       });
//       if (!allPairs[k2]) allPairs[k2] = [];
//       allPairs[k2].push({
//         key: k1,
//         score,
//         // score: count / (tokenTotals[filter][k1] + tokenTotals[filter][k2]),
//       });
//     }
//   }
//   const topPairs = Object.keys(allPairs)
//     .sort()
//     .reduce((res, k) => {
//       const items = allPairs[k]
//         .sort((a, b) => b.score - a.score)
//         // .filter((a, i) => i < 5 || a.score > 0.1);
//         .slice(0, 5);
//       // .map((x) => ({ ...x, score: Math.sqrt(x.score) }));
//       if (items.length === 0) return res;
//       for (const item of items) {
//         if (!stemWords[item.key]) stemWords[item.key] = getStemWord(item.key);
//       }
//       return { ...res, [k]: items };
//     }, {});
//   return sortedTokens
//     .filter((t) => topPairs[t])
//     .map(
//       (t) =>
//         `${t}=${topPairs[t]
//           // .map(({ key, score }) => `${key}:${Math.round(score * 1000)}`)
//           .map(({ key, score }) => `${key}:${Math.round((score + 30) * 20)}`)
//           // .map(({ key, score }) => `${key}:${score}`)
//           .join(",")}`
//     )
//     .join("\n");
// };
// const pairData = [
//   "All Writings and Prayers",
//   "All Prayers",
//   "Bahá’u’lláh",
//   "The Báb",
//   "‘Abdu’l‑Bahá",
//   "Shoghi Effendi",
//   "The Universal House of Justice",
// ]
//   .map((k) => `${k}\n${getPairs(k)}`)
//   .join("\n");

// const stemKeys = Object.keys(fullStems).sort();

// const lenFunc = (x) => 1 / (1 + Math.exp(x / 60 - 5));

// await Promise.all([
//   fs.writeFile(
//     "./data/stem/stems.txt",
//     stemKeys
//       .filter((k) => !k.includes("‑"))
//       .map(
//         (stem) => `${stem}: ${Object.keys(fullStems[stem]).sort().join(", ")}`
//       )
//       .join("\n\n")
//   ),
//   fs.writeFile(
//     "./public/stemWords.txt",
//     Object.keys(stemWords)
//       .sort()
//       .map((k) => `${k}=${stemWords[k]}`)
//       .join("\n")
//   ),
//   fs.writeFile(`./public/pairs.txt`, pairData, "utf-8"),
//   fs.writeFile(
//     `./public/data.txt`,
//     ordered
//       .map((d) => `${d}:${JSON.stringify(data[d])}`)
//       .join("\n")
//       .normalize("NFD")
//       .replace(/\u0323/g, "")
//       .normalize("NFC"),
//     "utf-8"
//   ),
//   fs.writeFile(`./public/search.txt`, searchIndexData.trim(), "utf-8"),
//   fs.writeFile(
//     `./data/json/factors.json`,
//     JSON.stringify(itemFactors),
//     "utf-8"
//   ),
//   fs.writeFile(
//     `./data/json/lengths.json`,
//     JSON.stringify(itemLengths),
//     "utf-8"
//   ),
//   fs.writeFile(
//     `./public/cited.txt`,
//     scoredParas
//       .reduce((res, { doc, para, score, level }) => {
//         if (!res[doc]) res[doc] = {};
//         res[doc][para] = [score, level];
//         return res;
//       }, [])
//       .map((d) => JSON.stringify(d))
//       .join("\n"),
//     "utf-8"
//   ),
//   fs.writeFile(
//     `./data/json/specialPrayers.json`,
//     JSON.stringify(
//       Object.keys(specialPrayers)
//         .map((p) => parseInt(p, 10))
//         .sort((a, b) => a - b)
//     ),
//     "utf-8"
//   ),
//   fs.writeFile(
//     `./data/json/info.json`,
//     JSON.stringify(data.map((d) => ({ type: d.type, author: d.author }))),
//     "utf-8"
//   ),
//   fs.writeFile(
//     `./public/stems.txt`,
//     Object.keys(fullStems)
//       .filter((s) => !s.includes("_") && !/[0A-Z]/.test(s))
//       .sort()
//       .join("\n"),
//     "utf-8"
//   ),
//   fs.writeFile(
//     `./data/json/initial.json`,
//     JSON.stringify(
//       scoredParas
//         .map((p) => ({
//           ...p,
//           score:
//             (p.score || 0) *
//             (itemFactors[p.doc] || 1) *
//             lenFunc(itemLengths[p.doc][p.para][p.level]),
//         }))
//         .sort((a, b) => b.score - a.score || a.doc - b.doc || a.para - b.para)
//         .slice(0, 50)
//         .map((p) =>
//           getDocByKey(data, p.doc, p.para, p.para, { [p.para]: p.level })
//         )
//     ),
//     "utf-8"
//   ),
// ]);
