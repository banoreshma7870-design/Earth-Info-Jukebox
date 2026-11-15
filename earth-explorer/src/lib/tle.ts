// CelesTrak TLE fetcher + session cache.
// Falls back silently if offline — callers must handle a `null` TLE.

const CACHE_KEY = 'gaia-tle-cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export interface TLE {
  noradId: number;
  name: string;
  line1: string;
  line2: string;
  fetchedAt: number;
}

interface CacheShape {
  [noradId: string]: TLE;
}

function readCache(): CacheShape {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}

async function fetchOneTLE(noradId: number): Promise<TLE | null> {
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text || text.startsWith('No GP data')) return null;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;
    return {
      noradId,
      name: lines[0],
      line1: lines[1],
      line2: lines[2],
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function fetchFleetTLEs(noradIds: number[]): Promise<Record<number, TLE | null>> {
  const cache = readCache();
  const now = Date.now();
  const result: Record<number, TLE | null> = {};

  const needsFetch: number[] = [];
  for (const id of noradIds) {
    const cached = cache[String(id)];
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      result[id] = cached;
    } else {
      needsFetch.push(id);
    }
  }

  if (needsFetch.length > 0) {
    const fetched = await Promise.all(needsFetch.map(fetchOneTLE));
    needsFetch.forEach((id, i) => {
      const tle = fetched[i];
      result[id] = tle;
      if (tle) cache[String(id)] = tle;
    });
    writeCache(cache);
  }

  console.log(`[TLE] Loaded ${Object.values(result).filter(Boolean).length}/${noradIds.length} TLEs from CelesTrak`);
  return result;
}
