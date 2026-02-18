import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useFormulaStore } from "@/store/formulaStore";
import { resolveColor } from "@/utils/colors";
import { MicroToken, MacroGroup, ViewMode } from "@/types/formula";

/**
 * Inject \textcolor{hex}{...} commands into a LaTeX string so KaTeX
 * renders each token / group in its assigned color.
 *
 * Processes from right-to-left so earlier indices stay valid after each splice.
 */
function colorizeByIndices(
  latex: string,
  spans: { range: [number, number]; colorId: string; selected: boolean }[]
): string {
  const sorted = [...spans].sort((a, b) => b.range[0] - a.range[0]);
  let result = latex;
  for (const { range, colorId, selected } of sorted) {
    const [start, end] = range;
    if (start < 0 || end > result.length) continue;
    const segment = result.slice(start, end);
    const color = resolveColor(colorId);
    const wrapped = selected
      ? `\\underline{\\textcolor{${color}}{${segment}}}`
      : `\\textcolor{${color}}{${segment}}`;
    result = result.slice(0, start) + wrapped + result.slice(end);
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
        colorId: t.color_id,
        selected: selectedIndex === i,
      }))
    );
  }
  if (viewMode === "macro") {
    return colorizeByIndices(
      latex,
      groups.map((g, i) => ({
        range: g.range,
        colorId: g.color_id,
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
      formula.micro.tokens,
      formula.macro.groups,
      selectedTokenIndex
    );
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
