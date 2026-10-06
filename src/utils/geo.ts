/**
 * Geolocation & Geofencing utility
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaPhi = (lat2 - lat1) * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance in meters or kilometers nicely
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} meter`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Gets current browser position with promise wrapper and high accuracy option
 */
export function getCurrentGeoPosition(): Promise<GeoCoordinate> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat tidak mendukung GPS/Geolokasi'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let message = 'Gagal mengakses GPS';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Izin akses lokasi ditolak oleh pengguna/browser';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Sinyal lokasi GPS tidak tersedia';
        } else if (err.code === err.TIMEOUT) {
          message = 'Waktu permintaan lokasi habis (GPS timeout)';
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  });
}
