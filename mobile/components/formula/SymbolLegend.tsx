import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useFormulaStore } from "@/store/formulaStore";
import { resolveColor } from "@/utils/colors";

export default function SymbolLegend() {
  const formula = useFormulaStore((s) => s.formula);
  const selectedTokenIndex = useFormulaStore((s) => s.selectedTokenIndex);
  const selectToken = useFormulaStore((s) => s.selectToken);

  if (!formula || !formula.micro) return null;

  const { tokens } = formula.micro;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View className="flex-row items-center mb-3">
        <Text className="text-[11px] font-bold text-brand-muted uppercase tracking-[1.5px]">
          Symbol Legend
        </Text>
        <View className="flex-1 h-px bg-brand-sand ml-3" />
      </View>
      {tokens.map((token, i) => {
        const color = resolveColor(token.color_id);
        const isSelected = selectedTokenIndex === i;
        return (
          <TouchableOpacity
            key={i}
            style={[styles.card, isSelected && { borderColor: color, borderWidth: 2 }]}
            onPress={() => selectToken(isSelected ? null : i)}
            activeOpacity={0.7}
          >
            <View style={styles.swatchContainer}>
              <View style={[styles.swatch, { backgroundColor: color }]} />
            </View>
            <View style={styles.cardContent}>
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
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#EDE7DB",
    borderWidth: 1,
    borderColor: "#E8E0D4",
    shadowColor: "#3D4148",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    overflow: "hidden",
  },
  swatchContainer: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 14,
  },
  symbol: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "SpaceMono",
  },
});
