// The seam where real async work happens. This trivial version produces a small JSON artifact;
// replace it with a real provider call (an AI model, an external API, a render). Throw a
// ProviderError with { retryable: false } for permanent failures so the consumer fails fast
// instead of burning all retries (see packages/shared/src/errors.ts).
export interface ProcessInput {
  itemId: string;
  title: string;
  metadata: Record<string, unknown> | null;
}
export interface ProcessResult {
  data: ArrayBuffer;
  contentType: string;
  extension: string;
}

export async function processItem(input: ProcessInput): Promise<ProcessResult> {
  const payload = JSON.stringify(
    { itemId: input.itemId, title: input.title, processedAt: new Date().toISOString() },
    null,
    2,
  );
  const bytes = new TextEncoder().encode(payload);
  return { data: bytes.buffer as ArrayBuffer, contentType: "application/json", extension: "json" };
}
