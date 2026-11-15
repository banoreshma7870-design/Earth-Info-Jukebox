// Nominatim (OpenStreetMap) wrappers for the Region Picker.
// Rate limit: 1 req/sec — we debounce + abort in-flight calls from the UI.

const BASE = 'https://nominatim.openstreetmap.org';
const UA = 'GAIA-Jukebox/0.1 (hackathon)';

export interface GeoHit {
  display_name: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number]; // [minLat, maxLat, minLon, maxLon]
  country?: string;
  state?: string;
  city?: string;
  type: string;
}

function parseBbox(raw: string[]): [number, number, number, number] {
  return [Number(raw[0]), Number(raw[1]), Number(raw[2]), Number(raw[3])];
}

async function nominatim(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<any[]> {
  const url = `${BASE}${path}?${new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: '5',
    ...params,
  }).toString()}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': UA }, signal });
  if (!res.ok) return [];
  return res.json();
}

export async function searchCountry(q: string, signal?: AbortSignal): Promise<GeoHit[]> {
  const rows = await nominatim('/search', { country: q }, signal);
  return rows
    .filter((r: any) => r.boundingbox)
    .map((r: any) => ({
      display_name: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      bbox: parseBbox(r.boundingbox),
      country: r.address?.country ?? r.display_name.split(',').pop()?.trim(),
      type: r.type,
    }));
}

export async function searchState(q: string, country: string, signal?: AbortSignal): Promise<GeoHit[]> {
  const rows = await nominatim('/search', { state: q, country }, signal);
  return rows
    .filter((r: any) => r.boundingbox)
    .map((r: any) => ({
      display_name: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      bbox: parseBbox(r.boundingbox),
      country: r.address?.country ?? country,
      state: r.address?.state ?? q,
      type: r.type,
    }));
}

export async function searchCity(q: string, state: string, country: string, signal?: AbortSignal): Promise<GeoHit[]> {
  const rows = await nominatim('/search', { city: q, state, country }, signal);
  return rows
    .filter((r: any) => r.boundingbox)
    .map((r: any) => ({
      display_name: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      bbox: parseBbox(r.boundingbox),
      country: r.address?.country ?? country,
      state: r.address?.state ?? state,
      city: r.address?.city ?? r.address?.town ?? r.address?.village ?? q,
      type: r.type,
    }));
}

export async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<GeoHit | null> {
  const url = `${BASE}/reverse?${new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lon),
    zoom: '10',
    addressdetails: '1',
  }).toString()}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': UA }, signal });
    if (!res.ok) return null;
    const r = await res.json();
    if (!r.boundingbox) return null;
    return {
      display_name: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      bbox: parseBbox(r.boundingbox),
      country: r.address?.country,
      state: r.address?.state,
      city: r.address?.city ?? r.address?.town ?? r.address?.village,
      type: r.type,
    };
  } catch {
    return null;
  }
}
