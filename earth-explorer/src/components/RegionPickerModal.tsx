import { useEffect, useRef, useState } from 'react';
import { X, Search, MapPin, Loader2, Globe } from 'lucide-react';
import { searchCountry, searchState, searchCity, type GeoHit } from '../lib/geocoding';
import type { Region } from '../lib/regionFilter';
import './RegionPickerModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (r: Region) => void;
  initial?: Region | null;
}

type Stage = 'country' | 'state' | 'area';

export default function RegionPickerModal({ open, onClose, onConfirm, initial }: Props) {
  const [stage, setStage] = useState<Stage>('country');
  const [country, setCountry] = useState<GeoHit | null>(null);
  const [state, setState] = useState<GeoHit | null>(null);
  const [area, setArea] = useState<GeoHit | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCountry(initial.country ? { ...fakeHit(initial.country, initial.center, initial.bbox) } : null);
      setState(initial.state ? fakeHit(initial.state, initial.center, initial.bbox) : null);
      setArea(initial.area ? fakeHit(initial.area, initial.center, initial.bbox) : null);
      setStage(initial.area ? 'area' : initial.state ? 'state' : 'country');
    } else {
      setCountry(null); setState(null); setArea(null); setStage('country');
    }
    setQuery(''); setHits([]); setGeoErr(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, initial, onClose]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) { setHits([]); return; }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        let rows: GeoHit[] = [];
        if (stage === 'country') rows = await searchCountry(q, ac.signal);
        else if (stage === 'state' && country) rows = await searchState(q, country.country || country.display_name, ac.signal);
        else if (stage === 'area' && country && state) rows = await searchCity(q, state.state || state.display_name, country.country || country.display_name, ac.signal);
        if (!ac.signal.aborted) setHits(rows);
      } catch { /* aborted */ }
      finally { if (!ac.signal.aborted) setBusy(false); }
    }, 350);
    return () => { clearTimeout(t); ac.abort(); };
  }, [query, stage, country, state, open]);

  function pickHit(h: GeoHit) {
    if (stage === 'country') { setCountry(h); setStage('state'); setQuery(''); setHits([]); }
    else if (stage === 'state') { setState(h); setStage('area'); setQuery(''); setHits([]); }
    else { setArea(h); setQuery(''); setHits([]); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setGeoErr('Geolocation not supported.'); return; }
    setGeoErr(null); setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { reverseGeocode } = await import('../lib/geocoding');
          const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (!r) { setGeoErr('Could not reverse geocode.'); return; }
          const [minLat, maxLat, minLon, maxLon] = r.bbox;
          setCountry(fakeHit(r.country || 'World', { lat: r.lat, lon: r.lon }, r.bbox));
          if (r.state) setState(fakeHit(r.state, { lat: r.lat, lon: r.lon }, r.bbox));
          if (r.city) setArea(fakeHit(r.city, { lat: r.lat, lon: r.lon }, r.bbox));
          setStage(r.city ? 'area' : r.state ? 'state' : 'country');
          // immediate confirm if full address
          if (r.country && r.city) {
            onConfirm({
              country: r.country, state: r.state, area: r.city,
              bbox: [minLat, maxLat, minLon, maxLon],
              center: { lat: r.lat, lon: r.lon },
            });
          }
        } finally { setBusy(false); }
      },
      () => { setGeoErr('Location denied.'); setBusy(false); }
    );
  }

  function confirm() {
    const h = area || state || country;
    if (!h) return;
    const [minLat, maxLat, minLon, maxLon] = h.bbox;
    onConfirm({
      country: country?.country || country?.display_name,
      state: state?.state || state?.display_name,
      area: area?.city || area?.display_name,
      bbox: [minLat, maxLat, minLon, maxLon],
      center: { lat: h.lat, lon: h.lon },
    });
  }

  if (!open) return null;

  return (
    <div className="rp-backdrop" onClick={onClose}>
      <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
        <header className="rp-head">
          <div>
            <div className="rp-kicker">
              <Globe size={12} /> REGION FILTER
            </div>
            <h2 className="rp-title">Select Region</h2>
          </div>
          <button className="rp-x" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="rp-crumbs">
          <span className={!country ? 'active' : ''} onClick={() => { setStage('country'); setQuery(''); }}>🌍 World</span>
          {country && (
            <>
              <span className="rp-sep">/</span>
              <span className={stage === 'state' ? 'active' : ''} onClick={() => { setStage('state'); setState(null); setArea(null); setQuery(''); }}>
                {country.country || country.display_name.split(',')[0]}
              </span>
            </>
          )}
          {state && (
            <>
              <span className="rp-sep">/</span>
              <span className={stage === 'area' ? 'active' : ''} onClick={() => { setStage('area'); setArea(null); setQuery(''); }}>
                {state.state || state.display_name.split(',')[0]}
              </span>
            </>
          )}
          {area && (
            <>
              <span className="rp-sep">/</span>
              <span className="active">{area.city || area.display_name.split(',')[0]}</span>
            </>
          )}
        </div>

        <div className="rp-search">
          <Search size={14} className="rp-search-icon" />
          <input
            placeholder={
              stage === 'country' ? 'Search country (e.g. India)…' :
              stage === 'state' ? 'Search state (e.g. Uttarakhand)…' :
              'Search city or district (e.g. Nainital)…'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="rp-geo" onClick={useMyLocation} title="Use my location">
            <MapPin size={13} />
          </button>
        </div>

        {geoErr && <div className="rp-err">{geoErr}</div>}

        <div className="rp-results">
          {busy && <div className="rp-busy"><Loader2 size={14} className="spin" /> Searching…</div>}
          {!busy && hits.length === 0 && query && <div className="rp-empty">No match. Try a different spelling.</div>}
          {hits.map((h, i) => (
            <button key={i} className="rp-hit" onClick={() => pickHit(h)}>
              <MapPin size={12} />
              <span>{h.display_name}</span>
            </button>
          ))}
          {!query && stage !== 'country' && (
            <button className="rp-skip" onClick={confirm}>
              Confirm just {stage === 'state' ? country?.country : (state?.state || country?.country)} →
            </button>
          )}
        </div>

        <footer className="rp-foot">
          <button className="rp-cancel" onClick={onClose}>Cancel</button>
          <button className="rp-ok" disabled={!country} onClick={confirm}>
            Confirm Selection
          </button>
        </footer>
      </div>
    </div>
  );
}

function fakeHit(name: string, center: { lat: number; lon: number }, bbox: [number, number, number, number]): GeoHit {
  return { display_name: name, lat: center.lat, lon: center.lon, bbox, type: 'preset' };
}
