// Propagate a TLE to a live geodetic position using satellite.js.
// Also exposes a lightweight reverse-geocoder for "currently over X".

import * as satellite from 'satellite.js';
import type { TLE } from './tle';

export interface GeoPosition {
  lat: number;
  lon: number;
  altKm: number;
  velocityKmS: number;
}

export function propagate(tle: TLE, date: Date = new Date()): GeoPosition | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const pv = satellite.propagate(satrec, date);
    if (!pv || typeof pv.position === 'boolean' || !pv.position) return null;

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const v = pv.velocity;
    const velocityKmS =
      v && typeof v !== 'boolean'
        ? Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
        : 0;

    return {
      lat: satellite.degreesLat(geo.latitude),
      lon: satellite.degreesLong(geo.longitude),
      altKm: geo.height,
      velocityKmS,
    };
  } catch (e) {
    console.warn('[satellitePosition] propagate failed', e);
    return null;
  }
}

/** Convert (lat, lon, alt) → unit-radius sphere XYZ for Three.js. */
export function geoToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

/**
 * Cheap reverse geocode: coarse ocean/continent/sub-region classification
 * so we never block the UI on a network hop. Good enough for the dossier.
 */
export function coarseLocationLabel(lat: number, lon: number): string {
  // Oceans first
  if (isInOcean(lat, lon)) return oceanLabel(lat, lon);

  // Rough continent boxes
  if (lat >= 5 && lat <= 37 && lon >= 68 && lon <= 97) return 'Indian subcontinent';
  if (lat >= -35 && lat <= 37 && lon >= -17 && lon <= 51) return 'African continent';
  if (lat >= 35 && lat <= 71 && lon >= -10 && lon <= 60) return 'European mainland';
  if (lat >= -11 && lat <= 55 && lon >= 60 && lon <= 150) return 'Asian landmass';
  if (lat >= 15 && lat <= 71 && lon >= -168 && lon <= -52) return 'North America';
  if (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -34) return 'South America';
  if (lat >= -44 && lat <= -10 && lon >= 112 && lon <= 154) return 'Australian continent';
  if (lat <= -60) return 'Antarctic region';
  if (lat >= 66) return 'Arctic region';
  return 'Open terrain';
}

function isInOcean(lat: number, lon: number): boolean {
  // Very coarse — treat anything not in a continent box as ocean
  const inLand =
    (lat >= 5 && lat <= 37 && lon >= 68 && lon <= 97) ||
    (lat >= -35 && lat <= 37 && lon >= -17 && lon <= 51) ||
    (lat >= 35 && lat <= 71 && lon >= -10 && lon <= 60) ||
    (lat >= -11 && lat <= 55 && lon >= 60 && lon <= 150) ||
    (lat >= 15 && lat <= 71 && lon >= -168 && lon <= -52) ||
    (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -34) ||
    (lat >= -44 && lat <= -10 && lon >= 112 && lon <= 154);
  return !inLand;
}

function oceanLabel(lat: number, lon: number): string {
  if (lon >= -70 && lon <= 20 && lat >= -60 && lat <= 70) return 'Atlantic Ocean';
  if ((lon >= 20 && lon <= 147) && lat >= -60 && lat <= 30) return 'Indian Ocean';
  if (lat <= -60) return 'Southern Ocean';
  if (lat >= 66) return 'Arctic Ocean';
  return 'Pacific Ocean';
}

export function timeSinceLaunch(launchISO: string): string {
  const diff = Date.now() - new Date(launchISO).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  const months = Math.floor((diff % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
  return `${years}y ${months}mo`;
}
