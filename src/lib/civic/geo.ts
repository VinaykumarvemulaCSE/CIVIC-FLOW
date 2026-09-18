import { TOWN_CENTER, ZONE_CENTER, type Coords } from "./types";

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Great-circle distance in metres. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function zoneCenter(zone: string): Coords {
  return ZONE_CENTER[zone] ?? TOWN_CENTER;
}

/** Deterministic coordinates inside a ward, used when a citizen gives no GPS fix. */
export function coordsForZone(seed: string, zone: string, spreadMeters = 400): Coords {
  const center = zoneCenter(zone);
  const h = hashString(seed);
  const dx = ((h % 1000) / 1000 - 0.5) * 2;
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 2;
  const degLat = spreadMeters / 111_320;
  const degLng = spreadMeters / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    lat: Number((center.lat + dy * degLat).toFixed(6)),
    lng: Number((center.lng + dx * degLng).toFixed(6)),
  };
}

/** Nearest ward for a GPS fix, so an officer's zone filter still works. */
export function nearestZone(point: Coords): string {
  let best = Object.keys(ZONE_CENTER)[0] ?? "";
  let bestD = Number.POSITIVE_INFINITY;
  for (const [zone, center] of Object.entries(ZONE_CENTER)) {
    const d = distanceMeters(point, center);
    if (d < bestD) {
      bestD = d;
      best = zone;
    }
  }
  return best;
}

export function formatCoords(point: Coords): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}
