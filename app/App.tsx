import { Fragment, useState, useEffect } from "react";
import {
  Link,
  ScrollRestoration,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router";

import type { RenderContent, RenderQuote } from "../src/server";

import renderTree from "./Tree";
import { Column, Row, SizeContext, Text } from "./Utils";

const showQuoted = false;
const showQuotedSources = false;
const showInlineSources = true;

const authorColours = {
  "The Báb": "#27ae60",
  "Bahá’u’lláh": "#c0392b",
  "‘Abdu’l‑Bahá": "#2980b9",
  Prayers: "#8e44ad",
  "Shoghi Effendi": "#f39c12",
  "The Universal House of Justice": "#4834d4",
  Documents: "#8e44ad",
  Compilations: "#8e44ad",
  Books: "#8e44ad",
  Stories: "#8e44ad",
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

const InlineQuote = ({ quote }: { quote: RenderQuote }) =>
  !showInlineSources ? null : (
    <Fragment>
      {quote.path.map(([label, url], k) => (
        <span
          style={{
            display: "inline-block",
            textIndent: 0,
            fontWeight: "bold",
            fontStyle: "italic",
            color: authorColours[quote.author],
            opacity: 0.5,
            fontSize: 14,
          }}
          key={k}
        >
          {k === 0 && <span>{"["}</span>}
          {k > 0 && (
            <svg
              style={{
                flexShrink: 0,
                height: 14 * 0.6,
                padding: `0 ${14 * 0.6}px`,
              }}
              viewBox="-0.5 -1 1.5 2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon points="-0.5,0.866 -0.5,-0.866 1.0,0.0" fill="#333" />
            </svg>
          )}
          <Link
            to={quote.author === "Ruhi Institute" ? "" : url}
            style={{ display: "inline-block", textIndent: 0 }}
          >
            {label}
          </Link>
        </span>
      ))}
      <span
        style={{
          fontWeight: "bold",
          fontStyle: "italic",
          color: authorColours[quote.author],
          opacity: 0.5,
          fontSize: 14,
        }}
      >
        {"]"}
      </span>
    </Fragment>
  );

const BlockQuote = ({ quote, left }: { quote: RenderQuote; left?: true }) => (
  <Row
    gap={`${11.5}px ${14 * 0.6}px`}
    style={{
      flexWrap: "wrap",
      maxWidth: 400,
      margin: left ? "0 auto 0 30px" : "0 0 0 auto",
      justifyContent: left ? "flex-start" : "flex-end",
      opacity: 0.5,
      fontWeight: "bold",
    }}
  >
    {quote.path.map(([label, url], i) => (
      <Row gap={14 * 0.6} key={i}>
        {i > 0 && (
          <svg
            style={{ flexShrink: 0, height: 14 * 0.6 }}
            viewBox="-0.5 -1 1.5 2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon points="-0.5,0.866 -0.5,-0.866 1.0,0.0" fill="#333" />
          </svg>
        )}
        <Text
          size={14}
          to={quote.author === "Ruhi Institute" ? "" : url}
          style={{
            marginLeft: left && i === 0 ? -30 : 0,
            color: authorColours[quote.author],
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Text>
      </Row>
    ))}
  </Row>
);

const Paragraph = ({
  para,
  paraId,
  quotes,
}: {
  para: RenderContent;
  paraId: string;
  quotes: RenderQuote[];
}) => {
  if ("type" in para && para.type === "break") {
    return (
      <Text
        id={paraId}
        size={13}
        style={{ textAlign: "center", padding: "10px 0" }}
      >
        * * *
      </Text>
    );
  }
  if (Array.isArray(para)) {
    return (
      <Text id={paraId} style={{ textIndent: 20 }}>
        {para.map((part, i) => {
          const style = {
            fontWeight: part.quote ? "bold" : "normal",
            padding: part.highlight ? "2.4px 3.5px" : "2.4px 0",
            margin: part.highlight ? "0 -3.5px" : "0",
            position: "relative" as "relative",
            zIndex: part.highlight ? 10 : 0,
            background: part.highlight
              ? "rgb(255, 247, 158)"
              : part.quoted > 0 && showQuoted
                ? `rgb(255, ${240 - part.quoted * 10}, ${240 - part.quoted * 10})`
                : "",
          };
          return typeof part.quote === "object" ? (
            <span style={style} key={i}>
              {part.text} <InlineQuote quote={part.quote} />
            </span>
          ) : (
            <span style={style} key={i}>
              {part.text}
            </span>
          );
        })}
      </Text>
    );
  }

  const inner = (
    <Text
      id={paraId}
      style={{
        fontStyle:
          para.type === "info" || para.type === "framing"
            ? "italic"
            : "inherit",
        textTransform: para.type === "call" ? "uppercase" : "inherit",
        textAlign:
          para.type === "info" || para.type === "call" ? "justify" : "inherit",
        textAlignLast:
          para.type === "info" || para.type === "call" ? "center" : "inherit",
        padding:
          para.type === "info" || para.type === "call"
            ? para.allSpecial
              ? "0 20px"
              : "0 40px"
            : para.type === "lines"
              ? para.allSpecial
                ? "0"
                : "0 70px"
              : "0",
      }}
    >
      {para.lines.flatMap((line, i) => {
        const res = line.map((part, j) => (
          <span
            style={{
              padding: part.highlight ? "2.4px 3.5px" : "2.4px 0",
              margin: part.highlight ? "0 -3.5px" : "0",
              position: "relative" as "relative",
              zIndex: part.highlight ? 10 : 0,
              background: part.highlight
                ? "rgb(255, 247, 158)"
                : part.quoted > 0 && showQuoted
                  ? `rgb(255, ${240 - part.quoted * 10}, ${240 - part.quoted * 10})`
                  : "",
            }}
            key={`${i}-${j}`}
          >
            {part.text}
          </span>
        ));
        return i > 0 ? [<br key={i} />, ...res] : res;
      })}
    </Text>
  );
  return para.type !== "quote" ? (
    inner
  ) : (
    <Column style={{ fontWeight: "bold", padding: "0 20px" }} gap={11.5}>
      {inner}
      {quotes.map((quote, i) => (
        <BlockQuote key={i} quote={quote} />
      ))}
    </Column>
  );
};

export default function App() {
  const allData: {
    data: any[];
    path: [string, string][];
    tree: any;
    showContent: boolean;
  } = useLoaderData();

  const [searchParams] = useSearchParams();

  const [level, setLevel] = useState(
    parseInt(searchParams.get("level") || "0", 10)
  );
  useEffect(() => {
    setLevel(parseInt(searchParams.get("level") || "0", 10));
  }, [searchParams]);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const navigate = useNavigate();
  useEffect(() => {
    if (level !== parseInt(searchParams.get("level") || "0", 10)) {
      navigate(
        { search: `?level=${level}&search=${encodeURIComponent(search)}` },
        { replace: true, preventScrollReset: true }
      );
    }
  }, [level]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (searchParams.get("search") || "")) {
        navigate(
          { search: `?level=${level}&search=${encodeURIComponent(search)}` },
          { replace: true, preventScrollReset: true }
        );
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, path, tree, showContent } = allData;

  return (
    <SizeContext value={17}>
      <ScrollRestoration />
      <Column
        gap={40}
        style={{
          padding: "30px 10px 120px",
          maxWidth: "730px",
          margin: "0 auto",
        }}
      >
        <Column gap={20}>
          <Text to="/" style={{ color: "darkred", fontWeight: "bold" }}>
            Bahá’í Explore
          </Text>

          <Breadcrumbs size={17} path={[["All", "/"], ...path]} />

          {Object.keys(tree).length > 0 && (
            <div style={{ paddingLeft: 15 }}>
              {renderTree(tree, path[path.length - 1]?.[1] || "")}
            </div>
          )}

          {showContent && (
            <input
              type="range"
              value={level}
              min={0}
              max={5}
              step={1}
              onChange={(e) => setLevel(parseInt(e.target.value, 10))}
            />
          )}

          {showContent && (
            <input
              type="text"
              value={search}
              placeholder="Search..."
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
        </Column>
        {showContent &&
          data.map(({ sources, content }, index) => (
            <Fragment key={index}>
              {index !== 0 && <div style={{ height: 3, background: "#ddd" }} />}
              <Column gap={25}>
                <Column gap={11.5} style={{ paddingBottom: 15 }}>
                  {sources.map((source: any, i: number) => (
                    <Row
                      gap={`${11.5}px ${14 * 0.6}px`}
                      style={{ flexWrap: "wrap", fontWeight: "bold" }}
                      key={i}
                    >
                      {source.path.map(
                        ([label, url]: [string, string], j: number) => (
                          <Row gap={14 * 0.6} key={j}>
                            {j > 0 && (
                              <svg
                                style={{
                                  flexShrink: 0,
                                  height: 14 * 0.6,
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
                            <Text
                              to={source.author === "Ruhi Institute" ? "" : url}
                              style={{
                                color: authorColours[source.author],
                              }}
                            >
                              {label}
                            </Text>
                          </Row>
                        )
                      )}
                    </Row>
                  ))}
                </Column>
                {content.map((para: any) =>
                  !(para.quoted.length > 0 && showQuotedSources) ? (
                    <div
                      key={para.paraId}
                      style={{ maxWidth: 670, width: "100%", margin: "0 auto" }}
                    >
                      <Paragraph
                        para={para.content}
                        paraId={para.paraId}
                        quotes={para.quotes}
                      />
                    </div>
                  ) : (
                    <Column
                      style={{
                        maxWidth: 670,
                        margin: "0 auto",
                        paddingBottom: 25,
                      }}
                      gap={25}
                      key={para.paraId}
                    >
                      <Paragraph
                        para={para.content}
                        paraId={para.paraId}
                        quotes={para.quotes}
                      />
                      {para.quoted.map((quote: any, i: number) => (
                        <BlockQuote key={i} quote={quote} left />
                      ))}
                    </Column>
                  )
                )}
              </Column>
            </Fragment>
          ))}
      </Column>
    </SizeContext>
  );
}
