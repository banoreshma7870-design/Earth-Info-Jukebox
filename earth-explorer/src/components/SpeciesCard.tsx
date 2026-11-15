import { MapPin, AlertTriangle, Globe2 } from 'lucide-react';
import NarrationButton from './NarrationButton';
import './SpeciesCard.css';

export interface Species {
  id: string;
  name: string;
  latin: string;
  status: 'CR' | 'EN' | 'VU' | string;
  population: number | null;
  country: string;
  habitat: string[];
  lat: number;
  lon: number;
  threats: string[];
  note: string;
}

const STATUS_COLOR: Record<string, string> = {
  CR: '#ef4444',
  EN: '#f59e0b',
  VU: '#22d3ee',
};
const STATUS_LABEL: Record<string, string> = {
  CR: 'CRITICALLY ENDANGERED',
  EN: 'ENDANGERED',
  VU: 'VULNERABLE',
};

interface Props {
  species: Species;
  onShowOnGlobe?: (s: Species) => void;
  muted?: boolean;
}

export default function SpeciesCard({ species, onShowOnGlobe, muted }: Props) {
  const color = STATUS_COLOR[species.status] ?? '#22c55e';
  return (
    <article className="spec-card" style={{ borderLeftColor: color }}>
      <header className="spec-head">
        <span className="spec-status" style={{ background: `${color}22`, color, borderColor: color }}>
          {species.status}
        </span>
        <span className="spec-pop">
          N={species.population ?? 'UNK'}
        </span>
      </header>
      <h3 className="spec-name">{species.name}</h3>
      <em className="spec-latin">{species.latin}</em>
      <div className="spec-loc">
        <MapPin size={11} />
        <span>◆ {species.habitat.join(' · ')}</span>
      </div>
      <p className="spec-note">{species.note}</p>
      <div className="spec-threats">
        <AlertTriangle size={11} />
        {species.threats.slice(0, 2).join(' · ')}
      </div>
      <div className="spec-status-full" style={{ color }}>{STATUS_LABEL[species.status] ?? species.status}</div>
      <div className="spec-actions">
        <NarrationButton
          id={`spec-${species.id}`}
          event={{
            title: species.name,
            category: STATUS_LABEL[species.status] ?? species.status,
            location: species.habitat.join(', '),
            lat: species.lat,
            lon: species.lon,
            description: species.note,
          }}
          muted={muted}
        />
        {onShowOnGlobe && (
          <button className="spec-action" onClick={() => onShowOnGlobe(species)}>
            <Globe2 size={13} /> SHOW ON GLOBE
          </button>
        )}
      </div>
    </article>
  );
}
