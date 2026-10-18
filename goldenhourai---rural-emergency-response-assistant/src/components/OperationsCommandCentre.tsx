import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  TriageAssessment,
  DispatchPlan,
  ConversationLogEntry,
  SeverityChangeRecord,
  DoctorCallState,
  DoctorBridgeMessage,
  AiPipelineStep,
  EmergencyScenario,
  RegistryFacility,
  RegistryDoctor,
  RegistryAmbulance,
  DispatchFacilityScore,
} from '../types/emergency';
import { COMPREHENSIVE_EMERGENCY_DATASET } from '../data/emergencyDataset';
import {
  buildAiPipelineSteps,
  buildCallerPairingUrl,
  formatCountdownMMSS,
  generateQrMatrix,
  resolveActiveEmergencyCountry,
  EMERGENCY_COUNTRY_OPTIONS,
  getCommandCentreTitleForCountry,
  getCountryDoctorLabel,
  DEMO_DOCTOR_LABEL,
} from '../utils/triageFlowLogic';
import {
  generateCentralRegistryFacilities,
  generateCentralRegistryAmbulances,
  computeDispatchScoring,
} from '../utils/centralRegistryLogic';
import { playOperationsManualAudio } from '../utils/audioSpeechEngine';
import { DoctorScreen } from './DoctorScreen';
import { CentralRegistryScreen } from './CentralRegistryScreen';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Globe,
  Layers,
  MapPin,
  Radio,
  Sparkles,
  Truck,
  Building2,
  Bike,
  Activity,
  Stethoscope,
  ShieldCheck,
  DollarSign,
  XCircle,
  ArrowRight,
} from 'lucide-react';

interface OperationsCommandCentreProps {
  roomCode: string;
  sessionVersion?: number;
  callId: string;
  callStartedAt: number | null;
  lastSyncedAt: number;
  isLiveSynced: boolean;
  assessment: TriageAssessment | null;
  dispatchPlan: DispatchPlan | null;
  setDispatchPlan: React.Dispatch<React.SetStateAction<DispatchPlan | null>>;
  conversationLog: ConversationLogEntry[];
  severityHistory: SeverityChangeRecord[];
  ambulanceEtaSeconds: number;
  doctorCallState: DoctorCallState;
  doctorName: string;
  doctorMessages: DoctorBridgeMessage[];
  pipelineTimings?: Record<string, number>;
  isLoadingTriage?: boolean;
  isUpdatingTriage?: boolean;
  onStartDoctorCall: (options?: {
    openConsoleAfterRing?: boolean;
    autoFromCritical?: boolean;
  }) => void;
  onDoctorSendMessage: (englishText: string, preTranslatedText?: string) => Promise<void>;
  onCallerSendMessage: (callerText: string, englishHint?: string) => Promise<void>;
  onEndDoctorCall: () => Promise<void> | void;
  onAppendConversationLog: (entry: ConversationLogEntry) => void;
  onOpenDataset?: () => void;
  onSelectScenario?: (scenario: EmergencyScenario) => void;
  onSubmitCustomText?: (text: string) => void;
  onOpenCollectedCalls?: () => void;
  collectedCallsCount?: number;
  isSplitView?: boolean;
  selectedCountryCode?: string;
  onChangeCountryCode?: (countryCode: string) => void;
  demoDoctorEnabled?: boolean;
  onToggleDemoDoctor?: (enabled: boolean) => void;
  humanDoctorTookOver?: boolean;
  onHumanDoctorTyping?: () => void;
  onToggleDoctor?: (doctorId: string) => void;
  onToggleAmbulance?: (ambulanceId: string) => void;
}

