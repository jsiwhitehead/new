import { Row, Text } from "./Utils";

const layerWidth = 40;
const treeGap = 10;

const renderTree = (tree: any, currentUrl: string) =>
  Object.keys(tree).map((k, i) => {
    const [title, url] = JSON.parse(k);
    const nextUrl = `${currentUrl}/${url}`;
    const isLeaf = Object.keys(tree[k]).length === 0;
    const isLast = i === Object.keys(tree).length - 1;

    const label = (
      <Row style={{ position: "relative" }}>
        <div
          className="treebar"
          style={{
            position: "absolute",
            top: "50%",
            left: layerWidth,
            width: 2,
            height: "calc(50% + 5px)",
            background: "#ddd",
          }}
        />
        {isLast && (
          <div
            style={{
              position: "absolute",
              top: -(treeGap + 5),
              left: -2,
              width: 2,
              height: `calc(50% + ${treeGap + 5 + 1}px)`,
              background: "#ddd",
            }}
          />
        )}
        <div
          style={{
            background: "#ddd",
            width: 40,
            height: 2,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            padding: 3,
            background: "#ddd",
            borderRadius: 100,
            marginLeft: -7,
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {isLeaf ? (
            <div
              style={{
                width: 5,
                height: 5,
                margin: 2.5,
                background: "#333",
                borderRadius: 100,
              }}
            />
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="-1 -1 2 2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon points="-0.5,0.866 -0.5,-0.866 1.0,0.0" fill="#333" />
            </svg>
          )}
        </div>
        <Text to={nextUrl} style={{ paddingLeft: 20 }}>
          {title}
        </Text>
      </Row>
    );

    return (
      <div
        style={{
          display: "flex",
          paddingLeft: layerWidth,
          borderLeft: isLast ? "2px solid transparent" : "2px solid #ddd",
          position: "relative",
        }}
        key={nextUrl}
      >
        {isLeaf ? (
          <div
            style={{
              padding: "5px 0",
              marginTop: treeGap,
              marginLeft: -layerWidth,
            }}
          >
            {label}
          </div>
        ) : (
          <details style={{ position: "relative" }}>
            <summary
              style={{
                display: "block",
                cursor: "pointer",
                padding: "5px 0",
                marginTop: treeGap,
                marginLeft: -layerWidth,
                position: "relative",
              }}
            >
              {label}
            </summary>
            {renderTree(tree[k], nextUrl)}
          </details>
        )}
      </div>
    );
  });

export default renderTree;
