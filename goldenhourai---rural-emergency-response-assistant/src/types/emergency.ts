export type SeverityLevel = 'Critical' | 'Serious' | 'Moderate' | 'Mild';

export type LocationConfidence = 'Geocoded (high)' | 'AI estimate (medium)' | 'Needs confirmation (low)';

export interface EstimatedLocation {
  description: string;
  latitude: number;
  longitude: number;
  landmarkAnchor: string;
  accessNotes: string;
  country?: string;
  countryCode?: string;
  countryFlag?: string;
  locationConfidence?: LocationConfidence;
  localEmergencyNumber?: string;
  geocodedPlaceName?: string;
  placeMentions?: {
    villageOrTownOrCity?: string;
    districtOrRegion?: string;
    stateOrProvince?: string;
    country?: string;
  };
  inferredCountryReason?: string;
}

export interface TriageAnswerOption {
  id: string;
  textCallerLang: string;
  textEnglish: string;
}

export interface TriageQuestion {
  id: string;
  questionEnglish: string;
  questionCallerLang: string;
  purpose: string;
  options?: TriageAnswerOption[];
  answeredText?: string;
  answeredEnglish?: string;
}

export interface FirstAidStep {
  stepNumber: number;
  stepEnglish: string;
  stepCallerLang: string;
  completed?: boolean;
  needsHelp?: boolean;
}

export interface SeverityChangeRecord {
  previousSeverity: SeverityLevel;
  newSeverity: SeverityLevel;
  previousConfidence: number;
  newConfidence: number;
  reason: string;
  timestamp: string;
  triggerAnswer: string;
}

export interface ConversationLogEntry {
  id: string;
  timestamp: string;
  role: 'caller' | 'ai_operator' | 'system_alert' | 'system' | 'first_aid' | 'doctor';
  stage:
    | 'initial_report'
    | 'question_1'
    | 'question_2'
    | 'guided_first_aid'
    | 'escalation'
    | 'doctor_chat'
    | 'doctor_bridge'
    | 'handover_note'
    | 'affordability_question'
    | 'dispatch_decision';
  textCallerLang: string;
  textEnglish: string;
  metadata?: {
    questionIndex?: number;
    stepNumber?: number;
    previousSeverity?: SeverityLevel;
    newSeverity?: SeverityLevel;
    previousConfidence?: number;
    newConfidence?: number;
    reason?: string;
    needsDoctor?: boolean;
    isAiDemoDoctor?: boolean;
    demoLabel?: string;
    publicInsuranceHolder?: boolean | null;
    isSimulatedRegistry?: boolean;
    toggledDoctor?: any;
    toggledAmbulance?: any;
  };
}

export interface SelectedAmbulance {
  id: string;
  name: string;
  etaMinutes: number;
  selectionReason: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  type?: string;
  status?: string;
  equipment?: string[];
  baseStation?: string;
  paramedic?: string;
  phone?: string;
  isSimulated?: boolean;
}

export interface SelectedHospital {
  id: string;
  name: string;
  etaMinutes: number;
  capabilityMatch: string;
  selectionReason: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  level?: string;
  capabilities?: string[];
  phone?: string;
  address?: string;
  isReal?: boolean;
}

export interface SelectedVolunteer {
  id: string;
  name: string;
  etaMinutes: number;
  vehicle: string;
  assignedReason: string;
  dispatched: boolean;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  training?: string;
  phone?: string;
  village?: string;
  kit?: string[];
  isSimulated?: boolean;
}

export interface CollectedCallRecord {
  id: string;
  timestamp: string;
  callerAudioOrText: string;
  detectedLanguage: string;
  matchedEmergencyCategory: string;
  likelyEmergencyType: string;
  severity: SeverityLevel;
  confidencePercentage: number;
  extractedLandmarks: string[];
  resolvedLocation: {
    latitude: number;
    longitude: number;
    description: string;
  };
  goldenHourWindowMinutes: number;
  goldenHourReason: string;
  criticalDos: string[];
  fatalDonts: string[];
  dispatchedAmbulanceName?: string;
  destinationHospitalName?: string;
  volunteerDispatched?: boolean;
  channel: 'voice_call' | 'sms' | 'audio_upload';
}

export type DoctorCallState = 'idle' | 'ringing' | 'connected' | 'ended';

export interface DoctorCheckOption {
  key: '1' | '2';
  textCallerLang: string;
  textEnglish: string;
  digit?: string;
  labelCallerLang?: string;
  labelEnglish?: string;
}

export interface DoctorBridgeMessage {
  id: string;
  sender: 'doctor' | 'caller';
  originalText: string;
  translatedText: string;
  transliteration?: string;
  originalLang: string;
  targetLang: string;
  timestamp: string;
  isAiDemoDoctor?: boolean;
  demoLabel?: string;
  checkQuestionEnglish?: string;
  checkQuestionCallerLang?: string;
  checkOptions?: DoctorCheckOption[];
}

