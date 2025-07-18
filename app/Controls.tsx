import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

import renderTree from "./Tree";
import { Column, RightArrow, Row, Text } from "./Utils";

const makeUrlSearch = (...parts: [string, string | number | boolean][]) => {
  const res = parts
    .filter((x) => x[1])
    .map((x) => x.map((y) => encodeURIComponent(y)).join("="))
    .join("&");
  return res ? `?${res}` : "";
};

const getUrlString = (params: URLSearchParams, key: string) =>
  params.get(key) || "";

const getUrlNumber = (params: URLSearchParams, key: string) =>
  parseInt(params.get(key) || "0", 10);

const Breadcrumbs = ({
  path,
  size,
  urlSearch,
}: {
  path: [string, string][];
  size: number;
  urlSearch: string;
}) => {
  return (
    <Row
      gap={`${size * 1.2}px ${size * 0.6}px`}
      style={{
        flexWrap: "wrap",
        paddingLeft: 30,
      }}
    >
      {path.map(([label, url], i) => (
        <Row gap={size * 0.6} style={{ marginLeft: i === 0 ? -30 : 0 }} key={i}>
          {i > 0 && <RightArrow size={size * 0.6} color="#333" />}
          <Text size={size} to={`${url}${urlSearch}`}>
            {label}
          </Text>
        </Row>
      ))}
    </Row>
  );
};

export default function Controls({
  path,
  tree,
  isLoading,
}: {
  path: [string, string][];
  tree: any;
  isLoading: boolean;
}) {
  const [params] = useSearchParams();

  const [level, setLevel] = useState(getUrlNumber(params, "level"));
  useEffect(() => {
    const newLevel = getUrlNumber(params, "level");
    if (newLevel !== level) setLevel(newLevel);
  }, [params]);

  const [search, setSearch] = useState(getUrlString(params, "search"));
  useEffect(() => {
    const newSearch = getUrlString(params, "search");
    if (newSearch !== search) setSearch(newSearch);
  }, [params]);

  const navigate = useNavigate();
  useEffect(() => {
    let timeout = setTimeout(() => {
      if (level !== getUrlNumber(params, "level")) {
        navigate(
          { search: makeUrlSearch(["search", search], ["level", level]) },
          { replace: true, preventScrollReset: true }
        );
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [level]);

  const runSearch = () => {
    if (search !== getUrlString(params, "search")) {
      navigate(
        { search: makeUrlSearch(["search", search], ["level", level]) },
        { replace: true, preventScrollReset: true }
      );
    }
  };

  useEffect(() => {
    if (search === "") runSearch();
  }, [search]);

  const linkUrlSearch = makeUrlSearch(
    ["search", getUrlString(params, "search")],
    ["level", getUrlNumber(params, "level")]
  );

  return (
    <Column gap={20}>
      <Row gap={30} style={{}}>
        <Text
          to="/"
          style={{ color: "darkred", fontWeight: "bold", flexGrow: 0 }}
        >
          Bahá’í Explore
        </Text>
        {isLoading && (
          <Text style={{ fontStyle: "italic" }}>Loading . . .</Text>
        )}
      </Row>

      <input
        type="text"
        value={search}
        placeholder="Search . . ."
        style={{
          borderRadius: 100,
          border: "2px solid #ccc",
          padding: "5px 18px",
        }}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") runSearch();
        }}
      />

      <Column gap={10}>
        <Row>
          <Text
            size={14}
            style={{ width: "50%", textAlign: "left", fontWeight: "bold" }}
          >
            All Passages
          </Text>
          <Text
            size={14}
            style={{ width: "50%", textAlign: "right", fontWeight: "bold" }}
          >
            Most Common
          </Text>
        </Row>
        <input
          type="range"
          value={level}
          min={0}
          max={5}
          step={1}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
        />
      </Column>

      <Breadcrumbs
        size={17}
        path={[["All", "/"], ...path]}
        urlSearch={linkUrlSearch}
      />

      {Object.keys(tree).length > 0 && (
        <div style={{ paddingLeft: 15 }}>
          {renderTree(tree, path[path.length - 1]?.[1] || "", linkUrlSearch)}
        </div>
      )}
    </Column>
  );
}
