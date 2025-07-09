import { Fragment } from "react";
import { Link } from "react-router";

import type { RenderQuote } from "../utils/types";

import { authorColours, RightArrow, Row, Text } from "./Utils";

export function InlineQuote({
  quote,
  state,
}: {
  quote: RenderQuote;
  state: any;
}) {
  return (
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
            <RightArrow
              size={14 * 0.6}
              color="#333"
              padding={`0 ${14 * 0.6}px`}
            />
          )}
          <Link
            to={quote.author === "Ruhi Institute" ? "" : url}
            state={state}
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
}

export function BlockQuote({
  quote,
  left,
  state,
}: {
  quote: RenderQuote;
  left?: true;
  state: any;
}) {
  return (
    <Row
      gap={`${11.5}px ${14 * 0.6}px`}
      style={{
        flexWrap: "wrap",
        maxWidth: left ? "auto" : 400,
        margin: left ? "0 auto 0 30px" : "0 0 0 auto",
        justifyContent: left ? "flex-start" : "flex-end",
        opacity: 0.5,
        fontWeight: "bold",
      }}
    >
      {quote.path.map(([label, url], i) => (
        <Row gap={14 * 0.6} key={i}>
          {i > 0 && <RightArrow size={14 * 0.6} color="#333" />}
          <Text
            size={14}
            to={quote.author === "Ruhi Institute" ? "" : url}
            state={state}
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
}