export interface DoctorHandoverNote {
  whatHappened: string;
  firstAidGivenWithTimes: Array<{ time: string; action: string }>;
  currentStatus: string;
  summaryNote: string;
  generatedAt: string;
  doctorName: string;
}

export interface HospitalPreAlert {
  patientProfile: string;
  primarySymptoms: string[];
  estimatedOnset: string;
  firstAidAdministered: string[];
  destinationHospitalId: string;
  destinationHospitalName: string;
  etaMinutes: number;
  requiredPrepTeams: string[];
  transmissionStatus: string;
  doctorHandoverNote?: DoctorHandoverNote;
}

export interface DispatchPlan {
  selectedAmbulance: SelectedAmbulance;
  selectedHospital: SelectedHospital;
  selectedVolunteer: SelectedVolunteer;
  hospitalPreAlert: HospitalPreAlert;
  allHospitals?: SelectedHospital[];
  allAmbulances?: SelectedAmbulance[];
  allVolunteers?: SelectedVolunteer[];
  hospitalSearchRadiusKm?: number;
  hospitalNote?: string;
  servingCellTower?: CellTowerData;
  centralRegistry?: CentralRegistryState;
  selectedDoctor?: RegistryDoctor;
}

export interface TriageAssessment {
  transcribedText?: string;
  detectedLanguage: string;
  dialect?: string;
  shortEnglishTranslation: string;
  patientSummary: string;
  likelyEmergencyType: string;
  severity: SeverityLevel;
  confidencePercentage: number;
  severityReasoning: string;
  landmarksMentioned: string[];
  estimatedLocation: EstimatedLocation;
  triageQuestions: TriageQuestion[];
  firstAidSteps: FirstAidStep[];
  callerReplySMS: string;
  goldenHourWindowMinutes?: number;
  goldenHourReason?: string;
  criticalDos?: string[];
  fatalDonts?: string[];
  matchedCategory?: string;
  locationConfidence?: LocationConfidence;
  country?: string;
  countryCode?: string;
  countryFlag?: string;
  localEmergencyNumber?: string;
  nearbyHospitals?: SelectedHospital[];
  nearbyAmbulances?: SelectedAmbulance[];
  nearbyVolunteers?: SelectedVolunteer[];
  hospitalSearchRadiusKm?: number;
  hospitalNote?: string;
  servingCellTower?: CellTowerData;
  publicInsuranceHolder?: boolean | null;
  centralRegistry?: CentralRegistryState;
}

export interface SMSMessage {
  id: string;
  sender: 'caller' | 'system' | 'doctor';
  text: string;
  timestamp: string;
  translatedText?: string;
  isVoice?: boolean;
}

export interface EmergencyScenario {
  id: string;
  category:
    | 'Cardiovascular'
    | 'Trauma & Hemorrhage'
    | 'Venom & Toxicology'
    | 'Stroke & Neurological'
    | 'Maternal & Pediatric'
    | 'Environmental & Electrical';
  emergencyType: string;
  severity: SeverityLevel;
  confidencePercentage: number;
  goldenHourWindowMinutes: number;
  goldenHourReason: string;
  language: string;
  group: 'Indian' | 'Foreign';
  scriptName: string;
  nativeText: string;
  transliteration?: string;
  englishTranslation: string;
  callerProfile: string;
  vocalToneNote: string;
  landmarkAnchors: string[];
  gpsCoordinates: { lat: number; lng: number };
  vitalTriageQuestions: {
    questionEnglish: string;
    questionCallerLang: string;
    purpose: string;
    expectedAnswers: string[];
  }[];
  criticalDos: string[];
  fatalDonts: string[];
  recommendedHospitalCapability: string;
  specialDispatchInstruction: string;
}

export interface CallMessage {
  id: string;
  speaker: 'caller' | 'operator' | 'doctor';
  text: string;
  timestamp: string;
  isAudioPlaying?: boolean;
}

export type CallerMode = 'call' | 'sms';

export type AppViewRoute = 'split' | 'caller' | 'ops' | 'registry';

export interface AiPipelineStep {
  id:
    | 'cell_tower'
    | 'transcription'
    | 'language_country'
    | 'location_geocoding'
    | 'triage'
    | 'followup_answers'
    | 'severity_update'
    | 'dispatch_decision'
    | 'hospital_prealert'
    | 'doctor_briefing';
  stepNumber: number;
  title: string;
  status: 'pending' | 'running' | 'completed';
  durationMs?: number;
  summary: string;
  whatGeminiDecided: string;
  whyGeminiDecided: string;
  details?: Array<{ label: string; value: string }>;
}

