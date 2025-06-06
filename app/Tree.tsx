import { Row, Text } from "./Utils";

const layerWidth = 40;
const treeGap = 10;

const renderTree = (tree: any, currentUrl: string) =>
  Object.keys(tree).map((k, i) => {
    const [title, url] = JSON.parse(k);
    const nextUrl = `${currentUrl}/${url}`;
    const isLast = i === Object.keys(tree).length - 1;

    const label = (
      <Row gap={20} style={{ position: "relative" }}>
        <div
          style={{
            background: "#ddd",
            width: 40,
            height: 2,
          }}
        />
        <Text to={nextUrl}>{title}</Text>
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
        {isLast && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: -2,
              width: 2,
              height: 17 / 2 + 1 + treeGap + 5,
              background: "#ddd",
            }}
          />
        )}
        {Object.keys(tree[k]).length === 0 ? (
          <div
            style={{
              padding: "5px 0",
              marginTop: treeGap,
              marginLeft: -layerWidth,
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 5 + (17 - 16) / 2,
                left: layerWidth - 16 / 2 + 1,
                background: "#ddd",
                borderRadius: 100,
                padding: 5.5,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  background: "#333",
                  borderRadius: 100,
                }}
              />
            </div>
            {label}
          </div>
        ) : (
          <details style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: 17 / 2 - 1 + treeGap + 5,
                left: 0,
                width: 2,
                height: 17 / 2 + 1 + 5,
                background: "#ddd",
              }}
            />
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
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: 5 + (17 - 16) / 2,
                  left: layerWidth - 16 / 2 + 1,
                  background: "#ddd",
                  borderRadius: 100,
                  padding: 3,
                  zIndex: 10,
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="-1 -1 2 2"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon
                    points="-0.5,0.866 -0.5,-0.866 1.0,0.0"
                    fill="#333"
                  />
                </svg>
              </div>
              {label}
            </summary>
            {renderTree(tree[k], nextUrl)}
          </details>
        )}
      </div>
    );
  });

export default renderTree;
