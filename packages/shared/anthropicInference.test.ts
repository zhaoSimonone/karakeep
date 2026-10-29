import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AnthropicInferenceClient } from "./anthropicInference";

const config = {
  apiKey: "test-secret",
  baseURL: "https://example.invalid/anthropic/v1/",
  model: "MiniMax-M3.1-Flash",
  maxOutputTokens: 4096,
  timeoutSec: 10,
  effort: "max" as const,
};

afterEach(() => vi.unstubAllGlobals());

describe("Messages text inference", () => {
  it("sends the configured Messages request and extracts text, not reasoning", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            { type: "thinking", thinking: "private" },
            { type: "text", text: '{"tags":["知识管理"]}' },
          ],
          stop_reason: "end_turn",
          usage: { input_tokens: 30, output_tokens: 12 },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await new AnthropicInferenceClient(config).inferFromText(
      "Tag this",
      { schema: z.object({ tags: z.array(z.string()) }) },
    );
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe("https://example.invalid/anthropic/v1/messages");
    expect(init.headers.Authorization).toBe("Bearer test-secret");
    expect(body).toMatchObject({
      model: config.model,
      max_tokens: 4096,
      output_config: { effort: "max" },
    });
    expect(body.messages[0].content).toContain('"tags"');
    expect(result).toEqual({
      response: '{"tags":["知识管理"]}',
      totalTokens: 42,
    });
  });

  it("does not leak provider error content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("test-secret", { status: 401 })),
    );
    await expect(
      new AnthropicInferenceClient(config).inferFromText("hi", {}),
    ).rejects.toThrow("Messages inference failed with HTTP 401");
  });

  it.each([
    { content: [{ type: "text", text: "partial" }], stop_reason: "max_tokens" },
    { content: [{ type: "thinking" }], stop_reason: "end_turn" },
  ])("rejects truncated or empty output", async (body) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body))),
    );
    await expect(
      new AnthropicInferenceClient(config).inferFromText("hi", {}),
    ).rejects.toThrow();
  });

  it("propagates caller cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        init.signal.throwIfAborted();
      }),
    );
    await expect(
      new AnthropicInferenceClient(config).inferFromText("hi", {
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("does not call the text API for image or embedding requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = new AnthropicInferenceClient(config);
    expect(client.supportsImageInference).toBe(false);
    await expect(client.inferFromImage()).rejects.toThrow("text only");
    await expect(client.generateEmbeddingFromText()).rejects.toThrow(
      "embeddings",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
