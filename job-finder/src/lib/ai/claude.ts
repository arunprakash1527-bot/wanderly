import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function client() {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

interface CallOpts {
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}

export interface ClaudeResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function callClaude({ system, user, maxTokens = 2048, json = false }: CallOpts): Promise<ClaudeResult> {
  const sys = json
    ? `${system}\n\nReturn ONLY valid JSON with no surrounding prose or code fences.`
    : system;

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: sys,
    messages: [{ role: "user", content: user }],
  });

  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  return {
    text,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    model: MODEL,
  };
}

/** Sonnet 4.6 pricing (USD per MTok). Update if Anthropic adjusts. */
const PRICE = { input: 3, output: 15 };
export function estimateCostCents(input: number, output: number) {
  const usd = (input / 1_000_000) * PRICE.input + (output / 1_000_000) * PRICE.output;
  return Math.round(usd * 100);
}
