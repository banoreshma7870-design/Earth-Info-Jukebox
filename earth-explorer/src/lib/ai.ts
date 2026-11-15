// Groq API wrapper (OpenAI-compatible endpoint) with streaming.
// Falls back to a friendly "unconfigured" message when VITE_GROQ_API_KEY is missing.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function hasApiKey(): boolean {
  return !!(import.meta.env.VITE_GROQ_API_KEY as string | undefined);
}

export async function streamChat(
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const key = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!key) {
    onToken(
      "I'm not wired up to an AI backend yet. Add a VITE_GROQ_API_KEY to your .env file (get a free key at console.groq.com) and I'll come online."
    );
    return;
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 700,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 160)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onToken(delta);
      } catch {
        /* ignore partial frames */
      }
    }
  }
}
