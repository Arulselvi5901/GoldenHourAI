import {
  CellTowerData,
  RegistryFacility,
  RegistryDoctor,
  RegistryAmbulance,
  DispatchFacilityScore,
  CentralRegistryState,
  FacilityType,
  CostLevel,
  DoctorSpecialty,
  DoctorAvailability,
  AmbulanceStatus,
  SeverityLevel,
} from '../types/emergency';

// ---------------------------------------------------------------------------
// Helpers: Distance and Coordinate Offsets
// ---------------------------------------------------------------------------
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
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

export function offsetCoordinates(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDegrees: number
): { lat: number; lng: number } {
  const R = 6371;
  const brng = (bearingDegrees * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceKm / R) +
      Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceKm / R) * Math.cos(lat1),
      Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: Math.round(((lat2 * 180) / Math.PI) * 100000) / 100000,
    lng: Math.round(((lon2 * 180) / Math.PI) * 100000) / 100000,
  };
}

// ---------------------------------------------------------------------------
// 1. CELL TOWER LOCATION (simulated)
// ---------------------------------------------------------------------------
export function generateCellTowerForLocation(
  callerLat: number,
  callerLng: number,
  countryCode?: string,
  landmarks: string[] = []
): CellTowerData {
  const code = (countryCode || 'IND').toUpperCase();
  // Generate deterministic ID based on lat/lng
  const seed = Math.abs(Math.round(callerLat * 100) + Math.round(callerLng * 100));
  const towerSuffix = ((seed % 899) + 101).toString();
  const towerId = `TOW-${code.slice(0, 3)}-${towerSuffix}`;

  // Rural default: 3.5 - 4.5 km radius; urban: 0.8 - 1.2 km
  const isLikelyUrban = Math.abs(callerLat - Math.round(callerLat)) > 0.45;
  const coverageRadiusKm = isLikelyUrban ? 0.9 : 3.8;

  // Offset tower 1.4 km north-east so caller is realistically within serving sector
  const towerCoords = offsetCoordinates(callerLat, callerLng, 1.4, 45);

  const landmarkStr =
    landmarks.length > 0 ? landmarks.slice(0, 2).join(', ') : 'verbal landmark clues';

  const narrowingReason = `Tower area ${coverageRadiusKm} km → landmark match ('${landmarkStr}') → 300 m`;

  return {
    towerId,
    operatorName: 'Simulated Telecom',
    lat: towerCoords.lat,
    lng: towerCoords.lng,
    coverageRadiusKm,
    narrowedRadiusMeters: 300,
    sectorDescription: 'Primary Macro Cell · Sector Alpha (120° Beamwidth)',
    landmarkCorrelation: landmarkStr,
    narrowingReason,
    isSimulated: true,
  };
}

