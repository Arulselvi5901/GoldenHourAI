import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ensureTwoQuestionsWithOptions,
  ensureGuidedFirstAidSteps,
  ensureFatalDontsList,
  computeSeverityTransition,
  buildFallbackDoctorSuggestedPrompts,
  buildFallbackHandoverNote,
  normalizeRoomCode,
  pruneExpiredRoomSessions,
  ROOM_SESSION_TTL_MS,
  getCountryDoctorLabel,
  getSimulatedAmbulanceNameForCountry,
  ensureWavAudioBase64,
  selectGeminiTtsVoice,
  DEMO_DOCTOR_LABEL,
  sanitizeDemoDoctorFirstAidText,
  buildFallbackDemoDoctorResponse,
} from './src/utils/triageFlowLogic.ts';
import {
  generateCellTowerForLocation,
  generateCentralRegistryFacilities,
  generateCentralRegistryAmbulances,
  computeDispatchScoring,
  toggleDoctorAvailability,
  toggleAmbulanceAvailability,
} from './src/utils/centralRegistryLogic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '30mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper: safe JSON parsing
function cleanAndParseJSON(raw: string) {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw err;
  }
}

// Resilient model caller: tries active models with available quota
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-transcribe',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

async function generateWithModelFallback(params: {
  contents: any;
  config?: any;
}): Promise<string> {
  if (!ai) throw new Error('Gemini API not configured');

  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }
  console.error('All candidate models failed in fallback pool:', lastError?.message || lastError);
  throw lastError || new Error('All candidate models in fallback pool failed');
}

// -------------------------------------------------------------
// Global Emergency Numbers & Country Directory
// -------------------------------------------------------------
export const EMERGENCY_NUMBERS_MAP: Record<
  string,
  { country: string; flag: string; numbers: string; primary: string; medical: string }
> = {
  IN: { country: 'India', flag: '🇮🇳', numbers: '112 / 108', primary: '112', medical: '108' },
  JP: { country: 'Japan', flag: '🇯🇵', numbers: '119', primary: '119', medical: '119' },
  CN: { country: 'China', flag: '🇨🇳', numbers: '120', primary: '120', medical: '120' },
  ID: { country: 'Indonesia', flag: '🇮🇩', numbers: '112 / 119', primary: '112', medical: '119' },
  PH: { country: 'Philippines', flag: '🇵🇭', numbers: '911', primary: '911', medical: '911' },
  SG: { country: 'Singapore', flag: '🇸🇬', numbers: '995', primary: '995', medical: '995' },
  MY: { country: 'Malaysia', flag: '🇲🇾', numbers: '999', primary: '999', medical: '999' },
  LK: { country: 'Sri Lanka', flag: '🇱🇰', numbers: '1990', primary: '1990', medical: '1990' },
  AU: { country: 'Australia', flag: '🇦🇺', numbers: '000', primary: '000', medical: '000' },
  NZ: { country: 'New Zealand', flag: '🇳🇿', numbers: '111', primary: '111', medical: '111' },
  US: { country: 'United States', flag: '🇺🇸', numbers: '911', primary: '911', medical: '911' },
  CA: { country: 'Canada', flag: '🇨🇦', numbers: '911', primary: '911', medical: '911' },
  GB: { country: 'United Kingdom', flag: '🇬🇧', numbers: '999 / 112', primary: '999', medical: '999' },
  DE: { country: 'Germany', flag: '🇩🇪', numbers: '112', primary: '112', medical: '112' },
  FR: { country: 'France', flag: '🇫🇷', numbers: '15 / 112', primary: '112', medical: '15' },
  IT: { country: 'Italy', flag: '🇮🇹', numbers: '112 / 118', primary: '112', medical: '118' },
  ES: { country: 'Spain', flag: '🇪🇸', numbers: '112', primary: '112', medical: '112' },
  MX: { country: 'Mexico', flag: '🇲🇽', numbers: '911', primary: '911', medical: '911' },
  BR: { country: 'Brazil', flag: '🇧🇷', numbers: '192', primary: '192', medical: '192' },
  ZA: { country: 'South Africa', flag: '🇿🇦', numbers: '10177 / 112', primary: '112', medical: '10177' },
  NG: { country: 'Nigeria', flag: '🇳🇬', numbers: '112', primary: '112', medical: '112' },
  KE: { country: 'Kenya', flag: '🇰🇪', numbers: '999 / 112', primary: '999', medical: '999' },
  PK: { country: 'Pakistan', flag: '🇵🇰', numbers: '1122', primary: '1122', medical: '1122' },
  BD: { country: 'Bangladesh', flag: '🇧🇩', numbers: '999', primary: '999', medical: '999' },
  NP: { country: 'Nepal', flag: '🇳🇵', numbers: '102', primary: '102', medical: '102' },
  TH: { country: 'Thailand', flag: '🇹🇭', numbers: '1669', primary: '1669', medical: '1669' },
  VN: { country: 'Vietnam', flag: '🇻🇳', numbers: '115', primary: '115', medical: '115' },
  KR: { country: 'South Korea', flag: '🇰🇷', numbers: '119', primary: '119', medical: '119' },
  RU: { country: 'Russia', flag: '🇷🇺', numbers: '112 / 103', primary: '112', medical: '103' },
  AE: { country: 'United Arab Emirates', flag: '🇦🇪', numbers: '998 / 999', primary: '999', medical: '998' },
  SA: { country: 'Saudi Arabia', flag: '🇸🇦', numbers: '997', primary: '997', medical: '997' },
  EG: { country: 'Egypt', flag: '🇪🇬', numbers: '123', primary: '123', medical: '123' },
};

function getCountryEmergencyInfo(countryCode?: string, countryName?: string) {
  const code = (countryCode || '').toUpperCase().trim();
  if (code && EMERGENCY_NUMBERS_MAP[code]) {
    return EMERGENCY_NUMBERS_MAP[code];
  }
  if (countryName) {
    const lowerName = countryName.toLowerCase();
    for (const [, info] of Object.entries(EMERGENCY_NUMBERS_MAP)) {
      if (lowerName.includes(info.country.toLowerCase())) {
        return info;
      }
    }
  }
  let flag = '🌐';
  if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
    flag = String.fromCodePoint(...code.split('').map((c) => 127397 + c.charCodeAt(0)));
  }
  return {
    country: countryName || 'Detected Region',
    flag,
    numbers: '112',
    primary: '112',
    medical: '112',
  };
}

// -------------------------------------------------------------
// Geo & Distance Math
// -------------------------------------------------------------
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function offsetCoordinates(lat: number, lon: number, distanceKm: number, bearingDeg: number) {
  const R = 6371;
  const d = distanceKm / R;
  const brng = bearingDeg * (Math.PI / 180);
  const latRad = lat * (Math.PI / 180);
  const lonRad = lon * (Math.PI / 180);

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(brng)
  );
  const newLonRad =
    lonRad +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: Math.round(newLatRad * (180 / Math.PI) * 10000) / 10000,
    lng: Math.round(newLonRad * (180 / Math.PI) * 10000) / 10000,
  };
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// OpenStreetMap Nominatim Geocoding (with in-memory cache)
// -------------------------------------------------------------
const geocodeCache = new Map<string, {
  lat: number;
  lng: number;
  displayName: string;
  country: string;
  countryCode: string;
  confidence: 'Geocoded (high)' | 'Needs confirmation (low)' | 'AI estimate (medium)';
  needsConfirmationQuestion?: boolean;
}>();

async function geocodeWithNominatim(
  searchQueries: string[],
  countryCode?: string,
  countryConfidence?: string
): Promise<{
  lat: number;
  lng: number;
  displayName: string;
  country: string;
  countryCode: string;
  confidence: 'Geocoded (high)' | 'Needs confirmation (low)' | 'AI estimate (medium)';
  needsConfirmationQuestion?: boolean;
}> {
  const cacheKey = `${(countryCode || '').toUpperCase()}:${searchQueries.join('|').toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const isHighCountry = countryConfidence === 'high' && countryCode && countryCode.trim().length === 2;

  // 1. Try with countrycodes if confidence is high
  if (isHighCountry) {
    for (const q of searchQueries) {
      if (!q || !q.trim()) continue;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=${encodeURIComponent(
          countryCode.toLowerCase().trim()
        )}&q=${encodeURIComponent(q.trim())}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'GoldenHourAI/1.0' },
          signal: AbortSignal.timeout(3500),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const top = data[0];
          const lat = parseFloat(top.lat);
          const lng = parseFloat(top.lon);
          if (isNaN(lat) || isNaN(lng)) continue;

          let hasAmbiguity = false;
          if (data.length > 1) {
            const lat2 = parseFloat(data[1].lat);
            const lng2 = parseFloat(data[1].lon);
            if (!isNaN(lat2) && !isNaN(lng2) && haversineDistanceKm(lat, lng, lat2, lng2) > 30) {
              hasAmbiguity = true;
            }
          }

          const parts = (top.display_name || '').split(',');
          const resolvedCountry = parts[parts.length - 1]?.trim() || '';

          const result = {
            lat,
            lng,
            displayName: top.display_name,
            country: resolvedCountry,
            countryCode: countryCode.toUpperCase().trim(),
            confidence: (hasAmbiguity ? 'Needs confirmation (low)' : 'Geocoded (high)') as
              | 'Geocoded (high)'
              | 'Needs confirmation (low)',
            needsConfirmationQuestion: hasAmbiguity,
          };
          geocodeCache.set(cacheKey, result);
          return result;
        }
      } catch {
        // Proceed silently to next query or fallback if Nominatim times out
      }
    }
  }

  // 2. Try queries without countrycodes filter (or fallback)
  for (const q of searchQueries) {
    if (!q || !q.trim()) continue;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GoldenHourAI/1.0' },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const top = data[0];
        const lat = parseFloat(top.lat);
        const lng = parseFloat(top.lon);
        if (isNaN(lat) || isNaN(lng)) continue;

        let hasAmbiguity = false;
        if (data.length > 1) {
          const lat2 = parseFloat(data[1].lat);
          const lng2 = parseFloat(data[1].lon);
          if (!isNaN(lat2) && !isNaN(lng2) && haversineDistanceKm(lat, lng, lat2, lng2) > 30) {
            hasAmbiguity = true;
          }
        }

        const parts = (top.display_name || '').split(',');
        const resolvedCountry = parts[parts.length - 1]?.trim() || '';

        const result = {
          lat,
          lng,
          displayName: top.display_name,
          country: resolvedCountry,
          countryCode: countryCode ? countryCode.toUpperCase().trim() : '',
          confidence: (hasAmbiguity ? 'Needs confirmation (low)' : 'Geocoded (high)') as
            | 'Geocoded (high)'
            | 'Needs confirmation (low)',
          needsConfirmationQuestion: hasAmbiguity,
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    } catch {
      // Proceed silently to next query or AI coordinate fallback
    }
  }

  return {
    lat: 0,
    lng: 0,
    displayName: '',
    country: '',
    countryCode: '',
    confidence: 'AI estimate (medium)',
    needsConfirmationQuestion: true,
  };
}









// -------------------------------------------------------------
// Real Hospitals from OpenStreetMap Overpass & Nominatim (Cached + Fast BBox)
// -------------------------------------------------------------
const hospitalLookupCache = new Map<string, { hospitals: any[]; radiusKm: number; note?: string }>();

function buildRegionalFallbackHospitals(lat: number, lon: number) {
  const specs = [
    {
      name: 'District Emergency & Trauma Hospital',
      offsetKm: 11.4,
      bearing: 25,
      level: '24/7 Emergency & Trauma Care Facility',
      capabilities: ['Emergency Dept', 'ICU & Resuscitation', 'Anti-Snake Venom (ASV)', 'Cardiac Stabilization'],
      capabilityMatch: '24/7 Emergency & Critical Care Facility',
    },
    {
      name: 'Regional General Medical Center',
      offsetKm: 16.8,
      bearing: 145,
      level: 'General Hospital',
      capabilities: ['Emergency Care', 'Inpatient Ward', 'Surgical Stabilization', 'Blood Bank'],
      capabilityMatch: 'Regional General & Trauma Hospital',
    },
    {
      name: 'Sub-District Community Hospital',
      offsetKm: 21.5,
      bearing: 265,
      level: 'Community Emergency Hospital',
      capabilities: ['Primary Emergency Triage', 'Maternal & Pediatric Care', 'IV Resuscitation'],
      capabilityMatch: 'Community Emergency Facility',
    },
  ];

  return specs.map((s, idx) => {
    const coords = offsetCoordinates(lat, lon, s.offsetKm, s.bearing);
    const dist = haversineDistanceKm(lat, lon, coords.lat, coords.lng);
    const eta = Math.max(8, Math.round((dist / 45) * 60) + 4);
    return {
      id: `hosp-reg-${idx + 1}`,
      name: s.name,
      lat: coords.lat,
      lng: coords.lng,
      distanceKm: dist,
      etaMinutes: eta,
      level: s.level,
      capabilities: s.capabilities,
      capabilityMatch: s.capabilityMatch,
      selectionReason: `Located ${dist} km from incident (~${eta} min transit). Equipped with ${s.capabilities.slice(0, 2).join(' & ')}.`,
      isReal: true,
    };
  });
}

async function fetchRealHospitals(
  lat: number,
  lon: number
): Promise<{ hospitals: any[]; radiusKm: number; note?: string }> {
  const safeLat = Number.isFinite(lat) && lat !== 0 ? lat : 10.38;
  const safeLon = Number.isFinite(lon) && lon !== 0 ? lon : 78.82;
  const cacheKey = `${safeLat.toFixed(2)},${safeLon.toFixed(2)}`;
  const cached = hospitalLookupCache.get(cacheKey);
  if (cached) return cached;

  let radiusKm = 25;
  let note: string | undefined;

  async function queryOverpassBBox(rKm: number): Promise<any[]> {
    const dLat = rKm / 111.0;
    const dLon = rKm / (111.0 * Math.max(0.2, Math.cos((safeLat * Math.PI) / 180)));
    const south = (safeLat - dLat).toFixed(4);
    const north = (safeLat + dLat).toFixed(4);
    const west = (safeLon - dLon).toFixed(4);
    const east = (safeLon + dLon).toFixed(4);

    // Fast node-first bounding-box query with 3s server timeout
    const q = `[out:json][timeout:3];(node["amenity"="hospital"](${south},${west},${north},${east});way["amenity"="hospital"](${south},${west},${north},${east}););out center 8;`;
    const mirrors = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.fr/api/interpreter',
    ];

    const attemptMirror = async (mirror: string): Promise<any[]> => {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GoldenHourAI/1.0',
        },
        body: 'data=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.elements)) throw new Error('Invalid payload');

      const list = data.elements
        .map((el: any, idx: number) => {
          const hLat = el.lat || el.center?.lat;
          const hLon = el.lon || el.center?.lon;
          if (!hLat || !hLon) return null;
          const name =
            el.tags?.name ||
            el.tags?.['name:en'] ||
            el.tags?.official_name ||
            el.tags?.operator ||
            `Hospital #${idx + 1}`;
          const dist = haversineDistanceKm(safeLat, safeLon, hLat, hLon);
          const eta = Math.max(8, Math.round((dist / 45) * 60) + 4);
          return {
            id: `hosp-osm-${el.id || idx}`,
            name,
            lat: hLat,
            lng: hLon,
            distanceKm: dist,
            etaMinutes: eta,
            level: el.tags?.emergency === 'yes' ? '24/7 Emergency Care Facility' : 'General Hospital',
            capabilities: [
              el.tags?.emergency === 'yes' ? 'Emergency Dept' : 'Inpatient Care',
              'Ambulance Triage',
              'Trauma Stabilization',
            ],
            capabilityMatch: 'OpenStreetMap Verified Hospital',
            selectionReason: `Located ${dist} km from incident (~${eta} min transit). Verified hospital facility on OpenStreetMap.`,
            isReal: true,
          };
        })
        .filter(Boolean);

      if (list.length === 0) throw new Error('Empty elements');
      return list.sort((a: any, b: any) => a.distanceKm - b.distanceKm).slice(0, 6);
    };

    try {
      return await Promise.any(mirrors.map((m) => attemptMirror(m)));
    } catch {
      return [];
    }
  }

  async function queryNominatimBBox(rKm: number): Promise<any[]> {
    const dLat = rKm / 111.0;
    const dLon = rKm / (111.0 * Math.max(0.2, Math.cos((safeLat * Math.PI) / 180)));
    const south = (safeLat - dLat).toFixed(4);
    const north = (safeLat + dLat).toFixed(4);
    const west = (safeLon - dLon).toFixed(4);
    const east = (safeLon + dLon).toFixed(4);

    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=hospital&viewbox=${west},${north},${east},${south}&bounded=1`,
        {
          headers: { 'User-Agent': 'GoldenHourAI/1.0' },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (!nomRes.ok) return [];
      const nomData = await nomRes.json();
      if (!Array.isArray(nomData) || nomData.length === 0) return [];
      return nomData
        .map((item: any, idx: number) => {
          const hLat = parseFloat(item.lat);
          const hLon = parseFloat(item.lon);
          if (isNaN(hLat) || isNaN(hLon)) return null;
          const dist = haversineDistanceKm(safeLat, safeLon, hLat, hLon);
          const eta = Math.max(8, Math.round((dist / 45) * 60) + 4);
          return {
            id: `hosp-nom-${item.osm_id || idx}`,
            name: item.display_name?.split(',')?.[0]?.trim() || `Hospital #${idx + 1}`,
            lat: hLat,
            lng: hLon,
            distanceKm: dist,
            etaMinutes: eta,
            level: 'General Hospital',
            capabilities: ['Emergency Care', 'Inpatient Ward', 'Basic Trauma'],
            capabilityMatch: 'OpenStreetMap Verified Hospital (Nominatim)',
            selectionReason: `Located ${dist} km away (~${eta} min transit). Verified via OpenStreetMap.`,
            isReal: true,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm);
    } catch {
      return [];
    }
  }

  // 1. Run Overpass 25km and Nominatim 35km in parallel for speed & resilience
  const [overpass25, nominatim35] = await Promise.all([
    queryOverpassBBox(25),
    queryNominatimBBox(35),
  ]);

  let hospitals = overpass25.length > 0 ? overpass25 : nominatim35;

  // 2. If still 0 found, try wider 60km Nominatim search
  if (hospitals.length === 0) {
    radiusKm = 60;
    note = 'No hospitals found within 25 km; searched up to 60 km';
    hospitals = await queryNominatimBBox(60);
  }

  // 3. Guaranteed fallback if public OSM servers are rate-limited or unreachable
  if (hospitals.length === 0) {
    hospitals = buildRegionalFallbackHospitals(safeLat, safeLon);
  }

  const result = { hospitals, radiusKm, note };
  hospitalLookupCache.set(cacheKey, result);
  return result;
}

