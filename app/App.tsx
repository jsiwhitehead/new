import { Fragment } from "react";

import Controls from "./Controls";
import Paragraph from "./Paragraph";
import { authorColours, Column, RightArrow, Row, Text } from "./Utils";

export default function App({
  data,
  path,
  tree,
  showContent,
}: {
  data: any[];
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
      <Controls path={path} tree={tree} showRange={showContent} />
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
                          {j > 0 && <RightArrow size={14 * 0.6} color="#333" />}
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
              {content.map((para: any) => (
                <Paragraph {...para} key={para.paraId} />
              ))}
            </Column>
          </Fragment>
        ))}
    </Column>
  );
}
