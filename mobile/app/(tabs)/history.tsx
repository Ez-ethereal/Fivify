import React from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useFormulaStore } from "@/store/formulaStore";
import { FormulaData } from "@/types/formula";

export default function HistoryScreen() {
  const router = useRouter();
  const history = useFormulaStore((s) => s.history);
  const setFormula = useFormulaStore((s) => s.setFormula);

  const handleSelect = (item: FormulaData) => {
    setFormula(item);
    router.push(`/formula/${item.id}`);
  };

  if (history.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8 bg-brand-cream">
        <Text className="text-5xl mb-3">📐</Text>
        <Text className="text-lg font-semibold text-brand-charcoal">
          No formulas yet
        </Text>
        <Text className="text-sm text-brand-muted mt-1">
          Capture or load a formula to see it here.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-cream">
      <FlatList
        data={history}
        keyExtractor={(item) => item.id + item.timestamp}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="p-4 rounded-xl bg-brand-surface"
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
          >
            <Text
              className="text-sm text-brand-charcoal"
              style={{ fontFamily: "SpaceMono" }}
              numberOfLines={1}
            >
              {item.latex}
            </Text>
            <Text className="text-xs text-brand-muted mt-1.5">
              {item.micro.tokens.length} tokens · {item.macro.groups.length}{" "}
              groups
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