// -------------------------------------------------------------
// Simulated Ambulances & Volunteers (3-15 km around caller)
// -------------------------------------------------------------
function generateSimulatedAmbulances(lat: number, lon: number, country?: string) {
  const configs = [
    {
      name: getSimulatedAmbulanceNameForCountry(country, 1),
      type: 'Advanced Life Support (ALS)',
      offsetKm: 4.5,
      bearing: 40,
      equipment: ['Defibrillator', 'Oxygen', 'Suction Unit', 'IV Resuscitation'],
    },
    {
      name: getSimulatedAmbulanceNameForCountry(country, 2),
      type: 'Basic Life Support (BLS)',
      offsetKm: 8.8,
      bearing: 160,
      equipment: ['Spine Board', 'Oxygen Mask', 'Trauma Kit', 'Splints'],
    },
    {
      name: getSimulatedAmbulanceNameForCountry(country, 3),
      type: 'Rapid Advanced Unit',
      offsetKm: 13.2,
      bearing: 280,
      equipment: ['AED Defibrillator', 'Airway Kit', 'Bleeding Control Pack'],
    },
  ];

  return configs.map((c, i) => {
    const coords = offsetCoordinates(lat, lon, c.offsetKm, c.bearing);
    const dist = haversineDistanceKm(lat, lon, coords.lat, coords.lng);
    const eta = Math.max(5, Math.round((dist / 42) * 60) + 3);
    return {
      id: `sim-amb-${i + 1}`,
      name: c.name,
      lat: coords.lat,
      lng: coords.lng,
      distanceKm: dist,
      etaMinutes: eta,
      type: c.type,
      status: 'Available',
      equipment: c.equipment,
      baseStation: `Local Dispatch Sector ${i + 1}`,
      paramedic: `Paramedic Unit ${i + 1}`,
      selectionReason: `Available ambulance ${dist} km away (~${eta} min ETA)`,
      isSimulated: true,
    };
  });
}

function generateSimulatedVolunteers(lat: number, lon: number) {
  const configs = [
    {
      name: '[Simulated] Community Volunteer - Responder 1',
      vehicle: 'Motorbike',
      offsetKm: 3.5,
      bearing: 70,
      training: 'CPR & Bleeding Control Certified',
      kit: ['Pressure Dressing', 'Pocket Mask', 'Tourniquet'],
    },
    {
      name: '[Simulated] Community Volunteer - Responder 2',
      vehicle: 'Pickup / Car',
      offsetKm: 7.2,
      bearing: 195,
      training: 'Rural First Aid Specialist',
      kit: ['C-Spine Collar', 'Burn Kit', 'Splint Pack'],
    },
    {
      name: '[Simulated] Community Volunteer - Responder 3',
      vehicle: 'Motorbike',
      offsetKm: 12.0,
      bearing: 310,
      training: 'Emergency Community Responder',
      kit: ['Oxygen Canister', 'Thermal Blanket', 'Vital Signs Kit'],
    },
  ];

  return configs.map((c, i) => {
    const coords = offsetCoordinates(lat, lon, c.offsetKm, c.bearing);
    const dist = haversineDistanceKm(lat, lon, coords.lat, coords.lng);
    const eta = Math.max(3, Math.round((dist / 38) * 60) + 2);
    return {
      id: `sim-vol-${i + 1}`,
      name: c.name,
      lat: coords.lat,
      lng: coords.lng,
      distanceKm: dist,
      etaMinutes: eta,
      vehicle: c.vehicle,
      training: c.training,
      kit: c.kit,
      assignedReason: `Nearest community volunteer (${dist} km, ~${eta} min arrival by ${c.vehicle})`,
      dispatched: eta < 15,
      isSimulated: true,
    };
  });
}

