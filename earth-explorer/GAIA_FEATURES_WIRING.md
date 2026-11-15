# GAIA Jukebox — Feature Wiring (30-min demo path)

Everything new sits under `src/`. These are the files just added and how to plug them into your existing `App.tsx`.

## 1. Install the one new dep

```bash
npm install satellite.js
```

(Everything else is already in `package.json` — React, framer-motion, lucide-react, globe.gl, three.)

## 2. Add your API key (optional — chat still shows a placeholder without it)

Create `.env` at the repo root:

```
VITE_GROQ_API_KEY=your_free_key_from_console.groq.com
```

Add `.env` to `.gitignore`.

## 3. New files you now have

```
src/
├── data/
│   ├── satellites.json          # Fleet with NORAD IDs
│   ├── earthSecrets.json        # 9 curated secrets (2 India)
│   ├── species.json             # 10 species (8 India)
│   ├── mythBuster.json          # 10 myths
│   └── countryStates.json       # fallback picker list
├── lib/
│   ├── tle.ts                   # CelesTrak fetcher + 6h session cache
│   ├── satellitePosition.ts     # propagate + coarse reverse geocode
│   ├── narration.ts             # browser TTS wrapper
│   ├── ai.ts                    # Groq streaming client
│   ├── chatContext.ts           # system prompt + grounding JSON
│   ├── eonet.ts                 # EONET with bbox support
│   ├── geocoding.ts             # Nominatim wrappers
│   └── regionFilter.ts          # Region shape + session persistence
├── hooks/
│   └── useLiveSatellites.ts     # Hook: TLE + propagation every 3s
├── components/
│   ├── ChatPanel.tsx/.css       # Slide-in AI Co-Pilot
│   ├── NarrationButton.tsx/.css # Play button + waveform
│   ├── EventDetailPanel.tsx/.css
│   ├── RegionPickerModal.tsx/.css
│   ├── RegionChip.tsx/.css
│   ├── SecretCard.tsx/.css
│   ├── SpeciesCard.tsx/.css
│   └── MythBuster.tsx/.css
├── views/
│   ├── EarthSecrets.tsx/.css
│   └── Biodiversity.tsx/.css
└── types/
    └── satellite.d.ts           # shim if types missing
```

## 4. Wire into `App.tsx` — minimal diff

At the top of `App.tsx`:

```tsx
import { useState } from 'react';
import ChatPanel from './components/ChatPanel';
import EventDetailPanel from './components/EventDetailPanel';
import RegionPickerModal from './components/RegionPickerModal';
import RegionChip from './components/RegionChip';
import MythBuster from './components/MythBuster';
import EarthSecrets from './views/EarthSecrets';
import Biodiversity from './views/Biodiversity';
import { fetchEonet, type EonetEvent } from './lib/eonet';
import { loadRegion, saveRegion, bboxForEonet, type Region } from './lib/regionFilter';
import type { GaiaAppContext } from './lib/chatContext';
```

Inside the `App` component (add state near your existing state):

```tsx
const [region, setRegion] = useState<Region | null>(loadRegion());
const [regionPickerOpen, setRegionPickerOpen] = useState(false);
const [pendingChannel, setPendingChannel] = useState<string | null>(null);
const [activeChannel, setActiveChannel] = useState<string | null>(null);
const [chatOpen, setChatOpen] = useState(false);
const [selectedEvent, setSelectedEvent] = useState<EonetEvent | null>(null);
const [muted, setMuted] = useState(false); // tie into your existing soundEnabled if present
```

Handler: click a channel card → open region picker if no region:

```tsx
function handleChannelClick(id: string) {
  if (!region) {
    setPendingChannel(id);
    setRegionPickerOpen(true);
    return;
  }
  setActiveChannel(id);
}

function handleRegionConfirm(r: Region) {
  saveRegion(r);
  setRegion(r);
  setRegionPickerOpen(false);
  if (pendingChannel) {
    setActiveChannel(pendingChannel);
    setPendingChannel(null);
  }
}
```

EONET fetch with region bbox:

```tsx
useEffect(() => {
  const load = () =>
    fetchEonet({ bbox: region ? bboxForEonet(region) : undefined }).then(setEvents).catch(console.error);
  load();
  const t = setInterval(load, 5 * 60 * 1000);
  return () => clearInterval(t);
}, [region]);
```

Chat context builder:

```tsx
const chatContext: GaiaAppContext = {
  view: activeChannel ?? 'overview',
  selectedChannel: activeChannel,
  selectedEvent: selectedEvent
    ? {
        id: selectedEvent.id,
        title: selectedEvent.title,
        category: selectedEvent.category,
        date: selectedEvent.date,
        lat: selectedEvent.lat ?? undefined,
        lon: selectedEvent.lon ?? undefined,
      }
    : null,
  selectedRegion: region ? { country: region.country, state: region.state, area: region.area, center: region.center } : null,
};
```

