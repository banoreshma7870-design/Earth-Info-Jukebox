import { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { toggle, onNarrationChange, currentNarrationId, type NarrationEvent, isSupported } from '../lib/narration';
import './NarrationButton.css';

interface Props {
  id: string;
  event: NarrationEvent;
  muted?: boolean;
  label?: string;
}

export default function NarrationButton({ id, event, muted, label = 'PLAY NARRATION' }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(currentNarrationId());
  useEffect(() => onNarrationChange(setPlayingId), []);
  if (!isSupported()) return null;
  const playing = playingId === id;

  return (
    <button
      className={`narr-btn ${playing ? 'playing' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        toggle(id, event, { muted });
      }}
      aria-label={playing ? 'Pause narration' : 'Play narration'}
    >
      <span className="narr-icon">{playing ? <Pause size={13} /> : <Play size={13} />}</span>
      <span className="narr-label">{playing ? 'NOW PLAYING' : label}</span>
      {playing && (
        <span className="narr-wave" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
      )}
    </button>
  );
}
