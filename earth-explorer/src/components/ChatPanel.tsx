import { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { streamChat, hasApiKey, type ChatMessage } from '../lib/ai';
import {
  SYSTEM_PROMPT,
  buildContextPreamble,
  suggestedQuestions,
  type GaiaAppContext,
} from '../lib/chatContext';
import './ChatPanel.css';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  context: GaiaAppContext;
}

interface UIMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export default function ChatPanel({ open, onClose, context }: ChatPanelProps) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const suggestions = suggestedQuestions(context);

  async function send(prompt: string) {
    const q = prompt.trim();
    if (!q || busy) return;
    const next: UIMessage[] = [...messages, { role: 'user', content: q }, { role: 'assistant', content: '', streaming: true }];
    setMessages(next);
    setInput('');
    setBusy(true);

    const payload: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: buildContextPreamble(context) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: q },
    ];

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamChat(
        payload,
        (delta) => {
          setMessages((cur) => {
            const last = cur[cur.length - 1];
            if (!last || last.role !== 'assistant') return cur;
            const next = cur.slice(0, -1);
            next.push({ ...last, content: last.content + delta });
            return next;
          });
        },
        ac.signal
      );
    } catch (e: any) {
      setMessages((cur) => {
        const last = cur[cur.length - 1];
        if (!last || last.role !== 'assistant') return cur;
        const next = cur.slice(0, -1);
        next.push({ ...last, content: `⚠ ${e?.message || 'AI offline.'}` });
        return next;
      });
    } finally {
      setMessages((cur) => {
        const last = cur[cur.length - 1];
        if (!last || last.role !== 'assistant') return cur;
        const next = cur.slice(0, -1);
        next.push({ ...last, streaming: false });
        return next;
      });
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <aside className={`chat-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
      <header className="chat-head">
        <div>
          <div className="chat-kicker">
            <Sparkles size={12} /> GAIA ORACLE
          </div>
          <div className="chat-title">AI Co-Pilot</div>
        </div>
        <button className="chat-x" onClick={onClose} aria-label="Close chat">
          <X size={16} />
        </button>
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>
              I'm your DJ — I know what you're looking at. Ask about events, satellites, or anything Earth-science.
              Hinglish works too.
            </p>
            {!hasApiKey() && (
              <p className="chat-warn">
                Add <code>VITE_GROQ_API_KEY</code> to <code>.env</code> (free at console.groq.com) for live responses.
              </p>
            )}
            <div className="chat-chips">
              {suggestions.map((s) => (
                <button key={s} className="chat-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.content}
            {m.streaming && <span className="chat-caret" />}
          </div>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          type="text"
          placeholder="Ask GAIA Oracle…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
          {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </form>
    </aside>
  );
}
