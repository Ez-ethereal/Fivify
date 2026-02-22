import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useFormulaStore } from "@/store/formulaStore";
import { resolveColor, assignColors } from "@/utils/colors";
import { MicroToken, MacroGroup, ViewMode } from "@/types/formula";

/**
 * Inject \textcolor{hex}{...} commands into a LaTeX string so KaTeX
 * renders each token / group in its assigned color.
 *
 * Uses an event-based approach to handle nested/overlapping ranges correctly.
 * At each character position we emit open/close tags, producing properly
 * nested \textcolor commands (e.g. \textcolor{blue}{( \textcolor{cyan}{y_{i}} )}).
 */
function colorizeByIndices(
  latex: string,
  spans: { range: [number, number]; color: string; selected: boolean }[]
): string {
  // Build open/close events keyed by position
  type Evt = { pos: number; type: "open" | "close"; color: string; selected: boolean; size: number };
  const events: Evt[] = [];

  for (const { range, color, selected } of spans) {
    const [start, end] = range;
    if (start < 0 || end > latex.length) continue;
    const size = end - start;
    events.push({ pos: start, type: "open", color, selected, size });
    events.push({ pos: end, type: "close", color, selected, size });
  }

  // Sort: by position, then closes before opens at the same position,
  // among opens at the same position: larger spans first (so they wrap outer),
  // among closes at the same position: smaller spans first (inner closes first).
  events.sort((a, b) => {
    if (a.pos !== b.pos) return a.pos - b.pos;
    if (a.type !== b.type) return a.type === "close" ? -1 : 1;
    if (a.type === "open") return b.size - a.size; // larger opens first
    return a.size - b.size; // smaller closes first
  });

  let result = "";
  let ei = 0;

  for (let ci = 0; ci <= latex.length; ci++) {
    // Emit all events at this position
    while (ei < events.length && events[ei].pos === ci) {
      const e = events[ei];
      if (e.type === "open") {
        result += e.selected
          ? `\\underline{\\textcolor{${e.color}}{`
          : `\\textcolor{${e.color}}{`;
      } else {
        result += e.selected ? "}}" : "}";
      }
      ei++;
    }
    // Append the current character
    if (ci < latex.length) {
      result += latex[ci];
    }
  }

  return result;
}

function buildColoredLatex(
  latex: string,
  viewMode: ViewMode,
  tokens: MicroToken[],
  groups: MacroGroup[],
  selectedIndex: number | null
): string {
  if (viewMode === "micro") {
    return colorizeByIndices(
      latex,
      tokens.map((t, i) => ({
        range: t.index,
        color: resolveColor(t.color_id),
        selected: selectedIndex === i,
      }))
    );
  }
  if (viewMode === "macro") {
    const colors = assignColors(groups.length);
    return colorizeByIndices(
      latex,
      groups.map((g, i) => ({
        range: g.range,
        color: colors[i],
        selected: selectedIndex === i,
      }))
    );
  }
  return latex;
}

function buildHtml(displayLatex: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
<script
  src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #F5F0E8;
    padding: 16px;
    overflow: hidden;
  }
  #formula {
    font-size: 1.4em;
    transform-origin: center center;
    transition: transform 0.15s ease;
  }
</style>
</head>
<body>
  <div id="formula"></div>
  <script>
    try {
      katex.render(
        ${JSON.stringify(displayLatex)},
        document.getElementById("formula"),
        { displayMode: true, throwOnError: false, trust: true }
      );
      // Scale down if the rendered formula overflows the viewport
      var el = document.getElementById("formula");
      var maxWidth = document.body.clientWidth - 32; // account for body padding
      var naturalWidth = el.scrollWidth;
      if (naturalWidth > maxWidth) {
        el.style.transform = "scale(" + (maxWidth / naturalWidth) + ")";
      }
    } catch (e) {
      document.getElementById("formula").textContent = e.message;
    }
  </script>
</body>
</html>`;
}

export default function FormulaRenderer() {
  const formula = useFormulaStore((s) => s.formula);
  const viewMode = useFormulaStore((s) => s.viewMode);
  const selectedTokenIndex = useFormulaStore((s) => s.selectedTokenIndex);

  const html = useMemo(() => {
    if (!formula) return buildHtml("");
    const colored = buildColoredLatex(
      formula.latex,
      viewMode,
      formula.micro?.tokens ?? [],
      formula.macro.groups,
      selectedTokenIndex
    );
    console.log("[FormulaRenderer] colored LaTeX:", colored);
    return buildHtml(colored);
  }, [formula, viewMode, selectedTokenIndex]);

  return (
    <WebView
      style={styles.webview}
      originWhitelist={["*"]}
      source={{ html }}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    height: 120,
    backgroundColor: "#F5F0E8",
  },
});
