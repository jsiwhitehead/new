import { useState, useEffect, useRef } from "react";
import { Link, ScrollRestoration, useParams } from "react-router";

import renderTree from "./Tree";
import { Column, Row, SizeContext, Text } from "./Utils";

import type { RenderSection } from "../src/server";

const showQuoted = false;

const authorColours = {
  "The Báb": "#27ae60",
  "Bahá’u’lláh": "#c0392b",
  "‘Abdu’l‑Bahá": "#2980b9",
  Prayers: "#8e44ad",
  "Shoghi Effendi": "#f39c12",
  "The Universal House of Justice": "#4834d4",
  Documents: "#8e44ad",
  "Ruhi Institute": "#8e44ad",
  Compilations: "#8e44ad",
  Books: "#8e44ad",
} as Record<string, string>;

const Breadcrumbs = ({
  path,
  size,
}: {
  path: [string, string][];
  size: number;
}) => {
  return (
    <Row
      gap={`${size * 1.2}px ${size * 0.6}px`}
      style={{
        flexWrap: "wrap",
        paddingLeft: 30,
      }}
    >
      {path.map((p, i) => (
        <Row gap={size * 0.6} style={{ marginLeft: i === 0 ? -30 : 0 }} key={i}>
          {i > 0 && (
            <svg
              style={{ flexShrink: 0, height: size * 0.6 }}
              viewBox="-0.5 -1 1.5 2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon points="-0.5,0.866 -0.5,-0.866 1.0,0.0" fill="#333" />
            </svg>
          )}
          <Text size={size} to={p[1]}>
            {p[0]}
          </Text>
        </Row>
      ))}
    </Row>
  );
};