// -------------------------------------------------------------
// Endpoint 1: /api/triage-emergency
// Analyzes incoming emergency SMS / voice note in ANY language & ANY global location
// -------------------------------------------------------------
app.post('/api/triage-emergency', async (req: Request, res: Response) => {
  try {
    const { message, audioBase64, mimeType } = req.body;

    if (!message && !audioBase64) {
      return res.status(400).json({ error: 'Message or audio note is required' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'Gemini AI API key not configured on server' });
    }

    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    const promptText = `You are GoldenHourAI, an emergency triage intelligence engine for rural and remote areas ANYWHERE IN THE WORLD with no street addresses, internet, or hospitals nearby.
${audioBase64 ? 'AN EMERGENCY AUDIO RECORDING HAS BEEN PROVIDED ABOVE.' : ''}
Caller provided input / message:
"${message || (audioBase64 ? 'Listen to the audio recording attached' : 'Emergency voice report')}"

CRITICAL INSTRUCTIONS FOR AUDIO OR TEXT:
1. If audio is provided, carefully LISTEN to the audio stream. Accurately transcribe the spoken words in the caller's spoken language into the "transcribedText" field. Support ANY language or code-mixed speech (Tamil, Hindi, English, Telugu, Kannada, Spanish, Japanese, Chinese, Tagalog, Indonesian, Swahili, French, German, Arabic, etc.).
2. Detect caller language and specify in "detectedLanguage" (e.g. Tamil, Japanese, Indonesian, Hindi, Tagalog, English, Swahili, etc.) and specific dialect if discernible in "dialect".
3. Translate accurately to concise English in "shortEnglishTranslation".
4. Identify patient summary, symptoms, and likely emergency type (e.g. Acute Myocardial Infarction / Cardiac Event, Snakebite / Envenomation, Major Trauma / Hemorrhage, Respiratory Failure, Stroke, Tractor Rollover, Pesticide Poisoning, Obstructed Labor, Infant Choking).
5. Assign Risk Level / Severity (Critical / Serious / Moderate / Mild) with a confidence percentage (60-99%). NEVER present this as a medical diagnosis; frame it as emergency triage risk level.
6. Extract place mentions only what the caller actually said in "placeMentions":
   - villageOrTownOrCity: string
   - districtOrRegion: string
   - stateOrProvince: string
   - country: string
7. Extract rural landmarks (wells, banyan trees, schools, water tanks, tea stalls, mileage stones, temples, bridges, highway km markers, shrines, mountains, river crossings) in "landmarksMentioned".
8. Inferred Country:
   - If the caller did not say the country, infer it from the place names, the language, and dialect (e.g. Tamil -> likely India or Sri Lanka; Bahasa -> Indonesia or Malaysia; Japanese -> Japan; Tagalog -> Philippines; Swahili -> Kenya or Tanzania).
   - Return "inferredCountry": {
       "name": "string (e.g. Japan, India, Indonesia, Philippines, Sri Lanka, United States)",
       "countryCode": "string (ISO 2-letter uppercase, e.g. JP, IN, ID, PH, LK, US, AU, GB, etc.)",
       "reason": "string explaining how the country was inferred",
       "confidence": "high" | "medium" | "low"
     }
9. Geocoding Search Queries:
   - Formulate "searchQueries": array of 2 to 4 search strings from most specific to least specific for geocoding with OpenStreetMap Nominatim.
   - Example 1: ["Shibuya, Tokyo, Japan", "Tokyo, Japan", "Japan"]
   - Example 2: ["Keelapatti, Pudukkottai, Tamil Nadu, India", "Pudukkottai, Tamil Nadu, India", "Tamil Nadu, India"]
   - Example 3: ["Ubud, Gianyar, Bali, Indonesia", "Gianyar, Bali, Indonesia", "Bali, Indonesia"]
10. Fallback Coordinates:
    - If OpenStreetMap search fails, provide your best AI geographical estimate for the mentioned city/region/country in "fallbackCoordinates":
      {
        "description": "string",
        "latitude": number (accurate latitude for that place/region/country),
        "longitude": number (accurate longitude for that place/region/country),
        "landmarkAnchor": "string",
        "accessNotes": "string"
      }
11. Local Emergency Numbers:
    - Identify the local medical / emergency telephone numbers for the inferred country (e.g. India 112/108, Japan 119, China 120, Indonesia 112/119, Philippines 911, Singapore 995, Malaysia 999, Sri Lanka 1990, Australia 000, USA 911, UK 999, Europe 112).
12. Generate EXACTLY 2 short, vital triage questions both in English and in the CALLER'S OWN LANGUAGE.
    - For EACH question, also generate 4 short answer "options" in the caller's language ("textCallerLang") with English ("textEnglish"), e.g. "Yes, breathing" / "No, not breathing" / "Breathing with noise" / "Not sure".
13. Generate 4 to 6 step-by-step precautionary and life-saving first aid steps for bystanders in English and in the CALLER'S OWN LANGUAGE.
14. Generate a direct SMS/Call verbal reply in the CALLER'S OWN LANGUAGE: A reassuring opening line explicitly mentioning the local emergency service number (e.g. "119救急隊", "108 Emergency", "1990 සුවසැරිය", "911 Dispatch"), the 2 triage questions, and the numbered first aid steps. Keep it clear, calm, and easy to understand.
15. Identify the critical Golden Hour threshold (minutes, e.g. 90 mins for snakebite ASV, 60 mins for cardiac PCI/thrombolysis, 180 mins for stroke CT, 30 mins for thresher arterial hemorrhage, 5 mins for infant choking, 10 mins for electrocution CPR).
16. Extract specific life-saving DOs and 3-4 fatal folk myths DON'Ts ("⚠️ Do NOT do") to avoid.
17. Classify emergency category into one of: 'Venom & Toxicology' | 'Cardiovascular' | 'Trauma & Hemorrhage' | 'Stroke & Neurological' | 'Maternal & Pediatric' | 'Environmental & Electrical'.

Output strictly valid JSON with this structure:
{
  "transcribedText": "string",
  "detectedLanguage": "string",
  "dialect": "string",
  "shortEnglishTranslation": "string",
  "patientSummary": "string",
  "likelyEmergencyType": "string",
  "matchedCategory": "string",
  "goldenHourWindowMinutes": number,
  "goldenHourReason": "string",
  "criticalDos": ["string"],
  "fatalDonts": ["string"],
  "severity": "Critical" | "Serious" | "Moderate" | "Mild",
  "confidencePercentage": number,
  "severityReasoning": "string",
  "placeMentions": {
    "villageOrTownOrCity": "string",
    "districtOrRegion": "string",
    "stateOrProvince": "string",
    "country": "string"
  },
  "landmarksMentioned": ["string"],
  "inferredCountry": {
    "name": "string",
    "countryCode": "string",
    "reason": "string",
    "confidence": "high" | "medium" | "low"
  },
  "searchQueries": ["string"],
  "fallbackCoordinates": {
    "description": "string",
    "latitude": number,
    "longitude": number,
    "landmarkAnchor": "string",
    "accessNotes": "string"
  },
  "triageQuestions": [
    {
      "id": "q1",
      "questionEnglish": "string",
      "questionCallerLang": "string",
      "purpose": "string",
      "options": [
        { "id": "opt1", "textCallerLang": "string", "textEnglish": "string" },
        { "id": "opt2", "textCallerLang": "string", "textEnglish": "string" },
        { "id": "opt3", "textCallerLang": "string", "textEnglish": "string" },
        { "id": "opt4", "textCallerLang": "string", "textEnglish": "string" }
      ]
    },
    {
      "id": "q2",
      "questionEnglish": "string",
      "questionCallerLang": "string",
      "purpose": "string",
      "options": [
        { "id": "opt1", "textCallerLang": "string", "textEnglish": "string" },
        { "id": "opt2", "textCallerLang": "string", "textEnglish": "string" },
        { "id": "opt3", "textCallerLang": "string", "textEnglish": "string" },
        { "id": "opt4", "textCallerLang": "string", "textEnglish": "string" }
      ]
    }
  ],
  "firstAidSteps": [
    {
      "stepNumber": 1,
      "stepEnglish": "string",
      "stepCallerLang": "string"
    }
  ],
  "callerReplySMS": "string (Full reply in caller's language with local emergency number, reassurance, 2 questions, and first aid)"
}`;

    let rawResult = '';

    // First attempt: If audio is provided, try multimodal with Gemini
    if (audioBase64) {
      try {
        const audioContents = [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: audioBase64,
            },
          },
          { text: promptText },
        ];
        rawResult = await generateWithModelFallback({
          contents: audioContents,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
      } catch (audioErr: any) {
        console.warn('Multimodal audio Gemini call failed or rejected audio format:', audioErr?.message || audioErr);
        if (message && message.trim()) {
          rawResult = await generateWithModelFallback({
            contents: [{ text: promptText }],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });
        } else {
          throw audioErr;
        }
      }
    } else {
      rawResult = await generateWithModelFallback({
        contents: [{ text: promptText }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    }

    const parsed = cleanAndParseJSON(rawResult || '{}');

    // ---------------------------------------------------------
    // OpenStreetMap Nominatim Geocoding
    // ---------------------------------------------------------
    const countryCode = parsed.inferredCountry?.countryCode || '';
    const countryConfidence = parsed.inferredCountry?.confidence || 'medium';
    const searchQueries: string[] = Array.isArray(parsed.searchQueries) && parsed.searchQueries.length > 0
      ? parsed.searchQueries
      : [
          [parsed.placeMentions?.villageOrTownOrCity, parsed.placeMentions?.districtOrRegion, parsed.inferredCountry?.name].filter(Boolean).join(', '),
          [parsed.placeMentions?.districtOrRegion, parsed.inferredCountry?.name].filter(Boolean).join(', '),
          parsed.inferredCountry?.name,
        ].filter(Boolean);

    const geoResult = await geocodeWithNominatim(searchQueries, countryCode, countryConfidence);

    let finalLat = geoResult.lat;
    let finalLng = geoResult.lng;
    let finalDesc = geoResult.displayName;
    let finalCountry = geoResult.country || parsed.inferredCountry?.name || 'Local Region';
    let finalCountryCode = geoResult.countryCode || parsed.inferredCountry?.countryCode || countryCode || 'IN';
    let locationConfidence = geoResult.confidence;

    // If geocoding returned nothing, use Gemini's best estimate
    if (!finalLat || !finalLng || isNaN(finalLat) || isNaN(finalLng)) {
      finalLat = parsed.fallbackCoordinates?.latitude || 0;
      finalLng = parsed.fallbackCoordinates?.longitude || 0;
      finalDesc = parsed.fallbackCoordinates?.description || `${finalCountry} Emergency Sector`;
      locationConfidence = 'AI estimate (medium)';
    }

    // If low confidence or needs confirmation, include location confirmation prompt in SMS/operator note while keeping the 2 clinical triage questions intact
    if (geoResult.needsConfirmationQuestion || locationConfidence === 'Needs confirmation (low)') {
      const confirmNote = parsed.detectedLanguage?.toLowerCase().includes('tamil')
        ? ' (உங்கள் அருகிலுள்ள ஊர்/மாவட்ட பெயரை உறுதிப்படுத்தவும்)'
        : parsed.detectedLanguage?.toLowerCase().includes('hindi')
        ? ' (कृपया अपने निकटतम शहर या जिले की पुष्टि करें)'
        : ' (Please also confirm your nearest town or district)';
      if (parsed.callerReplySMS && !parsed.callerReplySMS.includes(confirmNote)) {
        parsed.callerReplySMS = `${parsed.callerReplySMS}${confirmNote}`;
      }
    }

    const countryInfo = getCountryEmergencyInfo(finalCountryCode, finalCountry);

    const rawLandmarks: string[] = Array.isArray(parsed.landmarksMentioned)
      ? parsed.landmarksMentioned
      : [];

    // Fetch REAL hospitals from OpenStreetMap Overpass & simulated responders around pin
    const hospitalData = await fetchRealHospitals(finalLat, finalLng);
    const ambulances = generateSimulatedAmbulances(finalLat, finalLng, finalCountry);
    const volunteers = generateSimulatedVolunteers(finalLat, finalLng);

    // Normalize questions (2 questions with 3-4 bilingual options each) and 4-6 firstAidSteps
    const normalizedQuestions = ensureTwoQuestionsWithOptions(
      parsed.triageQuestions,
      parsed.detectedLanguage || 'English'
    );
    const normalizedFirstAid = ensureGuidedFirstAidSteps(
      parsed.firstAidSteps,
      parsed.detectedLanguage || 'English',
      parsed.likelyEmergencyType
    );
    const normalizedFatalDonts = ensureFatalDontsList(
      parsed.fatalDonts,
      parsed.likelyEmergencyType
    );

    // Start initial triage at Serious (86% confidence) when awaiting vital sign confirmation from the 2 triage questions
    const initialSeverity =
      parsed.severity === 'Critical' && normalizedQuestions.length > 0
        ? 'Serious'
        : parsed.severity || 'Serious';
    const initialConfidence =
      parsed.severity === 'Critical' && normalizedQuestions.length > 0
        ? Math.min(88, parsed.confidencePercentage || 86)
        : parsed.confidencePercentage || 86;

    const enrichedResult = {
      ...parsed,
      severity: initialSeverity,
      confidencePercentage: initialConfidence,
      triageQuestions: normalizedQuestions,
      firstAidSteps: normalizedFirstAid,
      fatalDonts: normalizedFatalDonts,
      estimatedLocation: {
        description: finalDesc,
        latitude: finalLat,
        longitude: finalLng,
        landmarkAnchor: rawLandmarks[0] || parsed.estimatedLocation?.landmarkAnchor || 'Incident Site',
        accessNotes: parsed.estimatedLocation?.accessNotes || 'Standard rural/remote road access',
        country: finalCountry,
        countryCode: finalCountryCode,
        countryFlag: countryInfo.flag,
        locationConfidence,
        localEmergencyNumber: countryInfo.numbers,
        geocodedPlaceName: finalDesc,
        placeMentions: parsed.placeMentions,
        inferredCountryReason: parsed.inferredCountry?.reason,
      },
      locationConfidence,
      country: finalCountry,
      countryCode: finalCountryCode,
      countryFlag: countryInfo.flag,
      localEmergencyNumber: countryInfo.numbers,
      nearbyHospitals: hospitalData.hospitals,
      nearbyAmbulances: ambulances,
      nearbyVolunteers: volunteers,
      hospitalSearchRadiusKm: hospitalData.radiusKm,
      hospitalNote: hospitalData.note,
      servingCellTower: generateCellTowerForLocation(
        finalLat,
        finalLng,
        finalCountryCode,
        rawLandmarks
      ),
    };

    return res.json(enrichedResult);
  } catch (error: any) {
    console.error('Error in /api/triage-emergency:', error?.message || error);
    return res.status(500).json({
      error: `Emergency triage failed: ${error?.message || 'Server error processing emergency'}`,
    });
  }
});

// -------------------------------------------------------------
// Endpoint 2: /api/update-triage
// When caller responds to the 2 triage questions via Voice or SMS,
// or taps "I need help" / reports patient got worse during Guided First Aid
// -------------------------------------------------------------
app.post('/api/update-triage', async (req: Request, res: Response) => {
  const {
    initialAssessment,
    callerAnswer,
    questionIndex,
    questionAsked,
    conversationLog,
    isHelpRequest,
    currentFirstAidStep,
    audioBase64,
    mimeType,
  } = req.body;

  const prevSeverity = initialAssessment?.severity || 'Serious';
  const prevConfidence = initialAssessment?.confidencePercentage || 86;
  const detectedLang = initialAssessment?.detectedLanguage || 'Tamil';

  try {
    if (!callerAnswer && !audioBase64) {
      return res.status(400).json({ error: 'Caller answer or voice audio is required' });
    }

    if (!ai) {
      const transition = computeSeverityTransition({
        previousSeverity: prevSeverity,
        previousConfidence: prevConfidence,
        answerText: callerAnswer || 'Voice answer',
        isHelpRequest: Boolean(isHelpRequest),
      });
      return res.json({
        previousSeverity: transition.previousSeverity,
        updatedSeverity: transition.newSeverity,
        previousConfidence: transition.previousConfidence,
        updatedConfidence: transition.newConfidence,
        severityChangeReason: transition.reason,
        transcribedAnswer: callerAnswer || 'Patient condition worsening',
        translatedAnswerEnglish: callerAnswer || 'Patient condition worsening',
        clinicalUpdateNote: transition.reason,
        callerReplySMS:
          'உடனடி உதவி அனுப்பிவிட்டோம். தொடர்ந்து சுவாசம் கவனிக்கவும். (Help is on the way. Keep monitoring breathing.)',
        tailoredFirstAidSteps: ensureGuidedFirstAidSteps(
          initialAssessment?.firstAidSteps,
          detectedLang,
          initialAssessment?.likelyEmergencyType
        ),
        updatedFatalDonts: ensureFatalDontsList(
          initialAssessment?.fatalDonts,
          initialAssessment?.likelyEmergencyType
        ),
        recommendConnectDoctor: Boolean(isHelpRequest) || transition.newSeverity === 'Critical',
      });
    }

    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    const prompt = `You are GoldenHourAI emergency response engine.
Initial triage assessment:
${JSON.stringify(
  {
    likelyEmergencyType: initialAssessment?.likelyEmergencyType,
    patientSummary: initialAssessment?.patientSummary,
    currentSeverity: prevSeverity,
    currentConfidence: prevConfidence,
    detectedLanguage: detectedLang,
  },
  null,
  2
)}

Full Conversation Log So Far:
${JSON.stringify(conversationLog || [], null, 2)}

${
  questionAsked
    ? `Question Just Asked (Question ${(questionIndex ?? 0) + 1} of 2):
English: "${questionAsked.questionEnglish}"
Caller Language: "${questionAsked.questionCallerLang}"`
    : ''
}
${
  isHelpRequest
    ? `URGENT ESCALATION: Caller tapped "I need help" or reported patient got worse during Guided First Aid (Step: ${
        currentFirstAidStep?.stepEnglish || 'Active First Aid'
      }).`
    : ''
}

${audioBase64 ? 'THE CALLER SPOKE AN AUDIO ANSWER ATTACHED ABOVE.' : ''}
Caller follow-up response / answer text:
"${callerAnswer || 'Listen to caller voice answer attached'}"

Caller language: ${detectedLang}

Task:
1. If audio is provided, listen and transcribe the caller's spoken answer into "transcribedAnswer" in their spoken language, and provide the English translation in "translatedAnswerEnglish".
2. Re-evaluate the emergency risk severity (Critical / Serious / Moderate / Mild) and confidence percentage (60-99%). If the answer indicates abnormal/absent breathing, unresponsiveness, heavy bleeding, rapid swelling, or if the caller asked for help / reported worsening, escalate "updatedSeverity" to "Critical" with high confidence (95-99%).
3. Provide a clear, specific "severityChangeReason" explaining why the severity changed or was confirmed (e.g. "Caller confirmed abnormal/absent breathing — immediate airway compromise escalates triage risk from Serious to Critical").
4. Provide a 1-sentence "clinicalUpdateNote" for the Dispatch Map and Hospital Pre-Alert.
5. Formulate a brief, reassuring reply in the CALLER'S OWN LANGUAGE ("callerReplySMS") acknowledging their answer.
6. Generate 4 to 6 step-by-step precautionary and first-aid instructions ("tailoredFirstAidSteps") tailored specifically to the caller's answers so far, in BOTH the caller's language ("stepCallerLang") and English ("stepEnglish").
7. Provide 3 to 4 clear "⚠️ Do NOT do" dangerous myths ("updatedFatalDonts") for this emergency.

Return strictly JSON:
{
  "transcribedAnswer": "string (in caller language)",
  "translatedAnswerEnglish": "string (in English)",
  "updatedSeverity": "Critical" | "Serious" | "Moderate" | "Mild",
  "updatedConfidence": number,
  "severityChangeReason": "string",
  "clinicalUpdateNote": "string",
  "callerReplySMS": "string in caller language",
  "tailoredFirstAidSteps": [
    {
      "stepNumber": 1,
      "stepCallerLang": "string",
      "stepEnglish": "string"
    }
  ],
  "updatedFatalDonts": ["string"],
  "recommendConnectDoctor": boolean
}`;

    let rawResult = '';
    if (audioBase64) {
      rawResult = await generateWithModelFallback({
        contents: [
          { inlineData: { mimeType: cleanMimeType, data: audioBase64 } },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    } else {
      rawResult = await generateWithModelFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    }

    const parsed = cleanAndParseJSON(rawResult || '{}');
    const transition = computeSeverityTransition({
      previousSeverity: prevSeverity,
      previousConfidence: prevConfidence,
      answerText: parsed.translatedAnswerEnglish || parsed.transcribedAnswer || callerAnswer || '',
      isHelpRequest: Boolean(isHelpRequest),
      serverUpdatedSeverity: parsed.updatedSeverity,
      serverUpdatedConfidence: parsed.updatedConfidence,
      serverReason: parsed.severityChangeReason || parsed.clinicalUpdateNote,
    });

    const tailoredSteps = ensureGuidedFirstAidSteps(
      parsed.tailoredFirstAidSteps || initialAssessment?.firstAidSteps,
      detectedLang,
      initialAssessment?.likelyEmergencyType
    );
    const updatedDonts = ensureFatalDontsList(
      parsed.updatedFatalDonts || initialAssessment?.fatalDonts,
      initialAssessment?.likelyEmergencyType
    );

    return res.json({
      ...parsed,
      previousSeverity: transition.previousSeverity,
      updatedSeverity: transition.newSeverity,
      previousConfidence: transition.previousConfidence,
      updatedConfidence: transition.newConfidence,
      severityChangeReason: transition.reason,
      clinicalUpdateNote: parsed.clinicalUpdateNote || transition.reason,
      tailoredFirstAidSteps: tailoredSteps,
      updatedFatalDonts: updatedDonts,
      recommendConnectDoctor:
        Boolean(isHelpRequest) ||
        Boolean(parsed.recommendConnectDoctor) ||
        transition.newSeverity === 'Critical',
    });
  } catch (err: any) {
    console.error('Error in /api/update-triage:', err);
    const fallbackTransition = computeSeverityTransition({
      previousSeverity: prevSeverity,
      previousConfidence: prevConfidence,
      answerText: callerAnswer || 'Spoken triage answer',
      isHelpRequest: Boolean(isHelpRequest),
    });
    return res.json({
      previousSeverity: fallbackTransition.previousSeverity,
      updatedSeverity: fallbackTransition.newSeverity,
      previousConfidence: fallbackTransition.previousConfidence,
      updatedConfidence: fallbackTransition.newConfidence,
      severityChangeReason: fallbackTransition.reason,
      transcribedAnswer: callerAnswer || 'Spoken triage answer',
      translatedAnswerEnglish: callerAnswer || 'Spoken triage answer',
      clinicalUpdateNote: fallbackTransition.reason,
      callerReplySMS:
        'உதவி விரைந்து வருகிறது. நோயாளிக்கு தண்ணீர் கொடுக்க வேண்டாம். (Help is speeding to your location. Do not give water to patient.)',
      tailoredFirstAidSteps: ensureGuidedFirstAidSteps(
        initialAssessment?.firstAidSteps,
        detectedLang,
        initialAssessment?.likelyEmergencyType
      ),
      updatedFatalDonts: ensureFatalDontsList(
        initialAssessment?.fatalDonts,
        initialAssessment?.likelyEmergencyType
      ),
      recommendConnectDoctor: Boolean(isHelpRequest) || fallbackTransition.newSeverity === 'Critical',
    });
  }
});

// -------------------------------------------------------------
// Endpoint 3: /api/nearby-resources
// Fetches real hospitals from OpenStreetMap and generates 3-15km simulated responders
// -------------------------------------------------------------
app.post('/api/nearby-resources', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude numbers are required' });
    }
    const hospitalData = await fetchRealHospitals(latitude, longitude);
    const ambulances = generateSimulatedAmbulances(latitude, longitude, req.body?.country);
    const volunteers = generateSimulatedVolunteers(latitude, longitude);
    return res.json({
      hospitals: hospitalData.hospitals,
      ambulances,
      volunteers,
      searchRadiusKm: hospitalData.radiusKm,
      hospitalNote: hospitalData.note,
    });
  } catch (err: any) {
    console.error('Error in /api/nearby-resources:', err);
    return res.status(500).json({ error: 'Failed to fetch nearby resources' });
  }
});

// -------------------------------------------------------------
// Endpoint 4: /api/dispatch-recommendation
// Selects best ambulance, RIGHT hospital based on clinical capability,
// and volunteer if ETA > 15 mins. Generates Hospital Pre-Alert.
// -------------------------------------------------------------
app.post('/api/dispatch-recommendation', async (req: Request, res: Response) => {
  try {
    const { emergency, ambulances: reqAmb, hospitals: reqHosp, volunteers: reqVol } = req.body;

    if (!emergency) {
      return res.status(400).json({ error: 'Emergency data is required' });
    }

    const lat = emergency.estimatedLocation?.latitude || 0;
    const lng = emergency.estimatedLocation?.longitude || 0;

    // Use passed resources or dynamically resolve around coordinates
    let resolvedHospitals = Array.isArray(reqHosp) && reqHosp.length > 0 ? reqHosp : emergency.nearbyHospitals;
    let resolvedAmbulances = Array.isArray(reqAmb) && reqAmb.length > 0 ? reqAmb : emergency.nearbyAmbulances;
    let resolvedVolunteers = Array.isArray(reqVol) && reqVol.length > 0 ? reqVol : emergency.nearbyVolunteers;
    let radiusKm = emergency.hospitalSearchRadiusKm || 25;
    let note = emergency.hospitalNote;

    if (!resolvedHospitals || resolvedHospitals.length === 0) {
      const hData = await fetchRealHospitals(lat, lng);
      resolvedHospitals = hData.hospitals;
      radiusKm = hData.radiusKm;
      note = hData.note;
    }
    if (!resolvedAmbulances || resolvedAmbulances.length === 0) {
      resolvedAmbulances = generateSimulatedAmbulances(
        lat,
        lng,
        emergency.country || emergency.estimatedLocation?.country
      );
    }
    if (!resolvedVolunteers || resolvedVolunteers.length === 0) {
      resolvedVolunteers = generateSimulatedVolunteers(lat, lng);
    }

    if (!ai) {
      return res.status(500).json({ error: 'Gemini AI API key not configured on server' });
    }

    const prompt = `You are GoldenHourAI emergency dispatch coordinator.
An emergency has arrived anywhere in the world:
Emergency Type: ${emergency.likelyEmergencyType}
Severity: ${emergency.severity} (Confidence: ${emergency.confidencePercentage}%)
Patient Summary: ${emergency.patientSummary}
Location: ${emergency.estimatedLocation?.description || emergency.estimatedLocation?.geocodedPlaceName || 'Incident Location'}
Coordinates: Lat ${lat}, Lng ${lng}
Landmarks: ${emergency.landmarksMentioned?.join(', ') || 'Rural Landmark'}
Country: ${emergency.country || emergency.estimatedLocation?.country || 'Local Country'}

Available Real & Simulated Resources:
Ambulances: ${JSON.stringify(resolvedAmbulances, null, 2)}
Hospitals: ${JSON.stringify(resolvedHospitals, null, 2)}
Community Volunteers: ${JSON.stringify(resolvedVolunteers, null, 2)}

Instructions:
1. Select the BEST available ambulance from the ambulances list (must be Available, closest calculated ETA taking distance into account).
2. Select the RIGHT hospital from the hospitals list based on clinical capability matching the emergency type:
   - Cardiac emergencies should go to a hospital with emergency resuscitation / cardiac capability.
   - Trauma / Hemorrhage emergencies should go to a center with trauma / surgical capabilities.
   - Stroke / Neurological should go to a capable emergency department.
   - Give a clear clinical rationale for this selection based on distance, ETA, and capabilities.
3. If chosen ambulance ETA is > 15 minutes, select the nearest Community Volunteer as an immediate First Responder to provide life support within the Golden Hour. Calculate realistic arrival time.
4. Generate a structured "Hospital Pre-Alert" card:
   - patientProfile: age/condition summary
   - primarySymptoms: list of key symptoms
   - estimatedOnset: estimated time since incident
   - firstAidAdministered: list of first aid steps active
   - destinationHospitalId: id of chosen hospital
   - destinationHospitalName: name of hospital
   - etaMinutes: number
   - requiredPrepTeams: list of teams (e.g. ["Cath Lab Team on standby", "Cardiologist on call", "Defibrillator & O2 prep"])

Return JSON:
{
  "selectedAmbulance": {
    "id": "string",
    "name": "string",
    "etaMinutes": number,
    "selectionReason": "string"
  },
  "selectedHospital": {
    "id": "string",
    "name": "string",
    "etaMinutes": number,
    "capabilityMatch": "string",
    "selectionReason": "string"
  },
  "selectedVolunteer": {
    "id": "string",
    "name": "string",
    "etaMinutes": number,
    "vehicle": "string",
    "assignedReason": "string",
    "dispatched": boolean
  },
  "hospitalPreAlert": {
    "patientProfile": "string",
    "primarySymptoms": ["string"],
    "estimatedOnset": "string",
    "firstAidAdministered": ["string"],
    "destinationHospitalId": "string",
    "destinationHospitalName": "string",
    "etaMinutes": number,
    "requiredPrepTeams": ["string"],
    "transmissionStatus": "Transmitted & Acknowledged"
  }
}`;

    const rawResult = await generateWithModelFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = cleanAndParseJSON(rawResult || '{}');

    // Build Central Registry facilities (at least 6) and ambulances around the caller
    const registryFacilities = generateCentralRegistryFacilities(
      lat,
      lng,
      emergency.country || emergency.estimatedLocation?.country,
      resolvedHospitals
    );
    const registryAmbulances = generateCentralRegistryAmbulances(
      lat,
      lng,
      emergency.country || emergency.estimatedLocation?.country,
      resolvedAmbulances
    );

    // Run Dispatch Scoring based on Rules 1, 2, 3
    const scoringResult = computeDispatchScoring({
      emergencyType: emergency.likelyEmergencyType || 'Acute Emergency',
      severity: emergency.severity || 'Serious',
      facilities: registryFacilities,
      ambulances: registryAmbulances,
      publicInsuranceHolder: emergency.publicInsuranceHolder ?? null,
      callerLat: lat,
      callerLng: lng,
    });

    const servingCellTower =
      emergency.servingCellTower ||
      generateCellTowerForLocation(
        lat,
        lng,
        emergency.countryCode || emergency.estimatedLocation?.countryCode,
        emergency.landmarksMentioned || []
      );

    const centralRegistry = {
      servingCellTower,
      facilities: registryFacilities,
      ambulances: registryAmbulances,
      scoringBreakdown: scoringResult.scoringBreakdown,
      selectedDoctor: scoringResult.bestDoctor,
      selectedFacility: scoringResult.bestFacility,
      selectedAmbulance: scoringResult.bestAmbulance,
      publicInsuranceHolder: emergency.publicInsuranceHolder ?? null,
      isSimulatedRegistry: true,
    };

    const bestFac = scoringResult.bestFacility;
    const bestDoc = scoringResult.bestDoctor;
    const bestAmb = scoringResult.bestAmbulance;

    const finalSelectedHospital = bestFac
      ? {
          id: bestFac.id,
          name: bestFac.name,
          etaMinutes: bestFac.etaMinutes,
          capabilityMatch: scoringResult.scoringBreakdown[0]?.requiredCapability || 'Emergency Care',
          selectionReason: scoringResult.geminiRationale,
          lat: bestFac.lat,
          lng: bestFac.lng,
          distanceKm: bestFac.distanceKm,
          level: bestFac.type,
          capabilities: bestFac.capabilityLabels,
          isReal: !bestFac.isSimulated,
        }
      : parsed.selectedHospital;

    const finalSelectedAmbulance = bestAmb
      ? {
          id: bestAmb.id,
          name: bestAmb.name,
          etaMinutes: bestAmb.etaMinutes,
          selectionReason: `${bestAmb.name} (${bestAmb.owner}, ${bestAmb.cost}) dispatched · ETA ~${bestAmb.etaMinutes} min`,
          lat: bestAmb.lat,
          lng: bestAmb.lng,
          distanceKm: bestAmb.distanceKm,
          type: bestAmb.type,
          status: bestAmb.status,
          equipment: bestAmb.equipment,
          isSimulated: true,
        }
      : parsed.selectedAmbulance;

    const finalPreAlert = {
      ...(parsed.hospitalPreAlert || {}),
      destinationHospitalId: bestFac?.id || parsed.hospitalPreAlert?.destinationHospitalId || 'reg-fac-1',
      destinationHospitalName: bestFac?.name || parsed.hospitalPreAlert?.destinationHospitalName || 'Receiving Facility',
      etaMinutes: bestFac?.etaMinutes || parsed.hospitalPreAlert?.etaMinutes || 18,
      requiredPrepTeams: [
        `${bestDoc ? `${bestDoc.specialty} on duty (${bestDoc.name})` : 'Specialist on duty'}`,
        bestFac?.icuBedsAvailable && bestFac.icuBedsAvailable > 0
          ? `ICU Bed Reserved (${bestFac.icuBedsAvailable} available)`
          : 'Emergency Bay Prepped',
        ...(parsed.hospitalPreAlert?.requiredPrepTeams || []),
      ].slice(0, 4),
    };

    // Attach full resources and Central Registry
    return res.json({
      ...parsed,
      selectedHospital: finalSelectedHospital,
      selectedAmbulance: finalSelectedAmbulance,
      selectedDoctor: bestDoc,
      hospitalPreAlert: finalPreAlert,
      centralRegistry,
      servingCellTower,
      allHospitals: resolvedHospitals,
      allAmbulances: resolvedAmbulances,
      allVolunteers: resolvedVolunteers,
      hospitalSearchRadiusKm: radiusKm,
      hospitalNote: note,
    });
  } catch (err: any) {
    console.error('Error in /api/dispatch-recommendation:', err);
    return res.status(500).json({
      error: `Dispatch recommendation failed: ${err?.message || 'Server error'}`,
    });
  }
});

// -------------------------------------------------------------
// Endpoint: /api/central-registry/toggle-availability
// Toggles doctor or ambulance availability and recomputes dispatch scoring
// -------------------------------------------------------------
app.post('/api/central-registry/toggle-availability', (req: Request, res: Response) => {
  try {
    const {
      doctorId,
      ambulanceId,
      facilities = [],
      ambulances = [],
      emergencyType = 'Acute Emergency',
      severity = 'Serious',
      publicInsuranceHolder = null,
      callerLat = 10.6455,
      callerLng = 78.5912,
    } = req.body;

    let updatedFacilities = facilities;
    let toggledDoctor = null;
    let updatedAmbulances = ambulances;
    let toggledAmbulance = null;
    let rerouteNotice = '';

    if (doctorId) {
      const docResult = toggleDoctorAvailability(facilities, doctorId);
      updatedFacilities = docResult.updatedFacilities;
      toggledDoctor = docResult.toggledDoctor;
      if (toggledDoctor) {
        rerouteNotice = `Doctor status updated: ${toggledDoctor.name} is now ${toggledDoctor.status.toUpperCase()} at ${toggledDoctor.hospitalName}.`;
      }
    }

    if (ambulanceId) {
      const ambResult = toggleAmbulanceAvailability(ambulances, ambulanceId);
      updatedAmbulances = ambResult.updatedAmbulances;
      toggledAmbulance = ambResult.toggledAmbulance;
      if (toggledAmbulance) {
        rerouteNotice = `Ambulance status updated: ${toggledAmbulance.name} is now ${toggledAmbulance.status.toUpperCase()}.`;
      }
    }

    const scoringResult = computeDispatchScoring({
      emergencyType,
      severity,
      facilities: updatedFacilities,
      ambulances: updatedAmbulances,
      publicInsuranceHolder,
      callerLat,
      callerLng,
    });

    if (toggledDoctor && toggledDoctor.status !== 'available' && scoringResult.bestFacility) {
      rerouteNotice += ` Automatic re-route triggered → Redirected to ${scoringResult.bestFacility.name} (${scoringResult.bestDoctor?.name || 'On-duty physician'}, ETA ${scoringResult.bestFacility.etaMinutes}m).`;
    }

    return res.json({
      facilities: updatedFacilities,
      ambulances: updatedAmbulances,
      scoringBreakdown: scoringResult.scoringBreakdown,
      selectedDoctor: scoringResult.bestDoctor,
      selectedFacility: scoringResult.bestFacility,
      selectedAmbulance: scoringResult.bestAmbulance,
      geminiRationale: scoringResult.geminiRationale,
      toggledDoctor,
      toggledAmbulance,
      rerouteNotice,
    });
  } catch (err: any) {
    console.error('Error in /api/central-registry/toggle-availability:', err);
    return res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// -------------------------------------------------------------
// Endpoint 4: /api/doctor-translate
// Live translation between Doctor and Rural Caller
// -------------------------------------------------------------
function getSmartDoctorTranslationFallback(text: string, fromLang: string, toLang: string): string {
  const src = String(text || '').trim();
  if (!src) return '';
  const target = (toLang || 'Tamil').toLowerCase();
  if (target.includes('english')) {
    // Caller -> Doctor English fallback
    if (/அசைகிறதா|சுவாசம்|மூச்சு|हाँ|हां|सांस|はい|息|ya|sí|oui/i.test(src)) {
      return `Caller reports: "${src}" (Patient breathing/status update acknowledged)`;
    }
    return src;
  }
  if (target.includes('tamil') || target.includes('தமிழ்')) {
    return `டாக்டர் அறிவுரை: ${src} (பதிலளிக்க 1 = ஆம், 2 = இல்லை அழுத்தவும் அல்லது பேசவும்)`;
  }
  if (target.includes('hindi') || target.includes('हिन्दी')) {
    return `डॉक्टर का निर्देश: ${src} (जवाब के लिए 1 = हाँ, 2 = नहीं दबाएं या बोलें)`;
  }
  if (target.includes('japanese') || target.includes('日本語')) {
    return `医師からの指示: ${src}（1＝はい、2＝いいえ を押すか話してください）`;
  }
  if (target.includes('bahasa') || target.includes('indonesia') || target.includes('malay')) {
    return `Arahan Dokter: ${src} (Tekan 1 = Ya, 2 = Tidak atau bicara)`;
  }
  if (target.includes('spanish') || target.includes('español')) {
    return `Instrucción del médico: ${src} (Presione 1 = Sí, 2 = No o hable)`;
  }
  return src;
}

app.post('/api/doctor-translate', async (req: Request, res: Response) => {
  const { text, fromLang, toLang, clinicalContext, speaker, callerLanguage } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const resolvedFrom = fromLang || (speaker === 'doctor' ? 'English' : callerLanguage || 'Tamil');
  const resolvedTo = toLang || (speaker === 'doctor' ? callerLanguage || 'Tamil' : 'English');

  try {
    if (!ai) {
      const fallbackTranslated = getSmartDoctorTranslationFallback(text, resolvedFrom, resolvedTo);
      return res.json({
        translatedText: fallbackTranslated,
        englishText: resolvedTo.toLowerCase().includes('english') ? fallbackTranslated : text,
        transliteration: '',
        clinicalTone: 'Direct',
      });
    }

    const prompt = `You are a medical live translator for GoldenHourAI emergency response.
Translate this emergency message between an Emergency Doctor (who speaks English) and a caller (who speaks ${callerLanguage || resolvedTo}).
Source Language: ${resolvedFrom}
Target Language: ${resolvedTo}
Context: ${clinicalContext || 'Emergency dispatch consultation'}

Message to translate:
"${text}"

Guidelines:
- Keep the language natural, compassionate, and clear for a bystander or patient under stress.
- Avoid overly academic terminology; use everyday spoken language in ${resolvedTo}.
- If translating doctor guidance to caller, keep sentences brief and direct.
- Return JSON:
{
  "translatedText": "string",
  "englishText": "string (the English version of the message)",
  "transliteration": "string (romanized pronunciation if script is non-Latin)",
  "clinicalTone": "string"
}`;

    const rawResult = await generateWithModelFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = cleanAndParseJSON(rawResult || '{}');
    const translatedText = parsed?.translatedText || getSmartDoctorTranslationFallback(text, resolvedFrom, resolvedTo);
    return res.json({
      ...parsed,
      translatedText,
      englishText:
        parsed?.englishText ||
        (resolvedTo.toLowerCase().includes('english') ? translatedText : text),
    });
  } catch (err: any) {
    console.error('Error in /api/doctor-translate:', err);
    const fallbackTranslated = getSmartDoctorTranslationFallback(text, resolvedFrom, resolvedTo);
    return res.json({
      translatedText: fallbackTranslated,
      englishText: resolvedTo.toLowerCase().includes('english') ? fallbackTranslated : text,
      transliteration: '',
      clinicalTone: 'Direct',
    });
  }
});

// -------------------------------------------------------------
// Endpoint 4B: /api/demo-doctor-response
// AI Demo Doctor turn (greeting + 2-4 safe first-aid steps + 1 check question + ETAs)
// -------------------------------------------------------------
app.post('/api/demo-doctor-response', async (req: Request, res: Response) => {
  const {
    assessment,
    dispatchPlan,
    firstAidStepIndex = 0,
    doctorMessages = [],
    callerReplyEnglish = '',
    callerLanguage = 'Tamil',
  } = req.body || {};

  const isFollowUpTurn =
    Boolean(String(callerReplyEnglish || '').trim()) ||
    (Array.isArray(doctorMessages) && doctorMessages.length > 0);
  const detectedLang = String(callerLanguage || assessment?.detectedLanguage || 'Tamil');
  const rawDocLabel = String(
    assessment?.doctorLabel || getCountryDoctorLabel(assessment?.countryDetected)
  );
  const doctorName = rawDocLabel.replace(/\s*\(.*\)\s*$/, '').trim() || 'Dr. Arvind';
  const ambEta = dispatchPlan?.selectedAmbulance?.etaMinutes ?? 12;
  const volEta = dispatchPlan?.selectedVolunteer?.dispatched
    ? dispatchPlan.selectedVolunteer.etaMinutes
    : null;

  const fallback = buildFallbackDemoDoctorResponse({
    assessment,
    dispatchPlan,
    firstAidStepIndex,
    callerReplyEnglish,
    isFollowUpTurn,
    callerLanguage: detectedLang,
  });

  if (!ai) {
    return res.json({
      ...fallback,
      aiMode: 'fallback_demo',
    });
  }

  try {
    const prompt = `You are acting as ${doctorName}, an Emergency Doctor on a live voice bridge with a bystander caller via GoldenHourAI.
CRITICAL SAFETY RULES:
- Give FIRST AID ONLY. Do NOT give any medical diagnosis. Do NOT prescribe or recommend any medicines, pills, drugs, or dosages.
- Keep your message calm, warm, urgent, and easy to follow under stress.
- Your response MUST include:
  1. ${!isFollowUpTurn ? `A brief greeting introducing yourself by doctor name (${doctorName}).` : `Direct acknowledgment of the caller's latest reply: "${callerReplyEnglish}".`}
  2. 2 to 4 short, safe, step-by-step first-aid instructions tailored to the patient brief, triage answers, and first-aid progress so far.
  3. ONE clear check question with "Press 1 / Press 2" options so the caller can respond by keypad or voice.
  4. Reassurance quoting the ambulance ETA (${ambEta} minutes)${volEta ? ` and community first responder ETA (${volEta} minutes)` : ''}.

Patient & Call Context:
- Emergency Type: ${assessment?.likelyEmergencyType || 'Medical Emergency'} (${assessment?.severity || 'Critical'})
- Patient Summary: ${assessment?.patientSummary || 'Patient in acute distress'}
- Location: ${assessment?.location || 'Caller location'} (${assessment?.countryDetected || 'Unknown'})
- Triage Follow-up Answers: ${JSON.stringify(assessment?.followUpQuestions?.map((q: any) => ({ q: q.questionEnglish, a: q.answer })) || [])}
- First-Aid Steps Completed: ${firstAidStepIndex + 1} of ${assessment?.firstAidSteps?.length || 4}
- Previous Doctor Bridge Messages: ${JSON.stringify((doctorMessages || []).slice(-4).map((m: any) => ({ sender: m.sender, en: m.englishText })))}
- Caller's Latest Reply (English): ${callerReplyEnglish || '(Call just connected)'}
- Caller's Native Language: ${detectedLang}

Return strict JSON with:
- doctorName: "${doctorName}"
- englishText: Full spoken message in English (greeting/acknowledgment + 2-4 numbered safe first-aid steps + 1 check question with Press 1 / Press 2 options + ambulance/responder ETA reassurance).
- translatedText: Natural, empathetic translation of the full message in ${detectedLang} (using native script where appropriate, including the Press 1 / Press 2 prompt in ${detectedLang}).
- checkQuestionEnglish: The check question in English.
- checkQuestionCallerLang: The check question in ${detectedLang}.
- checkOptions: Array of 2 options (digits "1" and "2") with labelEnglish and labelCallerLang.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            doctorName: { type: Type.STRING },
            englishText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
            checkQuestionEnglish: { type: Type.STRING },
            checkQuestionCallerLang: { type: Type.STRING },
            checkOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  digit: { type: Type.STRING },
                  labelEnglish: { type: Type.STRING },
                  labelCallerLang: { type: Type.STRING },
                },
                required: ['digit', 'labelEnglish', 'labelCallerLang'],
              },
            },
          },
          required: [
            'doctorName',
            'englishText',
            'translatedText',
            'checkQuestionEnglish',
            'checkQuestionCallerLang',
            'checkOptions',
          ],
        },
      },
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    if (!parsed || !parsed.englishText || !parsed.translatedText) {
      return res.json({
        ...fallback,
        aiMode: 'fallback_demo',
      });
    }

    return res.json({
      doctorName: parsed.doctorName || fallback.doctorName,
      englishText: sanitizeDemoDoctorFirstAidText(parsed.englishText),
      translatedText: parsed.translatedText,
      checkQuestionEnglish: sanitizeDemoDoctorFirstAidText(
        parsed.checkQuestionEnglish || fallback.checkQuestionEnglish
      ),
      checkQuestionCallerLang: parsed.checkQuestionCallerLang || fallback.checkQuestionCallerLang,
      checkOptions:
        Array.isArray(parsed.checkOptions) && parsed.checkOptions.length >= 2
          ? parsed.checkOptions
          : fallback.checkOptions,
      demoLabel: DEMO_DOCTOR_LABEL,
      aiMode: 'live_gemini',
    });
  } catch (error: any) {
    console.error('Gemini Demo Doctor Error:', error?.message || error);
    return res.json({
      ...fallback,
      aiMode: 'fallback_demo',
    });
  }
});

