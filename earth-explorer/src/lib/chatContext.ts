// Builds the system prompt + grounding JSON the AI co-pilot sees.

export interface GaiaAppContext {
  view: string;
  selectedChannel?: string | null;
  selectedEvent?: {
    id: string;
    title: string;
    category?: string;
    date?: string;
    lat?: number;
    lon?: number;
  } | null;
  selectedSatellite?: {
    id: string;
    name: string;
    agency?: string;
    mission?: string;
    livePosition?: { lat: number; lon: number; altKm: number };
    currentlyOver?: string;
    nextPassOverUserRegion?: string;
  } | null;
  selectedRegion?: {
    country?: string;
    state?: string;
    area?: string;
    center?: { lat: number; lon: number };
  } | null;
  visibleFleet?: Array<{ id: string; name: string; agency: string }>;
}

export const SYSTEM_PROMPT = `You are GAIA Oracle, an Earth-science co-pilot grounded in NASA, ISRO, ESA, and NOAA data.
Rules:
- Answer in 2-3 short paragraphs, no filler.
- When the user asks about a satellite, use the livePosition and currentlyOver fields from context. Be specific — say "Cartosat-3 is currently 509 km above the Western Ghats in India" not just "it's over India".
- When the user asks about an event, use the selectedEvent's category, date and coordinates.
- Support Hinglish (English + Hindi mix) queries naturally.
- Cite sources when possible (NASA EONET, CelesTrak, IUCN, NASA GIBS). Never invent citations.
- If asked about non-Earth-science topics, politely redirect.
`;

export function buildContextPreamble(ctx: GaiaAppContext): string {
  return `Here is the user's current GAIA Jukebox state (JSON):\n\`\`\`json\n${JSON.stringify(
    ctx,
    null,
    2
  )}\n\`\`\`\nUse this when answering. If a field is null, don't mention it.`;
}

export function suggestedQuestions(ctx: GaiaAppContext): string[] {
  if (ctx.selectedSatellite) {
    return [
      `Where is ${ctx.selectedSatellite.name} right now?`,
      `What is ${ctx.selectedSatellite.name} doing today?`,
      `When does it pass over my region?`,
    ];
  }
  if (ctx.selectedEvent) {
    return [
      `What causes ${ctx.selectedEvent.category ?? 'this'}?`,
      `How does this compare to past events?`,
      `Which satellites track this?`,
    ];
  }
  if (ctx.selectedChannel === 'satellite-fleet') {
    return ['What does Cartosat-3 do?', 'How are satellites tracked?', 'Show me Indian satellites.'];
  }
  if (ctx.selectedChannel === 'earths-secrets') {
    return ['Tell me about Roopkund.', 'Why does the Sahara feed the Amazon?', 'What is Catatumbo lightning?'];
  }
  if (ctx.selectedChannel === 'biodiversity') {
    return ['Great Indian Bustard status?', 'Which species are India-endemic?', 'How does climate hit snow leopards?'];
  }
  return [
    'Why are wildfires worse this year?',
    'What is NavIC?',
    "Show me today's biggest Earth event.",
  ];
}