const AppInner = ({
  allData: { data, path, tree },
}: {
  allData: {
    data: RenderSection[];
    path: [string, string][];
    tree: any;
  };
}) => {
  return (
    <Column gap={20}>
      <Breadcrumbs size={17} path={[["All", "/"], ...path]} />

      {Object.keys(tree).length > 0 && (
        <div style={{ paddingLeft: 15 }}>
          {renderTree(tree, path[path.length - 1]?.[1] || "")}
        </div>
      )}

      {data.map((d, i) => {
        const allSpecial = d.content.every((d) => d.type !== "normal");
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
              if (c.type === "break") {
                return (
                  <Text
                    size={13}
                    key={i}
                    style={{ textAlign: "center", padding: "10px 0" }}
                  >
                    ﹡﹡﹡
                  </Text>
                );
              }
              const allQuote = c.parts.every((line) =>
                line.every((p) => p.quote)
              );
              const mainText = (
                <Text
                  id={c.paragraph}
                  key={i}
                  style={
                    allQuote
                      ? {
                          fontWeight: "bold",
                          fontStyle: c.type === "info" ? "italic" : "normal",
                          textTransform:
                            c.type === "call" ? "uppercase" : "none",
                          padding: c.quote ? "" : "0 20px",
                        }
                      : c.type === "normal"
                        ? {
                            textIndent: 20,
                          }
                        : c.type === "info"
                          ? {
                              fontStyle: "italic",
                              textAlign: "justify",
                              textAlignLast: "center",
                              padding: allSpecial ? "0 20px" : "0 40px",
                            }
                          : c.type === "call"
                            ? {
                                textTransform: "uppercase",
                                textAlign: "justify",
                                textAlignLast: "center",
                                padding: allSpecial ? "0 20px" : "0 40px",
                              }
                            : c.type === "lines"
                              ? {
                                  padding: allSpecial ? 0 : "0 70px",
                                }
                              : {
                                  fontStyle: "italic",
                                }
                  }
                >
                  {c.parts.flatMap((line, i) => {
                    const res = line.map((l, j) => {
                      if (typeof l === "string") return l;
                      const inner = (
                        <span
                          style={{
                            padding: "2.4px 0",
                            fontWeight: l.quote ? "bold" : "inherit",
                            background:
                              l.quoted > 0
                                ? `rgb(255, ${240 - l.quoted * 10}, ${240 - l.quoted * 10})`
                                : "",
                          }}
                          key={`${i}-${j}`}
                        >
                          {l.text}
                        </span>
                      );
                      if (
                        l.quote &&
                        l.quote !== true &&
                        JSON.stringify(l.quote) !==
                          JSON.stringify(
                            line
                              .slice(j + 1)
                              .find((x) => x.quote && x.quote !== true)?.quote
                          )
                      ) {
                        return (
                          <span
                            style={{
                              padding: "2.4px 0",
                              background:
                                l.quoted > 0
                                  ? `rgb(255, ${240 - l.quoted * 10}, ${240 - l.quoted * 10})`
                                  : "",
                            }}
                            key={`${i}-${j}`}
                          >
                            {inner}{" "}
                            {l.quote.map(([label, url], k) => (
                              <span
                                style={{
                                  display: "inline-block",
                                  textIndent: 0,
                                }}
                                key={k}
                              >
                                {k === 0 && (
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      fontStyle: "italic",
                                      color:
                                        authorColours[(l as any).quote[0][0]],
                                      opacity: 0.5,
                                      fontSize: 14,
                                    }}
                                  >
                                    {"["}
                                  </span>
                                )}
                                {k > 0 && (
                                  <svg
                                    style={{
                                      flexShrink: 0,
                                      height: 14 * 0.6,
                                      padding: `0 ${14 * 0.6}px`,
                                      opacity: 0.5,
                                    }}
                                    viewBox="-0.5 -1 1.5 2"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <polygon
                                      points="-0.5,0.866 -0.5,-0.866 1.0,0.0"
                                      fill="#333"
                                    />
                                  </svg>
                                )}
                                <Link
                                  to={url}
                                  style={{
                                    fontWeight: "bold",
                                    fontStyle: "italic",
                                    color:
                                      authorColours[(l as any).quote[0][0]],
                                    display: "inline-block",
                                    textIndent: 0,
                                    opacity: 0.5,
                                    fontSize: 14,
                                  }}
                                >
                                  {label}
                                </Link>
                              </span>
                            ))}
                            <span
                              style={{
                                fontWeight: "bold",
                                fontStyle: "italic",
                                color: authorColours[(l as any).quote[0][0]],
                                opacity: 0.5,
                                fontSize: 14,
                              }}
                            >
                              {"]"}
                            </span>
                          </span>
                        );
                      }
                      return inner;
                    });
                    return i > 0 ? [<br key={`${i}`} />, ...res] : [...res];
                  })}
                </Text>
              );

              const main = !c.quote ? (
                mainText
              ) : (
                <Column gap={11.5} key={i} style={{ padding: "0 20px" }}>
                  {mainText}
                  <Row
                    gap={`${11.5}px ${14 * 0.6}px`}
                    style={{
                      flexWrap: "wrap",
                      maxWidth: 400,
                      marginLeft: "auto",
                      justifyContent: "flex-end",
                      opacity: 0.5,
                    }}
                  >
                    {c.quote.map((p, j) => (
                      <Row gap={14 * 0.6} key={j}>
                        {j > 0 && (
                          <svg
                            style={{ flexShrink: 0, height: 14 * 0.6 }}
                            viewBox="-0.5 -1 1.5 2"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <polygon
                              points="-0.5,0.866 -0.5,-0.866 1.0,0.0"
                              fill="#333"
                            />
                          </svg>
                        )}
                        <Text
                          size={14}
                          to={p[1]}
                          style={{
                            color: authorColours[(c as any).quote[0][0]],
                          }}
                        >
                          {p[0]}
                        </Text>
                      </Row>
                    ))}
                  </Row>
                </Column>
              );

              if (!c.quoted || !showQuoted) return main;
              return (
                <Column gap={25} key={i}>
                  {main}
                  {c.quoted.map((q, j) => (
                    <Row
                      key={j}
                      gap={`${11.5}px ${14 * 0.6}px`}
                      style={{
                        flexWrap: "wrap",
                        maxWidth: 400,
                        opacity: 0.5,
                        paddingLeft: 30,
                      }}
                    >
                      {q.map((p, k) => (
                        <Row
                          gap={14 * 0.6}
                          style={{ marginLeft: k === 0 ? -30 : 0 }}
                          key={k}
                        >
                          {k > 0 && (
                            <svg
                              style={{ flexShrink: 0, height: 14 * 0.6 }}
                              viewBox="-0.5 -1 1.5 2"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <polygon
                                points="-0.5,0.866 -0.5,-0.866 1.0,0.0"
                                fill="#333"
                              />
                            </svg>
                          )}
                          <Text
                            size={14}
                            to={p[1]}
                            style={{
                              color: authorColours[(q as any)[0][0]],
                            }}
                          >
                            {p[0]}
                          </Text>
                        </Row>
                      ))}
                    </Row>
                  ))}
                </Column>
              );
            })}
          </Column>
        );
      })}
    </Column>
  );
};

export default function App() {
  const params = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [allData, setAllData] = useState(
    null as {
      data: RenderSection[];
      path: [string, string][];
      tree: any;
    } | null
  );
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null as any);

  useEffect(() => {
    const { path1, path2, path3, path4, path5, path6, path7 } = params;
    const paramPath = [path1, path2, path3, path4, path5, path6, path7].filter(
      (p) => p
    ) as string[];

    const debounceTimeout = setTimeout(() => {
      // Abort previous fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const fetchData = async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `http://localhost:8000/api/${encodeURIComponent(
              JSON.stringify({
                path: paramPath,
                search: searchTerm,
              })
            )}`,
            { signal: controller.signal }
          );
          setAllData(await res.json());
        } catch (error) {
          if ((error as any).name !== "AbortError") {
            console.error("Fetch error:", error);
          }
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, params]);

  console.log(allData);

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
        <Text to="/" style={{ color: "darkred", fontWeight: "bold" }}>
          Bahá’í Explore
        </Text>

        <input
          type="text"
          value={searchTerm}
          placeholder="Search..."
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {allData && <AppInner allData={allData} />}
      </Column>
    </SizeContext>
  );
}
