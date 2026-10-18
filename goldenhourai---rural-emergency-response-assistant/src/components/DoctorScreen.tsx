import React, { useState, useEffect, useRef } from 'react';
import {
  TriageAssessment,
  DispatchPlan,
  ConversationLogEntry,
  SeverityChangeRecord,
  DoctorCallState,
  DoctorBridgeMessage,
  DoctorHandoverNote,
} from '../types/emergency';
import {
  formatCountdownMMSS,
  getLocalizedCallerQuickRepliesForDoctor,
  buildFallbackDoctorSuggestedPrompts,
  getCountryDoctorLabel,
  normalizeDoctorBridgeMessage,
  DEMO_DOCTOR_LABEL,
} from '../utils/triageFlowLogic';
import { playOperationsManualAudio } from '../utils/audioSpeechEngine';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Stethoscope,
  Send,
  Sparkles,
  AlertTriangle,
  Clock,
  MapPin,
  Building2,
  Radio,
  User,
  MessageSquare,
  CheckCircle2,
  FileText,
  Truck,
  ArrowRight,
} from 'lucide-react';

interface DoctorScreenProps {
  assessment: TriageAssessment | null;
  dispatchPlan: DispatchPlan | null;
  conversationLog?: ConversationLogEntry[];
  severityHistory?: SeverityChangeRecord[];
  currentFirstAidStepIndex?: number;
  ambulanceEtaSeconds?: number;
  doctorCallState?: DoctorCallState;
  doctorName?: string;
  doctorMessages?: DoctorBridgeMessage[];
  handoverNote?: DoctorHandoverNote | null;
  isGeneratingHandover?: boolean;
  onStartDoctorCall?: () => void;
  onEndDoctorCall?: () => void;
  onDoctorSendMessage?: (englishText: string, preTranslatedText?: string) => Promise<void>;
  onCallerSendMessage?: (callerText: string, englishOverride?: string) => Promise<void>;
  onAppendConversationLog?: (entry: ConversationLogEntry) => void;
  onNavigateToDispatch?: () => void;
  onNavigateToCaller?: () => void;
  demoDoctorEnabled?: boolean;
  onToggleDemoDoctor?: (enabled: boolean) => void;
  humanDoctorTookOver?: boolean;
  onHumanDoctorTyping?: () => void;
}

