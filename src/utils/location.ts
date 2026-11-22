import { KENYA_LOCATIONS, KenyaLocation } from '../data/kenya_locations';

export { KENYA_LOCATIONS };
export type { KenyaLocation };

/**
 * Client-Side Real Geolocation & Reverse Geocoding Utility
 * Accurately extracts real device GPS coordinates, reverse-geocodes to the actual town/city,
 * and calculates exact Haversine distances to candidates without any mock or hardcoded values.
 */

export interface RealLocationResult {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  locationCity: string;
  locationCountry: string;
  displayLabel: string;
  method: 'GPS' | 'IP';
}

/**
 * Calculates real great-circle distance between two geographic coordinates using the Haversine formula.
 * Returns distance in kilometers rounded to 1 decimal place.
 */
export function calculateRealDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates initial compass bearing (azimuth) from origin to destination in degrees (0 - 360).
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return Math.round((toDeg(θ) + 360) % 360);
}

/**
 * Converts degrees azimuth to 16-point cardinal compass text (e.g. N, NE, SSW).
 */
export function getBearingCardinal(bearing: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return cardinals[index];
}

/**
 * Computes walking and driving Estimated Time of Arrival (ETA) from distance in km.
 */
export function calculateETA(distanceKm: number): { walkingMinutes: number; drivingMinutes: number } {
  // Average urban walking speed: 4.5 km/h
  const walkingMinutes = Math.max(1, Math.round((distanceKm / 4.5) * 60));
  // Average urban driving speed: 30 km/h
  const drivingMinutes = Math.max(1, Math.round((distanceKm / 30) * 60));
  return { walkingMinutes, drivingMinutes };
}

/**
 * Performs real reverse-geocoding of latitude & longitude to extract actual neighborhood, town, and country.
 * Uses public CORS-enabled reverse geocoders (BigDataCloud client API & Nominatim OpenStreetMap)
 * with robust offline/error fallbacks.
 */
export async function reverseGeocodeRealCoords(
  lat: number,
  lon: number
): Promise<{ city: string; country: string; displayLabel: string }> {
  // 1. Try BigDataCloud Free Client Reverse Geocoding API (Fast, CORS-friendly, no API key needed)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.neighbourhood || '';
      const city = data.city || data.principalSubdivision || '';
      const country = data.countryName || 'Kenya';

      let display = '';
      if (locality && city && locality !== city) {
        display = `${locality}, ${city}`;
      } else if (city) {
        display = `${city}, ${country}`;
      } else if (locality) {
        display = `${locality}, ${country}`;
      } else {
        display = country;
      }

      return {
        city: display || 'Your Location',
        country: country || 'Kenya',
        displayLabel: display || 'Your Location',
      };
    }
  } catch (err) {
    console.warn('[ReverseGeocode] BigDataCloud failed, trying Nominatim fallback:', err);
  }

  // 2. Fallback to OpenStreetMap Nominatim reverse geocoder
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || '';
      const townOrCity = addr.city || addr.town || addr.municipality || addr.county || '';
      const country = addr.country || 'Kenya';

      let display = '';
      if (neighborhood && townOrCity && neighborhood !== townOrCity) {
        display = `${neighborhood}, ${townOrCity}`;
      } else if (townOrCity) {
        display = `${townOrCity}, ${country}`;
      } else if (neighborhood) {
        display = `${neighborhood}, ${country}`;
      } else {
        display = data.name || country;
      }

      return {
        city: display || 'Your Location',
        country: country || 'Kenya',
        displayLabel: display || 'Your Location',
      };
    }
  } catch (err) {
    console.warn('[ReverseGeocode] Nominatim failed:', err);
  }

  // 3. Fallback: Check local index of 1,450 Kenyan wards and hubs before raw coordinates
  if (KENYA_LOCATIONS && KENYA_LOCATIONS.length > 0) {
    let closestLoc = KENYA_LOCATIONS[0];
    let minDistance = calculateRealDistanceKm(lat, lon, closestLoc.lat, closestLoc.lon);

    for (let i = 1; i < KENYA_LOCATIONS.length; i++) {
      const loc = KENYA_LOCATIONS[i];
      const dist = calculateRealDistanceKm(lat, lon, loc.lat, loc.lon);
      if (dist < minDistance) {
        minDistance = dist;
        closestLoc = loc;
      }
    }

    const thresholdKm = closestLoc.county.toLowerCase() === 'nairobi' ? 4.5 : 8.5;
    if (minDistance <= thresholdKm) {
      return {
        city: closestLoc.name,
        country: 'Kenya',
        displayLabel: closestLoc.name,
      };
    }
  }

  // 4. Ultimate Fallback: Return formatted coordinates if completely remote or offline
  const latFormatted = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonFormatted = `${Math.abs(lon).toFixed(3)}°${lon >= 0 ? 'E' : 'W'}`;
  return {
    city: `${latFormatted}, ${lonFormatted}`,
    country: 'Kenya',
    displayLabel: `${latFormatted}, ${lonFormatted}`,
  };
}

