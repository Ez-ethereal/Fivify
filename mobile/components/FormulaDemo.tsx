import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
} from "react-native-reanimated";

/**
 * FormulaDemo — a tap-to-flip flashcard.
 *
 * Front: KaTeX-rendered SS_res formula with color-coded groups.
 * Back:  Plain-English narrative with matching inline colors.
 *
 * Uses a single shared value (0 = front, 1 = back) driving two
 * rotateY interpolations with an opacity snap at the midpoint
 * so neither face is visible edge-on.
 */

// ── Colors ───────────────────────────────────────

const C = {
  blue: "#2563EB",
  green: "#16A34A",
  orange: "#EA580C",
  cyan: "#0891B2",
};

// ── Card dimensions ──────────────────────────────

const CARD_HEIGHT = 190;
const FLIP_DURATION = 450;

// ── KaTeX formula (front face) ───────────────────

const COLORED_LATEX = [
  `\\textcolor{${C.blue}}{\\mathrm{SS}_{\\mathrm{res}}}`,
  `=`,
  `\\textcolor{${C.cyan}}{\\sum_{i=1}^{m}}`,
  `\\textcolor{${C.green}}{(\\, y_{i} - f(x_{i}) \\,)}`,
  `^{\\textcolor{${C.orange}}{2}}`,
].join(" ");

function buildDemoHtml(cardHeight: number): string {
  // The WebView gets the full card height minus space for the "tap to flip" hint
  const formulaAreaHeight = cardHeight - 30;
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
  html, body {
    width: 100%;
    height: ${formulaAreaHeight}px;
    overflow: hidden;
    background: transparent;
  }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #formula {
    font-size: 1.4em;
    transform-origin: center center;
  }
</style>
</head>
<body>
  <div id="formula"></div>
  <script>
    try {
      katex.render(
        ${JSON.stringify(COLORED_LATEX)},
        document.getElementById("formula"),
        { displayMode: true, throwOnError: false, trust: true }
      );
      var el = document.getElementById("formula");
      var maxWidth = document.body.clientWidth - 24;
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

const DEMO_HTML = buildDemoHtml(CARD_HEIGHT);

// ── Narrative (back face) ────────────────────────

const NARRATIVE: { text: string; color?: string }[] = [
  { text: "To measure " },
  { text: "the model\u2019s total failure", color: C.blue },
  { text: ", " },
  { text: "for each data point measure the miss between actual and predicted", color: C.green },
  { text: ", " },
  { text: "square that miss", color: C.orange },
  { text: " to punish larger errors, and " },
  { text: "add up all those penalties", color: C.cyan },
  { text: "." },
];

// ── Component ────────────────────────────────────

export function FormulaDemo() {
  const flip = useSharedValue(0); // 0 = front, 1 = back
  const isFlipped = useRef(false);
  const teaserDone = useRef(false);

  // Card entrance
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(16);

  useEffect(() => {
    cardOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    cardTranslateY.value = withDelay(
      200,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  // Auto-flip teaser: flip to back after 3s, back to front after 2s more
  useEffect(() => {
    const t1 = setTimeout(() => {
      flip.value = withTiming(1, {
        duration: FLIP_DURATION,
        easing: Easing.inOut(Easing.cubic),
      });
      isFlipped.current = true;
    }, 3000);

    const t2 = setTimeout(() => {
      flip.value = withTiming(0, {
        duration: FLIP_DURATION,
        easing: Easing.inOut(Easing.cubic),
      });
      isFlipped.current = false;
      teaserDone.current = true;
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleTap = useCallback(() => {
    const next = isFlipped.current ? 0 : 1;
    flip.value = withTiming(next, {
      duration: FLIP_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });
    isFlipped.current = !isFlipped.current;
  }, []);

  // ── Animated styles ────────────────────────────

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 90], Extrapolation.CLAMP);
    const opacity = flip.value > 0.5 ? 0 : 1;
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [-90, 0], Extrapolation.CLAMP);
    const opacity = flip.value > 0.5 ? 1 : 0;
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  // ── Render ─────────────────────────────────────

  return (
    <Animated.View style={cardStyle}>
      <Pressable onPress={handleTap}>
        <View
          style={{
            height: CARD_HEIGHT,
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(212, 197, 174, 0.4)",
            shadowColor: "#C4B19A",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          {/* ── Front: KaTeX formula ────────────── */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backfaceVisibility: "hidden",
              },
              frontStyle,
            ]}
          >
            <View style={{ flex: 1 }}>
              <WebView
                style={{ flex: 1, backgroundColor: "transparent" }}
                originWhitelist={["*"]}
                source={{ html: DEMO_HTML }}
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
            <Text
              style={{
                position: "absolute",
                bottom: 10,
                right: 16,
                fontSize: 11,
                fontWeight: "600",
                color: "#A89F95",
                letterSpacing: 0.3,
              }}
            >
              tap to flip
            </Text>
          </Animated.View>

          {/* ── Back: narrative ──────────────────── */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backfaceVisibility: "hidden",
                justifyContent: "center",
                paddingHorizontal: 24,
              },
              backStyle,
            ]}
          >
            <Text
              style={{
                fontSize: 14,
                lineHeight: 21,
                color: "#8A827A",
                fontWeight: "500",
              }}
            >
              {NARRATIVE.map((part, i) =>
                part.color ? (
                  <Text
                    key={i}
                    style={{ color: part.color, fontWeight: "700" }}
                  >
                    {part.text}
                  </Text>
                ) : (
                  <Text key={i}>{part.text}</Text>
                )
              )}
            </Text>
            <Text
              style={{
                position: "absolute",
                bottom: 10,
                right: 16,
                fontSize: 11,
                fontWeight: "600",
                color: "#A89F95",
                letterSpacing: 0.3,
              }}
            >
              tap to flip
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
