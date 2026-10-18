import React from 'react';
import {
  Building2,
  Truck,
  Stethoscope,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Sliders,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import {
  CentralRegistryState,
  RegistryFacility,
  RegistryAmbulance,
  RegistryDoctor,
  TriageAssessment,
  DispatchPlan,
} from '../types/emergency';

interface CentralRegistryScreenProps {
  assessment: TriageAssessment | null;
  dispatchPlan: DispatchPlan | null;
  centralRegistry: CentralRegistryState | null;
  onToggleDoctor: (doctorId: string) => void;
  onToggleAmbulance: (ambulanceId: string) => void;
  onNavigateToOps?: () => void;
}

export const CentralRegistryScreen: React.FC<CentralRegistryScreenProps> = ({
  assessment,
  dispatchPlan,
  centralRegistry,
  onToggleDoctor,
  onToggleAmbulance,
  onNavigateToOps,
}) => {
  const tower =
    centralRegistry?.servingCellTower ||
    dispatchPlan?.servingCellTower ||
    assessment?.servingCellTower;

  const facilities = centralRegistry?.facilities || [];
  const ambulances = centralRegistry?.ambulances || [];
  const scores = centralRegistry?.scoringBreakdown || [];
  const selectedDoc = centralRegistry?.selectedDoctor;
  const selectedFac = centralRegistry?.selectedFacility;
  const selectedAmb = centralRegistry?.selectedAmbulance;
  const publicInsurance = centralRegistry?.publicInsuranceHolder;

  return (
    <div
      data-testid="central-registry-screen"
      className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 text-slate-100 space-y-5"
    >
      {/* Header Banner */}
      <div className="bg-[#112036] p-4 sm:p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F2A93B] to-amber-600 flex items-center justify-center text-[#0E1B2E] shadow-lg shadow-[#F2A93B]/20 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  GoldenHour Central Registry
                </h1>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-[#F2A93B]/60 text-[#F2A93B]">
                  (Simulated registry)
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                  Live Dispatch Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Centralized health facility and emergency resource directory used by the Gemini
                Dispatch Engine for automated 3-rule clinical scoring and real-time specialist
                re-routing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToOps && (
              <button
                type="button"
                onClick={onNavigateToOps}
                data-testid="registry-btn-back-to-ops"
                className="px-3.5 py-2 rounded-xl bg-[#0b1626] hover:bg-[#152742] text-xs font-bold text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <span>Operations Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F2A93B]" />
              </button>
            )}
          </div>
        </div>

        {/* Live Re-route Notification Banner */}
        {centralRegistry?.lastRerouteNotice && (
          <div
            data-testid="registry-live-reroute-banner"
            className="p-3 rounded-xl bg-amber-950/40 border-2 border-[#F2A93B]/80 text-xs text-amber-200 flex items-start gap-2.5 shadow-md animate-pulse"
          >
            <AlertTriangle className="w-4 h-4 text-[#F2A93B] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-extrabold uppercase font-mono text-white mr-1.5">
                ⚡ Live Re-route Notice:
              </span>
              <span>{centralRegistry.lastRerouteNotice}</span>
            </div>
          </div>
        )}
      </div>

      {/* TOP ROW: Cell Tower Telemetry + Active Emergency Context */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cell Tower Card (Requirement 1) */}
        <div
          data-testid="registry-cell-tower-card"
          className="lg:col-span-6 bg-[#122238] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-extrabold text-white">
                Serving Cell Tower (Simulated)
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/70 border border-sky-500/40 text-sky-300">
              {tower?.operatorName || 'Simulated Telecom'} · (Simulated registry)
            </span>
          </div>

          {tower ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-[#0b1626] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Tower ID</span>
                  <span className="font-mono font-bold text-sky-300">{tower.towerId}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0b1626] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Operator</span>
                  <span className="font-bold text-white">{tower.operatorName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0b1626] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Sector Radius</span>
                  <span className="font-mono font-bold text-amber-300">{tower.coverageRadiusKm} km</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0b1626] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Narrowed Area</span>
                  <span className="font-mono font-bold text-emerald-400">~{tower.narrowedRadiusMeters} m</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0b1626] border border-sky-500/30 space-y-1">
                <div className="text-[10px] font-mono uppercase text-sky-300 font-bold">
                  Gemini Landmark Narrowing (Simulated)
                </div>
                <p className="text-white font-medium leading-snug">
                  {tower.narrowingReason}
                </p>
                <p className="text-[11px] text-slate-300">
                  Correlated verbal landmarks ({tower.landmarkCorrelation}) against OpenStreetMap topography to reduce coarse {tower.coverageRadiusKm} km tower sector to ~300 m precision.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No active call. Start a call or test a scenario to assign serving cell tower.
            </div>
          )}
        </div>

        {/* Selected Clinical Unit Summary (Requirement 5) */}
        <div
          data-testid="registry-active-pairing-card"
          className="lg:col-span-6 bg-[#122238] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#F2A93B]" />
              <h2 className="text-sm font-extrabold text-white">
                Receiving Facility &amp; Linked Doctor
              </h2>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              Matched via Rules 1, 2, 3 · (Simulated registry)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0b1626] border border-emerald-500/40 space-y-1">
              <span className="text-[10px] font-mono uppercase text-emerald-400 block font-bold">
                🏥 Receiving Facility
              </span>
              <div className="font-bold text-white text-sm">
                {selectedFac?.name || 'District Government Hospital'}
              </div>
              <div className="text-[11px] text-slate-300">
                {selectedFac?.type || 'Government Hospital'} · {selectedFac?.costLevel || 'Free'} cost · ETA ~{selectedFac?.etaMinutes || 18}m
              </div>
              <div className="text-[10px] text-emerald-300 font-mono">
                {selectedFac?.icuBedsAvailable || 4} ICU beds available · Accepts Public Insurance ✓
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0b1626] border border-[#F2A93B]/40 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#F2A93B] block font-bold">
                👨‍⚕️ Linked On-Duty Specialist
              </span>
              <div className="font-bold text-white text-sm">
                {selectedDoc?.name || 'Dr. R. Ramanathan'}
              </div>
              <div className="text-[11px] text-slate-300">
                {selectedDoc?.specialty || 'Cardiologist'} · {selectedDoc?.hospitalName || 'District Govt Hospital'}
              </div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Status: {selectedDoc?.status?.toUpperCase() || 'AVAILABLE'} (Receives Call)</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0b1626] border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
            <span>
              <strong>Affordability Status:</strong>{' '}
              {publicInsurance === true
                ? 'Government Health Insurance Card confirmed by caller (IVR Question).'
                : publicInsurance === false
                ? 'No insurance card reported.'
                : 'Not specified (emergency triage takes clinical priority).'}
            </span>
            <span className="font-mono text-[#F2A93B] font-bold text-[10px] shrink-0 ml-2">
              Rule 3 Active
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: DISPATCH SCORING BREAKDOWN TABLE (Requirement 3) */}
      <div
        data-testid="registry-dispatch-scoring-table-card"
        className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-xl space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>3-Rule Dispatch Scoring Table (Simulated registry)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Rule 1: Clinical capability + available on-duty specialist (hard filter) · Rule 2: Travel time ETA · Rule 3: Affordability &amp; public insurance.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-[#0b1626] px-2.5 py-1 rounded-lg border border-slate-700">
            Emergency: <strong>{assessment?.likelyEmergencyType || 'Acute Emergency'}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 text-[11px] font-mono uppercase text-slate-400 bg-[#0b1624]">
                <th className="py-2.5 px-3">Rank &amp; Facility</th>
                <th className="py-2.5 px-3">Rule 1: Clinical Capability</th>
                <th className="py-2.5 px-3">On-Duty Specialist</th>
                <th className="py-2.5 px-3">Rule 2: Travel ETA</th>
                <th className="py-2.5 px-3">Rule 3: Affordability</th>
                <th className="py-2.5 px-3">Score &amp; Status</th>
                <th className="py-2.5 px-3">Gemini Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {scores.map((score) => {
                const isWinner = score.isRecommended;
                return (
                  <tr
                    key={score.facilityId}
                    data-testid={`score-row-${score.facilityId}`}
                    className={`transition-colors ${
                      isWinner
                        ? 'bg-emerald-950/30 hover:bg-emerald-950/40'
                        : !score.passesRule1
                        ? 'opacity-60 bg-rose-950/10 hover:bg-rose-950/20'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                            isWinner
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : score.passesRule1
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-rose-900/60 text-rose-300'
                          }`}
                        >
                          #{score.rank}
                        </span>
                        <div>
                          <div className="font-bold text-white">{score.facilityName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {score.facilityType} · (Simulated registry)
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            score.hasCapability ? 'text-emerald-300' : 'text-rose-400'
                          }`}
                        >
                          {score.hasCapability ? '✓' : '❌'} {score.requiredCapability}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div>
                        <div className="font-semibold text-slate-200">
                          {score.availableSpecialist?.name || `No ${score.specialistNeeded}`}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            score.specialistStatus === 'available'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : score.specialistStatus === 'busy'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {score.specialistStatus.toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-[#F2A93B]">
                        {score.travelEtaMinutes} min
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {score.rule2Summary}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span
                          className={`font-semibold ${
                            score.costLevel === 'Free' ? 'text-emerald-300' : 'text-amber-200'
                          }`}
                        >
                          {score.costLevel}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {score.acceptsPublicInsurance ? 'Public Insurance ✓' : 'Self-pay'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {isWinner ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 text-slate-950 font-black text-xs shadow-sm font-mono">
                          ★ RECOMMENDED
                        </span>
                      ) : !score.passesRule1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[10px] font-mono">
                          DISQUALIFIED
                        </span>
                      ) : (
                        <span className="font-mono text-slate-300 text-xs">
                          Score: {score.finalScore}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 max-w-[280px]">
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {score.geminiExplanation}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: CENTRAL REGISTRY FACILITIES TABLE WITH DOCTOR AVAILABILITY TOGGLE (Requirement 2) */}
      <div
        data-testid="registry-facilities-directory-card"
        className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-xl space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Registered Health Facilities ({facilities.length} around caller · Simulated registry)
              </h2>
              <p className="text-xs text-slate-300">
                Click <strong>"Toggle Status"</strong> on any on-duty doctor to simulate doctor unavailability and observe automatic live re-routing!
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Real OpenStreetMap coordinates enriched with Central Registry attributes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((fac) => {
            const isDestination =
              selectedFac?.id === fac.id ||
              dispatchPlan?.selectedHospital?.name === fac.name;

            return (
              <div
                key={fac.id}
                data-testid={`facility-card-${fac.id}`}
                className={`p-4 rounded-xl border transition-all ${
                  isDestination
                    ? 'bg-[#152a47] border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-[#0b1626] border-slate-700/80'
                } space-y-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono uppercase text-[#F2A93B]">
                      {fac.type} · (Simulated registry)
                    </div>
                    <h3 className="font-bold text-white text-sm leading-tight mt-0.5">
                      {fac.name}
                    </h3>
                  </div>
                  {isDestination && (
                    <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] font-mono">
                      DESTINATION
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono">
                  <div className="p-1.5 rounded bg-[#112036] border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">ETA</span>
                    <span className="font-bold text-[#F2A93B]">~{fac.etaMinutes}m</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#112036] border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">BEDS</span>
                    <span className="font-bold text-slate-200">{fac.bedsAvailable}/{fac.totalBeds}</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#112036] border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">ICU</span>
                    <span className="font-bold text-emerald-300">{fac.icuBedsAvailable} free</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {fac.capabilityLabels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-200"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                {/* On-Duty Doctors with Interactive Toggle */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    On-Duty Doctors ({fac.doctorsOnDuty.length}):
                  </span>
                  <div className="space-y-1.5">
                    {fac.doctorsOnDuty.map((doc) => {
                      const isAvailable = doc.status === 'available';
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-[#112036] border border-slate-800 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate text-[11px]">
                              {doc.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {doc.specialty}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                isAvailable
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {doc.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => onToggleDoctor(doc.id)}
                              data-testid={`btn-toggle-doc-${doc.id}`}
                              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-100 transition cursor-pointer"
                              title="Toggle doctor availability to test live re-routing"
                            >
                              Toggle
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: REGISTERED AMBULANCES TABLE WITH AVAILABILITY TOGGLE (Requirement 2) */}
      <div
        data-testid="registry-ambulances-directory-card"
        className="bg-[#122238] rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-xl space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Registered Ambulances ({ambulances.length} fleet units · Simulated registry)
              </h2>
              <p className="text-xs text-slate-300">
                Live availability of Government (Free), NGO, and Private emergency transport units.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ambulances.map((amb) => {
            const isAssigned =
              selectedAmb?.id === amb.id ||
              dispatchPlan?.selectedAmbulance?.name === amb.name;
            const isAvail = amb.status === 'available';

            return (
              <div
                key={amb.id}
                data-testid={`ambulance-card-${amb.id}`}
                className={`p-3.5 rounded-xl border ${
                  isAssigned
                    ? 'bg-[#182942] border-[#F2A93B] shadow-md ring-2 ring-[#F2A93B]/20'
                    : 'bg-[#0b1626] border-slate-700/80'
                } space-y-2 text-xs`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold text-white text-sm">
                    🚑 {amb.callSign}
                  </div>
                  {isAssigned && (
                    <span className="px-2 py-0.5 rounded bg-[#F2A93B] text-slate-950 font-black text-[10px] font-mono">
                      ASSIGNED
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-300 font-medium">{amb.name}</div>

                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                  <div className="p-1 rounded bg-[#112036] border border-slate-800">
                    <span className="text-slate-400 block">TYPE</span>
                    <span className="text-slate-200">{amb.type.includes('Advanced') ? 'ALS' : 'BLS'}</span>
                  </div>
                  <div className="p-1 rounded bg-[#112036] border border-slate-800">
                    <span className="text-slate-400 block">COST</span>
                    <span className={amb.cost === 'Free' ? 'text-emerald-300' : 'text-amber-300'}>
                      {amb.cost}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-[#112036] border border-slate-800">
                    <span className="text-slate-400 block">ETA</span>
                    <span className="text-[#F2A93B]">~{amb.etaMinutes}m</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isAvail
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {amb.status.toUpperCase()}
                  </span>

                  <button
                    type="button"
                    onClick={() => onToggleAmbulance(amb.id)}
                    data-testid={`btn-toggle-amb-${amb.id}`}
                    className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-100 transition cursor-pointer"
                  >
                    Toggle status
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
