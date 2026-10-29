import { z } from "zod";

import type {
  EmbeddingResponse,
  InferenceClient,
  InferenceOptions,
  InferenceResponse,
} from "./inference";

export interface AnthropicInferenceConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxOutputTokens: number;
  timeoutSec: number;
  effort?: "low" | "medium" | "high" | "max";
}

const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  stop_reason: z.string().nullish(),
  usage: z
    .object({ input_tokens: z.number(), output_tokens: z.number() })
    .optional(),
});

/** Text-only Messages provider; image and embedding models require separate support. */
export class AnthropicInferenceClient implements InferenceClient {
  readonly supportsImageInference = false;
  constructor(private readonly config: AnthropicInferenceConfig) {}

  async inferFromText(
    prompt: string,
    opts: Partial<InferenceOptions>,
  ): Promise<InferenceResponse> {
    const timeout = AbortSignal.timeout(this.config.timeoutSec * 1000);
    const signal = opts.abortSignal
      ? AbortSignal.any([timeout, opts.abortSignal])
      : timeout;
    const content = opts.schema
      ? `${prompt}\nReturn only JSON matching this schema:\n${JSON.stringify(z.toJSONSchema(opts.schema))}`
      : prompt;
    const result = await fetch(
      `${this.config.baseURL.replace(/\/$/, "")}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxOutputTokens,
          ...(this.config.effort
            ? { output_config: { effort: this.config.effort } }
            : {}),
          messages: [{ role: "user", content }],
        }),
        signal,
      },
    );
    // Do not include provider bodies/headers in logs: they may contain sensitive content.
    if (!result.ok) {
      await result.body?.cancel();
      throw new Error(`Messages inference failed with HTTP ${result.status}`);
    }
    const data = responseSchema.parse(await result.json());
    if (data.stop_reason === "max_tokens") {
      throw new Error(
        "Messages inference output was truncated; increase INFERENCE_MAX_OUTPUT_TOKENS",
      );
    }
    const response = data.content
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();
    if (!response) throw new Error("Messages inference returned no text");
    return {
      response,
      totalTokens: data.usage
        ? data.usage.input_tokens + data.usage.output_tokens
        : undefined,
    };
  }

  async inferFromImage(): Promise<InferenceResponse> {
    throw new Error(
      "This Messages provider is configured for text only; image inference is unavailable",
    );
  }

  async generateEmbeddingFromText(): Promise<EmbeddingResponse> {
    throw new Error("Messages API does not provide embeddings");
  }
}