export interface CellTowerData {
  towerId: string;
  operatorName: string; // "Simulated Telecom"
  lat: number;
  lng: number;
  coverageRadiusKm: number; // 2–5 km rural / 0.5–1 km urban
  narrowedRadiusMeters: number; // e.g. 300
  sectorDescription: string;
  landmarkCorrelation: string;
  narrowingReason: string;
  isSimulated: true;
}

export type DoctorSpecialty =
  | 'Cardiologist'
  | 'Neurologist'
  | 'Trauma Surgeon'
  | 'Emergency Physician'
  | 'General Physician'
  | 'Obstetrician';

export type DoctorAvailability = 'available' | 'busy' | 'off';

export interface RegistryDoctor {
  id: string;
  name: string;
  specialty: DoctorSpecialty;
  status: DoctorAvailability;
  hospitalId: string;
  hospitalName: string;
  shiftHours?: string;
  phone?: string;
}

export type FacilityType =
  | 'Government Hospital'
  | 'Primary Health Centre'
  | 'Community Health Centre'
  | 'Private Hospital';

export type CostLevel = 'Free' | 'Low' | 'Medium' | 'High';

export interface FacilityCapabilities {
  cardiac: boolean;
  stroke: boolean;
  trauma: boolean;
  maternity: boolean;
  snakebiteAntivenom: boolean;
  icu: boolean;
  bloodBank: boolean;
  ctScan: boolean;
}

export interface RegistryFacility {
  id: string;
  name: string;
  type: FacilityType;
  capabilities: FacilityCapabilities;
  capabilityLabels: string[];
  bedsAvailable: number;
  totalBeds: number;
  icuBedsAvailable: number;
  totalIcuBeds: number;
  doctorsOnDuty: RegistryDoctor[];
  costLevel: CostLevel;
  acceptsPublicInsurance: boolean;
  distanceKm: number;
  etaMinutes: number;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  isSimulated?: boolean;
}

export type AmbulanceType = 'Basic Life Support' | 'Advanced Life Support';
export type AmbulanceStatus = 'available' | 'busy' | 'off';
export type AmbulanceOwner = 'Government' | 'Private' | 'NGO';
export type AmbulanceCost = 'Free' | 'Paid';

export interface RegistryAmbulance {
  id: string;
  callSign: string;
  name: string;
  type: AmbulanceType;
  status: AmbulanceStatus;
  owner: AmbulanceOwner;
  cost: AmbulanceCost;
  distanceKm: number;
  etaMinutes: number;
  lat: number;
  lng: number;
  baseStation?: string;
  contact?: string;
  equipment?: string[];
  isSimulated: true;
}

export interface DispatchFacilityScore {
  facilityId: string;
  facilityName: string;
  facilityType: FacilityType;
  requiredCapability: string;
  hasCapability: boolean;
  specialistNeeded: DoctorSpecialty;
  availableSpecialist?: RegistryDoctor;
  specialistStatus: DoctorAvailability;
  passesRule1: boolean;
  rule1Summary: string;
  travelEtaMinutes: number;
  passesRule2: boolean;
  rule2Summary: string;
  costLevel: CostLevel;
  acceptsPublicInsurance: boolean;
  affordabilityBonus: number;
  rule3Summary: string;
  finalScore: number;
  rank: number;
  isRecommended: boolean;
  geminiExplanation: string;
  geminiRationale?: string;
}

export interface CentralRegistryState {
  servingCellTower: CellTowerData | null;
  facilities: RegistryFacility[];
  ambulances: RegistryAmbulance[];
  scoringBreakdown: DispatchFacilityScore[];
  selectedDoctor: RegistryDoctor | null;
  selectedFacility: RegistryFacility | null;
  selectedAmbulance: RegistryAmbulance | null;
  publicInsuranceHolder: boolean | null;
  lastRerouteNotice?: string;
  isSimulatedRegistry: true;
}

export interface ActiveCallSessionState {
  roomCode: string;
  version: number;
  callId: string;
  updatedAt: number;
  callStartedAt: number | null;
  selectedCountryCode?: string;
  assessment: TriageAssessment | null;
  dispatchPlan: DispatchPlan | null;
  conversationLog: ConversationLogEntry[];
  severityHistory: SeverityChangeRecord[];
  currentQuestionIndex: number;
  currentFirstAidStepIndex: number;
  showConnectDoctorNow: boolean;
  ambulanceEtaSeconds: number;
  doctorCallState: DoctorCallState;
  doctorName: string;
  doctorMessages: DoctorBridgeMessage[];
  demoDoctorEnabled?: boolean;
  humanDoctorTookOver?: boolean;
  pipelineTimings: Record<string, number>;
  isLoadingTriage?: boolean;
  isUpdatingTriage?: boolean;
  centralRegistry?: CentralRegistryState;
}