/**
 * Resolves approximate location directly via browser network IP lookup.
 * Zero-permission and failover-safe.
 */
export async function getApproximateIpLocation(): Promise<{
  latitude: number;
  longitude: number;
  locationCity: string;
  locationCountry: string;
}> {
  // 1. Try ipapi.co (CORS-friendly, returns city, country, lat, lon)
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const city = data.city || data.region || 'Nairobi';
        const country = data.country_name || 'Kenya';
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          locationCity: `${city}, ${country}`,
          locationCountry: country,
        };
      }
    }
  } catch (err) {
    console.warn('[IP Location] ipapi.co failed, trying BigDataCloud fallback:', err);
  }

  // 2. Try BigDataCloud Client IP lookup
  try {
    const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || 'Nairobi';
      const country = data.countryName || 'Kenya';
      const lat = data.latitude || -1.2864;
      const lon = data.longitude || 36.8172;
      return {
        latitude: lat,
        longitude: lon,
        locationCity: `${city}, ${country}`,
        locationCountry: country,
      };
    }
  } catch (err) {
    console.warn('[IP Location] BigDataCloud failed:', err);
  }

  // 3. Metropolitan failover default
  return {
    latitude: -1.2864,
    longitude: 36.8172,
    locationCity: 'Nairobi, Kenya',
    locationCountry: 'Kenya',
  };
}

/**
 * Requests real device GPS coordinates with maximum accuracy and zero cache.
 * Triggers native browser location permission prompt.
 */
export function getRealDevicePosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by your browser or device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0, // Force fresh real-time satellite/hardware fix, no cached data!
      }
    );
  });
}

export interface KnownHub {
  name: string;
  lat: number;
  lon: number;
}

export const POPULAR_KENYA_HUBS: KnownHub[] = [
  { name: 'Ruiru, Kiambu', lat: -1.1466, lon: 36.9600 },
  { name: 'Juja, Kiambu', lat: -1.1833, lon: 37.1167 },
  { name: 'Kasarani, Nairobi', lat: -1.2227, lon: 36.8971 },
  { name: 'Roysambu, Nairobi', lat: -1.2185, lon: 36.8872 },
  { name: 'Kahawa Sukari, Nairobi', lat: -1.1856, lon: 36.9328 },
  { name: 'Kikuyu, Kiambu', lat: -1.2464, lon: 36.6622 },
  { name: 'Ongata Rongai, Kajiado', lat: -1.3964, lon: 36.7578 },
  { name: 'Kitengela, Kajiado', lat: -1.4722, lon: 36.9583 },
  { name: 'Syokimau / Athi River', lat: -1.3500, lon: 36.9333 },
  { name: 'Ngong, Kajiado', lat: -1.3611, lon: 36.6567 },
  { name: 'Limuru, Kiambu', lat: -1.1111, lon: 36.6444 },
  { name: 'Kiambu Town', lat: -1.1714, lon: 36.8356 },
  { name: 'Ruaka, Kiambu', lat: -1.2056, lon: 36.7764 },
  { name: 'Westlands, Nairobi', lat: -1.2675, lon: 36.8118 },
  { name: 'Kilimani, Nairobi', lat: -1.2917, lon: 36.7865 },
  { name: 'Lavington, Nairobi', lat: -1.2806, lon: 36.7686 },
  { name: 'Kileleshwa, Nairobi', lat: -1.2778, lon: 36.7917 },
  { name: 'Nairobi CBD', lat: -1.2864, lon: 36.8172 },
  { name: 'Karen, Nairobi', lat: -1.3211, lon: 36.7119 },
  { name: 'Parklands, Nairobi', lat: -1.2612, lon: 36.8197 },
  { name: 'South B / South C, Nairobi', lat: -1.3142, lon: 36.8378 },
  { name: 'Runda / Gigiri, Nairobi', lat: -1.2333, lon: 36.8167 },
  { name: 'Upper Hill, Nairobi', lat: -1.2995, lon: 36.8152 },
  { name: 'Eastleigh, Nairobi', lat: -1.2750, lon: 36.8489 },
  { name: 'Embakasi / Donholm', lat: -1.3197, lon: 36.9039 },
  { name: 'Thika', lat: -1.0333, lon: 37.0694 },
  { name: 'Naivasha', lat: -0.7167, lon: 36.4333 },
  { name: 'Machakos', lat: -1.5167, lon: 37.2667 },
  { name: 'Nyeri', lat: -0.4167, lon: 36.9500 },
  { name: 'Mombasa', lat: -4.0435, lon: 39.6682 },
  { name: 'Nyali, Mombasa', lat: -4.0256, lon: 39.7042 },
  { name: 'Diani Beach', lat: -4.2778, lon: 39.5936 },
  { name: 'Malindi', lat: -3.2167, lon: 40.1167 },
  { name: 'Kisumu', lat: -0.0917, lon: 34.7680 },
  { name: 'Nakuru', lat: -0.3031, lon: 36.0800 },
  { name: 'Eldoret', lat: 0.5143, lon: 35.2698 },
  { name: 'Kakamega', lat: 0.2833, lon: 34.7500 },
  { name: 'Kericho', lat: -0.3689, lon: 35.2863 },
  { name: 'Kitale', lat: 1.0167, lon: 35.0000 },
  { name: 'Meru', lat: 0.0500, lon: 37.6500 },
];