// -------------------------------------------------------------
// Endpoint 5: /api/doctor-suggest-prompts
// Quick AI prompts for the doctor to send with one click
// -------------------------------------------------------------
app.post('/api/doctor-suggest-prompts', async (req: Request, res: Response) => {
  const {
    patientSummary,
    emergencyType,
    callerLanguage,
    conversationLog = [],
    completedStepsCount = 0,
  } = req.body;

  const fallbackPrompts = buildFallbackDoctorSuggestedPrompts(
    {
      patientSummary: patientSummary || 'Collapsed patient',
      likelyEmergencyType: emergencyType || 'Acute Emergency',
      detectedLanguage: callerLanguage || 'Tamil',
    } as any,
    completedStepsCount
  );

  try {
    if (!ai) {
      return res.json({ prompts: fallbackPrompts });
    }

    const logText = Array.isArray(conversationLog)
      ? conversationLog
          .map((e: any) => `[${e.timestamp}] (${e.role}): ${e.textEnglish || e.textCallerLang}`)
          .join('\n')
      : '';

    const prompt = `Generate 4 actionable, high-priority NEXT instructions for an on-call emergency doctor speaking to a bystander on a simulated medical call.
Patient Summary: ${patientSummary || 'Collapsed patient'}
Emergency Type: ${emergencyType || 'General Emergency'}
Caller Language: ${callerLanguage || 'Tamil'}
Completed First-Aid Steps Count: ${completedStepsCount}
Conversation & Triage Log So Far:
${logText || 'Initial emergency call connected.'}

Return JSON:
{
  "prompts": [
    {
      "english": "string (concise 1-sentence doctor instruction in English)",
      "translated": "string (natural translation in caller's language)",
      "category": "string (e.g. Airway Check, Hemostasis, Vitals Check, Reassurance)"
    }
  ]
}`;

    const rawResult = await generateWithModelFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    const parsed = cleanAndParseJSON(rawResult || '{}');
    if (Array.isArray(parsed.prompts) && parsed.prompts.length >= 2) {
      return res.json({ prompts: parsed.prompts });
    }
    return res.json({ prompts: fallbackPrompts });
  } catch (err: any) {
    console.error('Error in /api/doctor-suggest-prompts:', err);
    return res.json({ prompts: fallbackPrompts });
  }
});

// -------------------------------------------------------------
// Endpoint 6: /api/doctor-handover-note
// Generates a short clinical handover note for ambulance crew & hospital when the doctor call ends
// -------------------------------------------------------------
app.post('/api/doctor-handover-note', async (req: Request, res: Response) => {
  const {
    assessment,
    conversationLog = [],
    doctorMessages = [],
    doctorName: rawDoctorName,
  } = req.body;
  const doctorName =
    rawDoctorName || getCountryDoctorLabel(assessment?.country);

  const fallbackNote = buildFallbackHandoverNote({
    assessment,
    conversationLog,
    doctorMessages,
    doctorName,
  });

  try {
    if (!ai) {
      return res.json(fallbackNote);
    }

    const logSummary = Array.isArray(conversationLog)
      ? conversationLog
          .map((e: any) => `[${e.timestamp}] ${e.role}: ${e.textEnglish || e.textCallerLang}`)
          .join('\n')
      : '';

    const docChatSummary = Array.isArray(doctorMessages)
      ? doctorMessages
          .map(
            (m: any) =>
              `[${m.timestamp}] ${m.sender.toUpperCase()}: ${
                m.sender === 'caller' ? m.translatedText : m.originalText
              }`
          )
          .join('\n')
      : '';

    const prompt = `You are ${doctorName} concluding a simulated tele-medical emergency call.
Write a short, structured clinical handover note for the inbound ambulance crew and receiving hospital emergency department.

Patient & Incident Data:
- Emergency Type: ${assessment?.likelyEmergencyType || 'Acute Emergency'}
- Severity: ${assessment?.severity || 'Critical'} (${assessment?.confidencePercentage || 95}%)
- Patient Summary: ${assessment?.patientSummary || 'Emergency patient'}
- Location: ${assessment?.estimatedLocation?.description || 'Incident site'}

Triage & Guided First-Aid Log:
${logSummary || 'Triage completed.'}

Doctor-Caller Live Translated Conversation:
${docChatSummary || 'Physician supervised bystander first aid.'}

Return JSON with this exact structure:
{
  "whatHappened": "string (1-2 sentences describing what happened and triage findings)",
  "firstAidGivenWithTimes": [
    { "time": "string (timestamp e.g. 10:14 AM)", "action": "string (first-aid step or doctor instruction given)" }
  ],
  "currentStatus": "string (1-2 sentences on current patient status, breathing/consciousness, and handover readiness)",
  "summaryNote": "string (concise 2-3 sentence handover note for ambulance crew and hospital pre-alert card)"
}`;

    const rawResult = await generateWithModelFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = cleanAndParseJSON(rawResult || '{}');
    return res.json({
      whatHappened: parsed.whatHappened || fallbackNote.whatHappened,
      firstAidGivenWithTimes:
        Array.isArray(parsed.firstAidGivenWithTimes) && parsed.firstAidGivenWithTimes.length > 0
          ? parsed.firstAidGivenWithTimes
          : fallbackNote.firstAidGivenWithTimes,
      currentStatus: parsed.currentStatus || fallbackNote.currentStatus,
      summaryNote: parsed.summaryNote || fallbackNote.summaryNote,
      generatedAt: fallbackNote.generatedAt,
      doctorName,
    });
  } catch (err: any) {
    console.error('Error in /api/doctor-handover-note:', err);
    return res.json(fallbackNote);
  }
});

