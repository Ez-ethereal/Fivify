import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useFormulaStore } from "@/store/formulaStore";
import { resolveColor } from "@/utils/colors";

export default function NarrativeView() {
  const formula = useFormulaStore((s) => s.formula);
  const selectedTokenIndex = useFormulaStore((s) => s.selectedTokenIndex);
  const selectToken = useFormulaStore((s) => s.selectToken);

  if (!formula) return null;

  const { groups, narrative } = formula.macro;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text className="text-[13px] font-semibold text-brand-muted uppercase tracking-wide mb-1">
        What it means
      </Text>

      <Text className="text-base leading-6 text-brand-charcoal">
        {narrative}
      </Text>

      <Text className="text-[13px] font-semibold text-brand-muted uppercase tracking-wide mb-1 mt-5">
        Components
      </Text>

      {groups.map((group, i) => {
        const color = resolveColor(group.color_id);
        const isSelected = selectedTokenIndex === i;
        return (
          <TouchableOpacity
            key={i}
            style={[styles.card, isSelected && { borderColor: color, borderWidth: 2 }]}
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
                {group.latex}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  card: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "#EDE7DB",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  colorBar: {
    width: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
