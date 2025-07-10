import { Fragment } from "react";

import type { QuoteLink, Ref, RenderContent, SemiPara } from "../utils/types";

import Controls from "./Controls";
import Paragraph from "./Paragraph";
import { authorColours, Column, RightArrow, Row, Text } from "./Utils";

export default function App({
  docs,
  path,
  tree,
  showContent,
}: {
  docs: {
    sources: QuoteLink[];
    content: {
      quoted: QuoteLink[];
      quotes: QuoteLink[];
      paraId: string;
      para: SemiPara;
      ref: Ref;
    }[];
  }[];
  path: [string, string][];
  tree: any;
  showContent: boolean;
}) {
  return (
    <Column
      gap={40}
      style={{
        padding: "30px 10px 120px",
        maxWidth: "730px",
        margin: "0 auto",
      }}
    >
      <Controls path={path} tree={tree} showContent={showContent} />
      {showContent &&
        docs.map(({ sources, content }, index) => (
          <Fragment key={index}>
            {index !== 0 && <div style={{ height: 3, background: "#ddd" }} />}
            <Column gap={25}>
              <Column gap={11.5} style={{ paddingBottom: 15 }}>
                {sources.map((source, i) => (
                  <Row
                    gap={`${11.5}px ${14 * 0.6}px`}
                    style={{ flexWrap: "wrap", fontWeight: "bold" }}
                    key={i}
                  >
                    {source.render.path.map(
                      ([label, url]: [string, string], j: number) => (
                        <Row gap={14 * 0.6} key={j}>
                          {j > 0 && <RightArrow size={14 * 0.6} color="#333" />}
                          <Text
                            to={
                              source.render.author === "Ruhi Institute"
                                ? ""
                                : url
                            }
                            style={{
                              color: authorColours[source.render.author],
                            }}
                            state={source.quotes}
                          >
                            {label}
                          </Text>
                        </Row>
                      )
                    )}
                  </Row>
                ))}
              </Column>
              {content.map((para) => (
                <Paragraph
                  key={`${para.ref.section}:${para.ref.paragraph}`}
                  {...para}
                />
              ))}
            </Column>
          </Fragment>
        ))}
    </Column>
  );
}
