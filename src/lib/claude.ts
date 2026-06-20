import Anthropic from '@anthropic-ai/sdk';

// Thin Claude client. All five AI calls (Section 11) route through here so the
// model id, defensive JSON parsing and retry behaviour live in one place.

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.'
    );
  }
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type ContentBlock = Anthropic.Messages.ContentBlockParam;

// Built-in web-search server tool (Section 9b web grounding). Runs entirely on
// Anthropic's side; the `_20260209` variant (dynamic filtering) is supported on
// Sonnet 4.6 / Opus 4.6+ and needs no beta header. Kept to a low max_uses so
// grounded generation stays bounded (it can otherwise run for minutes).
export function webSearchTool(maxUses = 2) {
  return { type: 'web_search_20260209', name: 'web_search', max_uses: maxUses } as unknown;
}

interface CallOpts {
  system: string;
  // Either a plain user string, or a structured list of content blocks
  // (used when sending a PDF document for extraction).
  user: string | ContentBlock[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  // Optional server tools (e.g. webSearchTool()). When present, the call runs
  // the server-side tool loop and transparently resumes on `pause_turn`.
  tools?: unknown[];
}

async function rawCall(opts: CallOpts): Promise<string> {
  const client = getClient();
  const content: ContentBlock[] =
    typeof opts.user === 'string' ? [{ type: 'text', text: opts.user }] : opts.user;

  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content }];
  const usingTools = Boolean(opts.tools);
  const base = {
    model: opts.model || DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    // The installed SDK's tool types predate web_search_20260209; the object is
    // passed straight through to the API, so cast to bypass the stale union.
    ...(opts.tools ? { tools: opts.tools as unknown as never } : {}),
  };
  // Per-request timeout so a tool call can never hang the route. Web grounding
  // gets a bounded budget; without tools we keep the SDK default.
  const reqOpts = usingTools ? { timeout: 90_000 } : undefined;

  // Server tools can pause the turn when the search loop hits its cap; re-send
  // the accumulated transcript to resume. Bounded to keep it fast.
  let res = await client.messages.create({ ...base, messages }, reqOpts);
  // `pause_turn` may not be in the installed SDK's stop_reason union; compare as string.
  for (let i = 0; i < 2 && (res.stop_reason as string) === 'pause_turn'; i++) {
    messages.push({ role: 'assistant', content: res.content });
    res = await client.messages.create({ ...base, messages }, reqOpts);
  }

  // The final answer (JSON or prose) is in the last message's text blocks.
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

export async function callText(opts: CallOpts): Promise<string> {
  return rawCall(opts);
}

// Strip stray markdown fences / prose and isolate the JSON payload.
export function extractJson(raw: string): string {
  let s = raw.trim();
  // Remove ```json ... ``` or ``` ... ``` fences.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // If there is leading/trailing prose, slice to the outermost bracket pair.
  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  const start =
    firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start > 0) {
    const lastObj = s.lastIndexOf('}');
    const lastArr = s.lastIndexOf(']');
    const end = Math.max(lastObj, lastArr);
    if (end > start) s = s.slice(start, end + 1);
  }
  return s.trim();
}

// JSON-only call with defensive parsing + a single retry on parse failure
// (Section 11). `validate` should throw if the shape is wrong.
export async function callJson<T>(
  opts: CallOpts & { validate?: (value: unknown) => T }
): Promise<T> {
  const attempt = async (): Promise<T> => {
    const raw = await rawCall({ temperature: 0.2, ...opts });
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as unknown;
    return opts.validate ? opts.validate(parsed) : (parsed as T);
  };

  try {
    return await attempt();
  } catch (err) {
    // Retry once — most failures are a stray fence or a truncated first token.
    return await attempt();
  }
}

// Helper to build a PDF document content block for the extractor (Track 1).
export function pdfBlock(base64: string): ContentBlock {
  return {
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: base64 },
  };
}

export function textBlock(text: string): ContentBlock {
  return { type: 'text', text };
}