// ---------------------------------------------------------------------------
// Doctor Name Generator by Region
// ---------------------------------------------------------------------------
function getDoctorNamesForCountry(country?: string): {
  cardiologists: string[];
  traumaSurgeons: string[];
  neurologists: string[];
  emergencyPhysicians: string[];
  generalPhysicians: string[];
  obstetricians: string[];
} {
  const c = (country || '').toLowerCase();
  if (c.includes('japan')) {
    return {
      cardiologists: ['Dr. Kenji Sato', 'Dr. Hiroshi Tanaka'],
      traumaSurgeons: ['Dr. Yoko Takahashi', 'Dr. Daisuke Suzuki'],
      neurologists: ['Dr. Akira Watanabe', 'Dr. Mayumi Ito'],
      emergencyPhysicians: ['Dr. Satoshi Yamamoto', 'Dr. Naoki Kobayashi'],
      generalPhysicians: ['Dr. Keiko Kato', 'Dr. Ryota Yoshida'],
      obstetricians: ['Dr. Eri Yamada', 'Dr. Tomoko Sasaki'],
    };
  }
  if (c.includes('indonesia') || c.includes('malaysia')) {
    return {
      cardiologists: ['dr. Budi Santoso, Sp.JP', 'dr. Agus Wijaya, Sp.JP'],
      traumaSurgeons: ['dr. Hendra Pratama, Sp.B', 'dr. Eko Nugroho, Sp.B'],
      neurologists: ['dr. Siti Rahmawati, Sp.N', 'dr. Dewi Lestari, Sp.S'],
      emergencyPhysicians: ['dr. Rian Hidayat', 'dr. Maya Kusuma'],
      generalPhysicians: ['dr. Arif Wibowo', 'dr. Nurul Huda'],
      obstetricians: ['dr. Tri Wahyuni, Sp.OG', 'dr. Sri Mulyani, Sp.OG'],
    };
  }
  if (c.includes('spain') || c.includes('mexico') || c.includes('colombia')) {
    return {
      cardiologists: ['Dra. Elena Gomez', 'Dr. Carlos Mendoza'],
      traumaSurgeons: ['Dr. Javier Ortiz', 'Dra. Lucia Ramirez'],
      neurologists: ['Dr. Mateo Silva', 'Dra. Sofia Navarro'],
      emergencyPhysicians: ['Dr. Alejandro Morales', 'Dra. Carmen Vega'],
      generalPhysicians: ['Dr. Diego Herrera', 'Dra. Rosa Torres'],
      obstetricians: ['Dra. Isabel Castro', 'Dr. Roberto Vargas'],
    };
  }
  // Default Indian Subcontinent / Global English
  return {
    cardiologists: ['Dr. R. Ramanathan', 'Dr. Arvind Patel', 'Dr. Sunita Rao'],
    traumaSurgeons: ['Dr. K. Anbarasu', 'Dr. Vikram Malhotra', 'Dr. Rajesh Nair'],
    neurologists: ['Dr. Priya Sundaram', 'Dr. Meera Kulkarni', 'Dr. Anand Verma'],
    emergencyPhysicians: ['Dr. S. Karthikeyan', 'Dr. Neha Deshmukh', 'Dr. Deepak Sharma'],
    generalPhysicians: ['Dr. M. Murugesan', 'Dr. Sanjay Gupta', 'Dr. Kavitha Selvan'],
    obstetricians: ['Dr. Ananya Reddy', 'Dr. Deepa Natarajan', 'Dr. Pooja Bhatt'],
  };
}

