import { useState, useMemo } from 'react';
import SecretCard, { type Secret } from '../components/SecretCard';
import type { Region } from '../lib/regionFilter';
import { inRegion } from '../lib/regionFilter';
import secretsData from '../data/earthSecrets.json';
import './EarthSecrets.css';

interface Props {
  region: Region | null;
  onShowOnGlobe?: (lat: number, lon: number, label: string) => void;
  muted?: boolean;
}

export default function EarthSecrets({ region, onShowOnGlobe, muted }: Props) {
  const all = secretsData as Secret[];
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    if (!region) return all;
    const within = all.filter((s) => inRegion(s.lat, s.lon, region));
    return within.length ? within : all;
  }, [region, all]);

  return (
    <div className="es-wrap">
      <div className="es-kicker">EARTH'S SECRETS · {list.length} FILES</div>
      <h2 className="es-title">The B-side of the planet.</h2>
      <p className="es-sub">Curated cases — phenomena that still defy intuition. Click a file to open.</p>

      {region && list === all && (
        <div className="es-empty-note">
          No cases filed inside <strong>{region.area || region.state || region.country}</strong>. Showing all secrets instead.
        </div>
      )}

      <div className="es-grid">
        {list.map((s) => (
          <SecretCard
            key={s.id}
            secret={s}
            expanded={open === s.id}
            onClick={() => setOpen(open === s.id ? null : s.id)}
            onShowOnGlobe={(sec) => onShowOnGlobe?.(sec.lat, sec.lon, sec.title)}
            muted={muted}
          />
        ))}
      </div>
    </div>
  );
}
