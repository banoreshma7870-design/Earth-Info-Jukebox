// Shared region shape + filter helpers used by every channel.

export interface Region {
  country?: string;
  countryCode?: string;
  state?: string;
  area?: string;
  bbox: [number, number, number, number]; // [minLat, maxLat, minLon, maxLon]
  center: { lat: number; lon: number };
}

const SESSION_KEY = 'gaia-region';

export function loadRegion(): Region | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRegion(r: Region | null) {
  try {
    if (r) sessionStorage.setItem(SESSION_KEY, JSON.stringify(r));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function inRegion(lat: number, lon: number, region: Region): boolean {
  const [minLat, maxLat, minLon, maxLon] = region.bbox;
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}

export function bboxForEonet(region: Region): { minLon: number; maxLat: number; maxLon: number; minLat: number } {
  const [minLat, maxLat, minLon, maxLon] = region.bbox;
  return { minLon, maxLat, maxLon, minLat };
}

export function regionPath(r: Region | null): string {
  if (!r) return 'World';
  const parts = ['World'];
  if (r.country) parts.push(r.country);
  if (r.state) parts.push(r.state);
  if (r.area) parts.push(r.area);
  return parts.join(' / ');
}
