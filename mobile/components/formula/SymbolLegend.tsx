import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useFormulaStore } from "@/store/formulaStore";
import { resolveColor } from "@/utils/colors";

export default function SymbolLegend() {
  const formula = useFormulaStore((s) => s.formula);
  const selectedTokenIndex = useFormulaStore((s) => s.selectedTokenIndex);
  const selectToken = useFormulaStore((s) => s.selectToken);

  if (!formula) return null;

  const { tokens } = formula.micro;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text className="text-[13px] font-semibold text-brand-muted uppercase tracking-wide mb-1">
        Symbol Legend
      </Text>
      {tokens.map((token, i) => {
        const color = resolveColor(token.color_id);
        const isSelected = selectedTokenIndex === i;
        return (
          <TouchableOpacity
            key={i}
            style={[styles.row, isSelected && { backgroundColor: color + "18" }]}
            onPress={() => selectToken(isSelected ? null : i)}
            activeOpacity={0.7}
          >
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <View className="flex-1">
              <Text
                style={[styles.symbol, { color }]}
              >
                {token.symbol}
              </Text>
              <Text className="text-xs text-brand-warmgray capitalize mt-px">
                {token.role}
              </Text>
              {token.definition && (
                <Text className="text-sm text-brand-charcoal mt-[3px]">
                  {token.definition}
                </Text>
              )}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#EDE7DB",
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 12,
  },
  symbol: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "SpaceMono",
  },
});
