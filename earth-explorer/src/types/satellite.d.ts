// Minimal type-shim for `satellite.js` in case @types aren't published cleanly.
declare module 'satellite.js' {
  export interface SatRec { [k: string]: any }
  export interface EciVec3 { x: number; y: number; z: number }
  export interface PositionAndVelocity {
    position: EciVec3 | boolean;
    velocity: EciVec3 | boolean;
  }
  export interface GeodeticLocation {
    latitude: number;
    longitude: number;
    height: number;
  }
  export function twoline2satrec(line1: string, line2: string): SatRec;
  export function propagate(satrec: SatRec, date: Date): PositionAndVelocity;
  export function gstime(date: Date): number;
  export function eciToGeodetic(eci: EciVec3, gmst: number): GeodeticLocation;
  export function degreesLat(rad: number): number;
  export function degreesLong(rad: number): number;
}
