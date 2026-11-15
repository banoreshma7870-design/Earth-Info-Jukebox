import { useMemo } from 'react';
import SpeciesCard, { type Species } from '../components/SpeciesCard';
import type { Region } from '../lib/regionFilter';
import { inRegion } from '../lib/regionFilter';
import speciesData from '../data/species.json';
import './Biodiversity.css';

interface Props {
  region: Region | null;
  onShowOnGlobe?: (lat: number, lon: number, label: string) => void;
  muted?: boolean;
}

export default function Biodiversity({ region, onShowOnGlobe, muted }: Props) {
  const all = speciesData as Species[];
  const list = useMemo(() => {
    if (!region) return all;
    const within = all.filter((s) => inRegion(s.lat, s.lon, region));
    return within.length ? within : all.filter((s) => region.country && s.country === region.country);
  }, [region, all]);

  const display = list.length ? list : all;

  return (
    <div className="bio-wrap">
      <div className="bio-kicker">ENDANGERED SPECIES · {display.length} TRACKED</div>
      <h2 className="bio-title">Life at the edge of the chart.</h2>
      <p className="bio-sub">IUCN-flagged species in the region's bbox. Satellite + ground records combined.</p>

      {region && !list.length && (
        <div className="bio-empty">
          No species records in <strong>{region.area || region.state || region.country}</strong>'s bounding box. Showing closest set.
        </div>
      )}

      <div className="bio-grid">
        {display.map((s) => (
          <SpeciesCard
            key={s.id}
            species={s}
            muted={muted}
            onShowOnGlobe={(sp) => onShowOnGlobe?.(sp.lat, sp.lon, sp.name)}
          />
        ))}
      </div>
    </div>
  );
}