// ---------------------------------------------------------------------------
// 2. CENTRAL REGISTRY GENERATION (At least 6 facilities around caller)
// ---------------------------------------------------------------------------
export function generateCentralRegistryFacilities(
  callerLat: number,
  callerLng: number,
  country?: string,
  baseHospitals: any[] = []
): RegistryFacility[] {
  const docNames = getDoctorNamesForCountry(country);

  // Template blueprints for 6 diverse facilities
  const blueprints: Array<{
    nameSuffix: string;
    type: FacilityType;
    capabilities: {
      cardiac: boolean;
      stroke: boolean;
      trauma: boolean;
      maternity: boolean;
      snakebiteAntivenom: boolean;
      icu: boolean;
      bloodBank: boolean;
      ctScan: boolean;
    };
    bedsAvailable: number;
    totalBeds: number;
    icuBedsAvailable: number;
    totalIcuBeds: number;
    costLevel: CostLevel;
    acceptsPublicInsurance: boolean;
    doctors: Array<{ specialty: DoctorSpecialty; nameKey: string; status: DoctorAvailability }>;
    distanceOffsetKm: number;
    bearing: number;
  }> = [
    {
      nameSuffix: 'Government District Hospital',
      type: 'Government Hospital',
      capabilities: {
        cardiac: true,
        stroke: true,
        trauma: true,
        maternity: true,
        snakebiteAntivenom: true,
        icu: true,
        bloodBank: true,
        ctScan: true,
      },
      bedsAvailable: 28,
      totalBeds: 120,
      icuBedsAvailable: 4,
      totalIcuBeds: 12,
      costLevel: 'Free',
      acceptsPublicInsurance: true,
      doctors: [
        { specialty: 'Cardiologist', nameKey: 'cardiologists', status: 'available' },
        { specialty: 'Trauma Surgeon', nameKey: 'traumaSurgeons', status: 'available' },
        { specialty: 'Emergency Physician', nameKey: 'emergencyPhysicians', status: 'available' },
        { specialty: 'General Physician', nameKey: 'generalPhysicians', status: 'available' },
      ],
      distanceOffsetKm: 14.5,
      bearing: 35,
    },
    {
      nameSuffix: 'Community Health Centre (CHC)',
      type: 'Community Health Centre',
      capabilities: {
        cardiac: false,
        stroke: false,
        trauma: true,
        maternity: true,
        snakebiteAntivenom: true,
        icu: false,
        bloodBank: false,
        ctScan: false,
      },
      bedsAvailable: 8,
      totalBeds: 30,
      icuBedsAvailable: 0,
      totalIcuBeds: 0,
      costLevel: 'Free',
      acceptsPublicInsurance: true,
      doctors: [
        { specialty: 'Emergency Physician', nameKey: 'emergencyPhysicians', status: 'available' },
        { specialty: 'Obstetrician', nameKey: 'obstetricians', status: 'available' },
        { specialty: 'General Physician', nameKey: 'generalPhysicians', status: 'available' },
      ],
      distanceOffsetKm: 6.8,
      bearing: 110,
    },
    {
      nameSuffix: 'Primary Health Centre (PHC)',
      type: 'Primary Health Centre',
      capabilities: {
        cardiac: false,
        stroke: false,
        trauma: false,
        maternity: true,
        snakebiteAntivenom: true,
        icu: false,
        bloodBank: false,
        ctScan: false,
      },
      bedsAvailable: 3,
      totalBeds: 10,
      icuBedsAvailable: 0,
      totalIcuBeds: 0,
      costLevel: 'Free',
      acceptsPublicInsurance: true,
      doctors: [
        { specialty: 'General Physician', nameKey: 'generalPhysicians', status: 'available' },
      ],
      distanceOffsetKm: 3.8,
      bearing: 215,
    },
    {
      nameSuffix: 'Apollo Super Speciality / Private Medical Center',
      type: 'Private Hospital',
      capabilities: {
        cardiac: true,
        stroke: true,
        trauma: true,
        maternity: true,
        snakebiteAntivenom: true,
        icu: true,
        bloodBank: true,
        ctScan: true,
      },
      bedsAvailable: 15,
      totalBeds: 80,
      icuBedsAvailable: 5,
      totalIcuBeds: 16,
      costLevel: 'High',
      acceptsPublicInsurance: false,
      doctors: [
        { specialty: 'Cardiologist', nameKey: 'cardiologists', status: 'available' },
        { specialty: 'Neurologist', nameKey: 'neurologists', status: 'available' },
        { specialty: 'Trauma Surgeon', nameKey: 'traumaSurgeons', status: 'available' },
      ],
      distanceOffsetKm: 18.2,
      bearing: 290,
    },
    {
      nameSuffix: 'Taluk Government Head Hospital',
      type: 'Government Hospital',
      capabilities: {
        cardiac: true,
        stroke: false,
        trauma: true,
        maternity: true,
        snakebiteAntivenom: true,
        icu: true,
        bloodBank: true,
        ctScan: false,
      },
      bedsAvailable: 14,
      totalBeds: 60,
      icuBedsAvailable: 2,
      totalIcuBeds: 6,
      costLevel: 'Free',
      acceptsPublicInsurance: true,
      doctors: [
        { specialty: 'Trauma Surgeon', nameKey: 'traumaSurgeons', status: 'available' },
        { specialty: 'Emergency Physician', nameKey: 'emergencyPhysicians', status: 'available' },
        { specialty: 'Cardiologist', nameKey: 'cardiologists', status: 'busy' },
      ],
      distanceOffsetKm: 11.4,
      bearing: 160,
    },
    {
      nameSuffix: 'Mission Charitable & Trauma Hospital',
      type: 'Private Hospital',
      capabilities: {
        cardiac: false,
        stroke: false,
        trauma: true,
        maternity: true,
        snakebiteAntivenom: true,
        icu: true,
        bloodBank: true,
        ctScan: true,
      },
      bedsAvailable: 9,
      totalBeds: 45,
      icuBedsAvailable: 2,
      totalIcuBeds: 4,
      costLevel: 'Low',
      acceptsPublicInsurance: true,
      doctors: [
        { specialty: 'Trauma Surgeon', nameKey: 'traumaSurgeons', status: 'available' },
        { specialty: 'General Physician', nameKey: 'generalPhysicians', status: 'available' },
      ],
      distanceOffsetKm: 9.8,
      bearing: 340,
    },
  ];

  const facilities: RegistryFacility[] = blueprints.map((bp, idx) => {
    // If real OSM hospital exists for this index, reuse its name and coordinates
    const realOsm = baseHospitals[idx];
    let facLat = realOsm?.lat;
    let facLng = realOsm?.lng;
    let facName = realOsm?.name;

    if (typeof facLat !== 'number' || typeof facLng !== 'number') {
      const coords = offsetCoordinates(callerLat, callerLng, bp.distanceOffsetKm, bp.bearing);
      facLat = coords.lat;
      facLng = coords.lng;
    }

    if (!facName || facName === 'Hospital') {
      facName = bp.nameSuffix;
    }

    const dist = haversineDistanceKm(callerLat, callerLng, facLat, facLng);
    const eta = Math.max(4, Math.round((dist / 40) * 60) + 3);

    const facilityId = `reg-fac-${idx + 1}`;

    const doctorsOnDuty: RegistryDoctor[] = bp.doctors.map((d, dIdx) => {
      const pool = (docNames as any)[d.nameKey] || ['Dr. On-Duty Specialist'];
      const docName = pool[dIdx % pool.length];
      return {
        id: `reg-doc-${idx + 1}-${dIdx + 1}`,
        name: docName,
        specialty: d.specialty,
        status: d.status,
        hospitalId: facilityId,
        hospitalName: facName,
        shiftHours: '08:00 - 20:00 (Active Shift)',
      };
    });

    const capabilityLabels: string[] = [];
    if (bp.capabilities.cardiac) capabilityLabels.push('Cardiac Care');
    if (bp.capabilities.stroke) capabilityLabels.push('Stroke Care');
    if (bp.capabilities.trauma) capabilityLabels.push('Trauma & Surgery');
    if (bp.capabilities.maternity) capabilityLabels.push('Maternity');
    if (bp.capabilities.snakebiteAntivenom) capabilityLabels.push('Antivenom (ASV)');
    if (bp.capabilities.icu) capabilityLabels.push('ICU');
    if (bp.capabilities.bloodBank) capabilityLabels.push('Blood Bank');
    if (bp.capabilities.ctScan) capabilityLabels.push('CT Scan');

    return {
      id: facilityId,
      name: facName,
      type: bp.type,
      capabilities: bp.capabilities,
      capabilityLabels,
      bedsAvailable: bp.bedsAvailable,
      totalBeds: bp.totalBeds,
      icuBedsAvailable: bp.icuBedsAvailable,
      totalIcuBeds: bp.totalIcuBeds,
      doctorsOnDuty,
      costLevel: bp.costLevel,
      acceptsPublicInsurance: bp.acceptsPublicInsurance,
      distanceKm: dist,
      etaMinutes: eta,
      lat: facLat,
      lng: facLng,
      isSimulated: true,
    };
  });

  return facilities.sort((a, b) => a.distanceKm - b.distanceKm);
}

