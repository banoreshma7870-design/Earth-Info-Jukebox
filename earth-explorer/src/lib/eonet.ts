// EONET fetch + normalize. Supports optional bbox filter for Region Picker.

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';

export interface EonetEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  categoryId: string;
  date: string;
  lat: number | null;
  lon: number | null;
  magnitude: string | null;
  sources: Array<{ id: string; url: string }>;
  link: string;
}

export interface Bbox {
  minLon: number;
  maxLat: number;
  maxLon: number;
  minLat: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  wildfires: '#ef4444',
  severeStorms: '#a855f7',
  volcanoes: '#f59e0b',
  seaLakeIce: '#38bdf8',
  floods: '#22d3ee',
  earthquakes: '#f59e0b',
  landslides: '#f59e0b',
  drought: '#ff9933',
  dustHaze: '#ff9933',
  snow: '#e8ecf5',
  tempExtremes: '#ef4444',
  waterColor: '#22d3ee',
  manmade: '#8893b5',
};

export function colorForCategory(id: string): string {
  return CATEGORY_COLOR[id] ?? '#22d3ee';
}

export async function fetchEonet(opts?: { bbox?: Bbox; limit?: number }): Promise<EonetEvent[]> {
  const params = new URLSearchParams({ status: 'open', limit: String(opts?.limit ?? 20) });
  if (opts?.bbox) {
    const { minLon, maxLat, maxLon, minLat } = opts.bbox;
    params.set('bbox', `${minLon},${maxLat},${maxLon},${minLat}`);
  }
  const res = await fetch(`${EONET_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`EONET ${res.status}`);
  const data = await res.json();
  return (data.events ?? []).map(normalize);
}

function normalize(raw: any): EonetEvent {
  const cat = raw.categories?.[0] ?? { id: 'unknown', title: 'Event' };
  const geo = raw.geometry?.[raw.geometry.length - 1];
  let lat: number | null = null;
  let lon: number | null = null;
  if (geo?.coordinates) {
    if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
      lon = Number(geo.coordinates[0]);
      lat = Number(geo.coordinates[1]);
    } else if (Array.isArray(geo.coordinates[0])) {
      lon = Number(geo.coordinates[0][0]);
      lat = Number(geo.coordinates[0][1]);
    }
  }
  const mag = geo?.magnitudeValue ? `${geo.magnitudeValue} ${geo.magnitudeUnit ?? ''}`.trim() : null;
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    category: cat.title,
    categoryId: cat.id,
    date: geo?.date ?? raw.geometry?.[0]?.date ?? new Date().toISOString(),
    lat,
    lon,
    magnitude: mag,
    sources: raw.sources ?? [],
    link: raw.link,
  };
}
