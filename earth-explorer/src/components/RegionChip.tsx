import { MapPin, Edit2 } from 'lucide-react';
import type { Region } from '../lib/regionFilter';
import { regionPath } from '../lib/regionFilter';
import './RegionChip.css';

interface Props {
  region: Region | null;
  onChange: () => void;
}

export default function RegionChip({ region, onChange }: Props) {
  return (
    <button className="region-chip" onClick={onChange}>
      <MapPin size={12} />
      <span className="region-chip-path">{regionPath(region)}</span>
      <span className="region-chip-edit">
        <Edit2 size={10} /> CHANGE
      </span>
    </button>
  );
}
