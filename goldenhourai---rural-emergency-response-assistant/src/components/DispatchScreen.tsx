import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MOCK_AMBULANCES,
  MOCK_HOSPITALS,
  MOCK_VOLUNTEERS,
  Ambulance,
  Hospital,
  CommunityVolunteer,
} from '../data/mockEmergencyData';
import { TriageAssessment, DispatchPlan } from '../types/emergency';
import {
  isIndiaCountry,
  getCommandCentreTitleForCountry,
  getSimulatedAmbulanceNameForCountry,
} from '../utils/triageFlowLogic';
import {
  Truck,
  Building2,
  Bike,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Send,
  Navigation,
  ShieldAlert,
  Layers,
  ArrowRight,
  Radio,
  FileText,
  UserCheck,
  Info,
  Globe,
} from 'lucide-react';

interface DispatchScreenProps {
  assessment: TriageAssessment | null;
  onNavigateToDoctor: () => void;
  dispatchPlan: DispatchPlan | null;
  setDispatchPlan: (plan: DispatchPlan) => void;
}

export const DispatchScreen: React.FC<DispatchScreenProps> = ({
  assessment,
  onNavigateToDoctor,
  dispatchPlan,
  setDispatchPlan,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [loadingDispatch, setLoadingDispatch] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [activeLayer, setActiveLayer] = useState<{
    ambulances: boolean;
    hospitals: boolean;
    volunteers: boolean;
    routes: boolean;
  }>({
    ambulances: true,
    hospitals: true,
    volunteers: true,
    routes: true,
  });

  // Incident Coordinates
  const incidentLat = assessment?.estimatedLocation?.latitude;
  const incidentLng = assessment?.estimatedLocation?.longitude;
  const hasCoordinates =
    typeof incidentLat === 'number' &&
    typeof incidentLng === 'number' &&
    !isNaN(incidentLat) &&
    !isNaN(incidentLng) &&
    (incidentLat !== 0 || incidentLng !== 0);

  const incidentName =
    assessment?.estimatedLocation?.description ||
    assessment?.estimatedLocation?.landmarkAnchor ||
    'Incident Location';

  // Active resources from dispatch plan or assessment
  const activeAmbulances = dispatchPlan?.allAmbulances || assessment?.nearbyAmbulances || [];
  const activeHospitals = dispatchPlan?.allHospitals || assessment?.nearbyHospitals || [];
  const activeVolunteers = dispatchPlan?.allVolunteers || assessment?.nearbyVolunteers || [];

  // Request dispatch recommendation from Gemini backend
  const fetchDispatchRecommendation = async () => {
    if (!assessment) return;

    setLoadingDispatch(true);
    try {
      const res = await fetch('/api/dispatch-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergency: assessment,
          ambulances: assessment.nearbyAmbulances,
          hospitals: assessment.nearbyHospitals,
          volunteers: assessment.nearbyVolunteers,
        }),
      });

      if (!res.ok) throw new Error('Dispatch computation failed');
      const data: DispatchPlan = await res.json();
      setDispatchPlan(data);
    } catch (e) {
      console.error('Error fetching dispatch:', e);
    } finally {
      setLoadingDispatch(false);
    }
  };

  // Run dispatch optimization automatically when assessment arrives and no plan exists
  useEffect(() => {
    if (assessment && !dispatchPlan) {
      fetchDispatchRecommendation();
    }
  }, [assessment]);

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

      // Standard OpenStreetMap tiles (free, no API key, global coverage)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map instance alive across re-renders
    };
  }, []);

  // Re-centre and zoom (zoom 15 when geocoding succeeded, zoom 13 for an AI estimate)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasCoordinates) return;
    const isAiEstimate =
      assessment?.locationConfidence === 'AI estimate (medium)' ||
      assessment?.estimatedLocation?.locationConfidence === 'AI estimate (medium)';
    const targetZoom = isAiEstimate ? 13 : 15;
    map.setView([incidentLat!, incidentLng!], targetZoom, { animate: true });
  }, [
    incidentLat,
    incidentLng,
    hasCoordinates,
    assessment?.locationConfidence,
    assessment?.estimatedLocation?.locationConfidence,
  ]);

  // Update Markers and Polylines whenever layer state, assessment, or dispatchPlan changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    // 1. Plot Incident Pin if coordinates available
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
        assessment.country ||
        assessment.estimatedLocation?.country ||
        'Global Location';
      const countryFlag =
        assessment.countryFlag ||
        assessment.estimatedLocation?.countryFlag ||
        '🌐';
      const confidenceBadge =
        assessment.locationConfidence ||
        assessment.estimatedLocation?.locationConfidence ||
        'Geocoded (high)';
      const emergencyNum =
        assessment.localEmergencyNumber ||
        assessment.estimatedLocation?.localEmergencyNumber ||
        '112';

      const badgeBg = confidenceBadge.includes('high')
        ? '#dcfce7'
        : confidenceBadge.includes('low')
        ? '#fee2e2'
        : '#fef3c7';
      const badgeColor = confidenceBadge.includes('high')
        ? '#166534'
        : confidenceBadge.includes('low')
        ? '#991b1b'
        : '#92400e';

      const incidentMarker = L.marker([incidentLat!, incidentLng!], { icon: incidentIcon });
      incidentMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-weight: bold; color: #dc2626; font-size: 13px;">🚨 EMERGENCY INCIDENT</span>
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">
              ${confidenceBadge}
            </span>
          </div>
          <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 3px;">
            ${countryFlag} ${countryName}
          </div>
          <div style="margin-bottom: 3px; line-height: 1.3;"><strong>Place:</strong> ${placeName}</div>
          <div style="margin-bottom: 2px;"><strong>Emergency:</strong> ${assessment.likelyEmergencyType}</div>
          <div style="margin-bottom: 3px;"><strong>Severity:</strong> <span style="color: #b91c1c; font-weight: bold;">${assessment.severity} (${assessment.confidencePercentage}%)</span></div>
          <div style="margin-top: 4px; padding: 4px 6px; background: #fee2e2; border-radius: 4px; color: #991b1b; font-size: 11px;">
            <strong>Local Emergency Call:</strong> ${emergencyNum}
          </div>
          <div style="margin-top: 4px; font-size: 10px; color: #64748b;">GPS: ${incidentLat!.toFixed(5)}, ${incidentLng!.toFixed(5)}</div>
        </div>
      `);
      markersLayerRef.current.addLayer(incidentMarker);
    }

    // 1b. Plot Serving Cell Tower & Coverage Circle (Requirement 1)
    const tower =
      assessment?.servingCellTower ||
      dispatchPlan?.servingCellTower ||
      dispatchPlan?.centralRegistry?.servingCellTower;

    if (tower && typeof tower.lat === 'number' && typeof tower.lng === 'number' && markersLayerRef.current) {
      // Coarse cell tower sector coverage circle
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

      // Tower Marker
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



    // 2. Plot Ambulances (Simulated)
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
                : amb.status === 'Available'
                ? 'bg-blue-600'
                : 'bg-slate-600'
            } text-white shadow-md flex items-center justify-center text-[10px] w-6 h-6 border border-white">
              🚑
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const ambMarker = L.marker([amb.lat, amb.lng], { icon: ambIcon });
        ambMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 180px;">
            <div style="font-weight: bold; color: #2563eb; font-size: 13px; margin-bottom: 2px;">
              🚑 ${amb.name}
            </div>
            <div><strong>Status:</strong> ${amb.status || 'Available'} · <span style="color: #d97706; font-weight: bold;">(Simulated)</span></div>
            <div><strong>Distance:</strong> ${amb.distanceKm || '~5'} km · <strong>ETA:</strong> ~${amb.etaMinutes}m</div>
            <div><strong>Equipment:</strong> ${(amb.equipment || []).slice(0, 3).join(', ') || 'ALS First-Aid'}</div>
            ${
              isSelected
                ? '<div style="margin-top: 4px; padding: 3px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; font-weight: bold; color: #92400e;">⚡ SELECTED BY GEMINI FOR DISPATCH</div>'
                : ''
            }
          </div>
        `);
        markersLayerRef.current?.addLayer(ambMarker);
      });
    }

    // 3. Plot Real Hospitals from OpenStreetMap
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
        hospMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 190px;">
            <div style="font-weight: bold; color: #4338ca; font-size: 13px; margin-bottom: 2px;">
              🏥 ${hosp.name}
            </div>
            <div><strong>Source:</strong> <span style="color: #059669; font-weight: bold;">OpenStreetMap Verified</span></div>
            <div><strong>Distance:</strong> ${hosp.distanceKm || '~10'} km · <strong>ETA:</strong> ~${hosp.etaMinutes}m</div>
            <div><strong>Level:</strong> ${hosp.level || 'Emergency Care'}</div>
            <div><strong>Capabilities:</strong> ${(hosp.capabilities || ['Emergency', 'Inpatient']).join(', ')}</div>
            ${
              isSelected
                ? '<div style="margin-top: 4px; padding: 3px; background: #dcfce7; border: 1px solid #22c55e; border-radius: 4px; font-weight: bold; color: #166534;">🎯 MATCHED DESTINATION HOSPITAL</div>'
                : ''
            }
          </div>
        `);
        markersLayerRef.current?.addLayer(hospMarker);
      });
    }

    // 4. Plot Volunteers (Simulated)
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
        volMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 180px;">
            <div style="font-weight: bold; color: #b45309; font-size: 13px; margin-bottom: 2px;">
              🏍 ${vol.name}
            </div>
            <div><strong>Role:</strong> Community First Responder · <span style="color: #d97706; font-weight: bold;">(Simulated)</span></div>
            <div><strong>Distance:</strong> ${vol.distanceKm || '~3'} km · <strong>ETA:</strong> ~${vol.etaMinutes}m (${vol.vehicle || 'Motorbike'})</div>
            <div><strong>Kit:</strong> ${(vol.kit || ['First Aid Kit', 'Bandages']).join(', ')}</div>
            ${
              isSelected
                ? '<div style="margin-top: 4px; padding: 3px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; font-weight: bold; color: #92400e;">⚡ RAPID COMMUNITY FIRST RESPONDER</div>'
                : ''
            }
          </div>
        `);
        markersLayerRef.current?.addLayer(volMarker);
      });
    }

    // 5. Draw Routing Polylines if routes layer is active
    if (activeLayer.routes && hasCoordinates && dispatchPlan) {
      const amb = activeAmbulances.find(
        (a) => a.name === dispatchPlan.selectedAmbulance?.name
      ) || activeAmbulances[0];
      const hosp = activeHospitals.find(
        (h) => h.name === dispatchPlan.selectedHospital?.name || h.id === dispatchPlan.selectedHospital?.id
      ) || activeHospitals[0];
      const vol = activeVolunteers.find(
        (v) => dispatchPlan.selectedVolunteer?.name?.includes(v.name) || v.name === dispatchPlan.selectedVolunteer?.name
      ) || activeVolunteers[0];

      // Route: Volunteer -> Incident (Amber dashed line)
      if (vol && dispatchPlan.selectedVolunteer?.dispatched && typeof vol.lat === 'number' && typeof vol.lng === 'number') {
        const volRoute = L.polyline(
          [
            [vol.lat, vol.lng],
            [incidentLat!, incidentLng!],
          ],
          {
            color: '#F2A93B',
            dashArray: '5, 8',
            weight: 3.5,
            opacity: 0.9,
          }
        );
        routesLayerRef.current.addLayer(volRoute);
      }

      // Route: Ambulance -> Incident (Blue solid line)
      if (amb && typeof amb.lat === 'number' && typeof amb.lng === 'number') {
        const ambRoute = L.polyline(
          [
            [amb.lat, amb.lng],
            [incidentLat!, incidentLng!],
          ],
          {
            color: '#2563eb',
            weight: 4,
            opacity: 0.85,
          }
        );
        routesLayerRef.current.addLayer(ambRoute);
      }

      // Route: Incident -> Destination Hospital (Green line)
      if (hosp && typeof hosp.lat === 'number' && typeof hosp.lng === 'number') {
        const hospRoute = L.polyline(
          [
            [incidentLat!, incidentLng!],
            [hosp.lat, hosp.lng],
          ],
          {
            color: '#10b981',
            weight: 3.5,
            opacity: 0.8,
          }
        );
        routesLayerRef.current.addLayer(hospRoute);
      }
    }
  }, [assessment, dispatchPlan, activeLayer, incidentLat, incidentLng, hasCoordinates, activeAmbulances, activeHospitals, activeVolunteers]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Dispatch Command Dashboard</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Worldwide Geocoding &amp; Dispatch</span>
            </span>
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Global emergency telemetry &amp; live OpenStreetMap geocoding. Gemini matches the nearest available ambulance,
            capability-matched hospital, and deploys rapid community volunteers when ambulance ETA exceeds 15 minutes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDispatchRecommendation}
            disabled={loadingDispatch || !assessment}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-[#F2A93B]" />
            <span>{loadingDispatch ? 'Recalculating...' : 'Re-Run Gemini Dispatch'}</span>
          </button>

          <button
            onClick={onNavigateToDoctor}
            className="flex items-center gap-2 px-4 py-2 bg-[#F2A93B] hover:bg-[#d68f23] text-[#0E1B2E] font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#F2A93B]/20 transition-all"
          >
            <span>Proceed to Doctor Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hospital Search Radius / Note Banner if 25km had no hospitals */}
      {(dispatchPlan?.hospitalNote || assessment?.hospitalNote) && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#F2A93B] shrink-0" />
          <span className="font-medium">
            {dispatchPlan?.hospitalNote || assessment?.hospitalNote}
          </span>
        </div>
      )}

      {/* Main Grid: Interactive Map + Dispatch Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Map Container (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Map Layer Controls Bar */}
          <div className="bg-[#142337] p-3 rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-300">
              <Layers className="w-3.5 h-3.5 text-[#F2A93B]" />
              <span>Map Telemetry Layers:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                <input
                  type="checkbox"
                  checked={activeLayer.ambulances}
                  onChange={(e) =>
                    setActiveLayer({ ...activeLayer, ambulances: e.target.checked })
                  }
                  className="rounded text-blue-500"
                />
                <span>{activeAmbulances.length} Ambulances (Simulated)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                <input
                  type="checkbox"
                  checked={activeLayer.hospitals}
                  onChange={(e) =>
                    setActiveLayer({ ...activeLayer, hospitals: e.target.checked })
                  }
                  className="rounded text-indigo-500"
                />
                <span>{activeHospitals.length} Real Hospitals (OSM)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                <input
                  type="checkbox"
                  checked={activeLayer.volunteers}
                  onChange={(e) =>
                    setActiveLayer({ ...activeLayer, volunteers: e.target.checked })
                  }
                  className="rounded text-amber-500"
                />
                <span>{activeVolunteers.length} Volunteers (Simulated)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                <input
                  type="checkbox"
                  checked={activeLayer.routes}
                  onChange={(e) =>
                    setActiveLayer({ ...activeLayer, routes: e.target.checked })
                  }
                  className="rounded text-emerald-500"
                />
                <span>Transit Routes</span>
              </label>
            </div>
          </div>

          {/* Map Frame */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-[#0b1523] h-[480px]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Floating Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-[#0E1B2E]/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/70 text-[11px] text-slate-200 space-y-1 shadow-lg">
              <div className="font-bold text-[#F2A93B] text-[10px] uppercase tracking-wider mb-1">
                Active Legend
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-white inline-block shrink-0" />
                <span>Incident Pin (Landmark Estimated)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 border border-white inline-block shrink-0" />
                <span>
                  {isIndiaCountry(assessment?.country)
                    ? '108 Ambulance Unit'
                    : 'Ambulance (Simulated)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block shrink-0" />
                <span>Specialized Hospital (Cath Lab / Trauma)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#F2A93B] border border-white inline-block shrink-0" />
                <span>Community Volunteer (Motorbike)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Gemini Dispatch Decisions & Hospital Pre-Alert (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Gemini Triple Decision */}
          <div className="bg-[#122238] rounded-2xl border border-slate-700/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F2A93B] animate-pulse" />
                <h3 className="font-bold text-white text-sm">
                  Gemini Dispatch Optimization
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {getCommandCentreTitleForCountry(assessment?.country)}
              </span>
            </div>

            {/* Decision A: Nearest Available Ambulance */}
            <div className="p-3.5 rounded-xl bg-[#17273d] border border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span>1. Chosen Ambulance:</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#F2A93B] bg-[#0E1B2E] px-2 py-0.5 rounded border border-slate-700">
                  <Clock className="w-3 h-3" />
                  <span>ETA: {dispatchPlan?.selectedAmbulance?.etaMinutes || 18}m</span>
                </div>
              </div>
              <div className="text-xs font-semibold text-white">
                {dispatchPlan?.selectedAmbulance?.name ||
                  getSimulatedAmbulanceNameForCountry(assessment?.country, 1)}
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                <strong>Rationale:</strong>{' '}
                {dispatchPlan?.selectedAmbulance?.selectionReason ||
                  'Closest Advanced Life Support vehicle with active paramedic crew'}
              </p>
            </div>

            {/* Decision B: Capability-Matched Hospital */}
            <div className="p-3.5 rounded-xl bg-[#17273d] border border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>2. Capability-Matched Hospital:</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#F2A93B] bg-[#0E1B2E] px-2 py-0.5 rounded border border-slate-700">
                  <Clock className="w-3 h-3" />
                  <span>ETA: {dispatchPlan?.selectedHospital?.etaMinutes || 28}m</span>
                </div>
              </div>
              <div className="text-xs font-semibold text-white">
                {dispatchPlan?.selectedHospital?.name ||
                  'Apollo Specialty & Heart Institute Trichy'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-medium">
                Matched Capability: {dispatchPlan?.selectedHospital?.capabilityMatch || 'Cardiac & Cath Lab Verified'}
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                <strong>Clinical Rationale:</strong>{' '}
                {dispatchPlan?.selectedHospital?.selectionReason ||
                  'Bypassed closer basic clinic to ensure direct Cath Lab / cardiac resuscitation facility within Golden Hour.'}
              </p>
            </div>

            {/* Decision C: Community Volunteer First Responder (Triggered when ETA > 15m) */}
            <div className="p-3.5 rounded-xl bg-[#17273d] border border-amber-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F2A93B]">
                  <Bike className="w-4 h-4 text-[#F2A93B]" />
                  <span>3. Community Volunteer First Responder:</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400 bg-[#0E1B2E] px-2 py-0.5 rounded border border-slate-700">
                  <Clock className="w-3 h-3" />
                  <span>ETA: {dispatchPlan?.selectedVolunteer?.etaMinutes || 6}m</span>
                </div>
              </div>
              <div className="text-xs font-semibold text-white">
                {dispatchPlan?.selectedVolunteer?.name || 'Murugan Selvam'} ·{' '}
                <span className="text-slate-300 font-normal">
                  {dispatchPlan?.selectedVolunteer?.vehicle || 'Bajaj Pulsar 150 Motorbike'}
                </span>
              </div>
              <div className="text-[10px] text-amber-300 font-medium">
                Threshold Rule: Ambulance ETA is &gt; 15 mins. Motorbike first responder deployed!
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                <strong>Protocol:</strong>{' '}
                {dispatchPlan?.selectedVolunteer?.assignedReason ||
                  'Volunteer lives 1.8km away; equipped with St. John first-aid pack and cervical collar to stabilize patient prior to ambulance arrival.'}
              </p>
            </div>

            {/* Broadcast Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setBroadcastSent(true)}
                disabled={broadcastSent}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                  broadcastSent
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                    : 'bg-[#F2A93B] hover:bg-[#d68f23] text-[#0E1B2E]'
                }`}
              >
                {broadcastSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Dispatched to{' '}
                      {isIndiaCountry(assessment?.country)
                        ? '108 & Volunteer'
                        : 'Ambulance & Volunteer'}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm &amp; Broadcast Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Hospital Pre-Alert Card */}
          <div
            data-testid="hospital-pre-alert-card"
            className="bg-[#122238] rounded-2xl border border-slate-700/80 p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-[#F2A93B]" />
                <span>Hospital Pre-Alert Transmission</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {dispatchPlan?.hospitalPreAlert?.transmissionStatus || 'Transmitted & Acknowledged'}
              </span>
            </div>

            <div className="text-xs space-y-2 text-slate-200">
              <div className="grid grid-cols-2 gap-2 bg-[#17273d] p-3 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    Receiving Facility:
                  </span>
                  <span className="font-semibold text-white">
                    {dispatchPlan?.hospitalPreAlert?.destinationHospitalName ||
                      dispatchPlan?.selectedHospital?.name ||
                      'Regional Emergency Hospital'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    Transit ETA:
                  </span>
                  <span className="font-semibold font-mono text-[#F2A93B]">
                    {dispatchPlan?.hospitalPreAlert?.etaMinutes || 28} Minutes
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#17273d] rounded-xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  Patient Condition &amp; Symptoms:
                </span>
                <p className="text-slate-100 font-medium">
                  {dispatchPlan?.hospitalPreAlert?.patientProfile ||
                    assessment?.patientSummary ||
                    'Elderly male, collapsed, unresponsive with abnormal breathing.'}
                </p>
                <div className="text-[11px] text-slate-300">
                  <strong>Onset:</strong> {dispatchPlan?.hospitalPreAlert?.estimatedOnset || 'Approx 25 mins ago'}
                </div>
              </div>

              <div className="p-3 bg-[#17273d] rounded-xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  Hospital Prep Teams Alerted:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(
                    dispatchPlan?.hospitalPreAlert?.requiredPrepTeams || [
                      'Emergency Triage Bay 1',
                      'Cath Lab on Standby',
                      'Cardiologist On-Call',
                      'Defibrillator Ready',
                    ]
                  ).map((team, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-medium"
                    >
                      ✓ {team}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#17273d] rounded-xl border border-slate-700/50 text-[11px] text-slate-300">
                <span className="text-[10px] text-slate-400 block uppercase font-mono mb-1">
                  Field First Aid Administered:
                </span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {(
                    dispatchPlan?.hospitalPreAlert?.firstAidAdministered || [
                      'Airway chin-lift performed',
                      'Loosened clothing for ventilation',
                      'Patient kept in recovery position',
                    ]
                  ).map((aid, idx) => (
                    <li key={idx}>{aid}</li>
                  ))}
                </ul>
              </div>

              {/* Doctor Handover Note (Written by Gemini when Simulated Doctor Call Ends) */}
              {dispatchPlan?.hospitalPreAlert?.doctorHandoverNote && (
                <div
                  data-testid="prealert-doctor-handover-note"
                  className="p-3.5 bg-emerald-950/60 rounded-xl border-2 border-emerald-400/80 space-y-2 text-xs shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5">
                    <span className="font-extrabold text-emerald-300 uppercase tracking-wide text-[11px]">
                      👨‍⚕️ Physician Handover Note for Ambulance Crew &amp; Hospital (Simulated)
                    </span>
                    <span className="font-mono text-[10px] text-[#F2A93B]">
                      {dispatchPlan.hospitalPreAlert.doctorHandoverNote.generatedAt}
                    </span>
                  </div>
                  <div>
                    <strong className="text-[#F2A93B] block text-[10px] uppercase font-mono">
                      What Happened:
                    </strong>
                    <p className="text-white leading-snug">
                      {dispatchPlan.hospitalPreAlert.doctorHandoverNote.whatHappened}
                    </p>
                  </div>
                  <div>
                    <strong className="text-emerald-300 block text-[10px] uppercase font-mono">
                      First Aid Given (With Times):
                    </strong>
                    <ul className="space-y-0.5 text-slate-200 mt-0.5">
                      {dispatchPlan.hospitalPreAlert.doctorHandoverNote.firstAidGivenWithTimes.map(
                        (item, idx) => (
                          <li key={idx} className="text-[11px]">
                            <span className="font-mono text-[#F2A93B]">[{item.time}]</span>{' '}
                            {item.action}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <strong className="text-blue-300 block text-[10px] uppercase font-mono">
                      Current Status:
                    </strong>
                    <p className="text-white leading-snug">
                      {dispatchPlan.hospitalPreAlert.doctorHandoverNote.currentStatus}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
