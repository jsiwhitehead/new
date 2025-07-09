import { useState } from "react";

import type { Quote, RenderContent, RenderQuote } from "../utils/types";

import { BlockQuote, InlineQuote } from "./Quotes";
import { Column, Text } from "./Utils";

function ParagraphBase({
  content,
  paraId,
  quotes,
  showQuoted,
}: {
  content: RenderContent;
  paraId: string;
  quotes: { quote: Quote; render: RenderQuote }[];
  showQuoted: boolean;
}) {
  if ("type" in content && content.type === "break") {
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
  if (Array.isArray(content)) {
    return (
      <Text id={paraId} style={{ textIndent: 20 }}>
        {content.map((part, i) => {
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
              {part.text}{" "}
              <InlineQuote
                quote={part.quote.render}
                state={[part.quote.quote]}
              />
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
          content.type === "info" || content.type === "framing"
            ? "italic"
            : "inherit",
        textTransform: content.type === "call" ? "uppercase" : "inherit",
        textAlign:
          content.type === "info" || content.type === "call"
            ? "justify"
            : "inherit",
        textAlignLast:
          content.type === "info" || content.type === "call"
            ? "center"
            : "inherit",
        padding:
          content.type === "info" || content.type === "call"
            ? content.allSpecial
              ? "0 20px"
              : "0 40px"
            : content.type === "lines"
              ? content.allSpecial
                ? "0"
                : "0 70px"
              : "0",
      }}
    >
      {content.lines.flatMap((line, i) => {
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
  return content.type !== "quote" ? (
    inner
  ) : (
    <Column style={{ fontWeight: "bold", padding: "0 20px" }} gap={11.5}>
      {inner}
      {quotes.map((quote, i) => (
        <BlockQuote key={i} quote={quote.render} state={[quote.quote]} />
      ))}
    </Column>
  );
}

export default function Paragraph({
  paraId,
  content,
  quoted,
  quotes,
}: {
  paraId: string;
  content: RenderContent;
  quoted: { quote: Quote; render: RenderQuote }[];
  quotes: { quote: Quote; render: RenderQuote }[];
}) {
  const [showQuoted, setShowQuoted] = useState(false);

  return quoted.length === 0 ? (
    <div
      key={paraId}
      style={{ maxWidth: 670, width: "100%", margin: "0 auto" }}
    >
      <ParagraphBase
        content={content}
        paraId={paraId}
        quotes={quotes}
        showQuoted={showQuoted}
      />
    </div>
  ) : (
    <Column
      style={{
        maxWidth: 670,
        width: "100%",
        margin: "0 auto",
      }}
      gap={25}
      key={paraId}
    >
      <ParagraphBase
        content={content}
        paraId={paraId}
        quotes={quotes}
        showQuoted={showQuoted}
      />
      <Text
        size={14}
        style={{
          fontWeight: "bold",
          fontStyle: "italic",
          cursor: "pointer",
          userSelect: "none",
          opacity: 0.5,
        }}
        onClick={() => setShowQuoted(!showQuoted)}
      >
        {showQuoted ? "[Hide citations]" : `${quoted.length} citations`}
      </Text>
      {showQuoted &&
        quoted.map((quote, i) => (
          <BlockQuote key={i} quote={quote.render} left state={[quote.quote]} />
        ))}
    </Column>
  );
}
