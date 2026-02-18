import { create } from "zustand";
import { FormulaData, ViewMode } from "@/types/formula";

interface FormulaState {
  formula: FormulaData | null;
  viewMode: ViewMode;
  selectedTokenIndex: number | null;
  history: FormulaData[];

  setFormula: (formula: FormulaData) => void;
  setViewMode: (mode: ViewMode) => void;
  selectToken: (index: number | null) => void;
  clearFormula: () => void;
}

export const useFormulaStore = create<FormulaState>((set) => ({
  formula: null,
  viewMode: "micro",
  selectedTokenIndex: null,
  history: [],

  setFormula: (formula) =>
    set((state) => ({
      formula,
      viewMode: "micro",
      selectedTokenIndex: null,
      history: [formula, ...state.history],
    })),

  setViewMode: (viewMode) => set({ viewMode, selectedTokenIndex: null }),

  selectToken: (selectedTokenIndex) => set({ selectedTokenIndex }),

  clearFormula: () => set({ formula: null, selectedTokenIndex: null }),
}));
