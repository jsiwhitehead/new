import { Fragment } from "react/jsx-runtime";
import { Link, useParams } from "react-router";

import getData from "../src/api";

const renderTree = (tree: any, currentUrl: string) =>
  Object.keys(tree).map((t, i) => {
    const [title, url] = JSON.parse(t);
    const nextUrl = `${currentUrl}/${url}`;
    return (
      <ul className="tree" key={i}>
        <li>
          <div>
            <Link to={nextUrl}>{title}</Link>
            {renderTree(tree[t], nextUrl)}
          </div>
        </li>
      </ul>
    );
  });

const collapseSingleKeys = (
  tree: any,
  maxDepth: number
): [[string, string][], any] => {
  const path: [string, string][] = [];
  let current = tree;
  while (path.length < maxDepth) {
    const keys = Object.keys(current);
    if (keys.length !== 1) break;
    const [title, url] = JSON.parse(keys[0]!);
    path.push([title, `${(path[path.length - 1] || [])[1] || ""}/${url}`]);
    current = current[keys[0]!];
  }
  return [path, current];
};

const getTreeDepth = (tree: any): number => {
  const keys = Object.keys(tree);
  if (keys.length > 1) return 0;
  return 1 + getTreeDepth(tree[keys[0]!]);
};

function App() {
  const { path1, path2, path3, path4, path5, path6, path7 } = useParams();
  const paramPath = [path1, path2, path3, path4, path5, path6, path7].filter(
    (p) => p
  ) as string[];
  const data = getData(...paramPath);

  const single = data.find(
    (d) =>
      paramPath.length === d.path.length &&
      paramPath.every((p, i) => d.path[i]![1] === p)
  );

  const tree = {} as any;
  for (const d of data) {
    d.path.reduce((res, p) => {
      const key = JSON.stringify([p[0], p[1]]);
      return (res[key] = res[key] || {});
    }, tree);
  }

  const [path, nestedTree] = collapseSingleKeys(tree, paramPath.length);

  return (
    <div id="main">
      <div id="nav">
        <div id="homelink">
          <Link to="/">Bahá’í Explore</Link>
        </div>
        <div id="breadcrumbs">
          {path.length === 0 ? (
            <div>
              <a style={{ visibility: "hidden" }}>&nbsp;</a>
            </div>
          ) : (
            path.map((p, i) => (
              <div key={i}>
                {i > 0 && <span>▶</span>}
                <Link to={p[1]}>{p[0]}</Link>
              </div>
            ))
          )}
        </div>
      </div>
      {!single
        ? renderTree(nestedTree, path[path.length - 1]?.[1] || "")
        : data.map((d, i) => (
            <div className="content" key={i}>
              <h1>{d.path[d.path.length - 1]![0]}</h1>
              {d.content.map((c, i) => {
                if (typeof c === "string") {
                  return (
                    <p className="plain" key={i}>
                      {c}
                    </p>
                  );
                }
                if ("type" in c) {
                  return (
                    <p className={c.type} key={i}>
                      {c.text}
                    </p>
                  );
                }
                return (
                  <p className="lines" key={i}>
                    {c.lines
                      .slice(1)
                      .map((l, i) => c.text.slice(c.lines[i], l))
                      .join("\n")}
                  </p>
                );
              })}
            </div>
          ))}
    </div>
  );
}

export default App;
