import { useEffect } from 'react';
import { X, MapPin, Calendar, Satellite, MessageSquare, Globe2 } from 'lucide-react';
import NarrationButton from './NarrationButton';
import type { EonetEvent } from '../lib/eonet';
import { colorForCategory } from '../lib/eonet';
import './EventDetailPanel.css';

interface Props {
  event: EonetEvent | null;
  onClose: () => void;
  onAskAi?: (ev: EonetEvent) => void;
  onShowOnGlobe?: (ev: EonetEvent) => void;
  muted?: boolean;
}

export default function EventDetailPanel({ event, onClose, onAskAi, onShowOnGlobe, muted }: Props) {
  useEffect(() => {
    if (!event) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [event, onClose]);

  const open = !!event;
  const ev = event;

  return (
    <aside className={`evt-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
      {ev && (
        <>
          <header className="evt-head" style={{ borderLeftColor: colorForCategory(ev.categoryId) }}>
            <div>
              <div className="evt-kicker" style={{ color: colorForCategory(ev.categoryId) }}>
                EVENT · {ev.category.toUpperCase()}
              </div>
              <h2 className="evt-title">{ev.title}</h2>
            </div>
            <button className="evt-x" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </header>

          <div className="evt-meta">
            <div className="evt-row">
              <Calendar size={13} />
              <span>{new Date(ev.date).toLocaleString()}</span>
            </div>
            {ev.lat !== null && ev.lon !== null && (
              <div className="evt-row">
                <MapPin size={13} />
                <span>
                  {ev.lat.toFixed(3)}°, {ev.lon.toFixed(3)}°
                </span>
              </div>
            )}
            {ev.magnitude && (
              <div className="evt-row">
                <Satellite size={13} />
                <span>{ev.magnitude}</span>
              </div>
            )}
          </div>

          {ev.description && <p className="evt-desc">{ev.description}</p>}

          <div className="evt-actions">
            <NarrationButton
              id={`evt-${ev.id}`}
              event={{
                title: ev.title,
                category: ev.category,
                date: ev.date,
                lat: ev.lat ?? undefined,
                lon: ev.lon ?? undefined,
                magnitude: ev.magnitude ?? undefined,
                source: ev.sources[0]?.id,
              }}
              muted={muted}
            />
            {onShowOnGlobe && ev.lat !== null && ev.lon !== null && (
              <button className="evt-action" onClick={() => onShowOnGlobe(ev)}>
                <Globe2 size={13} /> SHOW ON GLOBE
              </button>
            )}
            {onAskAi && (
              <button className="evt-action" onClick={() => onAskAi(ev)}>
                <MessageSquare size={13} /> ASK AI
              </button>
            )}
          </div>

          {ev.sources.length > 0 && (
            <div className="evt-sources">
              <div className="evt-sources-head">SOURCES</div>
              <ul>
                {ev.sources.map((s) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.id}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
