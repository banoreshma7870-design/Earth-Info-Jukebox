import { FileText, MapPin, Globe2 } from 'lucide-react';
import NarrationButton from './NarrationButton';
import './SecretCard.css';

export interface Secret {
  id: string;
  file: string;
  serial: string;
  title: string;
  country: string;
  location: string;
  lat: number;
  lon: number;
  brief: string;
  story: string;
  accent: string;
}

interface Props {
  secret: Secret;
  onShowOnGlobe?: (s: Secret) => void;
  muted?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

export default function SecretCard({ secret, onShowOnGlobe, muted, expanded, onClick }: Props) {
  return (
    <article
      className={`secret-card ${expanded ? 'expanded' : ''}`}
      style={{ borderLeftColor: secret.accent }}
      onClick={onClick}
    >
      <header className="secret-head">
        <div className="secret-meta">
          <span className="secret-file" style={{ color: secret.accent }}>
            <FileText size={11} /> {secret.file}
          </span>
          <span className="secret-serial">CASE #{secret.serial}</span>
        </div>
        <h3 className="secret-title">{secret.title}</h3>
        <div className="secret-loc">
          <MapPin size={11} />
          <span>{secret.location} · {secret.country}</span>
        </div>
      </header>

      <p className="secret-brief">{secret.brief}</p>

      {expanded && (
        <>
          <p className="secret-story">{secret.story}</p>
          <div className="secret-actions" onClick={(e) => e.stopPropagation()}>
            <NarrationButton
              id={`secret-${secret.id}`}
              event={{
                title: secret.title,
                location: `${secret.location}, ${secret.country}`,
                lat: secret.lat,
                lon: secret.lon,
                description: secret.story,
              }}
              muted={muted}
            />
            {onShowOnGlobe && (
              <button className="secret-action" onClick={() => onShowOnGlobe(secret)}>
                <Globe2 size={13} /> SHOW ON GLOBE
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