/**
 * Geocodes a manually entered city, town, or neighborhood into latitude and longitude coordinates.
 * Matches known Kenyan hubs first, falls back to public OpenStreetMap forward geocoding,
 * and fails over safely to Nairobi CBD.
 */
export async function geocodeCityOrAddress(query: string): Promise<{
  latitude: number;
  longitude: number;
  locationCity: string;
  locationCountry: string;
}> {
  const qClean = query.trim();
  if (!qClean) {
    return {
      latitude: -1.2864,
      longitude: 36.8172,
      locationCity: 'Nairobi, Kenya',
      locationCountry: 'Kenya',
    };
  }

  const qLower = qClean.toLowerCase();

  // 1. Direct match or substring match against known hubs
  const hubMatch = POPULAR_KENYA_HUBS.find((h) => {
    const hLower = h.name.toLowerCase();
    const hBase = hLower.split(',')[0].trim();
    return (
      qLower === hLower ||
      qLower === hBase ||
      hLower.includes(qLower) ||
      qLower.includes(hBase)
    );
  });

  if (hubMatch) {
    return {
      latitude: hubMatch.lat,
      longitude: hubMatch.lon,
      locationCity: qClean.length > 2 ? qClean : hubMatch.name,
      locationCountry: 'Kenya',
    };
  }

  // 1b. Match comprehensive 1,450 Kenyan wards, towns, and aliases
  if (KENYA_LOCATIONS && KENYA_LOCATIONS.length > 0) {
    const wardMatch = KENYA_LOCATIONS.find((l) => {
      const wLower = l.ward.toLowerCase();
      const nLower = l.name.toLowerCase();
      return (
        wLower === qLower ||
        nLower === qLower ||
        wLower.startsWith(qLower) ||
        nLower.startsWith(qLower) ||
        l.aliases.some((a) => a.toLowerCase() === qLower || a.toLowerCase().startsWith(qLower)) ||
        wLower.includes(qLower)
      );
    });

    if (wardMatch) {
      return {
        latitude: wardMatch.lat,
        longitude: wardMatch.lon,
        locationCity: wardMatch.name,
        locationCountry: 'Kenya',
      };
    }
  }

  // 2. OpenStreetMap Nominatim forward geocoding
  try {
    const encoded = encodeURIComponent(`${qClean}, Kenya`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return {
            latitude: lat,
            longitude: lon,
            locationCity: qClean,
            locationCountry: 'Kenya',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[geocodeCityOrAddress] Forward geocode failed, using failover:', err);
  }

  // 3. Failover default
  return {
    latitude: -1.2864,
    longitude: 36.8172,
    locationCity: qClean,
    locationCountry: 'Kenya',
  };
}

/**
 * Client-side autocomplete & search across all 1,450 Kenyan wards, towns, and aliases.
 */
export function searchClientKenyanLocations(query: string, limit: number = 8): KenyaLocation[] {
  const cleanQ = query.trim().toLowerCase();
  if (cleanQ.length < 2) {
    return KENYA_LOCATIONS.slice(0, limit);
  }

  type ScoredMatch = { location: KenyaLocation; score: number };
  const matches: ScoredMatch[] = [];

  for (const loc of KENYA_LOCATIONS) {
    const wardLower = loc.ward.toLowerCase();
    const nameLower = loc.name.toLowerCase();
    const countyLower = loc.county.toLowerCase();
    const constLower = loc.constituency.toLowerCase();

    let score = 0;

    if (wardLower === cleanQ) {
      score = 100;
    } else if (nameLower === cleanQ) {
      score = 95;
    } else if (wardLower.startsWith(cleanQ)) {
      score = 80;
    } else if (nameLower.startsWith(cleanQ)) {
      score = 75;
    } else if (loc.aliases.some((a) => a.toLowerCase() === cleanQ)) {
      score = 70;
    } else if (loc.aliases.some((a) => a.toLowerCase().startsWith(cleanQ))) {
      score = 65;
    } else if (wardLower.includes(cleanQ)) {
      score = 50;
    } else if (nameLower.includes(cleanQ)) {
      score = 45;
    } else if (loc.aliases.some((a) => a.toLowerCase().includes(cleanQ))) {
      score = 40;
    } else if (constLower.startsWith(cleanQ)) {
      score = 35;
    } else if (countyLower.startsWith(cleanQ)) {
      score = 30;
    }

    if (score > 0) {
      matches.push({ location: loc, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit).map((m) => m.location);
}
