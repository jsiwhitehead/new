import { ScrollRestoration, useParams } from "react-router";

import getData from "../src/api";

import renderTree from "./Tree";
import { Column, Row, SizeContext, Text } from "./Utils";

const collapseSingleKeys = (
  tree: any,
  maxDepth: number
): [[string, string][], any] => {
  const path: [string, string][] = [];
  let current = tree;
  while (path.length < maxDepth) {
    const keys = Object.keys(current);
    if (keys.length !== 1) break;
    const [title, url] = JSON.parse(keys[0]!);
    path.push([title, `${(path[path.length - 1] || [])[1] || ""}/${url}`]);
    current = current[keys[0]!];
  }
  return [path, current];
};
const calculateUrlPath = (
  path: [string, string, number][],
  paragraphs: number[]
): [string, string][] => {
  let current = "";
  return [
    ...(path.map((p) => {
      current = `${current}/${p[1]}`;
      return [p[0], current];
    }) as [string, string][]),
    [`Para ${paragraphs[0]}`, `${current}#${paragraphs[0]}`],
  ];
};

const Breadcrumbs = ({
  path,
  size,
  justify = "flex-start",
}: {
  path: [string, string][];
  size: number;
  justify?: "flex-start" | "flex-end";
}) => {
  return (
    <Row
      gap={`${size * 1.2}px ${size * 0.6}px`}
      style={{
        flexWrap: "wrap",
        paddingLeft: justify === "flex-start" ? 30 : 0,
        justifyContent: justify,
      }}
    >
      {path.map((p, i) => (
        <Row
          gap={size * 0.6}
          style={{ marginLeft: justify === "flex-start" && i === 0 ? -30 : 0 }}
          key={i}
        >
          {i > 0 && (
            <svg
              style={{ flexShrink: 0, height: size * 0.6 }}
              viewBox="-0.5 -1 1.5 2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon points="-0.5,0.866 -0.5,-0.866 1.0,0.0" fill="#333" />
            </svg>
          )}
          <Text size={size} to={p[1]} style={{ color: "darkgreen" }}>
            {p[0]}
          </Text>
        </Row>
      ))}
    </Row>
  );
};

export default function App() {
  const { path1, path2, path3, path4, path5, path6, path7 } = useParams();
  const paramPath = [path1, path2, path3, path4, path5, path6, path7].filter(
    (p) => p
  ) as string[];
  const data = getData(...paramPath);

  const showContent =
    data.find(
      (d) =>
        paramPath.length === d.path.length &&
        paramPath.every((p, i) => d.path[i]![1] === p)
    ) ||
    [
      "bahaullah/hidden-words",
      "bahaullah/gleanings-writings-bahaullah",
    ].includes(paramPath.join("/"));

  const tree = {} as any;
  for (const d of data) {
    d.path.reduce((res, p) => {
      const key = JSON.stringify([p[0], p[1]]);
      return (res[key] = res[key] || {});
    }, tree);
  }

  const [path, nestedTree] = collapseSingleKeys(tree, paramPath.length);

  return (
    <SizeContext value={17}>
      <ScrollRestoration />
      <Column
        gap={20}
        style={{
          padding: "30px 10px 120px",
          maxWidth: "670px",
          margin: "0 auto",
        }}
      >
        <Text style={{ color: "darkred", fontWeight: "bold" }}>
          Bahá’í Explore
        </Text>

        <Breadcrumbs size={17} path={[["All", "/"], ...path]} />

        {Object.keys(nestedTree).length > 0 && (
          <div style={{ paddingLeft: 15 }}>
            {renderTree(nestedTree, path[path.length - 1]?.[1] || "")}
          </div>
        )}

        {showContent &&
          data.map((d, i) => {
            const allSpecial = d.content.every((d) => typeof d !== "string");
            const isFullQuote = d.content.map(
              (c) =>
                Array.isArray(c) &&
                c.every((p) => {
                  if (typeof p !== "string") return true;
                  return !/[a-z]/.test(
                    p
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLowerCase()
                  );
                })
            );
            const allFullQuotes = isFullQuote.every((a) => a);
            return (
              <Column gap={25} style={{ paddingTop: 30 }} key={i}>
                <Text
                  size={30}
                  style={{
                    fontWeight: "bold",
                    textAlign: "center",
                    paddingBottom: 10,
                  }}
                >
                  {d.path[d.path.length - 1]![0]}
                </Text>
                {d.content.map((c, i) => {
                  if (typeof c === "string") {
                    return (
                      <Text id={`${i + 1}`} key={i} style={{ textIndent: 20 }}>
                        {c}
                      </Text>
                    );
                  }
                  if ("type" in c) {
                    if (c.type === "break") {
                      return (
                        <Text
                          id={`${i + 1}`}
                          size={13}
                          key={i}
                          style={{ textAlign: "center", padding: "10px 0" }}
                        >
                          ﹡﹡﹡
                        </Text>
                      );
                    }
                    return (
                      <Text
                        id={`${i + 1}`}
                        key={i}
                        style={{
                          fontStyle:
                            c.type === "info" || c.type === "framing"
                              ? "italic"
                              : "normal",
                          textTransform:
                            c.type === "call" ? "uppercase" : "none",
                          textAlign: "justify",
                          textAlignLast: "center",
                          padding: allSpecial ? "0 20px" : "0 40px",
                        }}
                      >
                        {c.text}
                      </Text>
                    );
                  }
                  if (Array.isArray(c)) {
                    const sources = c.flatMap((p) =>
                      typeof p === "string" ? [] : [p]
                    );
                    const allSource =
                      isFullQuote[i] &&
                      new Set(sources.map((p) => JSON.stringify(p.path)))
                        .size === 1;
                    const inner = (
                      <Text
                        id={!allSource ? `${i + 1}` : undefined}
                        style={
                          isFullQuote[i]
                            ? { padding: allSource ? 0 : "0 20px" }
                            : { textIndent: 20 }
                        }
                        key={i}
                      >
                        {c.map((a, j) => {
                          if (typeof a === "string") {
                            return a;
                          }
                          return (
                            <span style={{ fontWeight: "bold" }} key={j}>
                              {a.quote}
                            </span>
                          );
                        })}
                      </Text>
                    );
                    if (!allSource) return inner;
                    return (
                      <Column
                        id={`${i + 1}`}
                        style={{ padding: allFullQuotes ? 0 : "0 20px" }}
                        gap={15}
                        key={i}
                      >
                        {inner}
                        <div style={{ maxWidth: 400, marginLeft: "auto" }}>
                          <Breadcrumbs
                            size={14}
                            justify="flex-end"
                            path={calculateUrlPath(
                              sources[0]!.path,
                              sources.map((s) => s.paragraph)
                            )}
                          />
                        </div>
                      </Column>
                    );
                  }
                  return (
                    <Text
                      id={`${i + 1}`}
                      key={i}
                      style={{
                        whiteSpace: "pre-wrap",
                        padding: allSpecial ? 0 : "0 70px",
                      }}
                    >
                      {c.lines
                        .slice(1)
                        .map((l, i) => c.text.slice(c.lines[i], l))
                        .join("\n")}
                    </Text>
                  );
                })}
              </Column>
            );
          })}
      </Column>
    </SizeContext>
  );
}
