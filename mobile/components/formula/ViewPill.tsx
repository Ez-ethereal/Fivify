import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { ViewMode } from "@/types/formula";
import { useFormulaStore } from "@/store/formulaStore";

const MODES: { key: ViewMode; label: string }[] = [
  { key: "micro", label: "Micro" },
  { key: "macro", label: "Macro" },
  { key: "custom", label: "Custom" },
];

export default function ViewPill() {
  const viewMode = useFormulaStore((s) => s.viewMode);
  const setViewMode = useFormulaStore((s) => s.setViewMode);

  return (
    <View className="flex-row bg-brand-surface rounded-[8px] p-[3px] self-center">
      {MODES.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.pill,
            viewMode === key && styles.pillActive,
          ]}
          onPress={() => setViewMode(key)}
        >
          <Text
            className={
              viewMode === key
                ? "text-sm font-semibold text-brand-charcoal"
                : "text-sm font-medium text-brand-warmgray"
            }
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  pillActive: {
    backgroundColor: "#F5F0E8",
    shadowColor: "#3D4148",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
});
