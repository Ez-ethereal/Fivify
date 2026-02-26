import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useFormulaStore } from "@/store/formulaStore";
import { assignColors } from "@/utils/colors";
import { MacroGroup } from "@/types/formula";

/**
 * Build an array of text segments from the narrative using a "deepest wins"
 * painting algorithm. Handles overlapping/nested spans correctly:
 * parent spans are painted first (largest), then children overwrite
 * sub-regions with their own color — so "pool " stays purple while
 * "their individual spreads" becomes orange.
 */
function buildNarrativeSegments(
  narrative: string,
  groups: MacroGroup[],
  colors: string[]
): { text: string; groupIndex: number | null; color: string | null }[] {
  // Step 1: Per-character assignment — null means plain/uncolored text
  const assignment: (number | null)[] = new Array(narrative.length).fill(null);

  // Step 2: Paint largest spans first, smallest last (children overwrite parents)
  const spans = groups
    .map((g, i) => ({
      start: g.narrative_span?.[0] ?? -1,
      end: g.narrative_span?.[1] ?? -1,
      groupIndex: i,
      size: (g.narrative_span?.[1] ?? 0) - (g.narrative_span?.[0] ?? 0),
    }))
    .filter((s) => s.start >= 0 && s.end > s.start && s.end <= narrative.length)
    .sort((a, b) => b.size - a.size || a.groupIndex - b.groupIndex);

  for (const span of spans) {
    for (let i = span.start; i < span.end; i++) {
      assignment[i] = span.groupIndex;
    }
  }

  // Step 3: Collect consecutive runs of the same groupIndex into segments
  if (narrative.length === 0) return [];

  const segments: {
    text: string;
    groupIndex: number | null;
    color: string | null;
  }[] = [];
  let runStart = 0;

  for (let i = 1; i <= narrative.length; i++) {
    if (i === narrative.length || assignment[i] !== assignment[runStart]) {
      const gi = assignment[runStart];
      segments.push({
        text: narrative.slice(runStart, i),
        groupIndex: gi,
        color: gi !== null ? colors[gi] : null,
      });
      runStart = i;
    }
  }

  return segments;
}

/**
 * Converts a hex color to an rgba string with the given alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function NarrativeView() {
  const formula = useFormulaStore((s) => s.formula);
  const selectedTokenIndex = useFormulaStore((s) => s.selectedTokenIndex);
  const selectToken = useFormulaStore((s) => s.selectToken);

  const [componentsOpen, setComponentsOpen] = useState(false);
  const expandHeight = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  const toggleComponents = useCallback(() => {
    const next = !componentsOpen;
    setComponentsOpen(next);
    expandHeight.value = withTiming(next ? 1 : 0, { duration: 250 });
    chevronRotation.value = withTiming(next ? 1 : 0, { duration: 250 });
  }, [componentsOpen]);

  const expandStyle = useAnimatedStyle(() => ({
    maxHeight: expandHeight.value * 300,
    opacity: expandHeight.value,
    overflow: "hidden" as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 90}deg` }],
  }));

  if (!formula) return null;

  const { groups, narrative } = formula.macro;
  // Use assignColors to match FormulaRenderer's macro colorization
  const colors = useMemo(() => assignColors(groups.length), [groups.length]);

  const segments = useMemo(
    () => buildNarrativeSegments(narrative, groups, colors),
    [narrative, groups, colors]
  );

  return (
    <View style={styles.container}>
      {/* Narrative section — color-coded inline spans */}
      <Text className="text-[13px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
        What it means
      </Text>

      <Text style={styles.narrative}>
        {segments.map((seg, i) => {
          if (seg.color && seg.groupIndex !== null) {
            const isSelected = selectedTokenIndex === seg.groupIndex;
            return (
              <Text
                key={i}
                onPress={() =>
                  selectToken(isSelected ? null : seg.groupIndex)
                }
                style={[
                  {
                    color: seg.color,
                    fontWeight: "600",
                    backgroundColor: hexToRgba(seg.color, 0.1),
                    borderRadius: 3,
                  },
                  isSelected && {
                    backgroundColor: hexToRgba(seg.color, 0.2),
                    textDecorationLine: "underline" as const,
                  },
                ]}
              >
                {seg.text}
              </Text>
            );
          }
          return <Text key={i}>{seg.text}</Text>;
        })}
      </Text>

      {/* Collapsible components section */}
      <TouchableOpacity
        style={styles.componentsHeader}
        onPress={toggleComponents}
        activeOpacity={0.7}
      >
        <Animated.Text style={[styles.chevron, chevronStyle]}>
          {"\u25B8"}
        </Animated.Text>
        <Text className="text-[13px] font-semibold text-brand-muted uppercase tracking-wide ml-1">
          Components ({groups.length})
        </Text>
      </TouchableOpacity>

      <Animated.View style={expandStyle}>
        <ScrollView
          style={styles.componentsList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group, i) => {
            const color = colors[i];
            const isSelected = selectedTokenIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.card,
                  isSelected && { borderColor: color, borderWidth: 2 },
                ]}
                onPress={() => selectToken(isSelected ? null : i)}
                activeOpacity={0.7}
              >
                <View style={[styles.colorBar, { backgroundColor: color }]} />
                <View className="flex-1 p-3">
                  <Text style={[styles.label, { color }]}>{group.label}</Text>
                  <Text
                    className="text-[13px] text-brand-warmgray mt-[3px]"
                    style={{ fontFamily: "SpaceMono" }}
                  >
                    {group.latex.join("  ")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  narrative: {
    fontSize: 16,
    lineHeight: 26,
    color: "#3D4148",
  },
  componentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8E0D4",
  },
  chevron: {
    fontSize: 14,
    color: "#A89F95",
  },
  componentsList: {
    maxHeight: 280,
    gap: 8,
  },
  card: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "#EDE7DB",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 8,
  },
  colorBar: {
    width: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