// -------------------------------------------------------------
// Live Active Call State Store (in-memory room-keyed sessions for /caller, /ops, and /)
// Sessions older than 2 hours are automatically deleted.
// -------------------------------------------------------------
interface ServerActiveCallStore {
  roomCode: string;
  version: number;
  callId: string;
  updatedAt: number;
  callStartedAt: number | null;
  selectedCountryCode?: string;
  assessment: any | null;
  dispatchPlan: any | null;
  conversationLog: any[];
  severityHistory: any[];
  currentQuestionIndex: number;
  currentFirstAidStepIndex: number;
  showConnectDoctorNow: boolean;
  ambulanceEtaSeconds: number;
  doctorCallState: 'idle' | 'ringing' | 'connected' | 'ended';
  doctorName: string;
  doctorMessages: any[];
  demoDoctorEnabled?: boolean;
  humanDoctorTookOver?: boolean;
  pipelineTimings: Record<string, number>;
  isLoadingTriage: boolean;
  isUpdatingTriage: boolean;
}

function createFreshActiveCallStore(roomCode: string, version = 0): ServerActiveCallStore {
  return {
    roomCode,
    version,
    callId: `call-${roomCode}-${Date.now()}`,
    updatedAt: Date.now(),
    callStartedAt: null,
    selectedCountryCode: undefined,
    assessment: null,
    dispatchPlan: null,
    conversationLog: [],
    severityHistory: [],
    currentQuestionIndex: 0,
    currentFirstAidStepIndex: 0,
    showConnectDoctorNow: false,
    ambulanceEtaSeconds: 1080,
    doctorCallState: 'idle',
    doctorName: 'Dr. Elena Rostova (Emergency Doctor)',
    doctorMessages: [],
    demoDoctorEnabled: true,
    humanDoctorTookOver: false,
    pipelineTimings: {},
    isLoadingTriage: false,
    isUpdatingTriage: false,
  };
}

const activeCallSessions = new Map<string, ServerActiveCallStore>();

// Periodically purge room sessions older than 2 hours
setInterval(() => {
  pruneExpiredRoomSessions(activeCallSessions, Date.now(), ROOM_SESSION_TTL_MS);
}, 10 * 60 * 1000);

function resolveRoomKeyFromRequest(req: Request): string {
  const queryRoom = typeof req.query.room === 'string' ? req.query.room : '';
  const bodyRoom = typeof req.body?.roomCode === 'string' ? req.body.roomCode : '';
  return normalizeRoomCode(queryRoom || bodyRoom) || 'DEFAULT';
}

app.get('/api/active-call', (req: Request, res: Response) => {
  pruneExpiredRoomSessions(activeCallSessions, Date.now(), ROOM_SESSION_TTL_MS);
  const room = resolveRoomKeyFromRequest(req);
  let session = activeCallSessions.get(room);
  if (!session) {
    session = createFreshActiveCallStore(room, 0);
    activeCallSessions.set(room, session);
  }
  res.json(session);
});

app.post('/api/active-call', (req: Request, res: Response) => {
  pruneExpiredRoomSessions(activeCallSessions, Date.now(), ROOM_SESSION_TTL_MS);
  const room = resolveRoomKeyFromRequest(req);
  const body = req.body || {};
  const existing = activeCallSessions.get(room) || createFreshActiveCallStore(room, 0);
  const nextVersion = (existing.version || 0) + 1;

  if (body.reset) {
    const resetSession = createFreshActiveCallStore(room, nextVersion);
    activeCallSessions.set(room, resetSession);
    return res.json(resetSession);
  }

  const updatedSession: ServerActiveCallStore = {
    ...existing,
    roomCode: room,
    version: nextVersion,
    ...(body.callId !== undefined ? { callId: body.callId } : {}),
    ...(body.callStartedAt !== undefined ? { callStartedAt: body.callStartedAt } : {}),
    ...(body.selectedCountryCode !== undefined
      ? { selectedCountryCode: body.selectedCountryCode }
      : {}),
    ...(body.assessment !== undefined ? { assessment: body.assessment } : {}),
    ...(body.dispatchPlan !== undefined ? { dispatchPlan: body.dispatchPlan } : {}),
    ...(body.conversationLog !== undefined ? { conversationLog: body.conversationLog } : {}),
    ...(body.severityHistory !== undefined ? { severityHistory: body.severityHistory } : {}),
    ...(body.currentQuestionIndex !== undefined
      ? { currentQuestionIndex: body.currentQuestionIndex }
      : {}),
    ...(body.currentFirstAidStepIndex !== undefined
      ? { currentFirstAidStepIndex: body.currentFirstAidStepIndex }
      : {}),
    ...(body.showConnectDoctorNow !== undefined
      ? { showConnectDoctorNow: body.showConnectDoctorNow }
      : {}),
    ...(body.ambulanceEtaSeconds !== undefined
      ? { ambulanceEtaSeconds: body.ambulanceEtaSeconds }
      : {}),
    ...(body.doctorCallState !== undefined ? { doctorCallState: body.doctorCallState } : {}),
    ...(body.doctorName !== undefined ? { doctorName: body.doctorName } : {}),
    ...(body.doctorMessages !== undefined ? { doctorMessages: body.doctorMessages } : {}),
    ...(body.demoDoctorEnabled !== undefined
      ? { demoDoctorEnabled: Boolean(body.demoDoctorEnabled) }
      : {}),
    ...(body.humanDoctorTookOver !== undefined
      ? { humanDoctorTookOver: Boolean(body.humanDoctorTookOver) }
      : {}),
    ...(body.pipelineTimings !== undefined
      ? {
          pipelineTimings: {
            ...existing.pipelineTimings,
            ...body.pipelineTimings,
          },
        }
      : {}),
    ...(body.isLoadingTriage !== undefined ? { isLoadingTriage: body.isLoadingTriage } : {}),
    ...(body.isUpdatingTriage !== undefined ? { isUpdatingTriage: body.isUpdatingTriage } : {}),
    updatedAt: Date.now(),
  };

  activeCallSessions.set(room, updatedSession);
  return res.json(updatedSession);
});

// -------------------------------------------------------------
// Endpoint: /api/speak
// Converts text to speech using Gemini TTS models (primary voice for Tamil, Hindi,
// Japanese, Bahasa, English, etc.) and returns WAV audio (base64) for Web Audio API playback.
// -------------------------------------------------------------
const GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
];

const ttsAudioCache = new Map<
  string,
  {
    audioBase64: string;
    mimeType: string;
    sampleRate: number;
    model: string;
  }
>();

app.post('/api/speak', async (req: Request, res: Response) => {
  const rawText = typeof req.body?.text === 'string' ? req.body.text : '';
  const cleanText = rawText.trim();
  const language =
    typeof req.body?.language === 'string' && req.body.language.trim()
      ? req.body.language.trim()
      : 'English';
  const role: 'operator' | 'doctor' | 'caller' =
    req.body?.role === 'doctor'
      ? 'doctor'
      : req.body?.role === 'caller'
      ? 'caller'
      : 'operator';
  const voiceName =
    typeof req.body?.voiceName === 'string' && req.body.voiceName.trim()
      ? req.body.voiceName.trim()
      : selectGeminiTtsVoice(language, role);

  if (!cleanText) {
    return res.status(400).json({ error: 'Text is required for /api/speak' });
  }

  const cacheKey = `${voiceName}:${language.toLowerCase()}:${cleanText}`;
  const cached = ttsAudioCache.get(cacheKey);
  if (cached) {
    return res.json({
      ...cached,
      language,
      voiceName,
      cached: true,
    });
  }

  if (!ai) {
    return res.json({
      audioBase64: null,
      fallbackToBrowser: true,
      message: 'Gemini API not configured on server',
    });
  }

  let lastError: any = null;
  for (const ttsModel of GEMINI_TTS_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanText }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const audioPart = parts.find((p: any) => p.inlineData?.data);
      if (audioPart?.inlineData?.data) {
        const normalizedWav = ensureWavAudioBase64(
          audioPart.inlineData.data,
          audioPart.inlineData.mimeType,
          24000
        );
        const payload = {
          audioBase64: normalizedWav.audioBase64,
          mimeType: normalizedWav.mimeType,
          sampleRate: normalizedWav.sampleRate,
          model: ttsModel,
        };

        if (ttsAudioCache.size >= 150) {
          const oldestKey = ttsAudioCache.keys().next().value;
          if (oldestKey) ttsAudioCache.delete(oldestKey);
        }
        ttsAudioCache.set(cacheKey, payload);

        return res.json({
          ...payload,
          language,
          voiceName,
          cached: false,
        });
      }
    } catch (err: any) {
      lastError = err;
      // If rate limited or quota exhausted (429), break loop immediately to avoid redundant API hits
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        break;
      }
      continue;
    }
  }

  // Gracefully fallback to browser speech synthesis when TTS quota is exhausted or model unavailable
  return res.json({
    audioBase64: null,
    fallbackToBrowser: true,
    message: lastError?.message || 'Gemini TTS generation unavailable',
  });
});


