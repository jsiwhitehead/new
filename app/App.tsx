import { Fragment, useEffect } from "react";
import { useNavigation } from "react-router";

import type { DocSlice, QuoteLink } from "../utils/types";

import Controls from "./Controls";
import Paragraph from "./Paragraph";
import { authorColours, Column, RightArrow, Row, Text } from "./Utils";

const MainQuote = ({ quote: { quotes, render } }: { quote: QuoteLink }) => (
  <Row
    gap={`${11.5}px ${14 * 0.6}px`}
    style={{ flexWrap: "wrap", fontWeight: "bold" }}
  >
    {render.path.map(([label, url]: [string, string], j: number) => (
      <Row gap={14 * 0.6} key={j}>
        {j > 0 && <RightArrow size={14 * 0.6} color="#333" />}
        <Text
          to={render.author === "Ruhi Institute" ? "" : url}
          style={{
            color: authorColours[render.author],
          }}
          state={quotes}
        >
          {label}
        </Text>
      </Row>
    ))}
  </Row>
);

export default function App({
  docs,
  path,
  tree,
  showContent,
}: {
  docs: DocSlice[];
  path: [string, string][];
  tree: any;
  showContent: boolean;
}) {
  useEffect(() => {
    sessionStorage.removeItem("hasReloadedOnError");
  }, []);

  const navigation = useNavigation();
  const isNavigating = Boolean(navigation.location);

  return (
    <Column
      gap={40}
      style={{
        padding: "30px 10px 120px",
        maxWidth: "730px",
        margin: "0 auto",
      }}
    >
      <Controls path={path} tree={tree} isLoading={isNavigating} />
      {!isNavigating &&
        showContent &&
        docs.map(({ title, scoreInfo, chunks }, docIndex) => (
          <Column gap={25} key={docIndex}>
            <div style={{ background: "#ddd", padding: 20, margin: "0 -20px" }}>
              <MainQuote quote={title} />
            </div>
            {/* <Text style={{ whiteSpace: "pre" }}>
              {JSON.stringify(scoreInfo, null, 2)}
            </Text> */}
            {chunks.map(({ sources, content }, index) => (
              <Fragment key={index}>
                {index > 0 && <div style={{ height: 3, background: "#ddd" }} />}
                <Column gap={25}>
                  {sources.length > 0 && (
                    <Column gap={11.5}>
                      {sources.map((source, i) => (
                        <MainQuote quote={source} key={i} />
                      ))}
                    </Column>
                  )}
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
        ))}
    </Column>
  );
}
