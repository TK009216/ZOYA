/// <reference lib="esnext" />

const DS_API_BASE = "http://127.0.0.1:22217";
const DS_API_KEY = "sk-zoya-test-key-2026";
const PORT = 22218;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  reasoning_effort?: "none" | "low" | "medium" | "high";
  tools?: any[];
  tool_choice?: any;
}

const MODEL_MAP: Record<string, string> = {
  "deepseek-flash": "deepseek-default",
  "deepseek-chat": "deepseek-default",
  "deepseek-v4-flash": "deepseek-default",
  "deepseek-pro": "deepseek-expert",
  "deepseek-v4-pro": "deepseek-expert",
  "deepseek-expert": "deepseek-expert",
  "deepseek-r1": "deepseek-expert",
  "deepseek-reasoner": "deepseek-expert",
};

const DEFAULT_MODEL = "deepseek-default";

function mapModel(model: string): { mapped: string; reasoning: string | undefined } {
  const lower = model.toLowerCase();
  const mapped = MODEL_MAP[lower] || DEFAULT_MODEL;

  let reasoning: string | undefined;
  if (lower.includes("r1") || lower.includes("reason")) {
    reasoning = "high";
  } else if (lower.includes("flash")) {
    reasoning = "none";
  }

  return { mapped, reasoning };
}

function buildHeaders(apiKey?: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${apiKey || DS_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function handleChatCompletions(req: Request): Promise<Response> {
  const body = await req.json() as ChatRequest;
  const { mapped: mappedModel, reasoning: defaultReasoning } = mapModel(body.model);

  // Build request to ds-free-api
  const dsRequest: Record<string, any> = {
    model: mappedModel,
    messages: body.messages,
    stream: body.stream ?? false,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 384000,
  };

  // Determine reasoning effort
  const reasoningEffort = body.reasoning_effort || defaultReasoning;
  if (reasoningEffort) {
    dsRequest.reasoning_effort = reasoningEffort;
  }

  if (body.tools && body.tools.length > 0) {
    dsRequest.tools = body.tools;
  }
  if (body.tool_choice) {
    dsRequest.tool_choice = body.tool_choice;
  }

  const headers = buildHeaders();

  if (body.stream) {
    // Streaming response
    const dsResp = await fetch(`${DS_API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(dsRequest),
    });

    if (!dsResp.ok) {
      const errText = await dsResp.text();
      return new Response(errText, { status: dsResp.status, headers: { "Content-Type": "application/json" } });
    }

    if (dsResp.body) {
      const stream = new ReadableStream({
        async start(controller) {
          const reader = dsResp.body!.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    return new Response("", { status: 204 });
  } else {
    // Non-streaming
    const dsResp = await fetch(`${DS_API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(dsRequest),
    });

    const data = await dsResp.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleModels(req: Request): Promise<Response> {
  const headers = buildHeaders();

  // Try getting models from ds-free-api
  try {
    const dsResp = await fetch(`${DS_API_BASE}/v1/models`, { headers });
    const data = await dsResp.json() as any;
    const models = (data.data || []).filter((m: any) => m.id !== "");

    const ourModels = [
      {
        id: "deepseek-flash",
        object: "model",
        created: 1090108800,
        owned_by: "deepseek-web (ZOYA proxy)",
        description: "DeepSeek V4 Flash — Fast, lightweight (Instant mode)",
        max_input_tokens: 1048576,
        max_output_tokens: 384000,
      },
      {
        id: "deepseek-pro",
        object: "model",
        created: 1090108800,
        owned_by: "deepseek-web (ZOYA proxy)",
        description: "DeepSeek V4 Pro — High quality (Expert mode)",
        max_input_tokens: 1048576,
        max_output_tokens: 384000,
      },
      {
        id: "deepseek-r1",
        object: "model",
        created: 1090108800,
        owned_by: "deepseek-web (ZOYA proxy)",
        description: "DeepSeek R1 — Reasoning with chain-of-thought",
        max_input_tokens: 1048576,
        max_output_tokens: 384000,
      },
    ];

    return new Response(JSON.stringify({ object: "list", data: ourModels }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let response: Response;

    if (path === "/v1/chat/completions" && req.method === "POST") {
      response = await handleChatCompletions(req);
    } else if (path === "/v1/models" && req.method === "GET") {
      response = await handleModels(req);
    } else if (path === "/" || path === "/chat") {
      // Serve web chat UI
      const html = await Bun.file(new URL("../web/index.html", import.meta.url)).text();
      response = new Response(html, { headers: { "Content-Type": "text/html" } });
    } else if (path.startsWith("/web/")) {
      const filePath = new URL(`../web/${path.slice(5)}`, import.meta.url);
      const file = Bun.file(filePath);
      const exists = await file.exists();
      if (exists) {
        const ext = path.split(".").pop() || "";
        const mime: Record<string, string> = {
          html: "text/html",
          js: "application/javascript",
          css: "text/css",
          svg: "image/svg+xml",
        };
        response = new Response(file, { headers: { "Content-Type": mime[ext] || "text/plain" } });
      } else {
        response = new Response("Not found", { status: 404 });
      }
    } else {
      response = new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add CORS to all responses
    for (const [key, val] of Object.entries(corsHeaders)) {
      response.headers.set(key, val);
    }
    return response;
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

console.log(`\n  🚀 DeepSeek Proxy Server`);
console.log(`  ─────────────────────`);
console.log(`  Models:`);
console.log(`    deepseek-flash  → Flash V4 (Instant mode)`);
console.log(`    deepseek-pro    → Pro V4 (Expert mode)`);
console.log(`    deepseek-r1     → R1 (Reasoning)`);
console.log(`  ─────────────────────`);
console.log(`  API:     http://127.0.0.1:${PORT}/v1`);
console.log(`  Chat UI: http://127.0.0.1:${PORT}/chat`);
console.log(`  Backend: ${DS_API_BASE}\n`);

Bun.serve({
  port: PORT,
  fetch: handleRequest,
});
