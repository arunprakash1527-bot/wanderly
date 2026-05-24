const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; [key: string]: unknown }>
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>
  usage: { input_tokens: number; output_tokens: number }
}

export async function callClaude(
  messages: ClaudeMessage[],
  options: {
    system?: string
    maxTokens?: number
    model?: string
  } = {}
): Promise<ClaudeResponse> {
  const { system, maxTokens = 4096, model = 'claude-sonnet-4-20250514' } = options

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error (${response.status}): ${error}`)
  }

  return response.json()
}

export function extractTextFromResponse(response: ClaudeResponse): string {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text || '')
    .join('\n')
}

export function parseJsonFromResponse<T>(response: ClaudeResponse): T {
  const text = extractTextFromResponse(response)
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}
