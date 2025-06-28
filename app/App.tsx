import { Fragment, useState, useEffect } from "react";
import {
  Link,
  ScrollRestoration,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router";

import type { RenderContent, Quote } from "../src/server";

import renderTree from "./Tree";
import { Column, Row, SizeContext, Text } from "./Utils";

const showQuoted = false;
const showQuoteSources = false;

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

const InlineQuote = ({ quote }: { quote: Quote }) => (
  <Fragment>
    {quote.path.map(([label, url], k) => (
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
              color: authorColours[quote.author],
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
            <polygon points="-0.5,0.866 -0.5,-0.866 1.0,0.0" fill="#333" />
          </svg>
        )}
        <Link
          to={url}
          style={{
            fontWeight: "bold",
            fontStyle: "italic",
            color: authorColours[quote.author],
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
        color: authorColours[quote.author],
        opacity: 0.5,
        fontSize: 14,
      }}
    >
      {"]"}
    </span>
  </Fragment>
);

const BlockQuote = ({ quote, left }: { quote: Quote; left?: true }) => (
  <Row
    gap={`${11.5}px ${14 * 0.6}px`}
    style={{
      flexWrap: "wrap",
      maxWidth: 400,
      margin: left ? "0 auto 0 30px" : "0 0 0 auto",
      justifyContent: left ? "flex-start" : "flex-end",
      opacity: 0.5,
    }}
  >
    {quote.path.map((p, i) => (
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
          to={p[1]}
          style={{
            marginLeft: left && i === 0 ? -30 : 0,
            color: authorColours[quote.author],
            whiteSpace: "nowrap",
          }}
        >
          {p[0]}
        </Text>
      </Row>
    ))}
  </Row>
);

const Paragraph = ({
  para,
  paraId,
}: {
  para: RenderContent;
  paraId: string;
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
            padding: "2.4px 0",
            background:
              part.quoted > 0 && showQuoted
                ? `rgb(255, ${240 - part.quoted * 10}, ${240 - part.quoted * 10})`
                : "",
            // padding: l.highlight ? "2.4px 3.5px" : "2.4px 0",
            // margin: l.highlight ? "0 -3.5px" : "0",
            // position: "relative",
            // zIndex: l.highlight ? 10 : 0,
            // background: l.highlight
            //   ? "rgb(255, 247, 158)"
            //   : l.quoted > 0
            //     ? `rgb(255, ${240 - l.quoted * 10}, ${240 - l.quoted * 10})`
            //     : "",
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
        textIndent: para.type === "normal" && !para.quote ? 20 : 0,
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
              padding: "2.4px 0",
              background:
                part.quoted > 0 && showQuoted
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
  return !para.quote ? (
    inner
  ) : (
    <Column style={{ fontWeight: "bold", padding: "0 20px" }} gap={11.5}>
      {inner}
      <BlockQuote quote={para.quote} />
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

  const navigate = useNavigate();
  useEffect(() => {
    navigate(
      { search: `?level=${level}` },
      { replace: true, preventScrollReset: true }
    );
  }, [level]);

  const { data, path, tree, showContent } = allData;

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

        {/* <input
          type="text"
          value={searchTerm}
          placeholder="Search..."
          onChange={(e) => setSearchTerm(e.target.value)}
        /> */}

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

        {showContent &&
          data.map((section, index) => (
            <Column gap={25} style={{ paddingTop: 30 }} key={index}>
              <Text
                size={30}
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  paddingBottom: 10,
                }}
              >
                {section.path[section.path.length - 1]![0]}
              </Text>
              {section.content.map((para: any) =>
                !((para.quoted && showQuoteSources) || para.source) ? (
                  <Paragraph
                    para={para.content}
                    paraId={para.paraId}
                    key={para.paraId}
                  />
                ) : (
                  <Column
                    style={{ paddingBottom: 25 }}
                    gap={25}
                    key={para.paraId}
                  >
                    <Paragraph para={para.content} paraId={para.paraId} />
                    {para.quoted &&
                      showQuoteSources &&
                      para.quoted.map((quote: any, i: number) => (
                        <BlockQuote key={i} quote={quote} left />
                      ))}
                    {para.source && (
                      <Row
                        gap={`${11.5}px ${14 * 0.6}px`}
                        style={{ flexWrap: "wrap", opacity: 0.5 }}
                      >
                        {para.source.path.map(
                          (p: [string, string], j: number) => (
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
                                to={p[1]}
                                style={{
                                  color: authorColours[para.source.author],
                                }}
                              >
                                {p[0]}
                              </Text>
                            </Row>
                          )
                        )}
                      </Row>
                    )}
                  </Column>
                )
              )}
            </Column>
          ))}
      </Column>
    </SizeContext>
  );
}