// ---------------------------------------------------------------------------
// 3. REGISTERED AMBULANCES GENERATION
// ---------------------------------------------------------------------------
export function generateCentralRegistryAmbulances(
  callerLat: number,
  callerLng: number,
  country?: string,
  _baseAmbulances: any[] = []
): RegistryAmbulance[] {
  const isIndia = !country || country.toLowerCase().includes('india');
  const codePrefix = isIndia ? 'AMB-108' : 'AMB-EMG';

  const configs: Array<{
    callSign: string;
    name: string;
    type: 'Basic Life Support' | 'Advanced Life Support';
    owner: 'Government' | 'Private' | 'NGO';
    cost: 'Free' | 'Paid';
    distanceKm: number;
    bearing: number;
    status: AmbulanceStatus;
    equipment: string[];
  }> = [
    {
      callSign: `${codePrefix}-TN-01`,
      name: `${codePrefix}-01 (Govt ALS)`,
      type: 'Advanced Life Support',
      owner: 'Government',
      cost: 'Free',
      distanceKm: 4.8,
      bearing: 40,
      status: 'available',
      equipment: ['Defibrillator', 'Ventilator', 'Oxygen', 'IV Resuscitation'],
    },
    {
      callSign: `${codePrefix}-TN-04`,
      name: `${codePrefix}-04 (Govt BLS)`,
      type: 'Basic Life Support',
      owner: 'Government',
      cost: 'Free',
      distanceKm: 8.5,
      bearing: 155,
      status: 'available',
      equipment: ['Oxygen Mask', 'Spine Board', 'Trauma Dressing', 'Splints'],
    },
    {
      callSign: 'AMB-NGO-RED-02',
      name: 'Red Cross Rural Unit (NGO)',
      type: 'Basic Life Support',
      owner: 'NGO',
      cost: 'Free',
      distanceKm: 11.2,
      bearing: 260,
      status: 'available',
      equipment: ['Oxygen', 'First Aid Kit', 'Stretcher'],
    },
    {
      callSign: 'AMB-PVT-MED-07',
      name: 'MediCare Swift Unit (Private)',
      type: 'Advanced Life Support',
      owner: 'Private',
      cost: 'Paid',
      distanceKm: 7.2,
      bearing: 310,
      status: 'available',
      equipment: ['ICU Monitor', 'Defibrillator', 'Infusion Pump'],
    },
    {
      callSign: `${codePrefix}-TN-09`,
      name: `${codePrefix}-09 (Govt ALS Backup)`,
      type: 'Advanced Life Support',
      owner: 'Government',
      cost: 'Free',
      distanceKm: 15.6,
      bearing: 80,
      status: 'available',
      equipment: ['Full ALS Kit', 'Airway Management'],
    },
  ];

  return configs.map((c, i) => {
    const coords = offsetCoordinates(callerLat, callerLng, c.distanceKm, c.bearing);
    const eta = Math.max(5, Math.round((c.distanceKm / 42) * 60) + 3);

    return {
      id: `reg-amb-${i + 1}`,
      callSign: c.callSign,
      name: c.name,
      type: c.type,
      status: c.status,
      owner: c.owner,
      cost: c.cost,
      distanceKm: c.distanceKm,
      etaMinutes: eta,
      lat: coords.lat,
      lng: coords.lng,
      baseStation: `Sector Base ${i + 1}`,
      contact: `+91-Emergency-Dispatch-${i + 1}`,
      equipment: c.equipment,
      isSimulated: true,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. DISPATCH SCORING & SELECTION (Rules 1, 2, 3)
// ---------------------------------------------------------------------------
export function determineRequiredSpecialty(emergencyType: string): {
  requiredCapability: keyof RegistryFacility['capabilities'];
  specialistNeeded: DoctorSpecialty;
  label: string;
} {
  const lower = (emergencyType || '').toLowerCase();
  if (/cardiac|heart|chest pain|infarction|arrest|pci/i.test(lower)) {
    return {
      requiredCapability: 'cardiac',
      specialistNeeded: 'Cardiologist',
      label: 'Cardiac (Cath Lab & Cardiologist)',
    };
  }
  if (/bleed|trauma|cut|fracture|wound|artery|fall|accident/i.test(lower)) {
    return {
      requiredCapability: 'trauma',
      specialistNeeded: 'Trauma Surgeon',
      label: 'Trauma & Emergency Surgery',
    };
  }
  if (/stroke|paralysis|speech|slurred|numb/i.test(lower)) {
    return {
      requiredCapability: 'stroke',
      specialistNeeded: 'Neurologist',
      label: 'Stroke Care & CT',
    };
  }
  if (/snake|bite|venom|poison/i.test(lower)) {
    return {
      requiredCapability: 'snakebiteAntivenom',
      specialistNeeded: 'General Physician',
      label: 'Snakebite Antivenom (ASV)',
    };
  }
  if (/labor|maternal|birth|pregnant|delivery/i.test(lower)) {
    return {
      requiredCapability: 'maternity',
      specialistNeeded: 'Obstetrician',
      label: 'Maternity & Obstetrics',
    };
  }
  return {
    requiredCapability: 'trauma',
    specialistNeeded: 'Emergency Physician',
    label: 'Emergency Medicine',
  };
}

export function computeDispatchScoring(params: {
  emergencyType: string;
  severity: SeverityLevel;
  facilities: RegistryFacility[];
  ambulances: RegistryAmbulance[];
  publicInsuranceHolder: boolean | null;
  callerLat: number;
  callerLng: number;
}): {
  scoringBreakdown: DispatchFacilityScore[];
  bestFacility: RegistryFacility | null;
  bestDoctor: RegistryDoctor | null;
  bestAmbulance: RegistryAmbulance | null;
  geminiRationale: string;
} {
  const { emergencyType, facilities, ambulances, publicInsuranceHolder } = params;
  const { requiredCapability, specialistNeeded, label: reqLabel } =
    determineRequiredSpecialty(emergencyType);

  const scores: DispatchFacilityScore[] = facilities.map((fac) => {
    const hasCap = Boolean(fac.capabilities[requiredCapability]);

    // Find on-duty specialist matching the need (or Emergency Physician fallback if General)
    const matchingDoc = fac.doctorsOnDuty.find(
      (d) =>
        d.specialty === specialistNeeded ||
        (specialistNeeded === 'General Physician' &&
          (d.specialty === 'Emergency Physician' || d.specialty === 'General Physician'))
    );

    const specialistStatus: DoctorAvailability = matchingDoc ? matchingDoc.status : 'off';
    const hasAvailableSpecialist = matchingDoc ? matchingDoc.status === 'available' : false;

    // Rule 1: Clinical capability AND matching specialist currently available
    const passesRule1 = hasCap && hasAvailableSpecialist;
    const rule1Summary = passesRule1
      ? `${reqLabel} supported ✓ (${matchingDoc?.name || 'Specialist'} on duty & Available)`
      : !hasCap
      ? `❌ Missing clinical capability for ${reqLabel}`
      : `⚠️ Required ${specialistNeeded} is ${specialistStatus.toUpperCase()}`;

    // Rule 2: Travel time (haversine ETA)
    const travelEta = fac.etaMinutes;
    const rule2Summary = `ETA ${travelEta} min (${fac.distanceKm} km)`;

    // Rule 3: Affordability
    // Facilities within ~10 min of each other prefer Free / Govt / Public Insurance
    let affordabilityScore = 0;
    if (fac.costLevel === 'Free') affordabilityScore += 30;
    else if (fac.costLevel === 'Low') affordabilityScore += 20;
    else if (fac.costLevel === 'Medium') affordabilityScore += 10;

    if (fac.acceptsPublicInsurance) {
      affordabilityScore += 15;
      if (publicInsuranceHolder === true) {
        affordabilityScore += 15; // Extra bonus when caller holds government health card
      }
    }

    const rule3Summary = `${fac.costLevel} cost · ${
      fac.acceptsPublicInsurance ? 'Accepts Public Insurance ✓' : 'Self-pay only'
    }${publicInsuranceHolder === true ? ' · Patient has insurance' : ''}`;

    // Compute composite numeric score:
    // If Rule 1 fails -> score is 0 (disqualified from selection)
    let finalScore = 0;
    if (passesRule1) {
      // Base score 100
      finalScore = 100;
      // Subtract travel time penalty: 2 points per minute of ETA
      finalScore -= Math.min(60, travelEta * 2);
      // Add affordability bonus (0-60)
      finalScore += affordabilityScore;
      // Add ICU bed bonus if available
      if (fac.icuBedsAvailable > 0) finalScore += 10;
    }

    const geminiExplanation = passesRule1
      ? `${fac.name}: ${matchingDoc?.name || specialistNeeded} on duty & available, ${
          fac.icuBedsAvailable > 0 ? `${fac.icuBedsAvailable} ICU bed(s) free, ` : ''
        }${fac.costLevel === 'Free' ? '100% free treatment' : `${fac.costLevel} cost`}, ${travelEta} min ETA.`
      : !hasCap
      ? `${fac.name} disqualified: Lacks required ${reqLabel} equipment.`
      : `${fac.name} disqualified: ${matchingDoc?.name || specialistNeeded} is currently ${specialistStatus}.`;

    return {
      facilityId: fac.id,
      facilityName: fac.name,
      facilityType: fac.type,
      requiredCapability: reqLabel,
      hasCapability: hasCap,
      specialistNeeded,
      availableSpecialist: matchingDoc && matchingDoc.status === 'available' ? matchingDoc : undefined,
      specialistStatus,
      passesRule1,
      rule1Summary,
      travelEtaMinutes: travelEta,
      passesRule2: travelEta <= 60,
      rule2Summary,
      costLevel: fac.costLevel,
      acceptsPublicInsurance: fac.acceptsPublicInsurance,
      affordabilityBonus: affordabilityScore,
      rule3Summary,
      finalScore,
      rank: 0,
      isRecommended: false,
      geminiExplanation,
    };
  });

  // Sort by finalScore desc, then travelEta asc
  scores.sort((a, b) => {
    if (a.passesRule1 !== b.passesRule1) return a.passesRule1 ? -1 : 1;
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.travelEtaMinutes - b.travelEtaMinutes;
  });

  // Assign ranks
  scores.forEach((s, i) => {
    s.rank = i + 1;
    s.isRecommended = i === 0 && s.passesRule1;
  });

  const bestScore = scores.find((s) => s.passesRule1) || scores[0];
  const bestFacility = facilities.find((f) => f.id === bestScore?.facilityId) || null;
  const bestDoctor = bestScore?.availableSpecialist || bestFacility?.doctorsOnDuty[0] || null;

  // Best ambulance selection: Prefer Free/Government, available, closest ETA
  const availableAmbs = ambulances.filter((a) => a.status === 'available');
  availableAmbs.sort((a, b) => {
    // Prefer free/Govt if within 8 mins of paid
    if (a.cost === 'Free' && b.cost !== 'Free' && a.etaMinutes <= b.etaMinutes + 8) return -1;
    if (b.cost === 'Free' && a.cost !== 'Free' && b.etaMinutes <= a.etaMinutes + 8) return 1;
    return a.etaMinutes - b.etaMinutes;
  });
  const bestAmbulance = availableAmbs[0] || ambulances[0] || null;

  const geminiRationale = bestScore?.geminiExplanation || 'Dispatched nearest capable emergency team.';

  return {
    scoringBreakdown: scores,
    bestFacility,
    bestDoctor,
    bestAmbulance,
    geminiRationale,
  };
}

// ---------------------------------------------------------------------------
// 5. DOCTOR & AMBULANCE AVAILABILITY TOGGLE (For live demo re-routing)
// ---------------------------------------------------------------------------
export function toggleDoctorAvailability(
  facilities: RegistryFacility[],
  doctorId: string,
  newStatus?: DoctorAvailability
): {
  updatedFacilities: RegistryFacility[];
  toggledDoctor: RegistryDoctor | null;
} {
  let toggled: RegistryDoctor | null = null;

  const updatedFacilities = facilities.map((fac) => {
    const docIndex = fac.doctorsOnDuty.findIndex((d) => d.id === doctorId);
    if (docIndex === -1) return fac;

    const currentDoc = fac.doctorsOnDuty[docIndex];
    const nextStatus: DoctorAvailability =
      newStatus || (currentDoc.status === 'available' ? 'busy' : 'available');

    const updatedDoc: RegistryDoctor = { ...currentDoc, status: nextStatus };
    toggled = updatedDoc;

    const newDocs = [...fac.doctorsOnDuty];
    newDocs[docIndex] = updatedDoc;
    return { ...fac, doctorsOnDuty: newDocs };
  });

  return { updatedFacilities, toggledDoctor: toggled };
}

export function toggleAmbulanceAvailability(
  ambulances: RegistryAmbulance[],
  ambulanceId: string,
  newStatus?: AmbulanceStatus
): {
  updatedAmbulances: RegistryAmbulance[];
  toggledAmbulance: RegistryAmbulance | null;
} {
  let toggled: RegistryAmbulance | null = null;

  const updatedAmbulances = ambulances.map((amb) => {
    if (amb.id !== ambulanceId) return amb;
    const nextStatus: AmbulanceStatus =
      newStatus || (amb.status === 'available' ? 'busy' : 'available');
    toggled = { ...amb, status: nextStatus };
    return toggled;
  });

  return { updatedAmbulances, toggledAmbulance: toggled };
}

// ---------------------------------------------------------------------------
// 6. AFFORDABILITY QUESTION PROMPT (Multilingual)
// ---------------------------------------------------------------------------
export function getAffordabilityQuestionPrompt(language?: string): {
  promptCallerLang: string;
  promptEnglish: string;
  options: Array<{ digit: '1' | '2' | '3'; callerLang: string; english: string }>;
} {
  const langLower = (language || '').toLowerCase();
  const promptEnglish =
    'Do you have a government health insurance card? Press 1 for yes, press 2 for no, press 3 if not sure.';

  const optionsEnglish: Array<{ digit: '1' | '2' | '3'; callerLang: string; english: string }> = [
    { digit: '1', callerLang: 'Yes, government insurance card', english: 'Yes, have card' },
    { digit: '2', callerLang: 'No, no insurance card', english: 'No card' },
    { digit: '3', callerLang: 'Not sure', english: 'Not sure' },
  ];

  if (langLower.includes('tamil')) {
    return {
      promptCallerLang:
        'உங்களிடம் அரசு மருத்துவக் காப்பீட்டு அட்டை உள்ளதா? ஆம் என்றால் 1, இல்லை என்றால் 2, தெரியவில்லை என்றால் 3-ஐ அழுத்தவும்.',
      promptEnglish,
      options: [
        { digit: '1', callerLang: 'ஆம், காப்பீட்டு அட்டை உள்ளது', english: 'Yes, have card' },
        { digit: '2', callerLang: 'இல்லை, அட்டை இல்லை', english: 'No card' },
        { digit: '3', callerLang: 'தெரியவில்லை', english: 'Not sure' },
      ],
    };
  }

  if (langLower.includes('hindi')) {
    return {
      promptCallerLang:
        'क्या आपके पास सरकारी स्वास्थ्य बीमा कार्ड है? हाँ के लिए 1, नहीं के लिए 2, पता नहीं के लिए 3 दबाएं।',
      promptEnglish,
      options: [
        { digit: '1', callerLang: 'हाँ, बीमा कार्ड है', english: 'Yes, have card' },
        { digit: '2', callerLang: 'नहीं, कार्ड नहीं है', english: 'No card' },
        { digit: '3', callerLang: 'पता नहीं', english: 'Not sure' },
      ],
    };
  }

  if (langLower.includes('japanese')) {
    return {
      promptCallerLang:
        '公的健康保険証をお持ちですか？はいは1、いいえは2、不明は3を押してください。',
      promptEnglish,
      options: [
        { digit: '1', callerLang: 'はい、保険証があります', english: 'Yes, have card' },
        { digit: '2', callerLang: 'いいえ、ありません', english: 'No card' },
        { digit: '3', callerLang: 'わかりません', english: 'Not sure' },
      ],
    };
  }

  if (langLower.includes('indonesian') || langLower.includes('bahasa') || langLower.includes('malay')) {
    return {
      promptCallerLang:
        'Apakah Anda memiliki kartu asuransi kesehatan pemerintah? Tekan 1 untuk ya, 2 untuk tidak, 3 jika tidak tahu.',
      promptEnglish,
      options: [
        { digit: '1', callerLang: 'Ya, punya kartu', english: 'Yes, have card' },
        { digit: '2', callerLang: 'Tidak ada kartu', english: 'No card' },
        { digit: '3', callerLang: 'Tidak tahu', english: 'Not sure' },
      ],
    };
  }

  if (langLower.includes('spanish')) {
    return {
      promptCallerLang:
        '¿Tiene tarjeta de seguro médico del gobierno? Presione 1 para sí, 2 para no, 3 para no sabe.',
      promptEnglish,
      options: [
        { digit: '1', callerLang: 'Sí, tengo tarjeta', english: 'Yes, have card' },
        { digit: '2', callerLang: 'No tengo tarjeta', english: 'No card' },
        { digit: '3', callerLang: 'No estoy seguro', english: 'Not sure' },
      ],
    };
  }

  if (langLower.includes('french')) {
    return {
      promptCallerLang:
        "Avez-vous une carte d'assurance maladie publique ? Appuyez sur 1 pour oui, 2 pour non, 3 si vous ne savez pas.",
      promptEnglish,
      options: [
        { digit: '1', callerLang: 'Oui, carte valide', english: 'Yes, have card' },
        { digit: '2', callerLang: 'Non, pas de carte', english: 'No card' },
        { digit: '3', callerLang: 'Pas sûr', english: 'Not sure' },
      ],
    };
  }

  if (langLower.includes('telugu')) {
    return {
      promptCallerLang:
        'మీ వద్ద ప్రభుత్వ ఆరోగ్య బీమా కార్డు ఉందా? అవును అయితే 1, కాదు అయితే 2, తెలియకపోతే 3 నొక్కండి.',
      promptEnglish,
      options: [
        { digit: '1', callerLang: 'అవును, కార్డు ఉంది', english: 'Yes, have card' },
        { digit: '2', callerLang: 'లేదు, కార్డు లేదు', english: 'No card' },
        { digit: '3', callerLang: 'తెలియదు', english: 'Not sure' },
      ],
    };
  }

  return {
    promptCallerLang: promptEnglish,
    promptEnglish,
    options: optionsEnglish,
  };
}