export const DoctorScreen: React.FC<DoctorScreenProps> = ({
  assessment,
  dispatchPlan,
  conversationLog = [],
  severityHistory = [],
  currentFirstAidStepIndex = 0,
  ambulanceEtaSeconds = 1080,
  doctorCallState = 'idle',
  doctorName: propDoctorName,
  doctorMessages = [],
  handoverNote = null,
  isGeneratingHandover = false,
  onStartDoctorCall,
  onEndDoctorCall,
  onDoctorSendMessage,
  onCallerSendMessage,
  onNavigateToDispatch,
  onNavigateToCaller,
  demoDoctorEnabled = true,
  onToggleDemoDoctor,
  humanDoctorTookOver = false,
  onHumanDoctorTyping,
}) => {
  const doctorName =
    propDoctorName || getCountryDoctorLabel(assessment?.country);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [doctorInput, setDoctorInput] = useState('');
  const [callerInput, setCallerInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDoctorMicListening, setIsDoctorMicListening] = useState(false);
  const [isCallerMicListening, setIsCallerMicListening] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<
    Array<{ english: string; translated: string; category: string }>
  >(() => buildFallbackDoctorSuggestedPrompts(assessment, currentFirstAidStepIndex));

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const callerLanguage = assessment?.detectedLanguage || 'Tamil';
  const callerQuickReplies = getLocalizedCallerQuickRepliesForDoctor(callerLanguage);

  const isInCall = doctorCallState === 'connected';
  const isRinging = doctorCallState === 'ringing';

  // Call timer interval when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (doctorCallState === 'idle') {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isInCall, doctorCallState]);

  // Auto-scroll chat feed only when messages exist, without scrolling outer page
  useEffect(() => {
    if (doctorMessages.length > 0 || isTranslating) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [doctorMessages.length, isTranslating]);

  // Fetch Gemini-suggested next instructions for THIS call's data
  useEffect(() => {
    const initialFallback = buildFallbackDoctorSuggestedPrompts(
      assessment,
      currentFirstAidStepIndex
    );
    setSuggestedPrompts(initialFallback);

    if (!assessment) return;

    fetch('/api/doctor-suggest-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientSummary: assessment.patientSummary,
        emergencyType: assessment.likelyEmergencyType,
        callerLanguage: assessment.detectedLanguage,
        conversationLog,
        completedStepsCount: currentFirstAidStepIndex,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.prompts) && data.prompts.length >= 2) {
          setSuggestedPrompts(data.prompts);
        }
      })
      .catch((e) => console.error('Error fetching suggested prompts:', e));
  }, [assessment, currentFirstAidStepIndex, conversationLog.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Manual "🔊 play" playback for Doctor Console inside Operations view (never cancels Caller Phone audio)
  const speakText = (
    text: string,
    langHint?: string,
    role: 'operator' | 'doctor' | 'caller' = 'doctor'
  ) => {
    playOperationsManualAudio(text, langHint || 'English', role).catch(() => {});
  };

  // Doctor sends English instruction (by text, 1-click button, or 🎤 voice)
  const handleDoctorSubmit = async (textOverride?: string, preTranslated?: string) => {
    const text = (textOverride ?? doctorInput).trim();
    if (!text) return;

    // Human took over
    onHumanDoctorTyping?.();

    setDoctorInput('');
    setIsTranslating(true);
    try {
      if (onDoctorSendMessage) {
        await onDoctorSendMessage(text, preTranslated);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // Caller replies to Doctor (by tap, 🎤 voice, or text)
  const handleCallerSubmit = async (textCallerLang?: string, englishOverride?: string) => {
    const text = (textCallerLang ?? callerInput).trim();
    if (!text) return;

    setCallerInput('');
    setIsTranslating(true);
    try {
      if (onCallerSendMessage) {
        await onCallerSendMessage(text, englishOverride);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // Doctor 🎤 Speak in English (uses Web Speech Recognition or simulated clinical voice instruction)
  const handleDoctorVoiceButton = () => {
    onHumanDoctorTyping?.();
    if (isDoctorMicListening) {
      setIsDoctorMicListening(false);
      return;
    }

    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'en-US';
        rec.interimResults = false;
        setIsDoctorMicListening(true);
        rec.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          setIsDoctorMicListening(false);
          if (transcript) {
            handleDoctorSubmit(transcript);
          }
        };
        rec.onerror = () => {
          setIsDoctorMicListening(false);
          // Fallback in headless/no-mic environment so 🎤 always works reliably
          const promptToUse =
            suggestedPrompts[0]?.english ||
            'Keep the patient lying flat, tilt the chin up gently, and watch for chest movement.';
          handleDoctorSubmit(promptToUse, suggestedPrompts[0]?.translated);
        };
        rec.start();
        return;
      } catch {
        setIsDoctorMicListening(false);
      }
    }

    // Immediate voice fallback if browser SpeechRecognition is unavailable
    setIsDoctorMicListening(true);
    setTimeout(() => {
      setIsDoctorMicListening(false);
      const promptToUse =
        suggestedPrompts[0]?.english ||
        'Keep the patient lying flat, tilt the chin up gently, and watch for chest movement.';
      handleDoctorSubmit(promptToUse, suggestedPrompts[0]?.translated);
    }, 900);
  };

  // Caller 🎤 Speak in Caller's Language
  const handleCallerVoiceButton = () => {
    if (isCallerMicListening) {
      setIsCallerMicListening(false);
      return;
    }

    setIsCallerMicListening(true);
    setTimeout(() => {
      setIsCallerMicListening(false);
      const reply = callerQuickReplies[0];
      if (reply) {
        handleCallerSubmit(reply.textCallerLang, reply.textEnglish);
      }
    }, 900);
  };

  const latestDoctorMessage =
    [...doctorMessages].reverse().find((m) => m.sender === 'doctor') || null;

  // Completed vs pending first-aid steps for THIS call
  const firstAidSteps = assessment?.firstAidSteps || [];
  const activeHandover =
    handoverNote || dispatchPlan?.hospitalPreAlert?.doctorHandoverNote || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header with "(Simulated)" Label & Call Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex flex-wrap items-center gap-3">
            <span>On-Call Emergency Doctor Console</span>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-500/15 text-[#F2A93B] border border-[#F2A93B]/40 rounded-full">
              (Simulated) · No Real Phone Call Made
            </span>
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Live-translated tele-medical bridge connecting <strong>{doctorName}</strong> with the caller's phone.
            Doctor speaks or types in English; caller receives spoken &amp; written instructions in{' '}
            <strong className="text-[#F2A93B]">{callerLanguage}</strong>.
          </p>
        </div>

        {/* Call Status & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {onToggleDemoDoctor && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0e1b2d] border border-slate-700">
              <span className="text-xs font-mono font-bold text-slate-200">
                Demo Doctor:
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={demoDoctorEnabled}
                data-testid="doctor-console-demo-switch"
                onClick={() => onToggleDemoDoctor(!demoDoctorEnabled)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-extrabold transition cursor-pointer ${
                  demoDoctorEnabled
                    ? 'bg-emerald-600 text-white border border-emerald-400/60'
                    : 'bg-slate-800 text-slate-400 border border-slate-600'
                }`}
              >
                {demoDoctorEnabled ? 'ON' : 'OFF'}
              </button>
              {demoDoctorEnabled && humanDoctorTookOver && (
                <span className="text-[10px] font-mono font-bold text-amber-300">
                  (Human took over)
                </span>
              )}
            </div>
          )}

          {onNavigateToCaller && (
            <button
              type="button"
              onClick={onNavigateToCaller}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
            >
              ← Back to Caller Screen
            </button>
          )}

          {doctorCallState === 'idle' || doctorCallState === 'ended' ? (
            <button
              type="button"
              data-testid="doctor-start-simulated-call-btn"
              onClick={() => onStartDoctorCall && onStartDoctorCall()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>👨‍⚕️ Connect to Doctor (Simulated)</span>
            </button>
          ) : isRinging ? (
            <div
              data-testid="doctor-console-ringing-badge"
              className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-900/90 border-2 border-[#F2A93B] rounded-xl text-white text-xs sm:text-sm font-extrabold animate-pulse shadow-lg"
            >
              <PhoneCall className="w-4 h-4 text-[#F2A93B] animate-bounce" />
              <span>Connecting to on-call doctor… (Simulated call)</span>
            </div>
          ) : (
            <div
              data-testid="doctor-console-connected-bar"
              className="flex items-center gap-2 bg-[#17273d] p-1.5 rounded-xl border-2 border-emerald-500/60 shadow-lg"
            >
              <div className="flex items-center gap-2 px-3 py-1 font-mono text-xs font-extrabold text-emerald-300 bg-emerald-500/15 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {doctorName} joined · {formatTime(callDuration)} (Simulated)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-lg text-xs transition-colors ${
                  isMuted
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="button"
                data-testid="end-simulated-doctor-call-btn"
                onClick={() => onEndDoctorCall && onEndDoctorCall()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-lg transition-colors shadow"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Call (Simulated)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. AI Patient Brief Banner (Opened with THIS Call's Data) */}
      <div
        data-testid="doctor-ai-patient-brief"
        className="bg-[#122238] rounded-2xl border border-slate-700/80 p-5 shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#F2A93B]" />
            <h2 className="font-bold text-white text-sm">
              AI Patient Brief (Live Call Data · Simulated Consultation)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="doctor-brief-severity"
              className={`px-2.5 py-0.5 rounded text-xs font-extrabold ${
                assessment?.severity === 'Critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              Severity: {assessment?.severity || 'Critical'} (
              {assessment?.confidencePercentage || 95}%)
            </span>
            <span className="text-slate-400 text-xs font-mono">
              · Language: {callerLanguage}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Box 1: Summary & Emergency Type */}
          <div className="p-3 bg-[#17273d] rounded-xl border border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Patient Summary &amp; Condition:
            </span>
            <p className="font-bold text-white leading-tight">
              {assessment?.likelyEmergencyType || 'Acute Emergency Incident'}
            </p>
            <p className="text-[11px] text-slate-300">
              {assessment?.patientSummary ||
                assessment?.shortEnglishTranslation ||
                'Emergency caller report active.'}
            </p>
          </div>

          {/* Box 2: Resolved Location & Country */}
          <div className="p-3 bg-[#17273d] rounded-xl border border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Location &amp; Landmarks:
            </span>
            <div className="flex items-center gap-1 text-white font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#F2A93B] shrink-0" />
              <span className="truncate">
                {assessment?.countryFlag || assessment?.estimatedLocation?.countryFlag || '🌐'}{' '}
                {assessment?.estimatedLocation?.landmarkAnchor ||
                  assessment?.landmarksMentioned?.[0] ||
                  'Incident Landmark'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2">
              {assessment?.estimatedLocation?.description || 'Location resolved from caller transcript'}
            </p>
          </div>

          {/* Box 3: Live Ambulance ETA */}
          <div className="p-3 bg-[#17273d] rounded-xl border border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Ambulance &amp; Responder ETA:
            </span>
            <div className="flex items-center justify-between text-slate-200">
              <span className="truncate mr-1">
                {dispatchPlan?.selectedAmbulance?.name ||
                  assessment?.nearbyAmbulances?.[0]?.name ||
                  'Emergency Ambulance'}
                :
              </span>
              <strong className="text-[#F2A93B] font-mono shrink-0">
                {formatCountdownMMSS(ambulanceEtaSeconds)} (
                {dispatchPlan?.selectedAmbulance?.etaMinutes ||
                  assessment?.nearbyAmbulances?.[0]?.etaMinutes ||
                  18}
                m)
              </strong>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Volunteer First Responder:</span>
              <strong className="text-emerald-400 font-mono">
                {dispatchPlan?.selectedVolunteer?.etaMinutes || 6}m ETA
              </strong>
            </div>
          </div>

          {/* Box 4: Receiving Hospital */}
          <div className="p-3 bg-[#17273d] rounded-xl border border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Destination Hospital:
            </span>
            <div className="flex items-center gap-1 font-semibold text-white">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {dispatchPlan?.selectedHospital?.name ||
                  assessment?.nearbyHospitals?.[0]?.name ||
                  'Regional Emergency Hospital'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-300 truncate">
              Prep:{' '}
              {dispatchPlan?.hospitalPreAlert?.requiredPrepTeams?.[0] ||
                dispatchPlan?.selectedHospital?.capabilityMatch ||
                'Emergency Resuscitation Team'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Hospital Pre-Alert & Doctor Handover Note Card (Appears when call ends) */}
      {(activeHandover || isGeneratingHandover) && (
        <div
          data-testid="doctor-handover-prealert-card"
          className="bg-gradient-to-r from-[#13293d] via-[#16324a] to-[#13293d] rounded-2xl border-2 border-emerald-400 p-5 shadow-2xl space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">
                    Hospital Pre-Alert Card · Gemini Doctor Handover Note
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Transmitted to Ambulance &amp; ER (Simulated)
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Destination:{' '}
                  <strong className="text-white">
                    {dispatchPlan?.selectedHospital?.name ||
                      assessment?.nearbyHospitals?.[0]?.name ||
                      'Receiving Hospital'}
                  </strong>{' '}
                  · Ambulance:{' '}
                  <strong className="text-[#F2A93B]">
                    {dispatchPlan?.selectedAmbulance?.name || 'Inbound ALS Unit'}
                  </strong>
                </p>
              </div>
            </div>

            {onNavigateToDispatch && (
              <button
                type="button"
                onClick={onNavigateToDispatch}
                className="px-3.5 py-2 rounded-xl bg-[#F2A93B] hover:bg-[#e09626] text-[#0E1B2E] font-extrabold text-xs flex items-center gap-1.5 shadow transition"
              >
                <span>View on Dispatch &amp; Pre-Alert Screen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isGeneratingHandover && !activeHandover ? (
            <div className="p-4 text-xs text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F2A93B] animate-spin" />
              <span>
                Gemini is writing the clinical handover note for the ambulance crew and hospital…
              </span>
            </div>
          ) : activeHandover ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0d1c2c] border border-slate-700 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#F2A93B] font-bold block">
                  1. What Happened (Incident &amp; Triage):
                </span>
                <p className="text-slate-100 leading-relaxed font-medium">
                  {activeHandover.whatHappened}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1c2c] border border-slate-700 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                  2. First Aid Given (With Times):
                </span>
                <ul className="space-y-1 text-slate-200">
                  {activeHandover.firstAidGivenWithTimes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <span className="font-mono text-[10px] text-[#F2A93B] shrink-0">
                        [{item.time}]
                      </span>
                      <span>{item.action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1c2c] border border-slate-700 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-blue-300 font-bold block">
                  3. Current Status &amp; Crew Handover:
                </span>
                <p className="text-slate-100 leading-relaxed font-medium">
                  {activeHandover.currentStatus}
                </p>
                <div className="pt-1.5 border-t border-slate-800 text-[10px] text-emerald-300 font-mono">
                  Signed: {activeHandover.doctorName} at {activeHandover.generatedAt}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 4. Main Grid: Caller's Phone + Full Conversation Log (Left) & Live Translated Conversation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (lg:col-span-5): Caller's Phone Live Mirror + Full Conversation Log */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card A: Caller's Phone Live View (Simulated Call) */}
          <div
            data-testid="doctor-console-caller-phone-card"
            className="bg-[#122238] rounded-2xl border-2 border-slate-700/80 p-5 shadow-xl space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
              <span className="text-xs font-extrabold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Caller's Phone · Live Bridge (Simulated)</span>
              </span>
              <span className="text-[10px] font-mono text-[#F2A93B] bg-[#F2A93B]/10 px-2 py-0.5 rounded border border-[#F2A93B]/30">
                Language: {callerLanguage}
              </span>
            </div>

            {/* Ringing / Joined Status on Caller's Phone */}
            {isRinging ? (
              <div
                data-testid="caller-phone-ringing-view"
                className="p-5 rounded-xl bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 border-2 border-[#F2A93B] text-center space-y-2 animate-pulse"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-[#F2A93B] text-[#0E1B2E] flex items-center justify-center relative">
                  <span className="absolute inset-0 rounded-full bg-[#F2A93B] animate-ping opacity-75" />
                  <PhoneCall className="w-6 h-6 animate-bounce relative z-10" />
                </div>
                <div className="text-sm font-extrabold text-white">
                  Connecting to on-call doctor… (Simulated call)
                </div>
                <p className="text-xs text-amber-200">
                  Ringing for 3 seconds before {doctorName} joins…
                </p>
              </div>
            ) : isInCall ? (
              <div
                data-testid="caller-phone-joined-view"
                className="p-3.5 rounded-xl bg-[#0a1f1c] border-2 border-emerald-400 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      👨‍⚕️ {doctorName} joined
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      (Simulated call)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-300">
                    {formatTime(callDuration)}
                  </span>
                </div>

                {/* Latest Doctor Message Displayed on Caller's Phone in Caller's Language */}
                {latestDoctorMessage && (
                  <div
                    data-testid="caller-phone-doctor-message"
                    className="p-3 rounded-xl bg-[#071513] border border-emerald-500/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-emerald-300 font-mono">
                      <span>On Caller's Phone Screen ({callerLanguage}):</span>
                      <button
                        type="button"
                        onClick={() =>
                          speakText(latestDoctorMessage.translatedText, callerLanguage)
                        }
                        className="flex items-center gap-1 text-[#F2A93B] hover:text-white font-sans font-bold"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Read Aloud</span>
                      </button>
                    </div>
                    {(latestDoctorMessage.isAiDemoDoctor || latestDoctorMessage.demoLabel) && (
                      <div
                        data-testid="caller-mirror-demo-doctor-label"
                        className="px-2 py-1 rounded bg-amber-500/15 border border-[#F2A93B]/50 text-[#F2A93B] text-[10px] font-mono font-bold"
                      >
                        {latestDoctorMessage.demoLabel || DEMO_DOCTOR_LABEL}
                      </div>
                    )}
                    <p className="text-sm font-extrabold text-white leading-snug">
                      {latestDoctorMessage.translatedText}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Original (EN): "{latestDoctorMessage.originalText}"
                    </p>
                  </div>
                )}

                {/* Caller Reply Controls (Tap, 🎤 Voice, or Type in Caller Language) */}
                <div className="space-y-2 pt-1 border-t border-emerald-800/60">
                  <span className="text-[11px] font-bold text-emerald-200 block">
                    Caller Answers on Phone (Tap, 🎤 Voice, or Type):
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {callerQuickReplies.map((qr) => (
                      <button
                        key={qr.id}
                        type="button"
                        data-testid={`caller-quick-reply-${qr.id}`}
                        disabled={isTranslating}
                        onClick={() => handleCallerSubmit(qr.textCallerLang, qr.textEnglish)}
                        className="text-left p-2.5 rounded-lg bg-[#11352f] hover:bg-[#184941] border border-emerald-500/40 hover:border-[#F2A93B] transition text-xs"
                      >
                        <div className="font-extrabold text-amber-200 leading-tight">
                          {qr.textCallerLang}
                        </div>
                        <div className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                          {qr.textEnglish}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Caller Voice & Text Input Row */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      data-testid="caller-voice-reply-btn"
                      onClick={handleCallerVoiceButton}
                      disabled={isTranslating}
                      className={`px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1 shrink-0 transition ${
                        isCallerMicListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                      }`}
                      title="Caller answers by voice"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isCallerMicListening ? 'Listening…' : '🎤 Caller Voice'}</span>
                    </button>
                    <input
                      type="text"
                      aria-label="Caller reply input"
                      value={callerInput}
                      onChange={(e) => setCallerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCallerSubmit()}
                      placeholder={`Caller types in ${callerLanguage}...`}
                      className="flex-1 bg-[#061210] text-xs text-white placeholder-slate-400 px-2.5 py-2 rounded-lg border border-emerald-700/60 outline-none focus:border-[#F2A93B]"
                    />
                    <button
                      type="button"
                      data-testid="caller-send-reply-btn"
                      onClick={() => handleCallerSubmit()}
                      disabled={isTranslating || !callerInput.trim()}
                      className="px-3 py-2 bg-[#F2A93B] hover:bg-[#e09626] disabled:opacity-40 text-[#0E1B2E] font-extrabold text-xs rounded-lg transition"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0b1420] border border-slate-800 text-center space-y-2">
                <div className="text-xs font-bold text-slate-300">
                  {doctorCallState === 'ended'
                    ? 'Simulated Call Ended — Handover Note Sent to Hospital Pre-Alert'
                    : 'Simulated Doctor Call Standby'}
                </div>
                <button
                  type="button"
                  onClick={() => onStartDoctorCall && onStartDoctorCall()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition"
                >
                  👨‍⚕️ Connect to Doctor (Simulated)
                </button>
              </div>
            )}
          </div>

          {/* Card B: Full Conversation Log (Original Message, Triage Answers, Completed First-Aid Steps) */}
          <div
            data-testid="doctor-conversation-log"
            className="bg-[#122238] rounded-2xl border border-slate-700/80 p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F2A93B]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Full Conversation &amp; First-Aid Log
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                {conversationLog.length} Entries
              </span>
            </div>

            {/* First-Aid Steps Checklist Summary */}
            {firstAidSteps.length > 0 && (
              <div className="p-3 rounded-xl bg-[#0e1b2d] border border-slate-700/80 space-y-1.5">
                <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                  Guided First-Aid Steps Done ({currentFirstAidStepIndex} of {firstAidSteps.length}):
                </div>
                <div className="space-y-1">
                  {firstAidSteps.map((step, idx) => {
                    const isDone = idx < currentFirstAidStepIndex || Boolean(step.completed);
                    return (
                      <div
                        key={step.stepNumber || idx}
                        className={`text-[11px] flex items-start gap-1.5 ${
                          isDone ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <span className="shrink-0">{isDone ? '✅' : '⏳'}</span>
                        <span>
                          Step {step.stepNumber}: {step.stepEnglish}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {severityHistory.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs space-y-1">
                {severityHistory.map((sh, idx) => (
                  <div key={idx} className="text-rose-200">
                    <strong className="text-white">
                      Severity updated: {sh.previousSeverity} → {sh.newSeverity}
                    </strong>{' '}
                    ({sh.previousConfidence}% → {sh.newConfidence}%) — {sh.reason}
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1">
              {conversationLog.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No triage questions or first-aid steps logged yet.
                </p>
              ) : (
                conversationLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      entry.role === 'caller'
                        ? 'bg-[#172b44] border-[#F2A93B]/50 text-white'
                        : entry.role === 'doctor'
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-100'
                        : entry.role === 'system_alert'
                        ? 'bg-rose-950/50 border-rose-500/60 text-rose-100'
                        : 'bg-[#0e1b2d] border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="font-bold uppercase text-[#F2A93B]">
                        {entry.role === 'caller'
                          ? 'Caller Answer / Report'
                          : entry.role === 'doctor'
                          ? `${doctorName} (Simulated)`
                          : entry.role === 'system_alert'
                          ? 'System / Escalation'
                          : 'AI Triage & First Aid'}
                      </span>
                      <span>{entry.timestamp}</span>
                    </div>
                    <div className="font-semibold text-white leading-snug">
                      {entry.textEnglish}
                    </div>
                    {entry.textCallerLang && entry.textCallerLang !== entry.textEnglish && (
                      <div className="text-[11px] text-amber-200/90">
                        <strong>Original ({callerLanguage}):</strong> {entry.textCallerLang}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-7): Live Translated Conversation & Gemini 1-Click Doctor Instructions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#122238] rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden flex flex-col min-h-[560px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-700/60 bg-gradient-to-r from-[#172a44] to-[#122238] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#F2A93B]" />
                <span className="font-bold text-white text-sm">
                  Live Translated Conversation ({doctorName} ↔ Caller · Simulated)
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                English ↔ {callerLanguage}
              </span>
            </div>

            {/* Chat Message Scrollable Container */}
            <div
              data-testid="doctor-live-translation-chat"
              className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e1927] max-h-[380px]"
            >
              {doctorMessages.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 space-y-2">
                  <p>
                    Click any <strong>Gemini-Suggested Next Instruction</strong> below, or type / speak (🎤) in English to send live-translated guidance to the caller's phone.
                  </p>
                </div>
              ) : (
                doctorMessages.map((rawMsg) => {
                  const m = normalizeDoctorBridgeMessage(rawMsg, callerLanguage);
                  return (
                  <div
                    key={m.id}
                    data-testid={`chat-msg-${m.sender}`}
                    className={`flex flex-col ${
                      m.sender === 'doctor' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                      <span className="font-bold text-white">
                        {m.sender === 'doctor'
                          ? `👨‍⚕️ ${doctorName} (English → ${m.targetLang})`
                          : `📱 Caller (${m.originalLang} → English)`}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-[10px]">{m.timestamp}</span>
                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            m.sender === 'doctor' ? m.translatedText : m.originalText,
                            m.sender === 'doctor' ? m.targetLang : m.originalLang,
                            m.sender === 'doctor' ? 'doctor' : 'caller'
                          )
                        }
                        className="text-[#F2A93B] hover:text-white flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Play audio in Operations view"
                      >
                        <span>🔊 Play</span>
                      </button>
                    </div>

                    {m.sender === 'doctor' ? (
                      /* Doctor message: shows Doctor's English + Caller Language translation shown & read aloud on caller's phone */
                      <div className="p-3.5 rounded-2xl rounded-tr-none max-w-[88%] text-xs shadow-md space-y-1.5 bg-[#1e3450] text-slate-100 border border-slate-600/70">
                        {(m.isAiDemoDoctor || m.demoLabel) && (
                          <div
                            data-testid="doctor-chat-demo-label"
                            className="px-2 py-1 rounded bg-amber-500/15 border border-[#F2A93B]/50 text-[#F2A93B] text-[10px] font-mono font-bold"
                          >
                            {m.demoLabel || DEMO_DOCTOR_LABEL}
                          </div>
                        )}
                        <div className="font-bold text-white text-[13px] leading-snug whitespace-pre-line">
                          {m.originalText}
                        </div>
                        <div className="pt-1.5 border-t border-slate-600/50 text-xs text-amber-200 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#F2A93B] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-emerald-300 uppercase font-mono block">
                              Shown &amp; Read Aloud on Caller's Phone ({m.targetLang}):
                            </span>
                            <span className="font-bold text-white whitespace-pre-line">
                              "{m.translatedText}"
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Caller message: Requirement 4: "the doctor sees the English translation with the original underneath." */
                      <div className="p-3.5 rounded-2xl rounded-tl-none max-w-[88%] text-xs shadow-md space-y-1.5 bg-[#152d3b] text-slate-100 border-2 border-emerald-500/50">
                        <div className="text-[10px] font-mono uppercase text-emerald-300 font-bold">
                          English Translation (For Doctor):
                        </div>
                        <div
                          data-testid="caller-msg-english-top"
                          className="font-extrabold text-white text-sm leading-snug"
                        >
                          {m.translatedText}
                        </div>
                        <div
                          data-testid="caller-msg-original-underneath"
                          className="pt-1.5 border-t border-slate-700 text-xs text-amber-200/90"
                        >
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Original Caller Text ({m.originalLang}):
                          </span>
                          <span>"{m.originalText}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })
              )}

              {isTranslating && (
                <div className="flex items-center gap-2 text-xs text-amber-200 italic">
                  <Sparkles className="w-3.5 h-3.5 text-[#F2A93B] animate-spin" />
                  <span>Gemini live-translating message…</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Gemini-Suggested Next Instructions for the Doctor (One-Click Buttons) */}
            <div
              data-testid="doctor-suggested-instructions"
              className="p-3.5 bg-[#132236] border-t border-slate-700/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#F2A93B] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Gemini-Suggested Next Instructions for Doctor (One-Click Send &amp; Translate):
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-Click Buttons</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`doctor-suggested-btn-${idx}`}
                    disabled={isTranslating}
                    onClick={() => handleDoctorSubmit(p.english, p.translated)}
                    className="text-left p-2.5 rounded-xl bg-[#1a2d45] hover:bg-[#243d5c] text-slate-100 border border-slate-600/80 hover:border-[#F2A93B] text-xs transition-all shadow group"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#F2A93B] mb-0.5">
                      <span className="font-bold uppercase">[{p.category}]</span>
                      <span>Send → {callerLanguage}</span>
                    </div>
                    <div className="font-bold text-white group-hover:text-[#F2A93B] leading-snug">
                      {p.english}
                    </div>
                    {p.translated && (
                      <div className="text-[10px] text-slate-300 truncate mt-0.5">
                        {p.translated}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Input Bar (Type or Speak 🎤 in English) */}
            <div className="p-3.5 bg-[#111e2f] border-t border-slate-700/80 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <button
                type="button"
                data-testid="doctor-voice-mic-btn"
                onClick={handleDoctorVoiceButton}
                disabled={isTranslating}
                className={`px-3.5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border transition shadow ${
                  isDoctorMicListening
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500/50'
                }`}
                title="Doctor speaks in English"
              >
                <Mic className="w-4 h-4" />
                <span>{isDoctorMicListening ? 'Listening…' : '🎤 Speak (EN)'}</span>
              </button>

              <input
                type="text"
                data-testid="doctor-english-input"
                value={doctorInput}
                onChange={(e) => {
                  if (e.target.value.trim().length > 0) {
                    onHumanDoctorTyping?.();
                  }
                  setDoctorInput(e.target.value);
                }}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !isTranslating && handleDoctorSubmit()
                }
                placeholder="Doctor types in English (translates to caller's phone & reads aloud)..."
                className="flex-1 bg-[#0b1420] text-xs text-white placeholder-slate-400 px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-[#F2A93B]"
              />

              <button
                type="button"
                data-testid="doctor-send-translate-btn"
                onClick={() => handleDoctorSubmit()}
                disabled={isTranslating || !doctorInput.trim()}
                className="px-4 py-2.5 bg-[#F2A93B] hover:bg-[#d68f23] disabled:opacity-50 text-[#0E1B2E] font-extrabold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send &amp; Translate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