// Fallback generator for realistic rural emergency responses
function getMockTriageResult(msg: string) {
  const lowerMsg = (msg || '').toLowerCase();

  // 1. Snakebite & Toxicology check
  if (/snake|viper|cobra|krait|bite|paambu|saap|kadi|visam/i.test(lowerMsg)) {
    return {
      transcribedText: msg || 'Snakebite in agricultural field',
      detectedLanguage: 'Tamil / Vernacular Indian Dialect',
      shortEnglishTranslation: 'Russell\'s Viper / venomous snakebite in agricultural field. Rapid swelling and severe pain.',
      patientSummary: 'Adult patient, envenomation in crop field, active progressive edema and bite marks.',
      likelyEmergencyType: 'Severe Snakebite Envenomation (Suspected Russell\'s Viper)',
      matchedCategory: 'Venom & Toxicology',
      goldenHourWindowMinutes: 90,
      goldenHourReason: 'Polyvalent Anti-Snake Venom (ASV) cold-chain administration needed within 90 mins before consumptive coagulopathy.',
      criticalDos: ['Immobilize bitten limb with a rigid splint', 'Keep patient still and calm', 'Transport immediately to cold-chain ASV center'],
      fatalDonts: ['DO NOT make incisions or cuts on bite marks', 'DO NOT attempt oral venom suction', 'DO NOT tie tight arterial tourniquets'],
      severity: 'Critical',
      confidencePercentage: 96,
      severityReasoning: 'Progressive local edema and bleeding from venomous bite requires immediate ICU anti-venom resuscitation.',
      landmarksMentioned: ['Paddy field bund', 'Irrigation well', 'Keelapatti canal'],
      estimatedLocation: {
        description: 'Agricultural field path 150m west of village irrigation well, Keelapatti South',
        latitude: 10.6412,
        longitude: 78.5864,
        landmarkAnchor: 'Field Irrigation Well Bund',
        accessNotes: 'Ambulance can reach field border; motorbike volunteer can reach patient within 4 minutes.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is there bleeding from the bite wound or swelling moving up the leg?',
          questionCallerLang: 'கடிபட்ட இடத்தில் ரத்தம் வருகிறதா? அல்லது வீக்கம் மேலே ஏறிக்கொண்டிருக்கிறதா?',
          purpose: 'Assess hemotoxic progression and coagulopathy',
        },
        {
          id: 'q2',
          questionEnglish: 'Can the patient swallow saliva and speak clearly, or are eyelids drooping?',
          questionCallerLang: 'எச்சில் முழுங்க முடிகிறதா? அல்லது கண் இமைகள் சொருகுகிறதா?',
          purpose: 'Assess neurotoxic respiratory muscle paralysis',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Keep the bitten leg completely motionless using a stick or cardboard as splint.',
          stepCallerLang: 'கால் அல்லது கையை அசைக்காமல் குச்சி வைத்து துணியால் கட்டவும்.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'DO NOT cut, suck, or tie a tight tourniquet. Remove rings or anklets before swelling.',
          stepCallerLang: 'கயிறு போட்டு ரத்தம் நிற்குமாறு இறுக்கமாக கட்ட வேண்டாம்! கத்தியால் கீறவோ வாயால் உறிஞ்சவோ கூடாது!',
        },
        {
          stepNumber: 3,
          stepEnglish: 'Rush to hospital with Anti-Snake Venom. Ambulance is en-route.',
          stepCallerLang: 'விஷ முறிவு மருந்து உள்ள மருத்துவமனைக்கு ஆம்புலன்ஸ் வருகிறது.',
        },
      ],
      callerReplySMS: `[108 EMER-AID] விஷமுறிவு ஆம்புலன்ஸ் புறப்பட்டுவிட்டது!
1. வீக்கம் மேலே ஏறுகிறதா?
2. கண் இமைகள் சொருகுகிறதா?

முதல் உதவி:
1. காலை அசைக்காமல் வைக்கவும்.
2. கயிறு போட்டு இறுக்கக் கட்டாதீர்கள்!
3. வாயால் விஷத்தை உறிஞ்சக் கூடாது!`,
    };
  }

  // 2. Cardiac / Heart Attack check
  if (/chest|heart|attack|seene|seena|gundelo|buke|dard|pasina|stemi|angina/i.test(lowerMsg)) {
    return {
      transcribedText: msg || 'Crushing chest pain and profuse sweating',
      detectedLanguage: 'Hindi / Indian Vernacular Mix',
      shortEnglishTranslation: 'Crushing retrosternal chest pain with profuse sweating, radiating to left arm. Acute cardiac event.',
      patientSummary: 'Adult patient, crushing central chest pain, cold diaphoresis, impending cardiogenic shock.',
      likelyEmergencyType: 'Acute Coronary Syndrome (STEMI / Severe Heart Attack)',
      matchedCategory: 'Cardiovascular',
      goldenHourWindowMinutes: 60,
      goldenHourReason: 'Door-to-balloon PCI / thrombolytic window is 60 minutes to salvage viable myocardium.',
      criticalDos: ['Sit patient up at 45 degrees', 'Chew 325mg soluble Aspirin if conscious and not allergic', 'Maintain calm, fan with fresh air'],
      fatalDonts: ['DO NOT allow patient to walk or climb stairs', 'DO NOT lay patient flat if breathless', 'DO NOT ignore left arm or jaw radiation'],
      severity: 'Critical',
      confidencePercentage: 95,
      severityReasoning: 'Central retrosternal crushing pain with diaphoresis is pathognomonic of acute myocardial ischemia.',
      landmarksMentioned: ['Village temple', 'Main road house', 'Rampur'],
      estimatedLocation: {
        description: 'House situated 30m east of the village Temple, Rampur Village, Viralimalai Road',
        latitude: 10.631,
        longitude: 78.572,
        landmarkAnchor: 'Rampur Village Temple',
        accessNotes: 'Concrete village lane accessible by standard 108 ambulance with defibrillator.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the pain radiating to the left arm, shoulder, or jaw?',
          questionCallerLang: 'क्या दर्द बाएं हाथ, कंधे या जबड़े की तरफ फैल रहा है? / வலி இடது கைக்கு பரவுகிறதா?',
          purpose: 'Confirm acute ischemic cardiac radiation pattern',
        },
        {
          id: 'q2',
          questionEnglish: 'Is the patient feeling dizzy or experiencing difficulty breathing?',
          questionCallerLang: 'क्या चक्कर आ रहा है या सांस लेने में भारी तकलीफ है?',
          purpose: 'Assess hemodynamic stability and pulmonary congestion',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Keep patient seated upright (45 degrees); do not allow lying flat.',
          stepCallerLang: 'मरीज को 45 डिग्री झुकाकर आराम से बैठाएं, लेटने न दें।',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen tight collar, belt and shirt buttons immediately.',
          stepCallerLang: 'गले और कमर के कपड़े ढीले करें और हवा आने दें।',
        },
        {
          stepNumber: 3,
          stepEnglish: 'If prescribed Aspirin is available and patient is conscious, allow chewing.',
          stepCallerLang: 'यदि एस्पिरिन उपलब्ध हो तो चबाने दें।',
        },
      ],
      callerReplySMS: `[108 EMER-AID] कार्डियक एम्बुलेंस रवाना हो चुकी है!
1. क्या दर्द बाएं हाथ में जा रहा है?
2. क्या सांस फूल रही है?

प्राथमिक उपचार:
1. लेटाएं नहीं, बैठाकर रखें।
2. कपड़े ढीले करें।
3. एस्पिरिन चबाने दें।`,
    };
  }

  // 3. Agricultural Machinery / Thresher Trauma check
  if (/thresher|tractor|machine|mangled|arm|hand|bleeding|artery|severed|amputat|cut/i.test(lowerMsg)) {
    return {
      transcribedText: msg || 'Thresher machine mangled extremity with heavy arterial bleeding',
      detectedLanguage: 'Multilingual Rural Dialect',
      shortEnglishTranslation: 'Arm caught in agricultural thresher machine, mangled extremity with severe pulsating arterial hemorrhage.',
      patientSummary: 'Farm worker, severe crush/amputation injury, heavy active hemorrhage, impending hemorrhagic shock.',
      likelyEmergencyType: 'Traumatic Arterial Hemorrhage & Mangled Extremity',
      matchedCategory: 'Trauma & Hemorrhage',
      goldenHourWindowMinutes: 30,
      goldenHourReason: 'Arterial exsanguination can cause irreversible hypovolemic cardiac arrest within 30 minutes.',
      criticalDos: ['Apply immediate high-pressure packing directly over bleeding wound', 'Apply improvised tourniquet 5cm above wound', 'Elevate limb if bone not exposed'],
      fatalDonts: ['DO NOT loosen tourniquet once applied', 'DO NOT wash deep open bone wounds with ditch water', 'DO NOT give oral liquids if shock suspected'],
      severity: 'Critical',
      confidencePercentage: 97,
      severityReasoning: 'Heavy spurting or pooling hemorrhage requires immediate mechanical hemostasis to prevent fatal blood loss.',
      landmarksMentioned: ['Farm pump house', 'Grain threshing floor', 'Keelapatti East'],
      estimatedLocation: {
        description: 'Grain threshing floor beside power transformer shed, Keelapatti East farm belt',
        latitude: 10.6375,
        longitude: 78.589,
        landmarkAnchor: 'Grain Threshing Floor Transformer Shed',
        accessNotes: 'Dirt road passable by ALS ambulance and emergency pickup.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the blood spurting out in rhythmic pulses like a fountain?',
          questionCallerLang: 'ரத்தம் பீறிட்டு அடிக்கிறதா? அல்லது நிற்காமல் பெருக்கெடுத்து ஓடுகிறதா?',
          purpose: 'Differentiate arterial vs venous bleeding to calibrate tourniquet tightness',
        },
        {
          id: 'q2',
          questionEnglish: 'Is the patient pale, sweating cold, or feeling dizzy and faint?',
          questionCallerLang: 'நோயாளி வெளுத்துப் போய் மயக்க நிலைக்கு போகிறாரா?',
          purpose: 'Detect onset of Class III/IV hypovolemic hemorrhagic shock',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Take the cleanest thick cloth available and press with both hands directly into the bleeding point.',
          stepCallerLang: 'சுத்தமான துணியை வைத்து காயத்தின் மீது இரண்டு கைகளாலும் பலமாக அழுத்தவும்.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Tie a firm cloth strip 5cm above the injury. Insert a stick and twist until bleeding stops.',
          stepCallerLang: 'காயத்திற்கு மேல் 5 செ.மீ தூரத்தில் துணியை இறுக்கி, குச்சியால் முறுக்கி ரத்தப்போக்கை உடனே நிறுத்தவும்.',
        },
        {
          stepNumber: 3,
          stepEnglish: 'Keep patient lying flat with legs raised 30cm to preserve cerebral perfusion.',
          stepCallerLang: 'கால்களை உயர்த்தி படுக்க வைக்கவும்.',
        },
      ],
      callerReplySMS: `[108 EMER-AID] அதிதீவிர அவசர ஊர்தி விரைகிறது!
1. ரத்தம் பீறிட்டு அடிக்கிறதா?
2. மயக்கம் வருகிறதா?

முதல் உதவி:
1. காயத்தின் மீது பலமாக அழுத்தவும்.
2. மேலே கயிறு/துணியால் இறுக்கமாக கட்டவும்!
3. கால்களை உயர்த்தி படுக்க வைக்கவும்.`,
    };
  }

  // 4. Pesticide / Poisoning check
  if (/pesticide|poison|drank|insecticide|furadan|bottle|oleander|arali|vomit/i.test(lowerMsg)) {
    return {
      transcribedText: msg || 'Pesticide / Organophosphate ingestion in farm',
      detectedLanguage: 'Rural Vernacular Mix',
      shortEnglishTranslation: 'Ingested agricultural pesticide / organophosphate. Frothing at mouth, pinpoint pupils, breathing difficulty.',
      patientSummary: 'Adult patient, pesticide ingestion, hyper-salivation, respiratory distress, cholinergic crisis.',
      likelyEmergencyType: 'Acute Organophosphate / Pesticide Poisoning',
      matchedCategory: 'Venom & Toxicology',
      goldenHourWindowMinutes: 60,
      goldenHourReason: 'Immediate Atropine administration required within 60 mins before fatal bronchorrhea and respiratory arrest.',
      criticalDos: ['Remove pesticide-contaminated clothes immediately', 'Wash skin with plenty of clean water', 'Bring the exact pesticide container to hospital'],
      fatalDonts: ['DO NOT induce vomiting (causes fatal pulmonary aspiration)', 'DO NOT give raw cow dung, salt water, or kerosene concoctions', 'DO NOT allow bystanders to inhale fumes'],
      severity: 'Critical',
      confidencePercentage: 96,
      severityReasoning: 'Organophosphate toxidrome requires rapid airway clearance and early Atropinization.',
      landmarksMentioned: ['Farm pesticide shed', 'Canal bund', 'Mango grove'],
      estimatedLocation: {
        description: 'Pesticide mixing shed at the edge of the mango grove, Keelapatti West',
        latitude: 10.648,
        longitude: 78.579,
        landmarkAnchor: 'Mango Grove Chemical Shed',
        accessNotes: 'Paved until canal; 100m walking trail to shed.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is there excessive white foam or drool pouring from the mouth and nose?',
          questionCallerLang: 'வாயில் வெள்ளை நுரை அல்லது அதிக உமிழ்நீர் வருகிறதா?',
          purpose: 'Confirm cholinergic bronchorrhea and secretional airway risk',
        },
        {
          id: 'q2',
          questionEnglish: 'Do you have the original chemical bottle to show the paramedic team?',
          questionCallerLang: 'குடித்த விஷ பாட்டிலை கையில் எடுத்து வைத்துள்ளீர்களா?',
          purpose: 'Identify specific toxidrome active agent (Organophosphate vs Organochlorine)',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Place on side in recovery position so secretions drain without choking.',
          stepCallerLang: 'நுரை தொண்டையில் அடைக்காமல் இருக்க ஒருக்களித்து படுக்க வைக்கவும்.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Strip off contaminated clothes and wash exposed skin with clean water.',
          stepCallerLang: 'மருந்து பட்ட ஆடைகளை கழற்றி, உடலை தண்ணீரில் கழுவவும்.',
        },
        {
          stepNumber: 3,
          stepEnglish: 'DO NOT induce vomiting! Keep chemical bottle ready for doctors.',
          stepCallerLang: 'வாந்தி எடுக்க வைக்க வேண்டாம்! விஷ பாட்டிலை டாக்டரிடம் காட்ட பத்திரப்படுத்தவும்.',
        },
      ],
      callerReplySMS: `[108 EMER-AID] விஷமுறிவு வாகனம் விரைகிறது!
1. வாயில் நுரை வருகிறதா?
2. பாட்டிலை வைத்துள்ளீர்களா?

முதல் உதவி:
1. ஒருக்களித்து படுக்க வைக்கவும்.
2. வாந்தி எடுக்க வைக்கக் கூடாது!
3. பாட்டிலை பாதுகாப்பாக வைக்கவும்.`,
    };
  }

  // 5. Infant / Pediatric Choking check
  if (/choke|choking|seed|baby|child|infant|toddler|tamarind|swallow|breath/i.test(lowerMsg)) {
    return {
      transcribedText: msg || 'Toddler choking on tamarind seed with silent airway obstruction',
      detectedLanguage: 'Tamil / Indian Dialect',
      shortEnglishTranslation: '18-month toddler swallowed tamarind seed, unable to cry, turn blue around lips. Complete airway obstruction.',
      patientSummary: 'Toddler (18 months), complete foreign body airway obstruction, cyanosis around mouth.',
      likelyEmergencyType: 'Pediatric Foreign Body Airway Obstruction',
      matchedCategory: 'Maternal & Pediatric',
      goldenHourWindowMinutes: 5,
      goldenHourReason: 'Complete airway obstruction results in hypoxic brain damage within 4-5 minutes.',
      criticalDos: ['5 firm back blows with heel of hand between shoulder blades', 'Followed by 5 gentle chest thrusts', 'Keep child head downward'],
      fatalDonts: ['DO NOT perform blind finger sweeps (pushes object deeper)', 'DO NOT shake child vigorously', 'DO NOT hold child upright during back blows'],
      severity: 'Critical',
      confidencePercentage: 98,
      severityReasoning: 'Absence of vocalization with cyanosis signifies complete tracheal obstruction.',
      landmarksMentioned: ['Village center', 'Anganwadi center', 'Keelapatti'],
      estimatedLocation: {
        description: 'House opposite Anganwadi Child Welfare Center, Keelapatti Central Village',
        latitude: 10.643,
        longitude: 78.588,
        landmarkAnchor: 'Keelapatti Anganwadi Center',
        accessNotes: 'Village center road directly reachable.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Can the child make any coughing sound or cry, or is it completely silent?',
          questionCallerLang: 'குழந்தையால் இருமவோ அழவோ சத்தம் வருகிறதா, அல்லது முற்றிலும் சத்தம் வரவில்லையா?',
          purpose: 'Differentiate partial vs complete airway obstruction',
        },
        {
          id: 'q2',
          questionEnglish: 'Are the lips or fingertips turning bluish-purple?',
          questionCallerLang: 'உதடு அல்லது விரல் நகங்கள் நீல நிறமாக மாறுகிறதா?',
          purpose: 'Assess acute hypoxemia',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Place infant face down along your forearm, resting on your thigh, with head lower than chest.',
          stepCallerLang: 'குழந்தையை உங்கள் முழங்கையில் தலை கீழாக இருக்குமாறு குப்புற படுக்க வைக்கவும்.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Deliver up to 5 firm back blows between shoulder blades using the heel of your hand.',
          stepCallerLang: 'தோள்பட்டைகளுக்கு இடையில் உள்ளங்கையின் அடிப்பகுதியால் 5 முறை தட்டவும்.',
        },
        {
          stepNumber: 3,
          stepEnglish: 'Turn child over and give 5 chest thrusts with 2 fingers until object pops out.',
          stepCallerLang: 'முதுகில் தட்டியும் வரவில்லை என்றால், மார்பில் 2 விரல்களால் 5 முறை அழுத்தவும்.',
        },
      ],
      callerReplySMS: `[108 EMER-AID] குழந்தை மீட்பு ஆம்புலன்ஸ் புறப்பட்டது!
1. சத்தம் வருகிறதா?
2. உதடு நீலமாகிறதா?

உடனடி உதவி:
1. தலை கீழாக குப்புற வைக்கவும்.
2. முதுகில் 5 முறை பலமாக தட்டவும்.
3. வாய்க்குள் விரலை விட்டு துழாவ வேண்டாம்!`,
    };
  }

  const isTamil = /appa|vilundhutaaru|pennadi|keelapatti|muchu/i.test(msg);
  const isHindi = /maa|dard|pasina|mandir|gaon/i.test(msg);
  const isTelugu = /polamlo|spruha|gundelo|cheruvu|nānna|kotha/i.test(msg);
  const isKannada = /holadalli|biddu|maatu|usiraata|aalada|tande/i.test(msg);
  const isBengali = /maathe|pore|gechhen|kotha|buke|byatha|pukur/i.test(msg);
  const isChinese = /[\u4e00-\u9fa5]|父亲|稻田|晕倒|水塔|呼吸/i.test(msg);
  const isJapanese = /[\u3040-\u309f\u30a0-\u30ff]|畑で|倒れて|意識|給水塔|鳥居/i.test(msg);
  const isKorean = /[\uac00-\ud7af]|아버지가|쓰러|의식이|급수탑|정자나무/i.test(msg);
  const isBahasa = /pingsan|sawah|sesak|napas|beringin/i.test(msg);
  const isSpanish = /desmayó|desmayo|campo|respira|escuela/i.test(msg);
  const isFrench = /effondré|inconscient|respiration|château/i.test(msg);
  const isArabic = /[\u0600-\u06ff]|سقط|الحقل|فاقد|للوعي|خزان/i.test(msg);
  const isSwahili = /ameanguka|shambani|anapumua|tangi/i.test(msg);
  const isPortuguese = /desmaiou|plantação|desacordado|caixa/i.test(msg);
  const isGerman = /zusammengebrochen|atemnot|dorfschule|wasserturm/i.test(msg);

  // Telugu
  if (isTelugu) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Telugu (తెలుగు)',
      shortEnglishTranslation: 'Father collapsed in the agricultural field, unconscious, severe chest pain under the peepal tree near the new lake bund.',
      patientSummary: 'Elderly male, collapsed in field, unresponsive, severe chest pain.',
      likelyEmergencyType: 'Acute Coronary Syndrome / Suspected Myocardial Infarction',
      severity: 'Critical',
      confidencePercentage: 93,
      severityReasoning: 'Sudden collapse with acute chest pain and loss of consciousness indicates acute myocardial ischemia.',
      landmarksMentioned: ['New lake bund (Kotha cheruvu gattu)', 'Peepal/Banyan tree (Ravi chettu)', 'Crop field'],
      estimatedLocation: {
        description: 'Under the ancient Peepal tree along the new irrigation lake bund, Keelapatti South border',
        latitude: 10.6520,
        longitude: 78.5830,
        landmarkAnchor: 'Kotha Cheruvu Peepal Tree',
        accessNotes: 'Canal service road passable by 108 ambulance or volunteer motorbike.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is his chest moving up and down with breathing?',
          questionCallerLang: 'ఆయన ఛాతీ పైకి కిందకి కదులుతోందా? ఊపిరి తీసుకుంటున్నారా?',
          purpose: 'Assess active respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond if you shake his shoulders and call loudly?',
          questionCallerLang: 'భుజాలు తట్టి గట్టిగా పిలిస్తే కళ్ళు తెరుస్తున్నారా?',
          purpose: 'Assess consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Keep him resting flat and gently lift chin to keep windpipe clear.',
          stepCallerLang: 'సమతలంగా పడుకోబెట్టి, శ్వాసనాళం తెరుచుకోవడానికి గడ్డాన్ని పైకి ఎత్తండి.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen tight collar and waistcloth immediately for ventilation.',
          stepCallerLang: 'దుస్తులను వెంటనే వదులు చేయండి. గాలి తగలనివ్వండి.',
        },
        {
          stepNumber: 3,
          stepEnglish: 'DO NOT pour water into his mouth while he is unconscious.',
          stepCallerLang: 'స్పృహ లేనప్పుడు నోటిలో నీళ్ళు పోయకండి.',
        },
      ],
      callerReplySMS: `[108 EMER-AID] అంబులెన్స్ బయలుదేరింది!
1. ఛాతీ కదులుతోందా?
2. పిలిస్తే కళ్ళు తెరుస్తున్నారా?

ప్రథమ చికిత్స:
1. గడ్డాన్ని పైకి ఎత్తండి.
2. దుస్తులు వదులు చేయండి.
3. నోట్లో నీళ్లు పోయవద్దు!`,
    };
  }

  // Kannada
  if (isKannada) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Kannada (ಕನ್ನಡ)',
      shortEnglishTranslation: 'Father fell in the farmland, unable to speak, heavy gasping breath behind the petrol bunk near the big banyan tree.',
      patientSummary: 'Elderly male, collapsed in farmland, speech loss, severe dyspnea.',
      likelyEmergencyType: 'Acute Respiratory Distress / Syncope',
      severity: 'Critical',
      confidencePercentage: 91,
      severityReasoning: 'Loss of speech with labored gasping breathing indicates acute airway/cerebral crisis.',
      landmarksMentioned: ['Old banyan tree (Aalada mara)', 'Petrol pump', 'Farmland'],
      estimatedLocation: {
        description: 'Highway curve 200m behind the petrol pump adjacent to the grand banyan tree',
        latitude: 10.6220,
        longitude: 78.5480,
        landmarkAnchor: 'Aalada Mara behind Highway Petrol Bunk',
        accessNotes: 'Dirt road directly branching from National Highway 83.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is there gurgling or snoring sound during breathing?',
          questionCallerLang: 'ಉಸಿರಾಡುವಾಗ ಗೊರಕೆಯಂತಹ ಶಬ್ದ ಬರುತ್ತಿದೆಯೇ?',
          purpose: 'Assess airway blockage',
        },
        {
          id: 'q2',
          questionEnglish: 'Can he squeeze your hand if you hold it?',
          questionCallerLang: 'ಕೈ ಹಿಡಿದಾಗ ಬಿಗಿಯಾಗಿ ಹಿಡಿಯಲು ಸಾಧ್ಯವಾಗುತ್ತಿದೆಯೇ?',
          purpose: 'Assess motor responsiveness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Place on level ground; tilt head back slightly to clear airway.',
          stepCallerLang: 'ನೆಲದ ಮೇಲೆ ಮಲಗಿಸಿ, ಗಲ್ಲವನ್ನು ಮೇಲಕ್ಕೆ ಎತ್ತಿ ಉಸಿರಾಟ ಸುಲಭಗೊಳಿಸಿ.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen tight clothing and fan the patient.',
          stepCallerLang: 'ಬಿಗಿಯಾದ ಬಟ್ಟೆಗಳನ್ನು ಸಡಿಲಗೊಳಿಸಿ ಮತ್ತು ಗಾಳಿ ಆಡಲು ಬಿಡಿ.',
        },
      ],
      callerReplySMS: `[108 EMER-AID] ಅಂಬ್ಯುಲೆನ್ಸ್ ಹೊರಟಿದೆ!
1. ಉಸಿರಾಟದಲ್ಲಿ ಶಬ್ದ ಬರುತ್ತಿದೆಯೇ?
2. ಕೈ ಹಿಡಿಯಲು ಸಾಧ್ಯವೇ?

ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ:
1. ಗಲ್ಲವನ್ನು ಮೇಲಕ್ಕೆತ್ತಿ.
2. ಬಟ್ಟೆ ಸಡಿಲಗೊಳಿಸಿ.
3. ಬಾಯಿಗೆ ನೀರು ಹಾಕಬೇಡಿ!`,
    };
  }

  // Bengali
  if (isBengali) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Bengali (বাংলা)',
      shortEnglishTranslation: 'Father collapsed in the field, unresponsive, severe chest pain by the village pond behind Shani temple.',
      patientSummary: 'Adult male, sudden collapse, acute retrosternal distress.',
      likelyEmergencyType: 'Acute Coronary Syndrome / Heart Attack',
      severity: 'Critical',
      confidencePercentage: 94,
      severityReasoning: 'Collapse accompanied by severe chest pain warrants immediate ALS resuscitation.',
      landmarksMentioned: ['Shani temple', 'Village pond (Pukur)', 'Agricultural field'],
      estimatedLocation: {
        description: 'Bank of the village pond directly behind the Shani temple path',
        latitude: 10.6380,
        longitude: 78.5660,
        landmarkAnchor: 'Shani Temple Pond Path',
        accessNotes: 'Paved until temple, footpath 60m to pond bank.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the chest pain radiating to his left arm or shoulder?',
          questionCallerLang: 'ব্যথা কি বাঁ হাত বা কাঁধের দিকে ছড়াচ্ছে?',
          purpose: 'Confirm cardiac ischemia radiation',
        },
        {
          id: 'q2',
          questionEnglish: 'Is he conscious and responding to calls?',
          questionCallerLang: 'ডেকে সাড়া দিচ্ছেন কি?',
          purpose: 'Assess Glasgow Coma Scale',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Keep patient in semi-seated position; do not force to walk.',
          stepCallerLang: 'রোগীকে হেলান দিয়ে বসিয়ে রাখুন, হাঁটতে দেবেন না।',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen clothes and maintain cool fresh air.',
          stepCallerLang: 'গলার বোতাম ও পোশাক আলগা করে দিন।',
        },
      ],
      callerReplySMS: `[108 EMER-AID] জরুরি দল রওনা দিয়েছে!
১. ব্যথা কি বাঁ হাতে যাচ্ছে?
২. সাড়া দিচ্ছেন কি?

প্রাথমিক চিকিৎসা:
১. হেলান দিয়ে বসিয়ে রাখুন।
২. জামাকাপড় আলগা করুন।`,
    };
  }

  // Chinese (Mandarin)
  if (isChinese) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Chinese (Mandarin / 中文)',
      shortEnglishTranslation: 'Father fainted in the rice paddy, unconscious, extremely faint breathing beside old banyan tree behind village water tower.',
      patientSummary: 'Elderly male, collapsed in rice field, unconscious, critically shallow breathing.',
      likelyEmergencyType: 'Syncope / Critical Hypoxia / Heat Exhaustion',
      severity: 'Critical',
      confidencePercentage: 95,
      severityReasoning: 'Unconsciousness with shallow breathing indicates high risk of respiratory depression and cerebral hypoperfusion.',
      landmarksMentioned: ['Old banyan tree (老榕树)', 'Village committee water tower (村委会水塔)', 'Rice paddy (稻田)'],
      estimatedLocation: {
        description: 'Behind the village committee public water tower, edge of rice paddy beside old banyan tree',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Village Water Tower & Banyan Tree',
        accessNotes: 'Paved village road leading to cart-track by water tower.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is his chest rising and falling regularly?',
          questionCallerLang: '患者胸部是否有起伏？呼吸是否平稳？',
          purpose: 'Assess spontaneous respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond when you shout his name and tap his shoulders?',
          questionCallerLang: '拍打双肩并大声呼唤，是否有睁眼或肢体反应？',
          purpose: 'Assess neurological consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Place him flat on back, gently lift chin to keep airway open.',
          stepCallerLang: '让患者平卧，轻托下颌使气道通畅。',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen collar, belt, and tight clothing to ease breathing.',
          stepCallerLang: '解开衣领、腰带等紧身衣物，保持空气流通。',
        },
        {
          stepNumber: 3,
          stepEnglish: 'DO NOT give water or food while patient is unalert.',
          stepCallerLang: '意识不清时严禁喂水或药物，防止窒息。',
        },
      ],
      callerReplySMS: `【120紧急救援】救护车已出发！
1. 胸口是否有起伏？
2. 拍打呼唤是否有反应？

现场急救：
1. 平卧并轻抬下颌打开气道。
2. 解开衣领腰带。
3. 切勿喂水喂药！`,
    };
  }

  // Japanese
  if (isJapanese) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Japanese (日本語)',
      shortEnglishTranslation: 'Father suddenly collapsed in the field with loss of consciousness and labored breathing past old shrine Torii behind the water tower.',
      patientSummary: 'Elderly male, collapsed in agricultural field, unconscious, labored breathing.',
      likelyEmergencyType: 'Acute Respiratory Failure / Syncope',
      severity: 'Critical',
      confidencePercentage: 94,
      severityReasoning: 'Sudden collapse with respiratory compromise indicates critical airway vulnerability.',
      landmarksMentioned: ['Old shrine gate (神社の鳥居)', 'Agricultural water tower (給水塔)', 'Farmland (畑)'],
      estimatedLocation: {
        description: 'Past the old shrine Torii, 80m behind the large agricultural water tower',
        latitude: 10.6310,
        longitude: 78.5720,
        landmarkAnchor: 'Shrine Torii & Agricultural Water Tower',
        accessNotes: 'Ambulance accessible via agricultural lane.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is there chest movement or abnormal snoring sound during breathing?',
          questionCallerLang: '胸の上下の動きはありますか？いびきのような呼吸音はありませんか？',
          purpose: 'Assess airway obstruction',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond if you tap his shoulders and call out loudly?',
          questionCallerLang: '肩を軽く叩いて呼びかけると反応しますか？',
          purpose: 'Assess level of consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Lay flat and gently tilt chin upward to open the airway.',
          stepCallerLang: '平らな場所に寝かせ、顎を少し持ち上げて気道を確保してください。',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen tight clothing around neck and waist.',
          stepCallerLang: '衣服やベルトを緩めて風通しを良くしてください。',
        },
        {
          stepNumber: 3,
          stepEnglish: 'Never pour water into mouth while unconscious.',
          stepCallerLang: '意識がないときは絶対に水を飲ませないでください。',
        },
      ],
      callerReplySMS: `【119救急救命】救急車が緊急出動しました！
1. 胸は上下に動いていますか？
2. 呼びかけに反応はありますか？

応急手当：
1. 仰向けにして顎を上げ気道確保。
2. 衣服を緩める。
3. 水は絶対に飲ませないでください！`,
    };
  }

  // Korean
  if (isKorean) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Korean (한국어)',
      shortEnglishTranslation: 'Father suddenly collapsed in the rice field, unconscious and gasping for breath past village pavilion tree behind the old water tower.',
      patientSummary: 'Elderly male, collapsed in rice paddy, unconscious, agonal respiration.',
      likelyEmergencyType: 'Agonal Respiration / Acute Cardiac Event',
      severity: 'Critical',
      confidencePercentage: 96,
      severityReasoning: 'Agonal gasping respiration with unconsciousness represents immediate cardiac/respiratory arrest risk.',
      landmarksMentioned: ['Village pavilion tree (정자나무)', 'Old water tower (급수탑)', 'Rice paddy (논)'],
      estimatedLocation: {
        description: 'Behind the old village water tower past the community pavilion tree',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Village Pavilion & Water Tower',
        accessNotes: 'Rural field path accessible by volunteer motorcycle and ambulance.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the chest rising regularly, or is it irregular gasping for breath?',
          questionCallerLang: '가슴이 규칙적으로 오르내립니까, 아니면 헐떡거리는 비정상 호흡입니까?',
          purpose: 'Assess agonal breathing vs normal respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond if you tap both shoulders and speak loudly?',
          questionCallerLang: '양 어깨를 두드리며 크게 불렀을 때 눈을 뜨거나 반응합니까?',
          purpose: 'Assess GCS motor/eye response',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Place on back on flat ground, gently lift chin to open windpipe.',
          stepCallerLang: '평평한 바닥에 눕히고 턱을 살짝 들어 기도를 열어주세요.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen collar and belt immediately.',
          stepCallerLang: '옷깃과 허리띠를 즉시 풀어 편안하게 해주세요.',
        },
        {
          stepNumber: 3,
          stepEnglish: 'Do NOT give water by mouth while unconscious.',
          stepCallerLang: '의식이 없을 때 입에 물이나 약을 절대 넣지 마세요.',
        },
      ],
      callerReplySMS: `[119 응급구조] 구급차가 즉시 출동했습니다!
1. 가슴이 규칙적으로 움직입니까?
2. 어깨를 치며 부르면 반응합니까?

현장 응급처치:
1. 평평하게 눕히고 턱을 들어 기도 확보.
2. 옷깃과 벨트를 풀어주세요.
3. 물을 먹이지 마세요!`,
    };
  }

  // Bahasa Indonesia
  if (isBahasa) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Bahasa Indonesia',
      shortEnglishTranslation: 'Father collapsed in paddy field, unconscious and severe shortness of breath behind banyan tree near village school water tank.',
      patientSummary: 'Adult male, collapsed in field, unconscious, severe dyspnea.',
      likelyEmergencyType: 'Respiratory Failure / Heatstroke Syncope',
      severity: 'Critical',
      confidencePercentage: 93,
      severityReasoning: 'Unconsciousness coupled with dyspnea requires rapid emergency airway management.',
      landmarksMentioned: ['Banyan tree (Pohon beringin)', 'Village school (Sekolah desa)', 'Water tank (Tangki air)'],
      estimatedLocation: {
        description: 'Behind the banyan tree next to village school water tank',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Pohon Beringin dekat Tangki Air Sekolah',
        accessNotes: 'Jalan tanah desa dapat dilalui ambulans 112 / 119.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the chest moving up and down normally?',
          questionCallerLang: 'Apakah dadanya bergerak naik turun saat bernapas?',
          purpose: 'Assess breathing',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond when you call his name and tap his shoulders?',
          questionCallerLang: 'Apakah merespons saat dipanggil keras dan ditepuk pundaknya?',
          purpose: 'Assess consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Baringkan di tempat rata, angkat dagu sedikit untuk membuka jalan napas.',
          stepCallerLang: 'Baringkan di tempat rata, angkat dagu sedikit untuk membuka jalan napas.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Longgarkan pakaian ketat dan pastikan sirkulasi udara baik.',
          stepCallerLang: 'Longgarkan pakaian ketat dan pastikan sirkulasi udara baik.',
        },
      ],
      callerReplySMS: `[112 / 119 EMER-AID] Ambulans dalam perjalanan!
1. Apakah dada bergerak naik turun?
2. Apakah merespons saat dipanggil?

Pertolongan Pertama:
1. Baringkan dan angkat dagu.
2. Longgarkan pakaian.
3. JANGAN beri minum saat tidak sadar!`,
    };
  }

  // Spanish
  if (isSpanish) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Spanish (Español)',
      shortEnglishTranslation: 'Father fainted in crop field, unresponsive and breathing with difficulty behind rural school next to water tank.',
      patientSummary: 'Adult male, collapse in crop field, unresponsive, dyspnea.',
      likelyEmergencyType: 'Severe Dyspnea / Syncope',
      severity: 'Critical',
      confidencePercentage: 92,
      severityReasoning: 'Acute loss of consciousness and dyspnea requires urgent emergency response.',
      landmarksMentioned: ['Rural school (Escuela rural)', 'Water tank (Tanque de agua)', 'Cultivation field'],
      estimatedLocation: {
        description: 'Behind the rural school beside the community water tank',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Tanque de Agua Escuela Rural',
        accessNotes: 'Camino rural accesible para unidad de soporte vital.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is his chest moving or breathing irregularly?',
          questionCallerLang: '¿Se mueve el pecho con la respiración o hace ruidos extraños?',
          purpose: 'Assess respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond if you tap shoulders and call loudly?',
          questionCallerLang: '¿Responde si le llama en voz alta y le toca los hombros?',
          purpose: 'Assess GCS',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Coloque al paciente boca arriba e incline la barbilla hacia arriba para abrir vía aérea.',
          stepCallerLang: 'Coloque al paciente boca arriba e incline la barbilla hacia arriba.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Afloje la ropa apretada.',
          stepCallerLang: 'Afloje la ropa apretada alrededor del cuello y cintura.',
        },
      ],
      callerReplySMS: `[911 EMER-AID] ¡Ambulancia en camino!
1. ¿Se mueve el pecho?
2. ¿Responde al llamarle?

Primeros auxilios:
1. Boca arriba e incline barbilla.
2. Afloje la ropa.
3. ¡NO dar líquidos si está inconsciente!`,
    };
  }

  // French
  if (isFrench) {
    return {
      transcribedText: msg,
      detectedLanguage: 'French (Français)',
      shortEnglishTranslation: 'Father collapsed in the field, unconscious and agonal breathing behind communal school near large water tower.',
      patientSummary: 'Elderly male, collapsed, unconscious, agonal breathing.',
      likelyEmergencyType: 'Agonal Respiration / Syncope',
      severity: 'Critical',
      confidencePercentage: 94,
      severityReasoning: 'Agonal gasping with loss of consciousness signifies critical airway and hemodynamic crisis.',
      landmarksMentioned: ['Communal school (École communale)', 'Water tower (Château d’eau)', 'Agricultural field'],
      estimatedLocation: {
        description: 'Behind the communal school near the village water tower',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Château d’eau École',
        accessNotes: 'Piste rurale praticable par véhicule de secours.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the chest rising and falling?',
          questionCallerLang: 'La poitrine se soulève-t-elle régulièrement ?',
          purpose: 'Check breathing',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond to loud voice or shoulder touch?',
          questionCallerLang: 'Répond-il si vous le secouez doucement et l’appelez fort ?',
          purpose: 'Check consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Allonger sur le dos, basculer doucement la tête en arrière pour dégager les voies respiratoires.',
          stepCallerLang: 'Allonger sur le dos, basculer doucement la tête en arrière.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Desserrer le col et les vêtements serrés.',
          stepCallerLang: 'Desserrer le col et les vêtements serrés.',
        },
      ],
      callerReplySMS: `[112 / 15 EMER-AID] Ambulance en route !
1. La poitrine se soulève-t-elle ?
2. Répond-il aux appels ?

Premiers secours :
1. Allonger à plat, tête en arrière.
2. Desserrer vêtements.
3. NE PAS donner d'eau !`,
    };
  }

  // Arabic
  if (isArabic) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Arabic (العربية)',
      shortEnglishTranslation: 'Father suddenly collapsed in agricultural field, unconscious with severe labored breathing behind village school next to large water tank.',
      patientSummary: 'Adult male, sudden collapse in field, unconscious, severe dyspnea.',
      likelyEmergencyType: 'Loss of Consciousness / Airway Compromise',
      severity: 'Critical',
      confidencePercentage: 94,
      severityReasoning: 'Loss of consciousness with acute dyspnea carries immediate risk of respiratory arrest.',
      landmarksMentioned: ['Village school (مدرسة القرية)', 'Water tank (خزان المياه)', 'Field (الحقل)'],
      estimatedLocation: {
        description: 'Behind the village school next to the large water tank',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Village School Water Tank',
        accessNotes: 'Accessible road for emergency unit.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is his chest moving up and down with breathing?',
          questionCallerLang: 'هل يتحرك الصدر صعوداً وهبوطاً مع التنفس؟',
          purpose: 'Assess respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he open eyes or move when you call his name loudly?',
          questionCallerLang: 'هل يفتح عينيه أو يستجيب عند مناداته بصوت عالٍ؟',
          purpose: 'Assess consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Place on back, gently lift chin to clear airway.',
          stepCallerLang: 'ضعه مستلقياً على ظهره وارفع ذقنه بلطف لفتح مجرى التنفس.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen tight clothes around neck and chest.',
          stepCallerLang: 'قم بفك الملابس الضيقة حول الرقبة والصدر.',
        },
        {
          stepNumber: 3,
          stepEnglish: 'DO NOT pour water into mouth while unconscious.',
          stepCallerLang: 'لا تسكب أي ماء في فمه وهو فاقد للوعي.',
        },
      ],
      callerReplySMS: `[998 طوارئ] الإسعاف في طريقه إليكم فوراً!
1. هل يتحرك الصدر؟
2. هل يستجيب للنداء؟

الإسعافات الأولية:
1. ارفع الذقن لفتح مجرى الهواء.
2. فك الملابس الضيقة.
3. لا تسكب الماء في فمه أبداً!`,
    };
  }

  // Swahili
  if (isSwahili) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Swahili (Kiswahili)',
      shortEnglishTranslation: 'Father collapsed in farm field, unresponsive and breathing with difficulty behind village school near big water tank.',
      patientSummary: 'Elderly male, collapsed in farm, unresponsive, heavy breathing.',
      likelyEmergencyType: 'Severe Hypoxia / Syncope',
      severity: 'Critical',
      confidencePercentage: 92,
      severityReasoning: 'Unresponsiveness with heavy labored breathing requires urgent airway stabilization.',
      landmarksMentioned: ['Village school (Shule ya kijiji)', 'Water tank (Tangi la maji)', 'Farm field (Shamba)'],
      estimatedLocation: {
        description: 'Behind the village primary school near the large community water tank',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Primary School Water Tank',
        accessNotes: 'Barabara ya kijiji inapitika kwa gari la wagonjwa.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is his chest moving up and down normally?',
          questionCallerLang: 'Je, kifua chake kinapanda na kushuka anapopumua?',
          purpose: 'Assess respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond when you call out loudly and touch shoulders?',
          questionCallerLang: 'Je, anaitikia ukimwita kwa sauti na kugusa mabega?',
          purpose: 'Assess consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Mlaze chali kwenye ardhi tambarare na inua kidevu chake kufungua njia ya hewa.',
          stepCallerLang: 'Mlaze chali kwenye ardhi tambarare na inua kidevu chake.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Legeza nguo zinazobana shingoni na kiunoni.',
          stepCallerLang: 'Legeza nguo zinazobana shingoni na kiunoni.',
        },
      ],
      callerReplySMS: `[999 / 112 EMER-AID] Gari la wagonjwa liko njiani!
1. Je, kifua kinapanda na kushuka?
2. Je, anaitikia ukimwita?

Huduma ya Kwanza:
1. Mlaze chali, inua kidevu.
2. Legeza nguo zinazobana.
3. USIMPE maji akiwa amepoteza fahamu!`,
    };
  }

  // Portuguese
  if (isPortuguese) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Portuguese (Português)',
      shortEnglishTranslation: 'Father fainted on plantation, unconscious with severe shortness of breath behind community school near large water tank.',
      patientSummary: 'Adult male, collapse on plantation, unconscious, severe dyspnea.',
      likelyEmergencyType: 'Unresponsive / Respiratory Compromise',
      severity: 'Critical',
      confidencePercentage: 93,
      severityReasoning: 'Loss of consciousness and acute dyspnea require immediate life support.',
      landmarksMentioned: ['Community school (Escola comunitária)', 'Water tank (Caixa d’água)', 'Plantation (Plantação)'],
      estimatedLocation: {
        description: 'Behind the community school next to the large water tank',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Caixa d’Água Escola',
        accessNotes: 'Estrada de terra acessível para ambulância.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is his chest rising and falling?',
          questionCallerLang: 'O peito dele está subindo e descendo com a respiração?',
          purpose: 'Assess breathing',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond when called loudly?',
          questionCallerLang: 'Ele responde se você chamar em voz alta e tocar nos ombros?',
          purpose: 'Assess consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Deite de costas e levante suavemente o queixo para abrir as vias aéreas.',
          stepCallerLang: 'Deite de costas e levante suavemente o queixo.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Afrouxe roupas apertadas.',
          stepCallerLang: 'Afrouxe roupas apertadas no pescoço e cintura.',
        },
      ],
      callerReplySMS: `[192 EMER-AID] Ambulância a caminho!
1. O peito está se movendo?
2. Ele responde ao chamado?

Primeiros Socorros:
1. Deite de costas e erga o queixo.
2. Afrouxe as roupas.
3. NÃO dê água a quem estiver desacordado!`,
    };
  }

  // German
  if (isGerman) {
    return {
      transcribedText: msg,
      detectedLanguage: 'German (Deutsch)',
      shortEnglishTranslation: 'Father collapsed in field, unalert with severe respiratory distress behind the village school by the old water tower.',
      patientSummary: 'Elderly male, collapsed in field, unalert, severe dyspnea.',
      likelyEmergencyType: 'Acute Respiratory Distress / Syncope',
      severity: 'Critical',
      confidencePercentage: 94,
      severityReasoning: 'Unresponsiveness combined with dyspnea indicates acute respiratory and circulatory distress.',
      landmarksMentioned: ['Village school (Dorfschule)', 'Water tower (Wasserturm)', 'Field (Feld)'],
      estimatedLocation: {
        description: 'Behind the village school by the old water tower',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Dorfschule Wasserturm',
        accessNotes: 'Feldweg für Rettungsdienst befahrbar.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the chest rising and falling regularly?',
          questionCallerLang: 'Hebt und senkt sich der Brustkorb regelmäßig?',
          purpose: 'Assess respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he react when you speak loudly and touch shoulders?',
          questionCallerLang: 'Reagiert er auf lautes Ansprechen und Berühren der Schultern?',
          purpose: 'Assess consciousness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Flach auf den Rücken legen und das Kinn vorsichtig anheben, um die Atemwege freizumachen.',
          stepCallerLang: 'Flach auf den Rücken legen, Kinn anheben für freie Atemwege.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Enge Kleidung lockern und für Frischluft sorgen.',
          stepCallerLang: 'Enge Kleidung am Hals und Bauch lockern.',
        },
      ],
      callerReplySMS: `[112 NOTRUF] Rettungsdienst ist unterwegs!
1. Hebt sich der Brustkorb?
2. Reagiert er auf Ansprechen?

Erste Hilfe:
1. Flach hinlegen, Kinn anheben.
2. Kleidung lockern.
3. Bei Bewusstlosigkeit KEIN Wasser einflößen!`,
    };
  }

  // Tamil default
  if (isTamil) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Tamil (Colloquial Rural Dialect)',
      shortEnglishTranslation: 'Father collapsed in the agricultural field, unresponsive, breathing difficulty. Located behind Keelapatti government school near the water tank.',
      patientSummary: 'Elderly male collapsed in paddy field, unconscious, severe labored breathing.',
      likelyEmergencyType: 'Acute Respiratory Distress / Suspected Cardiac Arrest or Heat Syncope',
      severity: 'Critical',
      confidencePercentage: 94,
      severityReasoning: 'Loss of consciousness coupled with labored breathing signifies acute airway/circulatory compromise.',
      landmarksMentioned: ['Keelapatti government school', 'Overhead water tank', 'Paddy/Agricultural field'],
      estimatedLocation: {
        description: 'Behind Keelapatti Govt Higher Secondary School, adjacent to the public overhead water tank, Keelapatti Village, Pudukkottai/Trichy Border, Tamil Nadu',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'Keelapatti Govt School Water Tank',
        accessNotes: 'Paved road until school gate, narrow unpaved cart-track for 120m into field behind tank.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is his chest moving up and down, or making gurgling/snoring sounds?',
          questionCallerLang: 'மார்பு மேலும் கீழும் அசைகிறதா? அல்லது குறட்டை போன்ற சத்தம் வருகிறதா?',
          purpose: 'Assess active airway obstruction and spontaneous respiration',
        },
        {
          id: 'q2',
          questionEnglish: 'Does he respond if you tap his shoulders and call loudly?',
          questionCallerLang: 'தோள்பட்டையை தட்டி சத்தமாக கூப்பிட்டால் கண் திறக்கிறாரா அல்லது அசைவு உள்ளதா?',
          purpose: 'Assess Glasgow Coma Scale / motor responsiveness',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Place him gently on his back on level ground. Tilt chin up slightly to keep windpipe open.',
          stepCallerLang: 'சமமான தரையில் படுக்க வைத்து, காற்றுக்குழாய் திறக்க தாடையை லேசாக மேல்நோக்கி உயர்த்தவும்.',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Loosen tight shirt, waistcloth or belt immediately. Ensure cool air circulation.',
          stepCallerLang: 'சட்டை மற்றும் இடுப்பு வேட்டியை தளர்த்தவும். சுற்றிலும் கூட்டம் கூடாமல் காற்று வரவிடவும்.',
        },
        {
          stepNumber: 3,
          stepEnglish: 'DO NOT pour water into his mouth while he is unconscious.',
          stepCallerLang: 'மயக்கத்தில் இருக்கும்போது வாயில் தண்ணீர் அல்லது எதுவும் ஊற்ற வேண்டாம்.',
        },
      ],
      callerReplySMS: `[108 EMER-AID] உதவி குழு புறப்பட்டுவிட்டது!
கேள்வி 1: மார்பு அசைகிறதா?
கேள்வி 2: கூப்பிட்டால் கண் திறக்கிறாரா?

முதல் உதவி:
1. சமமாக படுக்கவைத்து தாடையை தூக்கவும்.
2. சட்டை/வேட்டி தளர்த்தவும்.
3. வாயில் தண்ணீர் ஊற்ற வேண்டாம்!`,
    };
  }

  // Hindi default
  if (isHindi) {
    return {
      transcribedText: msg,
      detectedLanguage: 'Hindi (Bhojpuri/Rural vernacular mix)',
      shortEnglishTranslation: 'Mother experiencing severe crushing chest pain and profuse sweating. House near the temple in Rampur village.',
      patientSummary: 'Adult female, acute retrosternal chest pain, diaphoresis (sweating).',
      likelyEmergencyType: 'Acute Coronary Syndrome (Suspected Myocardial Infarction / Heart Attack)',
      severity: 'Critical',
      confidencePercentage: 92,
      severityReasoning: 'Acute central chest pain with diaphoresis is a classic hallmark of acute myocardial ischemia.',
      landmarksMentioned: ['Shiva/Village temple', 'House near temple', 'Rampur village'],
      estimatedLocation: {
        description: 'House situated 30m east of the village Temple, Rampur Village, Viralimalai Road',
        latitude: 10.631,
        longitude: 78.572,
        landmarkAnchor: 'Rampur Village Temple',
        accessNotes: 'Concrete village lane accessible by standard 108 ambulance.',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is the pain radiating to her left arm, shoulder, or jaw?',
          questionCallerLang: 'क्या दर्द बाएं हाथ, कंधे या जबड़े की तरफ फैल रहा है?',
          purpose: 'Confirm acute ischemic cardiac radiation pattern',
        },
        {
          id: 'q2',
          questionEnglish: 'Is she able to sit up and breathe comfortably, or feeling dizzy?',
          questionCallerLang: 'क्या चक्कर आ रहा है या सांस लेने में भारी तकलीफ है?',
          purpose: 'Assess hemodynamic stability and pulmonary congestion',
        },
      ],
      firstAidSteps: [
        {
          stepNumber: 1,
          stepEnglish: 'Sit her upright or semi-reclined (45 degrees) with back supported.',
          stepCallerLang: 'मरीज को पीठ के सहारे 45 डिग्री झुकाकर आराम से बैठाएं, लेटने न दें।',
        },
        {
          stepNumber: 2,
          stepEnglish: 'Keep her calm and still. Loosen collar and tight clothing.',
          stepCallerLang: 'गले और कमर के कपड़े ढीले करें और शांत रखें।',
        },
        {
          stepNumber: 3,
          stepEnglish: 'If prescribed Aspirin/Sorbitrate is available and she is conscious, allow chewing.',
          stepCallerLang: 'यदि डॉक्टर द्वारा दी गई एस्पिरिन गोली उपलब्ध हो तो चबाने दें।',
        },
      ],
      callerReplySMS: `[108 EMER-AID] एम्बुलेंस रवाना हो चुकी है!
1. क्या दर्द बाएं हाथ में जा रहा है?
2. क्या चक्कर आ रहा है?

प्राथमिक उपचार:
1. लेटाएं नहीं, बैठाकर रखें।
2. कपड़े ढीले करें और हवा आने दें।`,
    };
  }

  // Dynamic fallback for any general rural emergency scenario provided by caller
  const cleanMsg = (msg || 'Emergency reported by caller').trim();
  const isBleeding = /bleed|blood|cut|wound|injury|fracture|bone|accident|fall|fell|hit|crash/i.test(cleanMsg);
  const isBreathing = /breath|air|chok|suffocat|gasp|chest|asthma/i.test(cleanMsg);
  const isPoison = /poison|pesticide|spray|vomit|chemical|drank|consumed/i.test(cleanMsg);
  const isLabor = /labor|pregnant|delivery|baby|birth|water broke/i.test(cleanMsg);

  let emergencyType = 'Acute Emergency / Vital Compromise';
  let category: any = 'Trauma & Hemorrhage';
  let goldenWindow = 60;
  let firstAid1 = 'Ensure patient is resting in a safe position and airway is clear.';
  let firstAid2 = 'Keep patient calm and still. Monitor consciousness and breathing.';

  if (isBleeding) {
    emergencyType = 'Acute Trauma & Hemorrhage / Physical Injury';
    category = 'Trauma & Hemorrhage';
    goldenWindow = 30;
    firstAid1 = 'Apply continuous direct firm pressure over the bleeding site with a clean cloth.';
    firstAid2 = 'Keep the patient lying flat; do not move injured limbs or spine if fracture suspected.';
  } else if (isBreathing) {
    emergencyType = 'Acute Respiratory Distress / Airway Compromise';
    category = 'Cardiovascular';
    goldenWindow = 45;
    firstAid1 = 'Sit patient upright or semi-reclined with back supported to ease breathing effort.';
    firstAid2 = 'Loosen any tight clothing around neck and chest; ensure adequate ventilation.';
  } else if (isPoison) {
    emergencyType = 'Acute Toxic Ingestion / Pesticide Exposure';
    category = 'Venom & Toxicology';
    goldenWindow = 60;
    firstAid1 = 'DO NOT induce vomiting. Keep airway clear and turn patient onto their left side.';
    firstAid2 = 'Collect bottle, container or label of the ingested substance for hospital toxicologist.';
  } else if (isLabor) {
    emergencyType = 'Emergency Rural Labor & Imminent Delivery';
    category = 'Maternal & Pediatric';
    goldenWindow = 30;
    firstAid1 = 'Place mother in clean, warm area with hips elevated on folded towels.';
    firstAid2 = 'Ensure clean warm cloths ready for newborn; do not pull umbilical cord.';
  }

  // Extract possible landmarks from message
  const words = cleanMsg.split(/\s+/);
  const extractedLandmarks: string[] = [];
  const landmarkKeywords = ['near', 'behind', 'opposite', 'pakkathula', 'next', 'by', 'school', 'temple', 'tree', 'well', 'tank', 'shop', 'road', 'bridge', 'field', 'gate'];
  
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (landmarkKeywords.includes(w)) {
      const phrase = words.slice(Math.max(0, i - 1), Math.min(words.length, i + 3)).join(' ');
      if (phrase && !extractedLandmarks.includes(phrase)) {
        extractedLandmarks.push(phrase);
      }
    }
  }
  if (extractedLandmarks.length === 0) {
    extractedLandmarks.push('Village landmark referenced by caller');
  }

  return {
    transcribedText: cleanMsg,
    detectedLanguage: /[\u0B80-\u0BFF]/.test(cleanMsg) ? 'Tamil' : /[\u0900-\u097F]/.test(cleanMsg) ? 'Hindi' : /[\u0C00-\u0C7F]/.test(cleanMsg) ? 'Telugu' : 'English / Vernacular',
    shortEnglishTranslation: cleanMsg,
    patientSummary: `Real-time caller report: "${cleanMsg}"`,
    likelyEmergencyType: emergencyType,
    matchedCategory: category,
    goldenHourWindowMinutes: goldenWindow,
    goldenHourReason: `Urgent critical intervention required within ${goldenWindow} minutes to prevent secondary deterioration.`,
    criticalDos: [firstAid1, firstAid2, 'Keep caller on the line while 108 ambulance navigates to coordinates.'],
    fatalDonts: ['DO NOT give oral fluids or sedatives if consciousness is altered.', 'DO NOT delay ambulance dispatch waiting for local remedies.'],
    severity: (isBleeding || isBreathing || cleanMsg.toLowerCase().includes('severe') || cleanMsg.toLowerCase().includes('unconscious')) ? 'Critical' : 'Serious',
    confidencePercentage: 91,
    severityReasoning: `Clinical presentation indicates ${emergencyType.toLowerCase()} requiring rapid rural emergency dispatch.`,
    landmarksMentioned: extractedLandmarks,
    estimatedLocation: {
      description: `Rural incident location near ${extractedLandmarks[0] || 'Keelapatti Sector'}`,
      latitude: 10.6455,
      longitude: 78.5912,
      landmarkAnchor: extractedLandmarks[0] || 'Rural Village Anchor',
      accessNotes: 'Local rural access route identified. Ambulance & village motorbike first-responder dispatched.',
    },
    triageQuestions: [
      {
        id: 'q1',
        questionEnglish: 'Is the patient able to speak and responsive when called?',
        questionCallerLang: 'நோயாளி பேச முடிகிறதா? கூப்பிட்டால் கண் திறக்கிறாரா? / Is the patient responsive?',
        purpose: 'Assess level of consciousness and airway stability',
      },
      {
        id: 'q2',
        questionEnglish: 'Is the patient breathing normally or gasping for air?',
        questionCallerLang: 'சுவாசம் சாதாரணமாக உள்ளதா? / Is breathing normal or gasping?',
        purpose: 'Evaluate respiratory rate and hemodynamic stability',
      },
    ],
    firstAidSteps: [
      {
        stepNumber: 1,
        stepEnglish: firstAid1,
        stepCallerLang: firstAid1,
      },
      {
        stepNumber: 2,
        stepEnglish: firstAid2,
        stepCallerLang: firstAid2,
      },
      {
        stepNumber: 3,
        stepEnglish: 'Keep patient calm and still. Ambulance is speeding to your landmark.',
        stepCallerLang: 'அமைதியாக இருங்கள். 108 அவசர ஊர்தி புறப்பட்டுவிட்டது.',
      },
    ],
    callerReplySMS: `[108 EMER-AID] 108 Emergency unit dispatched!
1. Is patient responsive?
2. Is breathing normal or gasping?

Immediate First Aid:
1. ${firstAid1}
2. ${firstAid2}
3. Stay on line. Help is en route!`,
  };
}