export const OperationsCommandCentre: React.FC<OperationsCommandCentreProps> = ({
  roomCode,
  sessionVersion = 0,
  callId,
  callStartedAt,
  lastSyncedAt,
  isLiveSynced,
  assessment,
  dispatchPlan,
  setDispatchPlan,
  conversationLog,
  severityHistory,
  ambulanceEtaSeconds,
  doctorCallState,
  doctorName,
  doctorMessages,
  pipelineTimings = {},
  isLoadingTriage = false,
  isUpdatingTriage = false,
  onStartDoctorCall,
  onDoctorSendMessage,
  onCallerSendMessage,
  onEndDoctorCall,
  onAppendConversationLog,
  onOpenDataset,
  onSelectScenario,
  onSubmitCustomText,
  onOpenCollectedCalls,
  collectedCallsCount = 0,
  isSplitView = false,
  selectedCountryCode,
  onChangeCountryCode,
  demoDoctorEnabled = true,
  onToggleDemoDoctor,
  humanDoctorTookOver = false,
  onHumanDoctorTyping,
  onToggleDoctor,
  onToggleAmbulance,
}) => {
  const activeCountryInfo = resolveActiveEmergencyCountry({
    selectedCountryCode,
    assessment,
  });
  const resolvedDoctorName =
    doctorName || getCountryDoctorLabel(activeCountryInfo.country);
  const [customEmergencyText, setCustomEmergencyText] = useState('');
  const [copiedPairingLink, setCopiedPairingLink] = useState(false);
  const [opsViewTab, setOpsViewTab] = useState<'map' | 'registry'>('map');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    transcription: true,
    language_country: true,
    location_geocoding: true,
    triage: true,
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeLayer, setActiveLayer] = useState({
    ambulances: true,
    hospitals: true,
    volunteers: true,
    routes: true,
  });

  // Update elapsed time bar every second when call is active
  useEffect(() => {
    if (!assessment) {
      setElapsedSeconds(0);
      return;
    }
    const baseStart = callStartedAt || Date.now();
    const updateElapsed = () => {
      const diff = Math.max(1, Math.floor((Date.now() - baseStart) / 1000));
      setElapsedSeconds(diff);
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [assessment, callStartedAt]);

  // Auto-expand newly updated steps such as severity_update or followup_answers
  useEffect(() => {
    if (severityHistory.length > 0) {
      setExpandedSteps((prev) => ({
        ...prev,
        followup_answers: true,
        severity_update: true,
      }));
    }
  }, [severityHistory.length]);

  const toggleStep = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute the 9 AI Pipeline steps
  const pipelineSteps: AiPipelineStep[] = buildAiPipelineSteps({
    assessment,
    dispatchPlan,
    conversationLog,
    severityHistory,
    doctorCallState,
    doctorName,
    doctorMessages,
    pipelineTimings,
    isLoadingTriage,
    isUpdatingTriage,
  });

  // Map coordinates
  const incidentLat = assessment?.estimatedLocation?.latitude;
  const incidentLng = assessment?.estimatedLocation?.longitude;
  const hasCoordinates =
    typeof incidentLat === 'number' &&
    typeof incidentLng === 'number' &&
    !isNaN(incidentLat) &&
    !isNaN(incidentLng) &&
    (incidentLat !== 0 || incidentLng !== 0);

  const activeAmbulances =
    dispatchPlan?.allAmbulances || assessment?.nearbyAmbulances || [];
  const activeHospitals =
    dispatchPlan?.allHospitals || assessment?.nearbyHospitals || [];
  const activeVolunteers =
    dispatchPlan?.allVolunteers || assessment?.nearbyVolunteers || [];

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const defaultCenter: [number, number] = hasCoordinates
        ? [incidentLat!, incidentLng!]
        : [20, 0];
      const defaultZoom = hasCoordinates ? 13 : 2;

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  // Re-centre and zoom (zoom 15 when geocoding succeeded, zoom 13 for an AI estimate)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setTimeout(() => {
      map.invalidateSize();
      if (hasCoordinates) {
        const isAiEstimate =
          assessment?.locationConfidence === 'AI estimate (medium)' ||
          assessment?.estimatedLocation?.locationConfidence === 'AI estimate (medium)';
        const targetZoom = isAiEstimate ? 13 : 15;
        map.setView([incidentLat!, incidentLng!], targetZoom, { animate: true });
      }
    }, 80);
  }, [
    incidentLat,
    incidentLng,
    hasCoordinates,
    isSplitView,
    assessment?.locationConfidence,
    assessment?.estimatedLocation?.locationConfidence,
  ]);

  // Update map markers and route lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    if (assessment && hasCoordinates) {
      const incidentIcon = L.divIcon({
        className: 'custom-incident-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full bg-rose-500/30 animate-ping"></div>
            <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white text-white flex items-center justify-center shadow-lg font-bold text-xs">
              SOS
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const placeName =
        assessment.estimatedLocation?.description ||
        assessment.estimatedLocation?.geocodedPlaceName ||
        'Emergency Incident Site';
      const countryName =
        assessment.country || assessment.estimatedLocation?.country || 'Global Location';
      const countryFlag =
        assessment.countryFlag || assessment.estimatedLocation?.countryFlag || '🌐';
      const confidenceBadge =
        assessment.locationConfidence ||
        assessment.estimatedLocation?.locationConfidence ||
        'Geocoded (high)';
      const emergencyNum =
        assessment.localEmergencyNumber ||
        assessment.estimatedLocation?.localEmergencyNumber ||
        '112';

      const incidentMarker = L.marker([incidentLat!, incidentLng!], {
        icon: incidentIcon,
      });
      incidentMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 210px;">
          <div style="font-weight: bold; color: #dc2626; font-size: 13px; margin-bottom: 4px;">
            🚨 EMERGENCY INCIDENT (${confidenceBadge})
          </div>
          <div style="font-weight: bold; color: #0f172a; margin-bottom: 2px;">
            ${countryFlag} ${countryName} · Emergency: ${emergencyNum}
          </div>
          <div style="margin-bottom: 2px;"><strong>Place:</strong> ${placeName}</div>
          <div style="margin-bottom: 2px;"><strong>Condition:</strong> ${assessment.likelyEmergencyType}</div>
          <div><strong>Severity:</strong> ${assessment.severity} (${assessment.confidencePercentage}%)</div>
        </div>
      `);
      markersLayerRef.current.addLayer(incidentMarker);
    }

    // Plot Serving Cell Tower & Coverage Circle (Requirement 1)
    const tower =
      assessment?.servingCellTower ||
      dispatchPlan?.servingCellTower ||
      dispatchPlan?.centralRegistry?.servingCellTower;

    if (tower && typeof tower.lat === 'number' && typeof tower.lng === 'number') {
      // 1. Draw coarse cell tower coverage circle (coverageRadiusKm * 1000m)
      const towerCircle = L.circle([tower.lat, tower.lng], {
        radius: (tower.coverageRadiusKm || 3.8) * 1000,
        color: '#38bdf8',
        dashArray: '5, 8',
        fillColor: '#0284c7',
        fillOpacity: 0.1,
        weight: 1.5,
      });
      towerCircle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 200px;">
          <div style="font-weight: bold; color: #0284c7; font-size: 13px; margin-bottom: 3px;">
            📡 SERVING CELL TOWER (${tower.operatorName})
          </div>
          <div><strong>Tower ID:</strong> ${tower.towerId} · <span style="color: #d97706; font-weight: bold;">(Simulated registry)</span></div>
          <div><strong>Coverage Sector:</strong> ~${tower.coverageRadiusKm} km radius</div>
          <div><strong>Sector Type:</strong> ${tower.sectorDescription || 'Primary Macro Sector'}</div>
          <div style="margin-top: 4px; padding: 4px; background: #e0f2fe; border-radius: 4px; font-size: 11px; color: #0369a1;">
            🎯 <strong>Gemini Narrowed:</strong> ~${tower.narrowedRadiusMeters || 300} m via landmarks
          </div>
        </div>
      `);
      markersLayerRef.current.addLayer(towerCircle);

      // 2. Tower Marker
      const towerIcon = L.divIcon({
        className: 'custom-tower-icon',
        html: `
          <div class="p-1 rounded-full bg-sky-700 text-white shadow-md flex items-center justify-center text-[10px] w-6 h-6 border-2 border-white">
            📡
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const towerMarker = L.marker([tower.lat, tower.lng], { icon: towerIcon });
      towerMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 190px;">
          <div style="font-weight: bold; color: #0284c7; font-size: 13px; margin-bottom: 2px;">
            📡 ${tower.towerId}
          </div>
          <div><strong>Operator:</strong> ${tower.operatorName} · (Simulated)</div>
          <div><strong>Sector Radius:</strong> ${tower.coverageRadiusKm} km</div>
          <div><strong>Precision:</strong> Narrowed to ~${tower.narrowedRadiusMeters || 300} m by Gemini</div>
        </div>
      `);
      markersLayerRef.current.addLayer(towerMarker);

    }



    // Plot Ambulances (Simulated)
    if (activeLayer.ambulances && activeAmbulances.length > 0) {
      activeAmbulances.forEach((amb) => {
        if (typeof amb.lat !== 'number' || typeof amb.lng !== 'number') return;
        const isSelected = dispatchPlan?.selectedAmbulance?.name === amb.name;
        const ambIcon = L.divIcon({
          className: 'custom-amb-icon',
          html: `
            <div class="p-1 rounded-full ${
              isSelected
                ? 'bg-[#F2A93B] ring-4 ring-[#F2A93B]/40'
                : 'bg-blue-600'
            } text-white shadow-md flex items-center justify-center text-[10px] w-6 h-6 border border-white">
              🚑
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const ambMarker = L.marker([amb.lat, amb.lng], { icon: ambIcon });
        ambMarker.bindPopup(
          `<b>🚑 ${amb.name}</b><br/>ETA: ~${amb.etaMinutes}m · <b>(Simulated)</b>`
        );
        markersLayerRef.current?.addLayer(ambMarker);
      });
    }

    // Plot Real Hospitals (OSM)
    if (activeLayer.hospitals && activeHospitals.length > 0) {
      activeHospitals.forEach((hosp) => {
        if (typeof hosp.lat !== 'number' || typeof hosp.lng !== 'number') return;
        const isSelected =
          dispatchPlan?.selectedHospital?.name === hosp.name ||
          dispatchPlan?.hospitalPreAlert?.destinationHospitalName === hosp.name;
        const hospIcon = L.divIcon({
          className: 'custom-hosp-icon',
          html: `
            <div class="p-1 rounded-full ${
              isSelected
                ? 'bg-emerald-600 ring-4 ring-emerald-400/50'
                : 'bg-indigo-700'
            } text-white shadow-md flex items-center justify-center text-[10px] w-6 h-6 border border-white">
              🏥
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const hospMarker = L.marker([hosp.lat, hosp.lng], { icon: hospIcon });
        hospMarker.bindPopup(
          `<b>🏥 ${hosp.name}</b><br/>ETA: ~${hosp.etaMinutes}m · OpenStreetMap Verified`
        );
        markersLayerRef.current?.addLayer(hospMarker);
      });
    }

    // Plot Volunteers (Simulated)
    if (activeLayer.volunteers && activeVolunteers.length > 0) {
      activeVolunteers.forEach((vol) => {
        if (typeof vol.lat !== 'number' || typeof vol.lng !== 'number') return;
        const isSelected = dispatchPlan?.selectedVolunteer?.name?.includes(vol.name);
        const volIcon = L.divIcon({
          className: 'custom-vol-icon',
          html: `
            <div class="p-1 rounded-full ${
              isSelected ? 'bg-[#F2A93B] ring-4 ring-[#F2A93B]/40' : 'bg-amber-600'
            } text-white shadow-md flex items-center justify-center text-[10px] w-6 h-6 border border-white">
              🏍
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const volMarker = L.marker([vol.lat, vol.lng], { icon: volIcon });
        volMarker.bindPopup(
          `<b>🏍 ${vol.name}</b><br/>ETA: ~${vol.etaMinutes}m · <b>(Simulated)</b>`
        );
        markersLayerRef.current?.addLayer(volMarker);
      });
    }

    // Route lines
    if (activeLayer.routes && hasCoordinates && dispatchPlan) {
      const amb =
        activeAmbulances.find(
          (a) => a.name === dispatchPlan.selectedAmbulance?.name
        ) || activeAmbulances[0];
      const hosp =
        activeHospitals.find(
          (h) =>
            h.name === dispatchPlan.selectedHospital?.name ||
            h.id === dispatchPlan.selectedHospital?.id
        ) || activeHospitals[0];
      const vol =
        activeVolunteers.find(
          (v) =>
            dispatchPlan.selectedVolunteer?.name?.includes(v.name) ||
            v.name === dispatchPlan.selectedVolunteer?.name
        ) || activeVolunteers[0];

      if (
        vol &&
        dispatchPlan.selectedVolunteer?.dispatched &&
        typeof vol.lat === 'number' &&
        typeof vol.lng === 'number'
      ) {
        routesLayerRef.current.addLayer(
          L.polyline(
            [
              [vol.lat, vol.lng],
              [incidentLat!, incidentLng!],
            ],
            { color: '#F2A93B', dashArray: '5, 8', weight: 3.5, opacity: 0.9 }
          )
        );
      }

      if (amb && typeof amb.lat === 'number' && typeof amb.lng === 'number') {
        routesLayerRef.current.addLayer(
          L.polyline(
            [
              [amb.lat, amb.lng],
              [incidentLat!, incidentLng!],
            ],
            { color: '#2563eb', weight: 4, opacity: 0.85 }
          )
        );
      }

      if (hosp && typeof hosp.lat === 'number' && typeof hosp.lng === 'number') {
        routesLayerRef.current.addLayer(
          L.polyline(
            [
              [incidentLat!, incidentLng!],
              [hosp.lat, hosp.lng],
            ],
            { color: '#10b981', weight: 3.5, opacity: 0.8 }
          )
        );
      }
    }
  }, [
    assessment,
    dispatchPlan,
    activeLayer,
    incidentLat,
    incidentLng,
    hasCoordinates,
    activeAmbulances,
    activeHospitals,
    activeVolunteers,
  ]);

  const goldenHourMinutes = assessment?.goldenHourWindowMinutes || 60;
  const goldenHourTotalSeconds = goldenHourMinutes * 60;
  const elapsedPercentage = Math.min(
    100,
    Math.max(4, Math.round((elapsedSeconds / goldenHourTotalSeconds) * 100))
  );

  const countryName =
    assessment?.country || assessment?.estimatedLocation?.country || 'Awaiting call';
  const countryFlag =
    assessment?.countryFlag || assessment?.estimatedLocation?.countryFlag || '🌐';
  const localEmergencyNum =
    assessment?.localEmergencyNumber ||
    assessment?.estimatedLocation?.localEmergencyNumber ||
    '112 / 108';

  const originUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000';
  const callerPairingUrl = buildCallerPairingUrl(originUrl, roomCode);
  const qrMatrix = generateQrMatrix(callerPairingUrl);

  const handleCopyPairingLink = async () => {
    try {
      await navigator.clipboard.writeText(callerPairingUrl);
      setCopiedPairingLink(true);
      setTimeout(() => setCopiedPairingLink(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div
      data-testid="operations-command-centre"
      className="w-full px-3 sm:px-5 py-4 space-y-5 text-slate-100"
    >
      {/* Operations Command Header Bar + Room Pairing Banner */}
      <div className="bg-[#112036] px-4 py-3 rounded-2xl border border-slate-700/80 shadow-lg space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F2A93B]/20 border border-[#F2A93B]/50 flex items-center justify-center text-[#F2A93B]">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  {getCommandCentreTitleForCountry(activeCountryInfo.country)}
                </h1>
                <span
                  data-testid="ops-live-sync-indicator"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-md border border-emerald-500/40 font-mono"
                >
                  <span>Live sync ●</span>
                </span>
                <span
                  data-testid="ops-room-code"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#F2A93B] bg-[#F2A93B]/15 px-2.5 py-0.5 rounded-md border border-[#F2A93B]/50 font-mono"
                >
                  <span>Room: {roomCode}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Room {roomCode} · v{sessionVersion} · Session {callId} · Synced{' '}
                {new Date(lastSyncedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}{' '}
                {isLiveSynced ? '(1s polling active)' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tiny "Change country" option in the Operations view top bar */}
            <div
              data-testid="ops-country-selector-bar"
              className="flex items-center gap-1.5 bg-[#0b1626] border border-slate-700 px-2 py-1 rounded-lg"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <label
                htmlFor="ops-change-country-select"
                className="text-[10px] font-mono uppercase text-slate-300 whitespace-nowrap"
              >
                Change country:
              </label>
              <select
                id="ops-change-country-select"
                data-testid="ops-change-country-select"
                aria-label="Change country"
                value={activeCountryInfo.countryCode || selectedCountryCode || 'UNKNOWN'}
                onChange={(e) => onChangeCountryCode?.(e.target.value)}
                className="bg-[#122238] text-slate-100 text-[11px] font-bold rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:border-[#F2A93B]"
              >
                {EMERGENCY_COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.country} ({c.emergencyNumber})
                  </option>
                ))}
                <option value="UNKNOWN">🌐 Unknown / International (112)</option>
              </select>
            </div>

            {/* "Demo Doctor" switch in Operations view (default ON) */}
            <div
              data-testid="ops-demo-doctor-switch-container"
              className="flex items-center gap-2 bg-[#0b1626] border border-slate-700 px-2.5 py-1 rounded-lg"
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#F2A93B] shrink-0" />
              <span className="text-[10px] font-mono uppercase text-slate-200 whitespace-nowrap font-bold">
                Demo Doctor:
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={demoDoctorEnabled}
                aria-label="Demo Doctor"
                data-testid="ops-demo-doctor-switch"
                onClick={() => onToggleDemoDoctor?.(!demoDoctorEnabled)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold transition cursor-pointer ${
                  demoDoctorEnabled
                    ? 'bg-emerald-600 text-white border border-emerald-400/60 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border border-slate-600'
                }`}
              >
                {demoDoctorEnabled ? 'ON' : 'OFF'}
              </button>
              {demoDoctorEnabled && humanDoctorTookOver && (
                <span
                  data-testid="ops-human-doctor-takeover-badge"
                  className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40"
                >
                  Human took over
                </span>
              )}
            </div>

            {onSelectScenario && (
              <select
                data-testid="ops-preset-scenario-select"
                aria-label="Preset emergency scenario selector"
                defaultValue=""
                onChange={(e) => {
                  const chosen = COMPREHENSIVE_EMERGENCY_DATASET.find(
                    (s) => s.id === e.target.value
                  );
                  if (chosen) {
                    onSelectScenario(chosen);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#0b1626] hover:bg-[#152742] text-xs font-bold text-[#F2A93B] border border-[#F2A93B]/40 focus:outline-none focus:border-[#F2A93B] max-w-[210px]"
              >
                <option value="" disabled>
                  Preset Scenarios (27)…
                </option>
                {COMPREHENSIVE_EMERGENCY_DATASET.map((scen) => (
                  <option key={scen.id} value={scen.id}>
                    [{scen.language}] {scen.emergencyType.slice(0, 36)} ({scen.severity})
                  </option>
                ))}
              </select>
            )}
            {onSubmitCustomText && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!customEmergencyText.trim()) return;
                  onSubmitCustomText(customEmergencyText.trim());
                  setCustomEmergencyText('');
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  data-testid="ops-custom-emergency-input"
                  value={customEmergencyText}
                  onChange={(e) => setCustomEmergencyText(e.target.value)}
                  placeholder="Simulate caller text / SMS…"
                  className="w-40 sm:w-48 px-2.5 py-1.5 rounded-lg bg-[#0b1626] border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#F2A93B]"
                />
                <button
                  type="submit"
                  data-testid="ops-custom-emergency-submit"
                  disabled={!customEmergencyText.trim() || isLoadingTriage}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F2A93B] hover:bg-[#e59b2b] disabled:opacity-40 text-[#0E1B2E] text-xs font-extrabold transition"
                >
                  Send
                </button>
              </form>
            )}
            {onOpenCollectedCalls && (
              <button
                type="button"
                onClick={onOpenCollectedCalls}
                className="px-2.5 py-1.5 rounded-lg bg-[#172a45] hover:bg-[#1f385c] text-xs font-bold text-emerald-300 border border-emerald-500/30 transition"
              >
                Calls ({collectedCallsCount})
              </button>
            )}
            {onOpenDataset && (
              <button
                type="button"
                onClick={onOpenDataset}
                className="px-2.5 py-1.5 rounded-lg bg-[#172a45] hover:bg-[#1f385c] text-xs font-bold text-[#F2A93B] border border-[#F2A93B]/40 transition"
              >
                All 27
              </button>
            )}
          </div>
        </div>

        {/* Mobile Caller Pairing Row: QR Code + Link */}
        <div
          data-testid="ops-mobile-pairing-banner"
          className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-700/70"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-testid="ops-room-qr-code"
              title={`Scan to open ${callerPairingUrl}`}
              className="w-12 h-12 p-1 bg-white rounded-lg border border-slate-300 shrink-0 shadow-sm flex items-center justify-center"
            >
              <svg
                viewBox="0 0 21 21"
                className="w-full h-full"
                shapeRendering="crispEdges"
                aria-label={`QR code for room ${roomCode}`}
              >
                {qrMatrix.map((row, rIdx) =>
                  row.map((cell, cIdx) =>
                    cell ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width={1}
                        height={1}
                        fill="#0E1B2E"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>
            <div className="text-xs text-slate-200 min-w-0">
              <div className="font-semibold text-slate-300">
                Open caller phone on your mobile:{' '}
                <a
                  href={`/caller?room=${encodeURIComponent(roomCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="ops-caller-pairing-link"
                  className="text-[#F2A93B] hover:underline font-mono font-bold break-all"
                >
                  {callerPairingUrl}
                </a>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Private room <span className="text-[#F2A93B] font-bold">{roomCode}</span> · Scan QR or open link on mobile to pair caller phone with this dashboard
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="ops-copy-pairing-link"
            onClick={handleCopyPairingLink}
            className="px-2.5 py-1 rounded-lg bg-[#0b1626] hover:bg-[#172a45] text-[11px] font-mono font-bold text-slate-200 border border-slate-600/80 transition shrink-0"
          >
            {copiedPairingLink ? 'Copied!' : 'Copy mobile link'}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TOP 3-COLUMN CONTROL ROOM GRID:                                     */}
      {/* Left: Incoming Call + Severity | Centre: Map + Pre-Alert | Right: AI Pipeline */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN: Incoming Call Card + Severity Badge & History        */}
        {/* ----------------------------------------------------------------- */}
        <div className="xl:col-span-3 space-y-4">
          {/* Card 1: Incoming Call Card */}
          <div
            data-testid="ops-incoming-call-card"
            className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#F2A93B]" />
                <span>Incoming Call</span>
              </h2>
              {assessment ? (
                <span className="text-xs font-mono font-bold text-[#F2A93B]">
                  {countryFlag} {countryName} ({localEmergencyNum})
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-400">Standby</span>
              )}
            </div>

            {!assessment ? (
              <div className="py-6 text-center space-y-2 text-slate-400 text-xs">
                <p className="font-semibold text-slate-300">
                  Waiting for caller transmission…
                </p>
                <p>
                  Speak or tap a phrase on the Caller Phone (`/caller` or left pane) to
                  stream live telemetry.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Original Words / Transcript */}
                <div className="p-3 rounded-xl bg-[#0b1626] border border-slate-700/70 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase text-slate-400">
                    <span className="truncate">Original Caller Words / Transcript</span>
                    <button
                      type="button"
                      data-testid="ops-play-transcript-btn"
                      onClick={() => {
                        playOperationsManualAudio(
                          assessment.transcribedText || 'Voice transmission',
                          assessment.detectedLanguage || 'English',
                          'caller'
                        ).catch(() => {});
                      }}
                      className="shrink-0 whitespace-nowrap text-[#F2A93B] hover:text-white font-bold lowercase cursor-pointer"
                      title="Play caller transcript in Operations view"
                    >
                      🔊 play
                    </button>
                  </div>
                  <p className="text-sm font-extrabold text-amber-200 leading-snug break-words">
                    "{assessment.transcribedText || 'Voice transmission'}"
                  </p>
                </div>

                {/* English Translation */}
                <div className="p-3 rounded-xl bg-[#162840] border border-slate-700/60 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    English Translation
                  </div>
                  <p className="text-xs font-semibold text-white leading-snug">
                    "{assessment.shortEnglishTranslation}"
                  </p>
                </div>

                {/* Language & Country Metadata */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#0e1b2d] border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Language
                    </span>
                    <span className="font-bold text-white text-xs">
                      {assessment.detectedLanguage}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0e1b2d] border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Country &amp; SOS
                    </span>
                    <span className="font-bold text-[#F2A93B] text-xs">
                      {countryFlag} {countryName} · {localEmergencyNum}
                    </span>
                  </div>
                </div>

                {/* Resolved Location & Landmarks */}
                <div className="p-2.5 rounded-xl bg-[#0e1b2d] border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Resolved Location</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        (assessment.locationConfidence || '').includes('high')
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : (assessment.locationConfidence || '').includes('low')
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {assessment.locationConfidence || 'Geocoded (high)'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200 leading-snug">
                    {assessment.estimatedLocation?.description}
                  </div>
                  {assessment.landmarksMentioned &&
                    assessment.landmarksMentioned.length > 0 && (
                      <div className="text-[11px] text-[#F2A93B] pt-0.5">
                        Landmarks: {assessment.landmarksMentioned.join(' · ')}
                      </div>
                    )}
                </div>

                {/* Live IVR Keypress & Conversation Log */}
                {conversationLog.length > 0 && (
                  <div
                    data-testid="ops-ivr-keypress-log"
                    className="p-2.5 rounded-xl bg-[#0b1626] border border-slate-700/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#F2A93B]">
                      <span>Operations Conversation Log (Original + English)</span>
                      <span>{conversationLog.length} events</span>
                    </div>
                    <div className="max-h-[210px] overflow-y-auto space-y-1.5 pr-1">
                      {conversationLog.map((entry) => {
                        const isKeypress = entry.textEnglish?.startsWith('Caller pressed ');
                        const isAiDemo = Boolean(
                          entry.metadata?.isAiDemoDoctor || entry.metadata?.demoLabel
                        );
                        return (
                          <div
                            key={entry.id}
                            data-testid={`ops-log-entry-${entry.role}`}
                            className={`p-2 rounded-lg text-[11px] leading-snug border ${
                              isKeypress
                                ? 'bg-amber-950/50 border-[#F2A93B]/60 text-amber-200 font-bold'
                                : entry.role === 'doctor'
                                ? 'bg-emerald-950/35 border-emerald-500/50 text-emerald-100'
                                : entry.role === 'caller'
                                ? 'bg-[#13253d] border-slate-700 text-slate-200'
                                : 'bg-[#0e1c2f] border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[9px] font-mono opacity-85">
                              <span>
                                {isKeypress
                                  ? '🔢 DTMF KEY'
                                  : entry.role === 'doctor'
                                  ? '👨‍⚕️ DOCTOR'
                                  : entry.role === 'caller'
                                  ? '📞 CALLER'
                                  : entry.role.toUpperCase()}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    playOperationsManualAudio(
                                      entry.textCallerLang || entry.textEnglish,
                                      assessment?.detectedLanguage || 'English',
                                      entry.role === 'doctor' ? 'doctor' : 'operator'
                                    ).catch(() => {});
                                  }}
                                  className="text-[#F2A93B] hover:text-white font-bold cursor-pointer"
                                  title="Play log entry in Operations view"
                                >
                                  🔊 play
                                </button>
                                <span>{entry.timestamp}</span>
                              </div>
                            </div>

                            {isAiDemo && (
                              <div
                                data-testid="ops-log-demo-doctor-label"
                                className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-[#F2A93B]/50 text-[#F2A93B] text-[10px] font-mono font-bold"
                              >
                                {entry.metadata?.demoLabel || DEMO_DOCTOR_LABEL}
                              </div>
                            )}

                            {/* Show both Original text and English translation */}
                            {entry.role === 'doctor' ? (
                              <div className="mt-1 space-y-0.5">
                                <div className="break-words text-white font-semibold">
                                  <span className="text-[10px] font-mono text-emerald-300 mr-1">
                                    [Original EN]:
                                  </span>
                                  {entry.textEnglish}
                                </div>
                                {entry.textCallerLang &&
                                  entry.textCallerLang !== entry.textEnglish && (
                                    <div className="break-words text-amber-200 text-[10px]">
                                      <span className="font-mono text-slate-400 mr-1">
                                        [{assessment?.detectedLanguage || 'Caller'}]:
                                      </span>
                                      {entry.textCallerLang}
                                    </div>
                                  )}
                              </div>
                            ) : entry.role === 'caller' ? (
                              <div className="mt-1 space-y-0.5">
                                {entry.textCallerLang && (
                                  <div className="break-words text-amber-200 font-semibold">
                                    <span className="text-[10px] font-mono text-slate-400 mr-1">
                                      [Original]:
                                    </span>
                                    {entry.textCallerLang}
                                  </div>
                                )}
                                <div className="break-words text-white">
                                  <span className="text-[10px] font-mono text-sky-300 mr-1">
                                    [English]:
                                  </span>
                                  {entry.textEnglish}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-0.5 space-y-0.5">
                                <div className="break-words">{entry.textEnglish}</div>
                                {entry.textCallerLang &&
                                  entry.textCallerLang !== entry.textEnglish && (
                                    <div className="break-words text-amber-200/90 text-[10px]">
                                      {entry.textCallerLang}
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Severity Badge, Confidence & Severity History */}
          <div
            data-testid="ops-severity-card"
            className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Triage Severity &amp; History</span>
              </h2>
              {assessment && (
                <span className="font-mono text-xs font-extrabold text-slate-300 tabular-nums">
                  {assessment.confidencePercentage}% conf
                </span>
              )}
            </div>

            {!assessment ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No active severity assessment
              </div>
            ) : (
              <div className="space-y-3">
                {/* Active Severity Badge */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    assessment.severity === 'Critical'
                      ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                      : assessment.severity === 'Serious'
                      ? 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                      : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-mono uppercase opacity-80">
                      Current Triage Severity
                    </div>
                    <div className="text-lg font-black tracking-wide text-white">
                      {assessment.severity.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-lg font-black text-[#F2A93B] tabular-nums">
                      {assessment.confidencePercentage}%
                    </div>
                    <div className="text-[10px] opacity-80">Confidence</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-white mb-0.5">
                    {assessment.likelyEmergencyType}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {assessment.severityReasoning}
                  </p>
                </div>

                {/* Live Severity History Log */}
                <div className="pt-2 border-t border-slate-700/60 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>Severity Transition History</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {severityHistory.length} updates
                    </span>
                  </div>

                  {severityHistory.length === 0 ? (
                    <div className="text-[11px] text-slate-400 bg-[#0b1626] p-2.5 rounded-xl border border-slate-800">
                      Initial triage severity ({assessment.severity} ·{' '}
                      {assessment.confidencePercentage}%). Updates live as caller answers
                      follow-up questions.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {severityHistory.map((rec, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-[#0b1626] border border-rose-500/40 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-extrabold text-amber-300">
                            <span>
                              Severity updated: {rec.previousSeverity} → {rec.newSeverity}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {rec.timestamp}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-200 leading-snug">
                            {rec.reason}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-300">
                            Confidence: {rec.previousConfidence}% → {rec.newConfidence}% ·
                            Answer: "{rec.triggerAnswer}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* CENTRE COLUMN: Live Map + Hospital Pre-Alert + Registry & Scoring */}
        {/* ----------------------------------------------------------------- */}
        <div className="xl:col-span-5 space-y-4">
          {/* Sub-view tab switcher: Live Map vs Central Registry & Scoring */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#122238] p-1.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="ops-tab-map"
                onClick={() => setOpsViewTab('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  opsViewTab === 'map'
                    ? 'bg-[#F2A93B] text-[#0E1B2E] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Map &amp; Telemetry</span>
              </button>

              <button
                type="button"
                data-testid="ops-tab-registry"
                onClick={() => setOpsViewTab('registry')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  opsViewTab === 'registry'
                    ? 'bg-[#F2A93B] text-[#0E1B2E] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Central Registry &amp; Scoring (Simulated)</span>
              </button>
            </div>

            {dispatchPlan?.centralRegistry?.lastRerouteNotice && (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded truncate max-w-[240px]">
                ⚡ {dispatchPlan.centralRegistry.lastRerouteNotice}
              </span>
            )}
          </div>

          {opsViewTab === 'registry' ? (
            /* TAB 2: CENTRAL REGISTRY & DISPATCH SCORING VIEW */
            <div className="space-y-4" data-testid="ops-registry-tab-content">
              <CentralRegistryScreen
                assessment={assessment}
                dispatchPlan={dispatchPlan}
                centralRegistry={
                  dispatchPlan?.centralRegistry || assessment?.centralRegistry || null
                }
                onToggleDoctor={onToggleDoctor || (() => {})}
                onToggleAmbulance={onToggleAmbulance || (() => {})}
                onNavigateToOps={() => setOpsViewTab('map')}
              />
            </div>
          ) : (
            /* TAB 1: LIVE MAP, PRE-ALERT & DISPATCH SCORING CARD */
            <>
              {/* Live Dispatch Map Card */}
              <div className="bg-[#122238] rounded-2xl border border-slate-700/80 p-3.5 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#F2A93B]" />
                    <h2 className="text-sm font-extrabold text-white">
                      Live Global Dispatch Map
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    <label className="flex items-center gap-1 cursor-pointer bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                      <input
                        type="checkbox"
                        checked={activeLayer.ambulances}
                        onChange={(e) =>
                          setActiveLayer({ ...activeLayer, ambulances: e.target.checked })
                        }
                      />
                      <span>🚑 Amb ({activeAmbulances.length} Simulated)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                      <input
                        type="checkbox"
                        checked={activeLayer.hospitals}
                        onChange={(e) =>
                          setActiveLayer({ ...activeLayer, hospitals: e.target.checked })
                        }
                      />
                      <span>🏥 Hosp ({activeHospitals.length} OSM)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                      <input
                        type="checkbox"
                        checked={activeLayer.volunteers}
                        onChange={(e) =>
                          setActiveLayer({ ...activeLayer, volunteers: e.target.checked })
                        }
                      />
                      <span>🏍 Vol ({activeVolunteers.length} Simulated)</span>
                    </label>
                  </div>
                </div>

                <div
                  data-testid="ops-live-map"
                  className="relative rounded-xl overflow-hidden border border-slate-700 bg-[#0b1523] h-[340px]"
                >
                  <div ref={mapContainerRef} className="w-full h-full" />
                </div>

                {/* Selected Units Summary Strip */}
                {dispatchPlan && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#17273d] border border-slate-700/60">
                      <div className="flex items-center justify-between text-[10px] text-blue-300 font-bold">
                        <span>🚑 Ambulance (Simulated)</span>
                        <span className="font-mono text-[#F2A93B]">
                          {dispatchPlan.selectedAmbulance?.etaMinutes}m
                        </span>
                      </div>
                      <div className="font-bold text-white truncate mt-0.5">
                        {dispatchPlan.selectedAmbulance?.name}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#17273d] border border-slate-700/60">
                      <div className="flex items-center justify-between text-[10px] text-emerald-300 font-bold">
                        <span>🏥 Hospital (Real OSM)</span>
                        <span className="font-mono text-[#F2A93B]">
                          {dispatchPlan.selectedHospital?.etaMinutes}m
                        </span>
                      </div>
                      <div className="font-bold text-white truncate mt-0.5">
                        {dispatchPlan.selectedHospital?.name}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#17273d] border border-slate-700/60">
                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                        <span>🏍 Volunteer (Simulated)</span>
                        <span className="font-mono text-emerald-300">
                          {dispatchPlan.selectedVolunteer?.etaMinutes}m
                        </span>
                      </div>
                      <div className="font-bold text-white truncate mt-0.5">
                        {dispatchPlan.selectedVolunteer?.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Hospital Pre-Alert Card */}
              <div
                data-testid="hospital-pre-alert-card"
                className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                    <FileText className="w-4 h-4 text-[#F2A93B]" />
                    <span>Hospital Pre-Alert Card</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {dispatchPlan?.hospitalPreAlert?.transmissionStatus ||
                      (assessment ? 'Active Pre-Alert' : 'Standby')}
                  </span>
                </div>

                {!assessment && !dispatchPlan ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Pre-alert packet will populate automatically upon call triage.
                  </div>
                ) : (
                  <div className="text-xs space-y-2.5 text-slate-200">
                    <div className="grid grid-cols-2 gap-2 bg-[#17273d] p-3 rounded-xl border border-slate-700/50">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">
                          Receiving Facility
                        </span>
                        <strong className="text-white">
                          {dispatchPlan?.hospitalPreAlert?.destinationHospitalName ||
                            dispatchPlan?.selectedHospital?.name ||
                            assessment?.nearbyHospitals?.[0]?.name ||
                            'Regional Emergency Center'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">
                          Inbound ETA &amp; Prep
                        </span>
                        <strong className="text-[#F2A93B]">
                          {dispatchPlan?.hospitalPreAlert?.etaMinutes ||
                            dispatchPlan?.selectedHospital?.etaMinutes ||
                            25}{' '}
                          Mins (Golden Hour)
                        </strong>
                      </div>
                    </div>

                    <div className="bg-[#17273d] p-3 rounded-xl border border-slate-700/50 space-y-1.5">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Patient Profile &amp; Triage
                        </span>
                        <p className="text-white font-medium">
                          {dispatchPlan?.hospitalPreAlert?.patientProfile ||
                            assessment?.patientSummary}
                        </p>
                      </div>

                      {dispatchPlan?.hospitalPreAlert?.requiredPrepTeams && (
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                            Required Specialist Teams on Standby
                          </span>
                          <div className="flex flex-wrap gap-1.5 text-[11px] text-[#F2A93B] font-semibold">
                            {dispatchPlan.hospitalPreAlert.requiredPrepTeams.map(
                              (team, idx) => (
                                <span key={idx}>
                                  {idx > 0 ? '· ' : ''}⚡ {team}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {dispatchPlan?.hospitalPreAlert?.firstAidAdministered &&
                        dispatchPlan.hospitalPreAlert.firstAidAdministered.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono block">
                              Bystander First-Aid Administered
                            </span>
                            <ul className="list-disc list-inside text-[11px] text-emerald-300 space-y-0.5">
                              {dispatchPlan.hospitalPreAlert.firstAidAdministered.map(
                                (fa, idx) => (
                                  <li key={idx}>{fa}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>

                    {/* Doctor Handover Note (Appears when Doctor Call ends) */}
                    {dispatchPlan?.hospitalPreAlert?.doctorHandoverNote && (
                      <div
                        data-testid="pre-alert-doctor-handover-note"
                        className="p-3.5 rounded-xl bg-emerald-950/40 border-2 border-emerald-500/70 space-y-2 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5">
                          <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wide">
                            👨‍⚕️ Doctor Handover Note ({dispatchPlan.hospitalPreAlert.doctorHandoverNote.doctorName} · Simulated)
                          </span>
                          <span className="text-[10px] font-mono text-emerald-200">
                            {dispatchPlan.hospitalPreAlert.doctorHandoverNote.generatedAt}
                          </span>
                        </div>
                        <p className="text-xs text-white leading-snug">
                          <strong>What Happened:</strong>{' '}
                          {dispatchPlan.hospitalPreAlert.doctorHandoverNote.whatHappened}
                        </p>
                        <div className="space-y-1">
                          <strong className="text-[10px] font-mono uppercase text-emerald-300 block">
                            First Aid Given with Times:
                          </strong>
                          {dispatchPlan.hospitalPreAlert.doctorHandoverNote.firstAidGivenWithTimes.map(
                            (item, idx) => (
                              <div
                                key={idx}
                                className="text-[11px] text-slate-200 flex items-start gap-1.5"
                              >
                                <span className="font-mono text-[#F2A93B] font-bold shrink-0">
                                  [{item.time}]
                                </span>
                                <span>{item.action}</span>
                              </div>
                            )
                          )}
                        </div>
                        <p className="text-xs text-emerald-200 leading-snug">
                          <strong>Current Status:</strong>{' '}
                          {dispatchPlan.hospitalPreAlert.doctorHandoverNote.currentStatus}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 3: 3-Rule Dispatch Scoring Table (Requirement 3) */}
              {(() => {
                const centralReg =
                  dispatchPlan?.centralRegistry || assessment?.centralRegistry;
                const regFacilities =
                  centralReg?.facilities && centralReg.facilities.length >= 6
                    ? centralReg.facilities
                    : generateCentralRegistryFacilities(
                        incidentLat || 10.6455,
                        incidentLng || 78.5912,
                        activeCountryInfo.country,
                        activeHospitals
                      );
                const regAmbulances =
                  centralReg?.ambulances && centralReg.ambulances.length >= 4
                    ? centralReg.ambulances
                    : generateCentralRegistryAmbulances(
                        incidentLat || 10.6455,
                        incidentLng || 78.5912,
                        activeCountryInfo.country,
                        activeAmbulances
                      );
                const fallbackScores = computeDispatchScoring({
                  emergencyType: assessment?.likelyEmergencyType || 'Acute Emergency',
                  severity: assessment?.severity || 'Serious',
                  facilities: regFacilities,
                  ambulances: regAmbulances,
                  publicInsuranceHolder: assessment?.publicInsuranceHolder ?? null,
                  callerLat: incidentLat || 10.6455,
                  callerLng: incidentLng || 78.5912,
                });
                const displayScores =
                  centralReg?.scoringBreakdown && centralReg.scoringBreakdown.length > 0
                    ? centralReg.scoringBreakdown
                    : fallbackScores.scoringBreakdown;

                return (
                  <div
                    data-testid="ops-dispatch-scoring-card"
                    className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-sm font-extrabold text-white">
                          3-Rule Dispatch Scoring Table (Simulated registry)
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpsViewTab('registry')}
                        className="text-[11px] font-mono text-[#F2A93B] hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>Open Registry Directory &amp; Toggles</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      <strong>Rule 1:</strong> Clinical capability &amp; available specialist (hard filter) · <strong>Rule 2:</strong> Travel time · <strong>Rule 3:</strong> Affordability &amp; public insurance.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-700 text-[10px] font-mono uppercase text-slate-400 bg-[#0b1624]">
                            <th className="py-2 px-2.5">Rank &amp; Facility</th>
                            <th className="py-2 px-2.5">Rule 1: Capability</th>
                            <th className="py-2 px-2.5">On-Duty Specialist</th>
                            <th className="py-2 px-2.5">Rule 2: ETA</th>
                            <th className="py-2 px-2.5">Rule 3: Cost</th>
                            <th className="py-2 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-[11px]">
                          {displayScores.slice(0, 6).map((score) => {
                            const isWinner = score.isRecommended;
                            return (
                              <tr
                                key={score.facilityId}
                                className={
                                  isWinner
                                    ? 'bg-emerald-950/30'
                                    : !score.passesRule1
                                    ? 'opacity-60 bg-rose-950/10'
                                    : 'hover:bg-slate-800/30'
                                }
                              >
                                <td className="py-2 px-2.5">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
                                        isWinner
                                          ? 'bg-emerald-500 text-slate-950 font-black'
                                          : 'bg-slate-700 text-slate-200'
                                      }`}
                                    >
                                      #{score.rank}
                                    </span>
                                    <span className="truncate max-w-[130px]">{score.facilityName}</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">
                                    {score.facilityType} · (Simulated registry)
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  <span
                                    className={
                                      score.hasCapability ? 'text-emerald-300 font-bold' : 'text-rose-400'
                                    }
                                  >
                                    {score.hasCapability ? '✓' : '❌'} {score.requiredCapability}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="text-slate-200 truncate max-w-[110px]">
                                    {score.availableSpecialist?.name || `No ${score.specialistNeeded}`}
                                  </div>
                                  <span
                                    className={`text-[9px] font-mono px-1 rounded ${
                                      score.specialistStatus === 'available'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-amber-950 text-amber-300'
                                    }`}
                                  >
                                    {score.specialistStatus.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 font-mono text-[#F2A93B] font-bold">
                                  {score.travelEtaMinutes}m
                                </td>
                                <td className="py-2 px-2.5">
                                  <span
                                    className={
                                      score.costLevel === 'Free' ? 'text-emerald-300 font-bold' : 'text-slate-300'
                                    }
                                  >
                                    {score.costLevel}
                                  </span>
                                  <div className="text-[9px] text-slate-400">
                                    {score.acceptsPublicInsurance ? 'Ins ✓' : 'Self-pay'}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  {isWinner ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] font-mono">
                                      SELECTED
                                    </span>
                                  ) : !score.passesRule1 ? (
                                    <span className="text-[10px] text-rose-400 font-mono">
                                      NO MATCH
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      #{score.rank}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 1-sentence Gemini explanation */}
                    {displayScores[0] && (
                      <div className="p-2.5 rounded-xl bg-[#0b1626] border border-emerald-500/40 text-xs space-y-1">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 block font-bold">
                          ⚡ Gemini Selection Rationale:
                        </span>
                        <p className="text-white font-medium italic">
                          "{displayScores[0].geminiRationale || displayScores[0].geminiExplanation}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Expandable 9-Step "AI Pipeline" Live Log            */}
        {/* ----------------------------------------------------------------- */}
        <div className="xl:col-span-4">
          <div
            data-testid="ops-ai-pipeline"
            className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F2A93B]" />
                <h2 className="text-sm font-extrabold text-white">
                  AI Pipeline Live Log
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold tabular-nums">
                {pipelineSteps.filter((s) => s.status === 'completed').length} /{' '}
                {pipelineSteps.length} ✓
              </span>
            </div>

            <div className="space-y-2">
              {pipelineSteps.map((step) => {
                const isExpanded = Boolean(expandedSteps[step.id]);
                const isDone = step.status === 'completed';
                const isRunning = step.status === 'running';

                return (
                  <div
                    key={step.id}
                    data-testid={`pipeline-step-${step.id}`}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isDone
                        ? 'bg-[#0e1d30] border-emerald-500/40'
                        : isRunning
                        ? 'bg-amber-950/30 border-[#F2A93B]'
                        : 'bg-[#0b1624] border-slate-800 opacity-75'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      aria-expanded={isExpanded}
                      className="w-full px-3 py-2.5 text-left flex items-start justify-between gap-2.5 hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0 mt-0.5">
                          {isDone ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                              ✓
                            </span>
                          ) : isRunning ? (
                            <span className="w-5 h-5 rounded-full border-2 border-[#F2A93B] border-t-transparent animate-spin inline-block" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px] flex items-center justify-center">
                              {step.stepNumber}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-white">
                              {step.stepNumber}. {step.title}
                            </span>
                            {step.durationMs !== undefined && (
                              <span className="text-[10px] font-mono text-emerald-300 shrink-0 tabular-nums">
                                ✓ {step.durationMs}ms
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 truncate mt-0.5">
                            {step.summary}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-slate-400 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 pb-3 pt-2 border-t border-slate-800/80 bg-[#08121f] text-xs space-y-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#F2A93B] block">
                            What Gemini Decided:
                          </span>
                          <p className="text-slate-100 font-medium leading-snug mt-0.5">
                            {step.whatGeminiDecided}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-emerald-400 block">
                            Why (Reasoning):
                          </span>
                          <p className="text-slate-300 text-[11px] leading-snug mt-0.5">
                            {step.whyGeminiDecided}
                          </p>
                        </div>
                        {step.details && step.details.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-800 space-y-1">
                            {step.details.map((d, i) => (
                              <div
                                key={i}
                                className="flex items-start justify-between gap-2 text-[11px]"
                              >
                                <span className="text-slate-400 font-mono shrink-0">
                                  {d.label}:
                                </span>
                                <span className="text-slate-200 font-semibold text-right break-words">
                                  {d.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* BOTTOM SECTION: Golden Hour Timeline + Doctor Console Panel         */}
      {/* =================================================================== */}
      <div className="space-y-4 pt-2">
        {/* Golden Hour Timeline with Elapsed-Time Bar */}
        <div
          data-testid="ops-golden-hour-timeline"
          className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-xl space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#F2A93B]" />
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  Golden Hour Survival Timeline &amp; Elapsed-Time Bar
                </h2>
                <p className="text-xs text-slate-300">
                  {assessment?.goldenHourReason ||
                    'Critical intervention window from symptom onset to definitive hospital care.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">ELAPSED TIME</span>
                <span className="text-white font-black text-sm tabular-nums">
                  {formatCountdownMMSS(elapsedSeconds)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">AMBULANCE ETA</span>
                <span className="text-[#F2A93B] font-black text-sm tabular-nums">
                  {formatCountdownMMSS(ambulanceEtaSeconds)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">GOLDEN WINDOW</span>
                <span className="text-emerald-400 font-black text-sm tabular-nums">
                  {goldenHourMinutes} min
                </span>
              </div>
            </div>
          </div>

          {/* Elapsed-Time Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3.5 bg-[#091321] rounded-full overflow-hidden border border-slate-700 p-0.5">
              <div
                style={{ width: `${assessment ? elapsedPercentage : 0}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#F2A93B] to-rose-500 transition-all duration-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono pt-1">
              <div className="p-2 rounded-lg bg-[#0d192b] border border-slate-800">
                <span className="text-emerald-400 font-bold block">00:00 · Call &amp; Triage</span>
                <span className="text-slate-400 text-[10px]">
                  {assessment ? 'Completed ✓' : 'Standby'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#0d192b] border border-slate-800">
                <span className="text-[#F2A93B] font-bold block">
                  ~{dispatchPlan?.selectedVolunteer?.etaMinutes || 6}m · Volunteer
                </span>
                <span className="text-slate-400 text-[10px]">
                  {dispatchPlan?.selectedVolunteer?.name || 'First-Aid Responder'} (Simulated)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#0d192b] border border-slate-800">
                <span className="text-blue-400 font-bold block">
                  ~{dispatchPlan?.selectedAmbulance?.etaMinutes || 18}m · Ambulance
                </span>
                <span className="text-slate-400 text-[10px]">
                  {dispatchPlan?.selectedAmbulance?.name || 'ALS Unit'} (Simulated)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#0d192b] border border-slate-800">
                <span className="text-emerald-300 font-bold block">
                  ~{dispatchPlan?.selectedHospital?.etaMinutes || 28}m · Hospital
                </span>
                <span className="text-slate-400 text-[10px] truncate block">
                  {dispatchPlan?.selectedHospital?.name || 'Receiving Facility'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#0d192b] border border-slate-800">
                <span className="text-rose-400 font-bold block">
                  {goldenHourMinutes}m · Golden Limit
                </span>
                <span className="text-slate-400 text-[10px]">
                  Definitive Care Target
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Console Panel */}
        <div
          data-testid="ops-doctor-console-panel"
          className="bg-[#0b1626] rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden"
        >
          <DoctorScreen
            assessment={assessment}
            dispatchPlan={dispatchPlan}
            conversationLog={conversationLog}
            severityHistory={severityHistory}
            doctorCallState={doctorCallState}
            doctorName={resolvedDoctorName}
            doctorMessages={doctorMessages}
            ambulanceEtaSeconds={ambulanceEtaSeconds}
            onStartDoctorCall={onStartDoctorCall}
            onDoctorSendMessage={onDoctorSendMessage}
            onCallerSendMessage={onCallerSendMessage}
            onEndDoctorCall={onEndDoctorCall}
            onAppendConversationLog={onAppendConversationLog}
            demoDoctorEnabled={demoDoctorEnabled}
            onToggleDemoDoctor={onToggleDemoDoctor}
            humanDoctorTookOver={humanDoctorTookOver}
            onHumanDoctorTyping={onHumanDoctorTyping}
          />
        </div>
      </div>
    </div>
  );
};
