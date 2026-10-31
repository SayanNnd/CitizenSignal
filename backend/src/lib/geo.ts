import { getBoundsOfDistance } from 'geolib';

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Lat/lng box that contains every point within `metres` of the centre.
 * Used as a cheap SQL prefilter before the exact Geolib distance check.
 * (Doesn't handle boxes crossing the ±180° meridian — not a concern for this demo.)
 */
export function boundingBox(latitude: number, longitude: number, metres: number): BoundingBox {
  const [min, max] = getBoundsOfDistance({ latitude, longitude }, metres);
  return { minLat: min.latitude, maxLat: max.latitude, minLng: min.longitude, maxLng: max.longitude };
}