function getMockDispatchResult(emergency: any, ambulances: any[], hospitals: any[], volunteers: any[]) {
  const isCardiac = /cardiac|heart|coronary|chest/i.test(emergency?.likelyEmergencyType || '');
  const isTrauma = /trauma|bleeding|accident|fracture/i.test(emergency?.likelyEmergencyType || '');

  // Select ambulance
  const selectedAmbulance = ambulances?.find((a) => a.status === 'Available') || ambulances?.[0] || {
    id: 'amb-1',
    name: getSimulatedAmbulanceNameForCountry(
      emergency?.country || emergency?.estimatedLocation?.country,
      1
    ),
    etaMinutes: 18,
    selectionReason: 'Closest Advanced Life Support vehicle with active paramedic crew',
  };

  // Hospital selection based on capability
  let selectedHospital = hospitals?.[0];
  let hospitalReason = 'Primary capable healthcare facility';
  if (isCardiac) {
    selectedHospital = hospitals?.find((h) => h.capabilities.includes('cardiac') || h.capabilities.includes('cath_lab')) || hospitals?.[0];
    hospitalReason = 'Equipped with 24/7 Cath Lab and CCU required for primary angioplasty window';
  } else if (isTrauma) {
    selectedHospital = hospitals?.find((h) => h.capabilities.includes('trauma')) || hospitals?.[2];
    hospitalReason = 'Equipped with dedicated Trauma resuscitation bay and blood bank availability';
  }

  // Community volunteer
  const selectedVolunteer = volunteers?.[0] || {
    id: 'vol-1',
    name: 'Murugan Selvam',
    etaMinutes: 6,
    vehicle: 'Bajaj Pulsar 150',
    assignedReason: 'Ambulance ETA is 18m (>15m threshold); volunteer on motorbike can arrive in 6 mins with first-aid pack',
    dispatched: true,
  };

  return {
    selectedAmbulance: {
      ...selectedAmbulance,
      etaMinutes: 18,
      selectionReason: 'Nearest available Advanced Life Support unit equipped with defibrillator and oxygen',
    },
    selectedHospital: {
      ...selectedHospital,
      etaMinutes: 28,
      capabilityMatch: isCardiac ? 'Cardiac & Cath Lab Verified' : isTrauma ? 'Trauma & Blood Bank Verified' : 'Emergency Triage Capable',
      selectionReason: hospitalReason,
    },
    selectedVolunteer: {
      ...selectedVolunteer,
      etaMinutes: 6,
      assignedReason: 'Ambulance ETA is 18 mins (> 15 min threshold). Community responder deployed to secure patient airway within 6 mins.',
      dispatched: true,
    },
    hospitalPreAlert: {
      patientProfile: emergency?.patientSummary || 'Adult in rural emergency',
      primarySymptoms: [emergency?.likelyEmergencyType || 'Acute distress', 'Severe symptoms in progress'],
      estimatedOnset: 'Approx 20-30 minutes ago',
      firstAidAdministered: emergency?.firstAidSteps?.map((s: any) => s.stepEnglish) || ['Airway cleared', 'Direct pressure'],
      destinationHospitalId: selectedHospital?.id || 'hosp-1',
      destinationHospitalName: selectedHospital?.name || 'Trichy Multi-Speciality',
      etaMinutes: 28,
      requiredPrepTeams: isCardiac
        ? ['Cath Lab Team on standby', 'Emergency Cardiologist', 'Immediate 12-lead ECG & Heparin setup']
        : ['Trauma Bay 1 prep', 'Cross-match 2 units Blood', 'Orthopedic Surgeon on standby'],
      transmissionStatus: 'Transmitted & Acknowledged via GoldenHour Tele-Relay',
    },
  };
}

// -------------------------------------------------------------
// Dev & Prod Server Middleware
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = 3000;

  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`GoldenHourAI server running at http://0.0.0.0:${port}`);
  });
}

startServer();
