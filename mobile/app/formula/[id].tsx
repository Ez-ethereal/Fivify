import React from "react";
import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { useFormulaStore } from "@/store/formulaStore";
import FormulaRenderer from "@/components/formula/FormulaRenderer";
import ViewPill from "@/components/formula/ViewPill";
import SymbolLegend from "@/components/formula/SymbolLegend";
import NarrativeView from "@/components/formula/NarrativeView";

export default function FormulaDetailScreen() {
  const formula = useFormulaStore((s) => s.formula);
  const viewMode = useFormulaStore((s) => s.viewMode);

  if (!formula) {
    return (
      <View className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-brand-muted">No formula loaded.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-cream">
      <Stack.Screen options={{ title: "Formula" }} />

      {/* Top Zone: KaTeX-rendered formula with color highlighting */}
      <FormulaRenderer />

      {/* Middle: View switcher */}
      <View className="py-3.5 items-center">
        <ViewPill />
      </View>

      {/* Bottom Zone: context view */}
      <View className="flex-1">
        {viewMode === "micro" && <SymbolLegend />}
        {viewMode === "macro" && <NarrativeView />}
        {viewMode === "custom" && (
          <View className="flex-1 items-center justify-center">
            <Text className="text-brand-muted text-[15px]">
              Custom view coming in Milestone 4
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
