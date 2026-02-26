import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
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
      groups.flatMap((g, i) =>
        g.ranges.map((range) => ({
          range: range as [number, number],
          color: colors[i],
          selected: selectedIndex === i,
        }))
      )
    );
  }
  return latex;
}

function buildHtml(displayLatex: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
<script
  src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #F5F0E8;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  #formula {
    font-size: 1.4em;
  }
  .katex-display { margin: 0 !important; }
</style>
</head>
<body>
  <div id="formula"></div>
  <script>
    try {
      var el = document.getElementById("formula");
      katex.render(
        ${JSON.stringify(displayLatex)},
        el,
        { displayMode: true, throwOnError: false, trust: true }
      );
      // Shrink font until formula fits viewport width
      var size = 1.4;
      while (el.scrollWidth > window.innerWidth && size > 0.5) {
        size -= 0.1;
        el.style.fontSize = size + "em";
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
    return buildHtml(colored);
  }, [formula, viewMode, selectedTokenIndex]);

  return (
    <View style={styles.container}>
      <WebView
        style={styles.webview}
        originWhitelist={["*"]}
        source={{ html }}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    backgroundColor: "#F5F0E8",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D4",
  },
  webview: {
    flex: 1,
    backgroundColor: "#F5F0E8",
  },
});
