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

export default function App() {
  const { path1, path2, path3, path4, path5, path6, path7 } = useParams();
  const paramPath = [path1, path2, path3, path4, path5, path6, path7].filter(
    (p) => p
  ) as string[];
  const data = getData(...paramPath);

  const single = data.find(
    (d) =>
      paramPath.length === d.path.length &&
      paramPath.every((p, i) => d.path[i]![1] === p)
  );

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
          padding: "30px 10px 50px",
          maxWidth: "670px",
          margin: "0 auto",
        }}
      >
        <Text to="/" style={{ color: "darkred" }}>
          Bahá’í Explore
        </Text>

        {path.length > 0 && (
          <Row gap="20px 10px" style={{ flexWrap: "wrap", paddingLeft: 30 }}>
            {path.map((p, i) => (
              <Row gap={10} style={{ marginLeft: i === 0 ? -30 : 0 }} key={i}>
                {i > 0 && (
                  <svg
                    style={{ flexShrink: 0 }}
                    height="10"
                    viewBox="-0.5 -1 1.5 2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polygon
                      points="-0.5,0.866 -0.5,-0.866 1.0,0.0"
                      fill="#333"
                    />
                  </svg>
                )}
                <Text to={p[1]} style={{ color: "darkgreen" }}>
                  {p[0]}
                </Text>
              </Row>
            ))}
          </Row>
        )}
        {Object.keys(nestedTree).length > 0 && (
          <div style={{ paddingLeft: 15 }}>
            {renderTree(nestedTree, path[path.length - 1]?.[1] || "")}
          </div>
        )}

        {single &&
          data.map((d, i) => {
            const allSpecial = d.content.every((d) => typeof d !== "string");
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
                      <Text key={i} style={{ textIndent: 20 }}>
                        {c}
                      </Text>
                    );
                  }
                  if ("type" in c) {
                    if (c.type === "break") {
                      return (
                        <Text key={i} style={{ textAlign: "center" }}>
                          ***
                        </Text>
                      );
                    }
                    return (
                      <Text
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
                  return (
                    <Text
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
