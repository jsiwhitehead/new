import { useState } from "react";
import { useLocation } from "react-router";

import type { QuoteLink, Ref, RenderContent, SemiPara } from "../utils/types";
import { refsEqual } from "../utils/utils";

import { BlockQuote, InlineQuote } from "./Quotes";
import { getRenderContent } from "./render";
import { Column, Text } from "./Utils";

const ParagraphBase = ({
  content,
  quotes,
  showQuoted,
  fills,
}: {
  content: RenderContent;
  quotes: QuoteLink[];
  showQuoted: boolean;
  fills: boolean;
}) => {
  if ("type" in content && content.type === "break") {
    return (
      <Text size={13} style={{ textAlign: "center", padding: "10px 0" }}>
        * * *
      </Text>
    );
  }
  if (Array.isArray(content)) {
    return (
      <Text style={{ textIndent: 20 }}>
        {content.map((part, i) => {
          const style = {
            fontWeight: part.quote ? "bold" : "normal",
            ...(fills
              ? {
                  padding: "2.4px 3.5px",
                  margin: "0 -3.5px",
                  position: "relative" as "relative",
                  zIndex: part.highlight ? 100 : part.quoted,
                  background: part.highlight
                    ? "rgb(255, 247, 158)"
                    : part.quoted > 0 && showQuoted
                      ? `rgb(255, ${240 - part.quoted * 10}, ${240 - part.quoted * 10})`
                      : "",
                }
              : { padding: "2.4px 3.5px", margin: "0 -3.5px" }),
          };
          return typeof part.quote === "object" ? (
            <span id={!fills ? part.id : undefined} style={style} key={i}>
              {part.text}{" "}
              <InlineQuote
                quote={part.quote.render}
                state={part.quote.quotes}
              />
            </span>
          ) : (
            <span id={!fills ? part.id : undefined} style={style} key={i}>
              {part.text}
            </span>
          );
        })}
      </Text>
    );
  }

  const inner = (
    <Text
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
            id={!fills ? part.id : undefined}
            style={
              fills
                ? {
                    padding: "2.4px 3.5px",
                    margin: "0 -3.5px",
                    position: "relative" as "relative",
                    zIndex: part.highlight ? 100 : part.quoted,
                    background: part.highlight
                      ? "rgb(255, 247, 158)"
                      : part.quoted > 0 && showQuoted
                        ? `rgb(255, ${240 - part.quoted * 10}, ${240 - part.quoted * 10})`
                        : "",
                  }
                : { padding: "2.4px 3.5px", margin: "0 -3.5px" }
            }
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
    <Column
      style={{
        fontWeight: "bold",
        padding: "0 20px",
      }}
      gap={11.5}
    >
      {inner}
      {quotes.map((quote, i) => (
        <BlockQuote key={i} quote={quote.render} state={quote.quotes} />
      ))}
    </Column>
  );
};

export default function Paragraph({
  paraId,
  para: basePara,
  quoted,
  quotes,
  ref,
}: {
  paraId: string;
  para: SemiPara;
  quoted: QuoteLink[];
  quotes: QuoteLink[];
  ref: Ref;
}) {
  const [showQuoted, setShowQuoted] = useState(false);

  const location = useLocation();

  console.log(location.state);

  console.log(ref);

  const para = { ...basePara, highlights: [...basePara.highlights] };
  if (location.state) {
    for (const part of location.state) {
      if (refsEqual(part, ref)) {
        para.highlights.push({ start: part.start, end: part.end });
      }
    }
  }

  const hasFills = showQuoted || para.highlights.length > 0;

  const content = getRenderContent(para, paraId, hasFills);

  const paragraph = (
    <div style={{ position: "relative" }}>
      {hasFills && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            color: "transparent",
          }}
        >
          <ParagraphBase
            content={content}
            quotes={quotes}
            showQuoted={showQuoted}
            fills={true}
          />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 200 }}>
        <ParagraphBase
          content={content}
          quotes={quotes}
          showQuoted={showQuoted}
          fills={false}
        />
      </div>
    </div>
  );

  return quoted.length === 0 ? (
    <div
      key={paraId}
      style={{ maxWidth: 670, width: "100%", margin: "0 auto" }}
    >
      {paragraph}
    </div>
  ) : (
    <Column
      style={{
        maxWidth: 670,
        width: "100%",
        margin: "0 auto",
        paddingBottom: showQuoted ? 20 : 0,
      }}
      gap={25}
      key={paraId}
    >
      {paragraph}
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
          <BlockQuote key={i} quote={quote.render} left state={quote.quotes} />
        ))}
    </Column>
  );
}
