import axios from "axios";
import * as FileSystem from 'expo-file-system';
import {
  FormulaData,
  OCRResponse,
  ChatResponse,
  ChatMessage,
  TestParseResponse,
  MacroGroup
} from "@/types/formula";

const client = axios.create({
  // Use your machine's LAN IP so Expo Go on a physical device can connect.
  // Change this back to "http://localhost:8000/api" for the iOS simulator.
  baseURL: "http://137.165.103.139:8000/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export async function sendOCR(imageUri: string): Promise<OCRResponse> {
  // Create FormData
  const formData = new FormData();

  // Append file with proper typing
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'formula.jpg',
  } as any);  // TypeScript workaround for React Native FormData

  // Upload with multipart content type and extended timeout
  const { data } = await client.post<OCRResponse>("/ocr", formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 30000,  // 30s timeout for OCR processing
  });

  return data;
}

export async function parseFormula(response: TestParseResponse): Promise<FormulaData> {
  const { data } = await client.post<FormulaData>("/parse", response);
  return data;
}

export async function testParseFormula(latex: string): Promise<TestParseResponse> {
  const { data } = await client.post<TestParseResponse>("/parse_new", null, {
    params: { latex },
    timeout: 120000,  // 120s timeout — structured output with long prompts can take 45s+
  });
  return data;
}



export async function sendChat(
  formulaId: string,
  messages: ChatMessage[],
  focusedTerm?: string
): Promise<ChatResponse> {
  const { data } = await client.post<ChatResponse>("/chat", {
    formula_id: formulaId,
    messages,
    focused_term: focusedTerm,
  });
  return data;
}