Mount near the bottom of the JSX (above `</div>` of root):

```tsx
{region && (
  <div style={{ padding: '0.8rem 1.8rem' }}>
    <RegionChip region={region} onChange={() => setRegionPickerOpen(true)} />
  </div>
)}

<RegionPickerModal
  open={regionPickerOpen}
  onClose={() => setRegionPickerOpen(false)}
  onConfirm={handleRegionConfirm}
  initial={region}
/>

<ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} context={chatContext} />

<EventDetailPanel
  event={selectedEvent}
  onClose={() => setSelectedEvent(null)}
  onAskAi={(ev) => { setSelectedEvent(ev); setChatOpen(true); }}
  onShowOnGlobe={(ev) => globeRef.current?.pointOfView({ lat: ev.lat!, lng: ev.lon!, altitude: 1.5 }, 2000)}
  muted={muted}
/>
```

Wire the topbar chat button:

```tsx
<button onClick={() => setChatOpen(true)}><MessageSquare size={18} /></button>
```

Event card click (replace external link):

```tsx
<div onClick={() => setSelectedEvent(ev)} className="event-card">
  {/* existing content */}
</div>
```

Channel routing (example):

```tsx
{activeChannel === 'myth-buster' && <MythBuster />}
{activeChannel === 'earths-secrets' && (
  <EarthSecrets region={region} muted={muted}
    onShowOnGlobe={(lat, lon) => globeRef.current?.pointOfView({ lat, lng: lon, altitude: 1.5 }, 2000)} />
)}
{activeChannel === 'biodiversity' && (
  <Biodiversity region={region} muted={muted}
    onShowOnGlobe={(lat, lon) => globeRef.current?.pointOfView({ lat, lng: lon, altitude: 1.5 }, 2000)} />
)}
```

## 5. Hook live satellites into your existing OrbitalAtlas

Inside `OrbitalAtlas.tsx`, add:

```tsx
import satellitesData from '../data/satellites.json';
import { useLiveSatellites } from '../hooks/useLiveSatellites';
import { geoToVector3, timeSinceLaunch } from '../lib/satellitePosition';

const FLEET = satellitesData.map((s) => ({ id: s.id, noradId: s.noradId }));

// inside the component:
const { positions, loading } = useLiveSatellites(FLEET, 3000);

// then in your animation loop, position each satellite mesh using:
// const live = positions[sat.id];
// if (live) {
//   const r = EARTH_RADIUS + live.altKm / EARTH_RADIUS_KM; // scale for your scene
//   const [x, y, z] = geoToVector3(live.lat, live.lon, r);
//   mesh.position.set(x, y, z);
// }

// Dossier panel reads:
// positions[sat.id].locationLabel      → "Currently over: Western Ghats"
// positions[sat.id].velocityKmS        → live speed
// timeSinceLaunch(sat.launchDate)      → "5y 11mo"
```

If CelesTrak is unreachable, `positions` stays empty — your existing static orbit code acts as the fallback.

## 6. Narration button on event cards

Inside your existing event card JSX:

```tsx
import NarrationButton from './components/NarrationButton';

<NarrationButton
  id={`evt-${ev.id}`}
  event={{
    title: ev.title, category: ev.category, date: ev.date,
    lat: ev.lat ?? undefined, lon: ev.lon ?? undefined,
    magnitude: ev.magnitude ?? undefined, source: ev.sources?.[0]?.id,
  }}
  muted={muted}
/>
```

## Priority if you're sprinting

1. `npm install satellite.js` (10 sec)
2. Paste the `App.tsx` state + handlers above (3 min)
3. Mount `<ChatPanel>`, `<EventDetailPanel>`, `<RegionPickerModal>`, `<RegionChip>` (2 min)
4. Wire channel cards → `handleChannelClick` (1 min)
5. Add NarrationButton to each event card (1 min)
6. Live sats in OrbitalAtlas (5 min — optional, static works too)
7. Myth Buster is one line: render `<MythBuster />` on your Myth channel route

Demo order:
- Open Planet in Motion → pick Uttarakhand, Nainital → EONET filters to region
- Click a wildfire → EventDetailPanel slides in → press Play Narration → voice reads
- Click Ask AI → Chat panel opens, suggestions already contextualized
- Switch to Satellite Fleet → satellites move with live TLE data
- Switch to Earth's Secrets → open Roopkund → Show on Globe
- Switch to Myth Buster → flip a card

That's it. Everything is mounted, filtered by region, and the chat already knows what you're looking at.
