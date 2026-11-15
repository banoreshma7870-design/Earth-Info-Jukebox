// Browser TTS wrapper + narration-script builder.
// One global stream — a new play() stops the current utterance.

export interface NarrationEvent {
  title: string;
  category?: string;
  location?: string;
  date?: string;
  lat?: number;
  lon?: number;
  magnitude?: string | number;
  source?: string;
  description?: string;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

function notify() {
  for (const fn of listeners) fn(currentId);
}

export function onNarrationChange(fn: (id: string | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function currentNarrationId(): string | null {
  return currentId;
}

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function buildScript(ev: NarrationEvent): string {
  const parts: string[] = [];
  parts.push(`Now streaming: ${ev.title}.`);
  if (ev.location) parts.push(`Location: ${ev.location}.`);
  if (ev.category) parts.push(`Category: ${ev.category}.`);
  if (ev.date) parts.push(`Active since ${formatDate(ev.date)}.`);
  if (ev.lat !== undefined && ev.lon !== undefined) {
    parts.push(
      `Satellite imagery tracks this at ${Math.abs(ev.lat).toFixed(1)} degrees ${
        ev.lat >= 0 ? 'north' : 'south'
      }, ${Math.abs(ev.lon).toFixed(1)} degrees ${ev.lon >= 0 ? 'east' : 'west'}.`
    );
  }
  if (ev.magnitude !== undefined && ev.magnitude !== null) {
    parts.push(`Intensity: ${ev.magnitude}.`);
  }
  if (ev.source) parts.push(`Source: ${ev.source}.`);
  if (ev.description) parts.push(ev.description);
  return parts.join(' ');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred =
    voices.find((v) => /en-IN/i.test(v.lang)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang));
  return preferred || voices[0];
}

export function stop() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  currentId = null;
  notify();
}

export function play(id: string, ev: NarrationEvent, opts?: { muted?: boolean }) {
  if (!isSupported()) return;
  if (opts?.muted) return;

  stop();
  const text = buildScript(ev);
  const utt = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utt.voice = voice;
  utt.rate = 1.02;
  utt.pitch = 1.0;
  utt.volume = 0.9;
  utt.onend = () => {
    if (currentId === id) {
      currentUtterance = null;
      currentId = null;
      notify();
    }
  };
  utt.onerror = utt.onend;

  currentUtterance = utt;
  currentId = id;
  window.speechSynthesis.speak(utt);
  notify();
}

export function toggle(id: string, ev: NarrationEvent, opts?: { muted?: boolean }) {
  if (currentId === id) stop();
  else play(id, ev, opts);
}
