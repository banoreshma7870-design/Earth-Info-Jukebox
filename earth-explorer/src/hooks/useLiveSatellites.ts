// Fetch TLEs + propagate every N seconds. Drop this hook into OrbitalAtlas.tsx.
// Returns a map of { [satelliteId]: { lat, lon, altKm, velocityKmS, locationLabel } }

import { useEffect, useRef, useState } from 'react';
import { fetchFleetTLEs, type TLE } from '../lib/tle';
import { propagate, coarseLocationLabel, type GeoPosition } from '../lib/satellitePosition';

export interface LiveSatellite extends GeoPosition {
  locationLabel: string;
  tleStale: boolean;
}

export interface SatRef {
  id: string;
  noradId: number;
}

export function useLiveSatellites(fleet: SatRef[], intervalMs = 3000) {
  const [positions, setPositions] = useState<Record<string, LiveSatellite>>({});
  const [loading, setLoading] = useState(true);
  const tlesRef = useRef<Record<string, TLE>>({});

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    (async () => {
      const ids = fleet.map((f) => f.noradId);
      const map = await fetchFleetTLEs(ids);
      if (cancelled) return;
      const byId: Record<string, TLE> = {};
      for (const f of fleet) {
        const t = map[f.noradId];
        if (t) byId[f.id] = t;
      }
      tlesRef.current = byId;
      tick();
      timer = window.setInterval(tick, intervalMs);
      setLoading(false);
    })();

    function tick() {
      const now = new Date();
      const next: Record<string, LiveSatellite> = {};
      for (const [id, tle] of Object.entries(tlesRef.current)) {
        const p = propagate(tle, now);
        if (!p) continue;
        next[id] = {
          ...p,
          locationLabel: coarseLocationLabel(p.lat, p.lon),
          tleStale: now.getTime() - tle.fetchedAt > 7 * 24 * 3600 * 1000,
        };
      }
      setPositions(next);
    }

    return () => {
      cancelled = true;
      if (timer !== null) clearInterval(timer);
    };
  }, [fleet, intervalMs]);

  return { positions, loading };
}
