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



/**
 * Streaming version of testParseFormula.
 * Connects to the SSE endpoint, logs each chunk to console,
 * and returns the final TestParseResponse when the stream completes.
 */
export async function streamParseFormula(latex: string): Promise<TestParseResponse> {
  const baseURL = client.defaults.baseURL;
  const url = `${baseURL}/parse_new/stream?latex=${encodeURIComponent(latex)}`;

  console.log("\n[STREAM] Connecting to:", url);
  const t0 = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Accept": "text/event-stream" },
  });

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream not supported in this environment");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: TestParseResponse | null = null;
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines from the buffer
    const lines = buffer.split("\n");
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);

          if (currentEvent === "chunk") {
            chunkCount++;
            const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
            console.log(
              `[STREAM] chunk #${parsed.chunk_number} | +${parsed.chunk.length} chars | ${elapsed}s | ${JSON.stringify(parsed.chunk).slice(0, 80)}`
            );
          } else if (currentEvent === "complete") {
            const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
            console.log(`\n[STREAM] === COMPLETE === | ${chunkCount} chunks | ${elapsed}s`);
            console.log("[STREAM] Explanation:", parsed.explanation);
            console.log("[STREAM] Components:");
            parsed.components?.forEach((c: any) => {
              console.log(`  ${c.symbol.join(", ")} → "${c.counterpart}" (${c.role})`);
            });
            finalResult = parsed as TestParseResponse;
          } else if (currentEvent === "error") {
            console.error("[STREAM] ERROR:", parsed.error);
            throw new Error(parsed.error);
          }
        } catch (e) {
          // JSON parse failure on partial data — skip
          if (currentEvent === "error") throw e;
        }
        currentEvent = "";
      }
    }
  }

  if (!finalResult) {
    throw new Error("Stream ended without a complete event");
  }

  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`[STREAM] Total wall time: ${totalElapsed}s\n`);

  return finalResult;
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
