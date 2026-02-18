/**
 * TypeScript interfaces mirroring backend Pydantic models.
 * Source: backend/app/models/formula.py
 */

export interface MicroToken {
  index: [number, number];
  symbol: string;
  role: "variable" | "constant" | "operator" | "function";
  color_id: string;
  definition?: string;
}

export interface MicroMap {
  tokens: MicroToken[];
}

export interface MacroGroup {
  range: [number, number];
  latex: string;
  label: string;
  color_id: string;
  narrative_span?: [number, number];
}

export interface MacroMap {
  groups: MacroGroup[];
  narrative: string;
}

export interface FormulaData {
  id: string;
  latex: string;
  micro: MicroMap;
  macro: MacroMap;
  spark_chips?: string[];
  timestamp: string;
}

export interface OCRRequest {
  image_base64: string;
}

export interface OCRResponse {
  latex: string;
  confidence?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  formula_id: string;
  messages: ChatMessage[];
  focused_term?: string;
}

export interface ChatResponse {
  message: string;
  suggested_questions?: string[];
}

export interface ComponentBreakdown {
  symbol: string;
  counterpart: string;
  role: string;
}

export interface TestParseResponse {
  latex: string;
  explanation: string;
  components: ComponentBreakdown[];
  insights: string[];
}

export type ViewMode = "micro" | "macro" | "custom";
