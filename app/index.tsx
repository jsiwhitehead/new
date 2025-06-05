import { createRoot } from "react-dom/client";

import type { Section } from "../src/structure";
import data from "../data/structure/bahaullah-call-divine-beloved.json";

const typedData = data as Section[];

function MyApp() {
  return (
    <div id="main">
      <h1>Bahá’í Explorer</h1>
      <h2>{typedData[3]?.title}</h2>
      <h3>{typedData[3]?.author}</h3>
      {typedData[3]?.content.map((d, i) => {
        if (typeof d === "string") {
          return (
            <p className="plain" key={i}>
              {d}
            </p>
          );
        }
        if ("type" in d) {
          return (
            <p className={d.type} key={i}>
              {d.text}
            </p>
          );
        }
        return (
          <p className="lines" key={i}>
            {d.lines
              .slice(1)
              .map((l, i) => d.text.slice(d.lines[i], l))
              .join("\n")}
          </p>
        );
      })}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<MyApp />);
