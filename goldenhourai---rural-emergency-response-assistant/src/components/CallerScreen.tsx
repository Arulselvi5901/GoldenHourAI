import React, { useState, useRef, useEffect, useCallback } from 'react';
import { KeypadPhone, IvrPhoneStage } from './KeypadPhone';
import { COMPREHENSIVE_EMERGENCY_DATASET } from '../data/emergencyDataset';
import {
  TriageAssessment,
  DispatchPlan,
  EmergencyScenario,
  ConversationLogEntry,
  SeverityChangeRecord,
  DoctorCallState,
  DoctorBridgeMessage,
  EstimatedLocation,
} from '../types/emergency';
import {
  detectWorseningOrHelpIntent,
  ensureGuidedFirstAidSteps,
  ensureFatalDontsList,
  computeSeverityTransition,
  mergeDispatchPlanWithTriageUpdate,
  shouldAutoConnectDoctorAfterTriage,
  getLocalizedCallerQuickRepliesForDoctor,
  formatCountdownMMSS,
  mapLanguageToBcp47,
  getShortReassuranceInCallerLang,
  buildIvrQuestionPrompt,
  buildIvrFirstAidPrompt,
  buildIvrFinalDispatchStatus,
  formatIvrKeypressLog,
  parseSpokenMenuNumber,
  resolveActiveEmergencyCountry,
  buildIdlePhoneScreenDisplay,
  formatConnectedEmergencyLabel,
  getDoctorLabelForCountry,
  isIndiaCountry,
  normalizeDoctorBridgeMessage,
  DEMO_DOCTOR_LABEL,
  getDoctorIncomingSpokenPrompt,
  getOfferCallDoctorHint,
  shouldTriggerDoctorCallOnTriageUpdate,
  shouldTriggerDoctorCallAfterFirstAidStep,
} from '../utils/triageFlowLogic';
import {
  getAffordabilityQuestionPrompt,
  computeDispatchScoring,
} from '../utils/centralRegistryLogic';
import {
  SpeakApiResponse,
  getOrCreateCallerAudioContext,
  unlockCallerAudioContext,
  fetchGeminiSpeakAudio,
  decodeBase64ToAudioBuffer,
  speakWithBrowserFallback,
  startDoctorRingtone,
  stopDoctorRingtone,
} from '../utils/audioSpeechEngine';

export interface PipelineProgressItem {
  id: string;
  label: string;
  detail: string;
  completed: boolean;
  active: boolean;
}

export const INITIAL_PIPELINE_STEPS: PipelineProgressItem[] = [
  { id: 'transcribe', label: 'Transcribing', detail: 'Listening to spoken caller voice audio', completed: false, active: false },
  { id: 'language', label: 'Language detected', detail: 'Detecting regional dialect & language', completed: false, active: false },
  { id: 'location', label: 'Location found', detail: 'Extracting rural landmark & resolving GPS', completed: false, active: false },
  { id: 'triage', label: 'Triage done', detail: 'Assessing severity risk & Golden Hour window', completed: false, active: false },
  { id: 'dispatch', label: 'Ambulance & hospital selected', detail: 'Routing ALS vehicle & capability-matched hospital', completed: false, active: false },
  { id: 'volunteer', label: 'Volunteer alerted', detail: 'Dispatched certified village motorbike responder', completed: false, active: false },
  { id: 'hospital', label: 'Hospital pre-alerted', detail: 'Cath Lab & emergency trauma bay alerted in advance', completed: false, active: false },
  { id: 'doctor', label: 'Doctor briefed', detail: 'Case transmitted to Medical Command Console', completed: false, active: false },
];

interface CallerScreenProps {
  onTriageComplete: (
    assessment: TriageAssessment,
    initialMsg: string,
    channel?: 'voice_call' | 'sms' | 'audio_upload'
  ) => void;
  assessment: TriageAssessment | null;
  dispatchPlan?: DispatchPlan | null;
  onUpdateAssessment?: (assessment: TriageAssessment) => void;
  onUpdateDispatchPlan?: (plan: DispatchPlan) => void;
  conversationLog?: ConversationLogEntry[];
  onAppendConversationLog?: (entries: ConversationLogEntry[]) => void;
  severityHistory?: SeverityChangeRecord[];
  onAppendSeverityChange?: (record: SeverityChangeRecord) => void;
  currentQuestionIndex?: number;
  setCurrentQuestionIndex?: React.Dispatch<React.SetStateAction<number>>;
  currentFirstAidStepIndex?: number;
  setCurrentFirstAidStepIndex?: React.Dispatch<React.SetStateAction<number>>;
  showConnectDoctorNow?: boolean;
  setShowConnectDoctorNow?: React.Dispatch<React.SetStateAction<boolean>>;
  ambulanceEtaSeconds?: number;
  doctorCallState?: DoctorCallState;
  doctorName?: string;
  doctorMessages?: DoctorBridgeMessage[];
  selectedCountryCode?: string;
  isLoadingExternal?: boolean;
  onStartDoctorCall?: (options?: {
    openConsoleAfterRing?: boolean;
    autoFromCritical?: boolean;
    autoFromFirstAidComplete?: boolean;
  }) => void;
  onAcceptDoctorCall?: () => void;
  onDeclineDoctorCall?: () => void;
  onEndDoctorCall?: () => void;
  onCallerSendToDoctor?: (textCallerLang: string, textEnglishOverride?: string) => void;
  onLoadingStateChange?: (isLoadingTriage: boolean, isUpdatingTriage: boolean) => void;
  onNavigateToDispatch: () => void;
  onNavigateToDoctor?: () => void;
  onTabChange?: (tab: 'caller' | 'dispatch' | 'doctor') => void;
}

export const CallerScreen: React.FC<CallerScreenProps> = ({
  onTriageComplete,
  assessment,
  dispatchPlan,
  onUpdateAssessment,
  onUpdateDispatchPlan,
  conversationLog = [],
  onAppendConversationLog,
  severityHistory = [],
  onAppendSeverityChange,
  currentQuestionIndex = 0,
  setCurrentQuestionIndex,
  currentFirstAidStepIndex = 0,
  setCurrentFirstAidStepIndex,
  setShowConnectDoctorNow,
  ambulanceEtaSeconds = 840,
  doctorCallState = 'idle',
  doctorName,
  doctorMessages = [],
  selectedCountryCode,
  isLoadingExternal = false,
  onStartDoctorCall,
  onAcceptDoctorCall,
  onDeclineDoctorCall,
  onEndDoctorCall,
  onCallerSendToDoctor,
  onLoadingStateChange,
}) => {
  const [ivrStage, setIvrStage] = useState<IvrPhoneStage>('idle');
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(0);
  const [responderEtaSeconds, setResponderEtaSeconds] = useState<number>(300);

  const [loading, setLoading] = useState<boolean>(false);
  const [updatingTriage, setUpdatingTriage] = useState<boolean>(false);
  const [isSpeakingAloud, setIsSpeakingAloud] = useState<boolean>(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState<boolean>(false);
  const [voiceUnavailableNote, setVoiceUnavailableNote] = useState<string | null>(null);
  const [declinedDoctorCall, setDeclinedDoctorCall] = useState<boolean>(false);

  // Automatic microphone recording state
  const [isAudioRecording, setIsAudioRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const ivrStageRef = useRef<IvrPhoneStage>(ivrStage);
  useEffect(() => {
    ivrStageRef.current = ivrStage;
  }, [ivrStage]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceStartTimeRef = useRef<number | null>(null);
  const hasUserSpokenRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingPurposeRef = useRef<'initial' | 'ivr_answer' | 'doctor_reply'>('initial');

  // Single FIFO Speech Queue owned ONLY by the Caller Phone
  const speechQueueRef = useRef<
    Array<{
      id: string;
      text: string;
      language: string;
      role: 'operator' | 'doctor';
      prefetchPromise: Promise<SpeakApiResponse | null>;
      onStart?: () => void;
      onDone?: () => void;
    }>
  >([]);
  const isQueueRunningRef = useRef<boolean>(false);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const lastBlockedSpeechRef = useRef<{
    text: string;
    language: string;
    role: 'operator' | 'doctor';
  } | null>(null);

  const spokenDocMsgIdsRef = useRef<Set<string>>(new Set());
  const lastAnnouncedAssessmentIdRef = useRef<string | null>(null);
  const reassuranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDoctorCallStateRef = useRef<DoctorCallState>('idle');

  // Sync loading state upward for AI Pipeline
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(loading, updatingTriage);
    }
  }, [loading, updatingTriage, onLoadingStateChange]);

  // Update responder ETA when dispatchPlan or assessment arrives
  useEffect(() => {
    const volMins =
      dispatchPlan?.selectedVolunteer?.etaMinutes ||
      assessment?.nearbyVolunteers?.[0]?.etaMinutes ||
      5;
    setResponderEtaSeconds(volMins * 60);
  }, [dispatchPlan?.selectedVolunteer?.etaMinutes, assessment?.nearbyVolunteers]);

  // Live countdown for responder ETA when assessment is active
  useEffect(() => {
    if (!assessment) return;
    const timer = setInterval(() => {
      setResponderEtaSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [assessment]);

  // Live call duration timer whenever call is active
  useEffect(() => {
    if (ivrStage === 'idle' || ivrStage === 'ended') {
      return;
    }
    const timer = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [ivrStage]);

  // Sequential FIFO queue runner for Caller Phone voice playback
  const processCallerSpeechQueue = useCallback(async () => {
    if (isQueueRunningRef.current) return;
    isQueueRunningRef.current = true;

    while (speechQueueRef.current.length > 0) {
      const item = speechQueueRef.current.shift()!;
      if (item.onStart) {
        try {
          item.onStart();
        } catch {
          // Ignore callback error
        }
      }
      setIsSpeakingAloud(true);

      const speakRes = await item.prefetchPromise;

      if (speakRes && speakRes.audioBase64) {
        // Primary Voice: Gemini TTS played via the Caller Phone's single Web Audio API AudioContext
        setVoiceUnavailableNote(null);
        const ctx = getOrCreateCallerAudioContext();

        if (ctx && ctx.state === 'suspended') {
          try {
            await Promise.race([
              ctx.resume(),
              new Promise((resolve) => setTimeout(resolve, 350)),
            ]);
          } catch {
            // Ignore resume error
          }
        }

        if (!ctx || ctx.state !== 'running') {
          // Browser blocked audio (no user tap yet) -> show "🔇 Tap to enable sound" button
          setIsAudioBlocked(true);
          lastBlockedSpeechRef.current = {
            text: item.text,
            language: item.language,
            role: item.role,
          };
          await new Promise((resolve) => setTimeout(resolve, 700));
        } else {
          setIsAudioBlocked(false);
          const audioBuffer = await decodeBase64ToAudioBuffer(
            ctx,
            speakRes.audioBase64,
            speakRes.sampleRate
          );
          if (audioBuffer) {
            await new Promise<void>((resolve) => {
              let settled = false;
              const finishPlayback = () => {
                if (settled) return;
                settled = true;
                if (activeSourceNodeRef.current) {
                  activeSourceNodeRef.current = null;
                }
                resolve();
              };

              const safetyTimeout = setTimeout(
                finishPlayback,
                Math.ceil(audioBuffer.duration * 1000) + 1200
              );

              try {
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                activeSourceNodeRef.current = source;
                source.onended = () => {
                  clearTimeout(safetyTimeout);
                  finishPlayback();
                };
                source.start(0);
              } catch {
                clearTimeout(safetyTimeout);
                finishPlayback();
              }
            });
          } else {
            await new Promise((resolve) => setTimeout(resolve, 600));
          }
        }
      } else {
        // Fallback: Browser speechSynthesis with matching voice (if Gemini TTS failed)
        await new Promise<void>((resolve) => {
          speakWithBrowserFallback(item.text, item.language, {
            onStart: () => setIsSpeakingAloud(true),
            onDone: () => resolve(),
            onVoiceUnavailable: () => {
              setVoiceUnavailableNote('voice not available on this device');
            },
          });
        });
      }

      if (item.onDone) {
        try {
          item.onDone();
        } catch {
          // Ignore callback error
        }
      }
    }

    setIsSpeakingAloud(false);
    isQueueRunningRef.current = false;
  }, []);

  // Enqueue a message into the Caller Phone's single speech queue (never cancels previous items)
  const speakInCallerLanguage = useCallback(
    (
      text: string,
      detectedLanguage?: string,
      onDone?: () => void,
      options?: {
        role?: 'operator' | 'doctor';
        onStart?: () => void;
      }
    ) => {
      const cleanText = (text || '').trim();
      if (!cleanText) {
        if (onDone) onDone();
        return;
      }
      const lang = detectedLanguage || 'English';
      const role = options?.role || 'operator';

      // Start prefetching Gemini TTS immediately so queued items play back-to-back seamlessly
      const prefetchPromise = fetchGeminiSpeakAudio(cleanText, lang, role);

      speechQueueRef.current.push({
        id: `speech-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: cleanText,
        language: lang,
        role,
        prefetchPromise,
        onStart: options?.onStart,
        onDone,
      });

      processCallerSpeechQueue();
    },
    [processCallerSpeechQueue]
  );

  // Clear speech queue (only used when call is explicitly ended or reset)
  const clearCallerSpeechQueue = useCallback(() => {
    speechQueueRef.current = [];
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.stop();
      } catch {
        // Ignore
      }
      activeSourceNodeRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setIsSpeakingAloud(false);
    isQueueRunningRef.current = false;
  }, []);

  // Unlock sound when user taps "🔇 Tap to enable sound"
  const handleEnableSound = useCallback(async () => {
    await unlockCallerAudioContext();
    setIsAudioBlocked(false);
    const blocked = lastBlockedSpeechRef.current;
    if (blocked) {
      lastBlockedSpeechRef.current = null;
      speakInCallerLanguage(blocked.text, blocked.language, undefined, {
        role: blocked.role,
      });
    }
  }, [speakInCallerLanguage]);

  // Stop active voice recording (without closing the shared Caller AudioContext)
  const stopVoiceRecording = useCallback(() => {
    setIsAudioRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch {
        // Ignore
      }
      micSourceNodeRef.current = null;
    }
    analyserRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
  }, []);

  // Reset phone to idle when parent resets assessment to null
  useEffect(() => {
    if (!assessment && !isLoadingExternal && !loading) {
      if (reassuranceTimerRef.current) clearTimeout(reassuranceTimerRef.current);
      if (callingTimerRef.current) clearTimeout(callingTimerRef.current);
      stopDoctorRingtone();
      stopVoiceRecording();
      clearCallerSpeechQueue();
      setIvrStage('idle');
      setCallDurationSeconds(0);
      setVoiceUnavailableNote(null);
      setIsAudioBlocked(false);
      setDeclinedDoctorCall(false);
      spokenDocMsgIdsRef.current.clear();
      lastAnnouncedAssessmentIdRef.current = null;
      prevDoctorCallStateRef.current = 'idle';
    }
  }, [assessment, isLoadingExternal, loading, stopVoiceRecording, clearCallerSpeechQueue]);

  // Ensure ringtone stops when component unmounts or stage leaves 'doctor_incoming'
  useEffect(() => {
    if (ivrStage !== 'doctor_incoming' && doctorCallState !== 'ringing') {
      stopDoctorRingtone();
    }
  }, [ivrStage, doctorCallState]);

  useEffect(() => {
    return () => {
      stopDoctorRingtone();
    };
  }, []);

  // If preset scenario is triggered from Operations view top bar, show "Please wait…" then Step 3 -> Step 4
  useEffect(() => {
    if (isLoadingExternal && ivrStage === 'idle') {
      setCallDurationSeconds(1);
      setIvrStage('processing');
    }
  }, [isLoadingExternal, ivrStage]);

  // When a new assessment arrives (from voice call or Operations preset selector), run Step 3 -> Step 4
  useEffect(() => {
    if (!assessment) return;
    const assessmentSignature = `${assessment.likelyEmergencyType}-${assessment.transcribedText || ''}`;
    if (lastAnnouncedAssessmentIdRef.current === assessmentSignature) return;
    lastAnnouncedAssessmentIdRef.current = assessmentSignature;

    if (callDurationSeconds === 0) {
      setCallDurationSeconds(1);
    }

    // Step 3: Voice + screen reply: short reassurance ("Help is being arranged.")
    setIvrStage('reassurance');
    const reassurance = getShortReassuranceInCallerLang(assessment.detectedLanguage);
    const firstQ = assessment.triageQuestions?.[0];

    speakInCallerLanguage(reassurance.callerText, assessment.detectedLanguage, () => {
      if (firstQ) {
        setIvrStage('ivr_question');
      } else {
        setIvrStage('first_aid');
      }
    });

    if (firstQ) {
      const qPrompt = buildIvrQuestionPrompt(firstQ, assessment.detectedLanguage, 0);
      speakInCallerLanguage(qPrompt.spokenPrompt, assessment.detectedLanguage, undefined, {
        onStart: () => {
          setIvrStage('ivr_question');
        },
      });
    }
  }, [assessment, callDurationSeconds, speakInCallerLanguage]);

  // Sync Doctor Call State transitions with the phone screen (Step 7)
  useEffect(() => {
    const prevState = prevDoctorCallStateRef.current;
    prevDoctorCallStateRef.current = doctorCallState;

    if (doctorCallState === 'ringing' && ivrStage !== 'ended') {
      setIvrStage('doctor_incoming');
      if (prevState !== 'ringing') {
        startDoctorRingtone();
        const incomingPrompt = getDoctorIncomingSpokenPrompt(
          assessment?.detectedLanguage || 'English'
        );
        speakInCallerLanguage(
          incomingPrompt.callerText,
          assessment?.detectedLanguage || 'English'
        );
      }
    } else if (doctorCallState === 'connected' && ivrStage !== 'ended') {
      stopDoctorRingtone();
      setIvrStage('doctor_connected');
    } else if (doctorCallState === 'ended' && ivrStage === 'doctor_connected') {
      stopDoctorRingtone();
      setIvrStage('final_status');
    } else if (doctorCallState === 'idle') {
      stopDoctorRingtone();
    }
  }, [doctorCallState, assessment?.detectedLanguage, ivrStage, speakInCallerLanguage]);

  // Automatically queue and read aloud EVERY new translated message from the Doctor in the caller's language
  useEffect(() => {
    for (const rawMsg of doctorMessages) {
      const m = normalizeDoctorBridgeMessage(rawMsg, assessment?.detectedLanguage || 'Tamil');
      if (m.sender === 'doctor' && !spokenDocMsgIdsRef.current.has(m.id)) {
        spokenDocMsgIdsRef.current.add(m.id);
        speakInCallerLanguage(
          m.translatedText || m.originalText,
          m.targetLang || assessment?.detectedLanguage || 'English',
          () => {
            // After the doctor message finishes speaking, automatically listen for caller voice reply
            if (ivrStageRef.current === 'doctor_connected') {
              startAutoMicRecording('doctor_reply');
            }
          },
          { role: 'doctor' }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorMessages, assessment?.detectedLanguage, speakInCallerLanguage]);

  // Register scenario into dataset
  const registerScenarioFromTriage = (data: TriageAssessment, spokenText: string) => {
    const dynamicScenario: EmergencyScenario = {
      id: `live-call-${Date.now()}`,
      category: (data.matchedCategory as EmergencyScenario['category']) || 'Trauma & Hemorrhage',
      emergencyType: data.likelyEmergencyType || 'Acute Emergency Call',
      severity: data.severity || 'Critical',
      confidencePercentage: data.confidencePercentage || 94,
      goldenHourWindowMinutes: data.goldenHourWindowMinutes || 60,
      goldenHourReason: data.goldenHourReason || 'Immediate golden-hour resuscitation window',
      language: data.detectedLanguage || 'Regional',
      group: 'Indian',
      scriptName: data.detectedLanguage || 'Local Dialect',
      nativeText: spokenText || data.transcribedText || 'Live emergency voice call',
      englishTranslation: data.shortEnglishTranslation || spokenText || 'Live emergency call',
      callerProfile: data.patientSummary || 'Live rural caller',
      vocalToneNote: `Real-time caller voice recording via ${
        data.localEmergencyNumber ||
        data.estimatedLocation?.localEmergencyNumber ||
        'local'
      } emergency IVR channel`,
      landmarkAnchors:
        data.landmarksMentioned && data.landmarksMentioned.length > 0
          ? data.landmarksMentioned
          : ['Rural Incident Landmark'],
      gpsCoordinates: {
        lat: data.estimatedLocation?.latitude || 10.6455,
        lng: data.estimatedLocation?.longitude || 78.5912,
      },
      vitalTriageQuestions: (data.triageQuestions || []).map((q) => ({
        questionEnglish: q.questionEnglish,
        questionCallerLang: q.questionCallerLang,
        purpose: q.purpose,
        expectedAnswers: ['1', '2', '3'],
      })),
      criticalDos: data.criticalDos || [],
      fatalDonts: data.fatalDonts || [],
      recommendedHospitalCapability: '24/7 Emergency Facility',
      specialDispatchInstruction: 'Auto-dispatched from live caller IVR call',
    };

    if (!COMPREHENSIVE_EMERGENCY_DATASET.some((s) => s.id === dynamicScenario.id)) {
      COMPREHENSIVE_EMERGENCY_DATASET.unshift(dynamicScenario);
    }
  };

  // Submit initial voice text or audio to /api/triage-emergency
  const submitInitialEmergency = async (params: {
    message?: string;
    audioBase64?: string;
    mimeType?: string;
  }) => {
    setLoading(true);
    setIvrStage('processing');

    try {
      const response = await fetch('/api/triage-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data: TriageAssessment = await response.json();
      const transcript =
        data.transcribedText || params.message || 'Emergency voice transmission';

      // Mark signature before calling onTriageComplete so the effect doesn't double-fire
      const sig = `${data.likelyEmergencyType}-${data.transcribedText || ''}`;
      lastAnnouncedAssessmentIdRef.current = sig;

      registerScenarioFromTriage(data, transcript);
      onTriageComplete(data, transcript, 'voice_call');

      const reassurance = getShortReassuranceInCallerLang(data.detectedLanguage);

      // Step 3: Short reassurance ("Help is being arranged.") -> Step 4: Question 1 IVR menu
      setIvrStage('reassurance');
      const firstQ = data.triageQuestions?.[0];

      speakInCallerLanguage(reassurance.callerText, data.detectedLanguage, () => {
        if (firstQ) {
          setIvrStage('ivr_question');
        } else {
          setIvrStage('first_aid');
        }
      });

      if (firstQ) {
        const qPrompt = buildIvrQuestionPrompt(firstQ, data.detectedLanguage, 0);
        speakInCallerLanguage(qPrompt.spokenPrompt, data.detectedLanguage, undefined, {
          onStart: () => {
            setIvrStage('ivr_question');
          },
        });
      }
    } catch (err) {
      console.error('IVR triage error:', err);
      setIvrStage('idle');
    } finally {
      setLoading(false);
    }
  };

  // Start automatic microphone recording with 2-second silence detection (max 30s)
  const startAutoMicRecording = useCallback(
    async (purpose: 'initial' | 'ivr_answer' | 'doctor_reply' = 'initial') => {
      recordingPurposeRef.current = purpose;
      if (purpose !== 'doctor_reply') {
        setIvrStage('listening');
      }
      setRecordingSeconds(0);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices unavailable');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        let analyser: AnalyserNode | null = null;
        try {
          const audioCtx = getOrCreateCallerAudioContext();
          if (audioCtx) {
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume().catch(() => {});
            }
            const source = audioCtx.createMediaStreamSource(stream);
            micSourceNodeRef.current = source;
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.3;
            source.connect(analyser);
            analyserRef.current = analyser;
          }
        } catch {
          // AudioContext optional
        }

        let mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
          else mimeType = '';
        }

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const blobType = recorder.mimeType || mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
          if (audioBlob.size === 0) return;

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            if (recordingPurposeRef.current === 'initial') {
              submitInitialEmergency({ audioBase64: base64Data, mimeType: blobType });
            } else if (recordingPurposeRef.current === 'ivr_answer') {
              handleVoiceMenuAnswer(base64Data, blobType);
            } else if (recordingPurposeRef.current === 'doctor_reply') {
              // If user actually spoke during doctor_reply, transcribe & send to doctor
              if (hasUserSpokenRef.current && onCallerSendToDoctor) {
                try {
                  const res = await fetch('/api/update-triage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      initialAssessment: assessment,
                      audioBase64: base64Data,
                      mimeType: blobType,
                      questionIndex: 0,
                      conversationLog,
                    }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    const callerText =
                      updated.transcribedAnswer ||
                      getLocalizedCallerQuickRepliesForDoctor(assessment?.detectedLanguage || 'Tamil')[0]
                        ?.textCallerLang ||
                      'Yes, following doctor instructions';
                    const englishText =
                      updated.translatedAnswerEnglish ||
                      getLocalizedCallerQuickRepliesForDoctor(assessment?.detectedLanguage || 'Tamil')[0]
                        ?.textEnglish ||
                      callerText;
                    onCallerSendToDoctor(callerText, englishText);
                  }
                } catch {
                  const quick = getLocalizedCallerQuickRepliesForDoctor(
                    assessment?.detectedLanguage || 'Tamil'
                  )[0];
                  if (quick) {
                    onCallerSendToDoctor(quick.textCallerLang, quick.textEnglish);
                  }
                }
              }
              setIvrStage('doctor_connected');
            }
          };
        };

        recorder.start(250);
        setIsAudioRecording(true);
        recordingStartTimeRef.current = Date.now();
        hasUserSpokenRef.current = false;
        silenceStartTimeRef.current = null;

        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        if (analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkSilence = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            const elapsed = Date.now() - recordingStartTimeRef.current;

            if (avg > 7) {
              hasUserSpokenRef.current = true;
              silenceStartTimeRef.current = null;
            } else if (hasUserSpokenRef.current || elapsed > 2000) {
              if (!silenceStartTimeRef.current) {
                silenceStartTimeRef.current = Date.now();
              } else if (Date.now() - silenceStartTimeRef.current >= 2000) {
                stopVoiceRecording();
                return;
              }
            }

            if (elapsed >= 30000) {
              stopVoiceRecording();
              return;
            }
            animFrameRef.current = requestAnimationFrame(checkSilence);
          };
          animFrameRef.current = requestAnimationFrame(checkSilence);
        }
      } catch {
        // Microphone unavailable or blocked in headless browser — stay in 'listening' so user can press 1-9 or #
        setIsAudioRecording(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopVoiceRecording]
  );

  // Handle spoken answer during IVR question stage
  const handleVoiceMenuAnswer = async (audioBase64: string, mimeType: string) => {
    if (!assessment) return;
    setUpdatingTriage(true);
    setIvrStage('processing');
    try {
      const totalQuestions = Math.min(2, assessment.triageQuestions?.length || 2);
      const activeQIndex = currentQuestionIndex >= totalQuestions ? 1 : currentQuestionIndex;
      const res = await fetch('/api/update-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialAssessment: assessment,
          audioBase64,
          mimeType,
          questionIndex: activeQIndex,
          conversationLog,
        }),
      });
      const updated = await res.json();
      const transcribedAns = updated.transcribedAnswer || '1';
      const spokenDigit = parseSpokenMenuNumber(transcribedAns);
      const activeQ = assessment.triageQuestions?.[activeQIndex];
      if (spokenDigit && (spokenDigit === '1' || spokenDigit === '2' || spokenDigit === '3') && activeQ) {
        const prompt = buildIvrQuestionPrompt(activeQ, assessment.detectedLanguage, activeQIndex);
        const matchedOpt = prompt.options.find((o) => o.key === spokenDigit) || prompt.options[0];
        await processTriageKeySelection(spokenDigit, matchedOpt.fullCaller, matchedOpt.fullEnglish);
      } else {
        await processTriageKeySelection(
          '1',
          transcribedAns,
          updated.translatedAnswerEnglish || transcribedAns
        );
      }
    } catch {
      setIvrStage('ivr_question');
    } finally {
      setUpdatingTriage(false);
    }
  };

  // Announce Step 6 Final Status using real dispatch results
  const announceFinalDispatchStatus = useCallback(
    (overrideAssessment?: TriageAssessment, doctorConnectedOverride?: boolean) => {
      const targetAssessment = overrideAssessment || assessment;
      const isDocConn =
        doctorConnectedOverride !== undefined
          ? doctorConnectedOverride
          : doctorCallState === 'connected';
      const statusObj = buildIvrFinalDispatchStatus({
        dispatchPlan,
        assessment: targetAssessment,
        ambulanceEtaSeconds,
        responderEtaSeconds,
        doctorConnected: isDocConn,
      });
      setIvrStage('final_status');
      speakInCallerLanguage(statusObj.spokenStatus, targetAssessment?.detectedLanguage);
    },
    [assessment, dispatchPlan, ambulanceEtaSeconds, responderEtaSeconds, doctorCallState, speakInCallerLanguage]
  );

  // Process keypad answer (1, 2, or 3) to active IVR triage question
  const processTriageKeySelection = async (
    keyPressed: string,
    answerCallerLang: string,
    answerEnglish: string
  ) => {
    if (!assessment) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const totalQuestions = Math.min(2, assessment.triageQuestions?.length || 2);
    const activeQIndex = currentQuestionIndex >= totalQuestions ? 1 : currentQuestionIndex;
    const isHelpOrWorsening = detectWorseningOrHelpIntent(answerEnglish);

    // Format keypress log for Operations Command Centre ("Caller pressed 2 → Not breathing")
    const kpLog = formatIvrKeypressLog(keyPressed, answerEnglish, answerCallerLang);

    const callerLogEntry: ConversationLogEntry = {
      id: `log-kp-q${activeQIndex + 1}-${Date.now()}`,
      timestamp: nowStr,
      role: 'caller',
      stage: activeQIndex === 0 ? 'question_1' : 'question_2',
      textCallerLang: kpLog.logCallerLang,
      textEnglish: kpLog.logEnglish,
      metadata: {
        questionIndex: activeQIndex,
        needsDoctor: isHelpOrWorsening,
      },
    };

    const updatedLogSoFar = [...conversationLog, callerLogEntry];
    setUpdatingTriage(true);
    setIvrStage('processing');

    try {
      const res = await fetch('/api/update-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialAssessment: assessment,
          callerAnswer: answerEnglish,
          questionIndex: activeQIndex,
          questionAsked: assessment.triageQuestions?.[activeQIndex],
          conversationLog: updatedLogSoFar,
          isHelpRequest: isHelpOrWorsening,
        }),
      });

      const updated = await res.json();
      const logsToAdd: ConversationLogEntry[] = [callerLogEntry];

      const transition: SeverityChangeRecord = computeSeverityTransition({
        previousSeverity: assessment.severity,
        previousConfidence: assessment.confidencePercentage,
        answerText: answerEnglish,
        isHelpRequest: isHelpOrWorsening,
        serverUpdatedSeverity: updated.updatedSeverity,
        serverUpdatedConfidence: updated.updatedConfidence,
        serverReason: updated.severityChangeReason || updated.clinicalUpdateNote,
      });

      if (onAppendSeverityChange) {
        onAppendSeverityChange(transition);
      }

      const nextQIndex = Math.min(totalQuestions, currentQuestionIndex + 1);
      if (setCurrentQuestionIndex) {
        setCurrentQuestionIndex(nextQIndex);
      }

      if (isHelpOrWorsening || updated.recommendConnectDoctor) {
        if (setShowConnectDoctorNow) setShowConnectDoctorNow(true);
      }

      const tailoredFirstAid = ensureGuidedFirstAidSteps(
        updated.tailoredFirstAidSteps || assessment.firstAidSteps,
        assessment.detectedLanguage,
        `${assessment.likelyEmergencyType} ${answerEnglish}`
      );
      const tailoredDonts = ensureFatalDontsList(
        updated.updatedFatalDonts || assessment.fatalDonts,
        assessment.likelyEmergencyType
      );

      const updatedQuestions = (assessment.triageQuestions || []).map((q, idx) =>
        idx === activeQIndex
          ? { ...q, answeredText: answerCallerLang, answeredEnglish: kpLog.logEnglish }
          : q
      );

      const newAssessment: TriageAssessment = {
        ...assessment,
        triageQuestions: updatedQuestions,
        severity: transition.newSeverity,
        confidencePercentage: transition.newConfidence,
        severityReasoning: updated.clinicalUpdateNote || transition.reason,
        firstAidSteps: tailoredFirstAid,
        fatalDonts: tailoredDonts,
      };

      if (onUpdateAssessment) {
        onUpdateAssessment(newAssessment);
      }

      if (dispatchPlan && onUpdateDispatchPlan) {
        const mergedPlan = mergeDispatchPlanWithTriageUpdate(
          dispatchPlan,
          newAssessment,
          transition,
          kpLog.logEnglish,
          nextQIndex >= totalQuestions && tailoredFirstAid[0]
            ? `Guided First Aid Step 1: ${tailoredFirstAid[0].stepEnglish}`
            : undefined
        );
        if (mergedPlan) {
          onUpdateDispatchPlan(mergedPlan);
        }
      }

      if (nextQIndex < totalQuestions && newAssessment.triageQuestions[nextQIndex]) {
        // Move to Question 2 of 2
        const nextQ = newAssessment.triageQuestions[nextQIndex];
        logsToAdd.push({
          id: `log-q2-ask-${Date.now() + 1}`,
          timestamp: nowStr,
          role: 'ai_operator',
          stage: 'question_2',
          textCallerLang: `Question 2 of 2: ${nextQ.questionCallerLang}`,
          textEnglish: `Question 2 of 2: ${nextQ.questionEnglish}`,
          metadata: {
            questionIndex: nextQIndex,
            previousSeverity: transition.previousSeverity,
            newSeverity: transition.newSeverity,
            newConfidence: transition.newConfidence,
            reason: transition.reason,
          },
        });
        setIvrStage('ivr_question');
        const q2Prompt = buildIvrQuestionPrompt(nextQ, newAssessment.detectedLanguage, nextQIndex);
        speakInCallerLanguage(q2Prompt.spokenPrompt, newAssessment.detectedLanguage);
      } else {
        // Both follow-up questions answered!
        if (setCurrentFirstAidStepIndex) setCurrentFirstAidStepIndex(0);
        const step1 = tailoredFirstAid[0];
        if (step1) {
          logsToAdd.push({
            id: `log-fa-start-${Date.now() + 2}`,
            timestamp: nowStr,
            role: 'ai_operator',
            stage: 'guided_first_aid',
            textCallerLang: `Step 1: ${step1.stepCallerLang}`,
            textEnglish: `Guided First Aid Step 1: ${step1.stepEnglish}`,
            metadata: {
              stepNumber: 1,
              previousSeverity: transition.previousSeverity,
              newSeverity: transition.newSeverity,
              newConfidence: transition.newConfidence,
            },
          });
        }

        // Check if doctor call should trigger IMMEDIATELY when severity becomes Critical after the follow-up answers
        const shouldRingDoctorNow = shouldTriggerDoctorCallOnTriageUpdate({
          previousSeverity: transition.previousSeverity,
          newSeverity: newAssessment.severity,
          isFollowUpComplete: true,
          doctorCallState,
        });

        if (shouldRingDoctorNow) {
          if (setShowConnectDoctorNow) setShowConnectDoctorNow(true);
          setDeclinedDoctorCall(false);
          if (onStartDoctorCall) {
            onStartDoctorCall({
              openConsoleAfterRing: false,
              autoFromCritical: true,
            });
          }
          setIvrStage('doctor_incoming');
        } else if (newAssessment.severity !== 'Critical') {
          // Requirement 4: AFFORDABILITY QUESTION (optional IVR step after triage, skipped for Critical cases)
          // "Do you have a government health insurance card? Press 1 yes, 2 no, 3 don't know."
          setIvrStage('affordability_question');
          const affPrompt = getAffordabilityQuestionPrompt(newAssessment.detectedLanguage);
          logsToAdd.push({
            id: `log-aff-ask-${Date.now() + 2}`,
            timestamp: nowStr,
            role: 'ai_operator',
            stage: 'affordability_question',
            textCallerLang: affPrompt.promptCallerLang,
            textEnglish: affPrompt.promptEnglish,
          });
          speakInCallerLanguage(affPrompt.promptCallerLang, newAssessment.detectedLanguage);
        } else if (step1) {
          setIvrStage('first_aid');
          const faPrompt = buildIvrFirstAidPrompt(step1, newAssessment.detectedLanguage);
          speakInCallerLanguage(faPrompt.spokenPrompt, newAssessment.detectedLanguage);
        } else {
          announceFinalDispatchStatus(newAssessment);
        }
      }

      if (onAppendConversationLog) {
        onAppendConversationLog(logsToAdd);
      }
    } catch (e) {
      console.error('Failed to update IVR triage:', e);
      setIvrStage('ivr_question');
    } finally {
      setUpdatingTriage(false);
    }
  };

  // Complete current Guided First-Aid step when caller presses '1'
  const handleCompleteCurrentFirstAidStep = () => {
    if (!assessment) return;
    const steps = assessment.firstAidSteps || [];
    const currentStep = steps[currentFirstAidStepIndex];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const logs: ConversationLogEntry[] = [];
    if (currentStep) {
      const kpLog = formatIvrKeypressLog(
        '1',
        `Done – Step ${currentStep.stepNumber}: ${currentStep.stepEnglish}`,
        `முடிந்தது – படி ${currentStep.stepNumber}: ${currentStep.stepCallerLang}`
      );
      logs.push({
        id: `log-kp-fa-${Date.now()}`,
        timestamp: nowStr,
        role: 'caller',
        stage: 'guided_first_aid',
        textCallerLang: kpLog.logCallerLang,
        textEnglish: kpLog.logEnglish,
        metadata: { stepNumber: currentStep.stepNumber },
      });

      // Mark step completed on assessment
      const updatedSteps = steps.map((s, idx) =>
        idx === currentFirstAidStepIndex ? { ...s, completed: true } : s
      );
      const updatedAssessment: TriageAssessment = {
        ...assessment,
        firstAidSteps: updatedSteps,
      };
      if (onUpdateAssessment) {
        onUpdateAssessment(updatedAssessment);
      }

      if (dispatchPlan && onUpdateDispatchPlan) {
        const updatedPlan = mergeDispatchPlanWithTriageUpdate(
          dispatchPlan,
          updatedAssessment,
          severityHistory[severityHistory.length - 1] || {
            previousSeverity: assessment.severity,
            newSeverity: assessment.severity,
            previousConfidence: assessment.confidencePercentage,
            newConfidence: assessment.confidencePercentage,
            reason: assessment.severityReasoning,
            timestamp: nowStr,
            triggerAnswer: kpLog.logEnglish,
          },
          kpLog.logEnglish,
          `Completed Step ${currentStep.stepNumber}: ${currentStep.stepEnglish}`
        );
        if (updatedPlan) onUpdateDispatchPlan(updatedPlan);
      }
    }

    const nextIdx = currentFirstAidStepIndex + 1;
    if (nextIdx < steps.length) {
      if (setCurrentFirstAidStepIndex) setCurrentFirstAidStepIndex(nextIdx);
      const nextStep = steps[nextIdx];
      logs.push({
        id: `log-fa-next-${Date.now() + 1}`,
        timestamp: nowStr,
        role: 'ai_operator',
        stage: 'guided_first_aid',
        textCallerLang: `Step ${nextStep.stepNumber}: ${nextStep.stepCallerLang}`,
        textEnglish: `Instructed Step ${nextStep.stepNumber}: ${nextStep.stepEnglish}`,
        metadata: { stepNumber: nextStep.stepNumber },
      });
      setIvrStage('first_aid');
      const faPrompt = buildIvrFirstAidPrompt(nextStep, assessment.detectedLanguage);
      speakInCallerLanguage(faPrompt.spokenPrompt, assessment.detectedLanguage);
    } else {
      // All guided first-aid steps done -> automatically trigger incoming doctor call!
      if (
        shouldTriggerDoctorCallAfterFirstAidStep({
          completedStepIndex: currentFirstAidStepIndex,
          totalSteps: steps.length,
          doctorCallState,
        })
      ) {
        setDeclinedDoctorCall(false);
        if (onStartDoctorCall) {
          onStartDoctorCall({
            openConsoleAfterRing: false,
            autoFromFirstAidComplete: true,
          });
        }
        setIvrStage('doctor_incoming');
      } else {
        announceFinalDispatchStatus(assessment, doctorCallState === 'connected');
      }
    }

    if (onAppendConversationLog && logs.length > 0) {
      onAppendConversationLog(logs);
    }
  };

  // =========================================================================
  // GREEN CALL / ACCEPT BUTTON HANDLER
  // =========================================================================
  const handlePressCall = () => {
    // Unlock the single Caller Phone AudioContext on user tap (green CALL button)
    unlockCallerAudioContext().then((unlocked) => {
      if (unlocked) setIsAudioBlocked(false);
    });

    // 1. If incoming doctor call is ringing -> Accept doctor call!
    if (ivrStage === 'doctor_incoming' || doctorCallState === 'ringing') {
      stopDoctorRingtone();
      setDeclinedDoctorCall(false);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const kpLog = formatIvrKeypressLog('CALL', 'Accepted incoming call from Emergency Doctor (Simulated)');
      if (onAppendConversationLog) {
        onAppendConversationLog([
          {
            id: `log-kp-doc-accept-${Date.now()}`,
            timestamp: nowStr,
            role: 'caller',
            stage: 'doctor_bridge',
            textCallerLang: kpLog.logCallerLang,
            textEnglish: kpLog.logEnglish,
          },
        ]);
      }
      if (onAcceptDoctorCall) {
        onAcceptDoctorCall();
      }
      setIvrStage('doctor_connected');
      const statusObj = buildIvrFinalDispatchStatus({
        dispatchPlan,
        assessment,
        ambulanceEtaSeconds,
        responderEtaSeconds,
        doctorConnected: true,
      });
      speakInCallerLanguage(statusObj.spokenStatus, assessment?.detectedLanguage || 'English');
      return;
    }

    // 2. If connected to doctor -> start auto-recording voice reply to doctor
    if (ivrStage === 'doctor_connected') {
      if (isAudioRecording) {
        stopVoiceRecording();
      } else {
        startAutoMicRecording('doctor_reply');
      }
      return;
    }

    // 3. If currently recording in listening mode -> stop & process immediately
    if (ivrStage === 'listening' && isAudioRecording) {
      stopVoiceRecording();
      return;
    }

    // 4. If idle or ended -> Step 1 & Step 2: Start emergency call ("Calling <localNumber>…" -> "Connected – GoldenHourAI" -> Greeting -> Auto Mic)
    if (ivrStage === 'idle' || ivrStage === 'ended') {
      setCallDurationSeconds(1);
      setIvrStage('calling');

      if (callingTimerRef.current) clearTimeout(callingTimerRef.current);
      callingTimerRef.current = setTimeout(() => {
        setIvrStage('connected_greeting');
        const greetingText = 'Emergency service. Tell us what happened and where you are.';
        speakInCallerLanguage(greetingText, 'English', () => {
          if (ivrStageRef.current === 'connected_greeting') {
            startAutoMicRecording('initial');
          }
        });
      }, 700);
    }
  };

  // =========================================================================
  // RED END / DECLINE BUTTON HANDLER
  // =========================================================================
  const handlePressEnd = () => {
    unlockCallerAudioContext().catch(() => {});
    stopDoctorRingtone();
    stopVoiceRecording();
    clearCallerSpeechQueue();
    if (reassuranceTimerRef.current) clearTimeout(reassuranceTimerRef.current);
    if (callingTimerRef.current) clearTimeout(callingTimerRef.current);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // If incoming doctor call is ringing -> Decline doctor call, keep first-aid flow, and offer "Press 0 to call the doctor"
    if (ivrStage === 'doctor_incoming' || doctorCallState === 'ringing') {
      setDeclinedDoctorCall(true);
      const offerHint = getOfferCallDoctorHint(assessment?.detectedLanguage || 'English');
      const kpLog = formatIvrKeypressLog(
        'END',
        'Declined incoming doctor call — keeping first-aid flow (Press 0 to call the doctor)',
        offerHint.callerText
      );
      if (onAppendConversationLog) {
        onAppendConversationLog([
          {
            id: `log-kp-doc-decline-${Date.now()}`,
            timestamp: nowStr,
            role: 'caller',
            stage: 'doctor_bridge',
            textCallerLang: kpLog.logCallerLang,
            textEnglish: kpLog.logEnglish,
          },
        ]);
      }
      if (onDeclineDoctorCall) {
        onDeclineDoctorCall();
      }
      if (assessment) {
        setIvrStage('first_aid');
        const steps = assessment.firstAidSteps || [];
        const activeStep = steps[currentFirstAidStepIndex] || steps[0];
        if (activeStep) {
          const faPrompt = buildIvrFirstAidPrompt(activeStep, assessment.detectedLanguage);
          speakInCallerLanguage(
            `${faPrompt.spokenPrompt} ${offerHint.callerText}`,
            assessment.detectedLanguage
          );
        } else {
          speakInCallerLanguage(offerHint.callerText, assessment.detectedLanguage);
        }
      } else {
        setIvrStage('idle');
      }
      return;
    }

    // Step 8: Red END button ends the doctor call and generates the handover note (with whatHappened and currentStatus)
    if (onEndDoctorCall && (doctorCallState === 'connected' || doctorMessages.length > 0 || assessment)) {
      onEndDoctorCall();
    }

    if (assessment && onAppendConversationLog) {
      const kpLog = formatIvrKeypressLog('END', 'Call ended – help is still on the way');
      onAppendConversationLog([
        {
          id: `log-kp-end-${Date.now()}`,
          timestamp: nowStr,
          role: 'caller',
          stage: 'escalation',
          textCallerLang: kpLog.logCallerLang,
          textEnglish: kpLog.logEnglish,
        },
      ]);
    }

    setIvrStage('ended');
    speakInCallerLanguage(
      'Call ended. Help is still on the way.',
      assessment?.detectedLanguage || 'English'
    );
  };

  // =========================================================================
  // PHYSICAL KEYPAD & KEYBOARD HANDLER (1–9, *, 0, #)
  // =========================================================================
  const handlePressKey = (key: string) => {
    unlockCallerAudioContext().then((unlocked) => {
      if (unlocked) setIsAudioBlocked(false);
    });
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // A. During 'listening' (or 'connected_greeting'), if mic is unavailable/silent in headless browser,
    // pressing 1–5 or # submits a spoken emergency voice report so IVR flow works everywhere
    if (ivrStage === 'listening' || ivrStage === 'connected_greeting') {
      stopVoiceRecording();
      const quickVoiceReports: Record<string, string> = {
        '1': 'அப்பா வயல்ல விழுந்துட்டாரு, பேசல, மூச்சு சரியா வரல. கீழப்பட்டி அரசு பள்ளி பின்னாடி தண்ணீர் தொட்டி பக்கத்துல',
        '2': 'मेरे पिताजी को सीने में बहुत तेज दर्द हो रहा है और पसीना आ रहा है, रामपुर मंदिर के पास',
        '3': '父が田んぼで倒れて意識がありません。呼吸が苦しそうです。亀岡市の小学校の近くです',
        '4': 'Ayah saya digigit ular di sawah dekat Masjid Agung Lembang Bandung, kakinya bengkak dan pusing',
        '5': 'My father collapsed near St Thomas Hospital Westminster Road in London, he is unresponsive and gasping',
      };
      const chosenReport = quickVoiceReports[key] || quickVoiceReports['1'];
      submitInitialEmergency({ message: chosenReport });
      return;
    }

    if (!assessment) return;

    // GLOBAL KEY 0: Any time the caller presses 0 during an active call, trigger the incoming doctor call!
    if (key === '0' && ivrStage !== 'doctor_incoming' && ivrStage !== 'doctor_connected') {
      setDeclinedDoctorCall(false);
      const kpLog = formatIvrKeypressLog('0', 'Caller pressed 0 to call the doctor');
      if (onAppendConversationLog) {
        onAppendConversationLog([
          {
            id: `log-kp-doc-0-${Date.now()}`,
            timestamp: nowStr,
            role: 'caller',
            stage: 'doctor_bridge',
            textCallerLang: kpLog.logCallerLang,
            textEnglish: kpLog.logEnglish,
          },
        ]);
      }
      if (onStartDoctorCall) {
        onStartDoctorCall({ openConsoleAfterRing: false });
      }
      setIvrStage('doctor_incoming');
      return;
    }

    // B0. Location Clarification Question (Requirement 4: Low confidence)


    // B. Step 4: IVR Follow-up Questions (1, 2, 3 to answer; * to repeat; 0 for doctor)
    if (ivrStage === 'ivr_question') {
      const totalQuestions = Math.min(2, assessment.triageQuestions?.length || 2);
      const activeQIndex = currentQuestionIndex >= totalQuestions ? 1 : currentQuestionIndex;
      const activeQ = assessment.triageQuestions?.[activeQIndex];
      if (!activeQ) return;

      const qPrompt = buildIvrQuestionPrompt(
        activeQ,
        assessment.detectedLanguage,
        activeQIndex
      );

      if (key === '*') {
        const kpLog = formatIvrKeypressLog(
          '*',
          `Repeat Question ${activeQIndex + 1}`,
          qPrompt.repeatHintCaller
        );
        if (onAppendConversationLog) {
          onAppendConversationLog([
            {
              id: `log-kp-repeat-q-${Date.now()}`,
              timestamp: nowStr,
              role: 'caller',
              stage: activeQIndex === 0 ? 'question_1' : 'question_2',
              textCallerLang: kpLog.logCallerLang,
              textEnglish: kpLog.logEnglish,
            },
          ]);
        }
        speakInCallerLanguage(qPrompt.spokenPrompt, assessment.detectedLanguage);
        return;
      }

      if (key === '1' || key === '2' || key === '3') {
        const selectedOpt = qPrompt.options.find((o) => o.key === key) || qPrompt.options[0];
        processTriageKeySelection(key, selectedOpt.fullCaller, selectedOpt.fullEnglish);
        return;
      }
    }

    // B2. Affordability Question (Skipped for Critical; 1=Yes, 2=No, 3=Unsure; *=Repeat; 0=Doctor)
    if (ivrStage === 'affordability_question') {
      const affPrompt = getAffordabilityQuestionPrompt(assessment.detectedLanguage);

      if (key === '*') {
        const kpLog = formatIvrKeypressLog(
          '*',
          'Repeat Health Insurance Question',
          'மருத்துவக் காப்பீட்டு கேள்வியை மீண்டும் கூறவும்'
        );
        if (onAppendConversationLog) {
          onAppendConversationLog([
            {
              id: `log-kp-repeat-aff-${Date.now()}`,
              timestamp: nowStr,
              role: 'caller',
              stage: 'affordability_question',
              textCallerLang: kpLog.logCallerLang,
              textEnglish: kpLog.logEnglish,
            },
          ]);
        }
        speakInCallerLanguage(affPrompt.promptCallerLang, assessment.detectedLanguage);
        return;
      }

      if (key === '1' || key === '2' || key === '3') {
        const hasCard = key === '1' ? true : key === '2' ? false : null;
        const answerTextEnglish =
          key === '1'
            ? 'Yes, has government health insurance card'
            : key === '2'
            ? 'No, no health insurance card'
            : 'Unsure about health insurance card';
        const answerTextCaller =
          key === '1'
            ? affPrompt.options[0]?.callerLang || 'ஆம், காப்பீட்டு அட்டை உள்ளது'
            : key === '2'
            ? affPrompt.options[1]?.callerLang || 'இல்லை, அட்டை இல்லை'
            : affPrompt.options[2]?.callerLang || 'தெரியவில்லை';

        const kpLog = formatIvrKeypressLog(key, answerTextEnglish, answerTextCaller);

        const updatedAssessment: TriageAssessment = {
          ...assessment,
          publicInsuranceHolder: hasCard,
        };
        if (onUpdateAssessment) {
          onUpdateAssessment(updatedAssessment);
        }

        const logsToAdd: ConversationLogEntry[] = [
          {
            id: `log-kp-aff-ans-${Date.now()}`,
            timestamp: nowStr,
            role: 'caller',
            stage: 'affordability_question',
            textCallerLang: kpLog.logCallerLang,
            textEnglish: kpLog.logEnglish,
            metadata: { publicInsuranceHolder: hasCard },
          },
        ];

        // Re-score Central Registry using caller's insurance answer (Rule 3)
        if (dispatchPlan && onUpdateDispatchPlan) {
          const scoringResult = computeDispatchScoring({
            emergencyType: updatedAssessment.likelyEmergencyType,
            severity: updatedAssessment.severity,
            facilities: dispatchPlan.centralRegistry?.facilities || [],
            ambulances: dispatchPlan.centralRegistry?.ambulances || [],
            publicInsuranceHolder: hasCard,
            callerLat: updatedAssessment.estimatedLocation?.latitude || 10.6455,
            callerLng: updatedAssessment.estimatedLocation?.longitude || 78.5912,
          });

          const updatedPlan: DispatchPlan = {
            ...dispatchPlan,
            centralRegistry: dispatchPlan.centralRegistry
              ? {
                  ...dispatchPlan.centralRegistry,
                  publicInsuranceHolder: hasCard,
                  scoringBreakdown: scoringResult.scoringBreakdown,
                  selectedDoctor: scoringResult.bestDoctor,
                  selectedFacility: scoringResult.bestFacility,
                  selectedAmbulance: scoringResult.bestAmbulance,
                }
              : undefined,
          };
          onUpdateDispatchPlan(updatedPlan);
        }

        // Advance to Guided First Aid Step 1
        const steps = updatedAssessment.firstAidSteps || [];
        const step1 = steps[0];
        if (setCurrentFirstAidStepIndex) setCurrentFirstAidStepIndex(0);

        if (step1) {
          setIvrStage('first_aid');
          const faPrompt = buildIvrFirstAidPrompt(step1, updatedAssessment.detectedLanguage);
          logsToAdd.push({
            id: `log-fa-start-${Date.now() + 1}`,
            timestamp: nowStr,
            role: 'ai_operator',
            stage: 'guided_first_aid',
            textCallerLang: `Step 1: ${step1.stepCallerLang}`,
            textEnglish: `Guided First Aid Step 1: ${step1.stepEnglish}`,
            metadata: { stepNumber: 1 },
          });
          speakInCallerLanguage(faPrompt.spokenPrompt, updatedAssessment.detectedLanguage);
        } else {
          announceFinalDispatchStatus(updatedAssessment);
        }

        if (onAppendConversationLog) {
          onAppendConversationLog(logsToAdd);
        }
        return;
      }
    }

    // C. Step 5: Guided First Aid (1 when done, * to repeat, 0 to talk to a doctor, # for final status)
    if (ivrStage === 'first_aid') {
      const steps = assessment.firstAidSteps || [];
      const activeStep = steps[currentFirstAidStepIndex] || steps[0];

      if (key === '1') {
        handleCompleteCurrentFirstAidStep();
        return;
      }

      if (key === '*' && activeStep) {
        const faPrompt = buildIvrFirstAidPrompt(activeStep, assessment.detectedLanguage);
        const kpLog = formatIvrKeypressLog(
          '*',
          `Repeat First-Aid Step ${activeStep.stepNumber}`
        );
        if (onAppendConversationLog) {
          onAppendConversationLog([
            {
              id: `log-kp-repeat-fa-${Date.now()}`,
              timestamp: nowStr,
              role: 'caller',
              stage: 'guided_first_aid',
              textCallerLang: kpLog.logCallerLang,
              textEnglish: kpLog.logEnglish,
            },
          ]);
        }
        speakInCallerLanguage(faPrompt.spokenPrompt, assessment.detectedLanguage);
        return;
      }

      if (key === '#') {
        announceFinalDispatchStatus(assessment, doctorCallState === 'connected');
        return;
      }
    }

    // D. Step 6: Final Status (0 to talk to doctor, * to repeat status, 1 to view first aid)
    if (ivrStage === 'final_status') {
      if (key === '*') {
        const statusObj = buildIvrFinalDispatchStatus({
          dispatchPlan,
          assessment,
          ambulanceEtaSeconds,
          responderEtaSeconds,
          doctorConnected: doctorCallState === 'connected',
        });
        const kpLog = formatIvrKeypressLog('*', 'Repeat dispatch ETA status');
        if (onAppendConversationLog) {
          onAppendConversationLog([
            {
              id: `log-kp-repeat-status-${Date.now()}`,
              timestamp: nowStr,
              role: 'caller',
              stage: 'guided_first_aid',
              textCallerLang: kpLog.logCallerLang,
              textEnglish: kpLog.logEnglish,
            },
          ]);
        }
        speakInCallerLanguage(statusObj.spokenStatus, assessment.detectedLanguage);
        return;
      }

      if (key === '1') {
        setIvrStage('first_aid');
        return;
      }
    }

    // E. Step 7: Doctor Connected (1, 2, 3 menu replies to doctor; * to repeat doctor message)
    if (ivrStage === 'doctor_connected') {
      stopVoiceRecording();
      const latestDoc = [...doctorMessages].reverse().find((m) => m.sender === 'doctor');
      const quickReplies = getLocalizedCallerQuickRepliesForDoctor(
        assessment.detectedLanguage || 'English'
      );

      if (key === '*') {
        if (latestDoc) {
          speakInCallerLanguage(
            latestDoc.translatedText || latestDoc.originalText,
            assessment.detectedLanguage,
            undefined,
            { role: 'doctor' }
          );
        }
        return;
      }

      if (key === '1' || key === '2' || key === '3') {
        const matchedCheckOpt = latestDoc?.checkOptions?.find((o) => o.digit === key);
        const idx = Number(key) - 1;
        const fallbackReply = quickReplies[idx] || quickReplies[0];
        const replyCallerLang = matchedCheckOpt
          ? `Pressed ${key}: ${matchedCheckOpt.labelCallerLang}`
          : fallbackReply?.textCallerLang || `Pressed ${key}`;
        const replyEnglish = matchedCheckOpt
          ? `Caller pressed ${key} → ${matchedCheckOpt.labelEnglish}`
          : fallbackReply?.textEnglish || `Caller pressed ${key}`;

        if (onCallerSendToDoctor) {
          onCallerSendToDoctor(replyCallerLang, replyEnglish);
        }
      }
    }
  };

  // =========================================================================
  // COMPUTE COMPACT 4-LINE SCREEN DISPLAY FOR THE 220x170 LCD
  // =========================================================================
  const activeCountryInfo = resolveActiveEmergencyCountry({
    assessment,
    selectedCountryCode,
  });
  const selectedDoctorObj =
    dispatchPlan?.selectedDoctor ||
    dispatchPlan?.centralRegistry?.selectedDoctor;
  const linkedHospitalName =
    dispatchPlan?.hospitalPreAlert?.destinationHospitalName ||
    dispatchPlan?.selectedHospital?.name;
  const resolvedDoctorLabel = selectedDoctorObj
    ? `${selectedDoctorObj.name} (${selectedDoctorObj.specialty}, ${
        linkedHospitalName || selectedDoctorObj.hospitalName
      })`
    : doctorName ||
      getDoctorLabelForCountry(activeCountryInfo.code, activeCountryInfo.country);
  const displayNumbers = activeCountryInfo.numbers || '112';

  const idleDisplay = buildIdlePhoneScreenDisplay(activeCountryInfo);
  const connectedLabel = formatConnectedEmergencyLabel(activeCountryInfo);

  let callerIdLabel = idleDisplay.callerIdLabel;
  let screenLines: string[] = [];

  if (ivrStage === 'idle') {
    callerIdLabel = idleDisplay.callerIdLabel;
    screenLines = idleDisplay.screenLines;
  } else if (ivrStage === 'calling') {
    callerIdLabel = `Calling ${displayNumbers}…`;
    screenLines = [
      `Calling ${displayNumbers}…`,
      activeCountryInfo.isUnknown
        ? '🌐 Connecting Emergency Line…'
        : `${activeCountryInfo.flag} ${activeCountryInfo.country}`,
      '(Simulated)',
    ];
  } else if (ivrStage === 'connected_greeting') {
    callerIdLabel = connectedLabel;
    screenLines = [
      connectedLabel,
      'Emergency service.',
      'Tell us what happened and where you are.',
    ];
  } else if (ivrStage === 'listening') {
    callerIdLabel = connectedLabel;
    const mmss = `00:${recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}`;
    screenLines = [
      `Listening… ${mmss}`,
      'Tell us what happened and where you are.',
      'Stops after 2s silence',
    ];
  } else if (ivrStage === 'processing') {
    callerIdLabel = connectedLabel;
    screenLines = ['Please wait…', connectedLabel, '(Simulated)'];
  } else if (ivrStage === 'reassurance') {
    callerIdLabel = connectedLabel;
    const reassurance = getShortReassuranceInCallerLang(assessment?.detectedLanguage);
    screenLines = [reassurance.callerText, connectedLabel];

  } else if (ivrStage === 'ivr_question' && assessment) {
    callerIdLabel = connectedLabel;
    const activeQ =
      assessment.triageQuestions?.[currentQuestionIndex] || assessment.triageQuestions?.[0];
    if (activeQ) {
      const qPrompt = buildIvrQuestionPrompt(
        activeQ,
        assessment.detectedLanguage,
        currentQuestionIndex
      );
      screenLines = [
        qPrompt.questionTitleCaller,
        qPrompt.menuShortLine,
        `${qPrompt.repeatHintCaller} · ${activeCountryInfo.flag} ${displayNumbers}`,
      ];
    } else {
      screenLines = ['Please wait…', connectedLabel];
    }
  } else if (ivrStage === 'affordability_question' && assessment) {
    const prompt = getAffordabilityQuestionPrompt(assessment.detectedLanguage);
    callerIdLabel = connectedLabel;
    screenLines = [
      'Govt Health Card?',
      prompt.promptCallerLang.slice(0, 38),
      '1=Yes 2=No 3=NotSure',
      `*=Repeat · 0=Doctor (${displayNumbers})`,
    ];
  } else if (ivrStage === 'first_aid' && assessment) {
    const steps = assessment.firstAidSteps || [];
    const activeStep = steps[currentFirstAidStepIndex] || steps[0];
    callerIdLabel = connectedLabel;
    if (activeStep) {
      const faPrompt = buildIvrFirstAidPrompt(activeStep, assessment.detectedLanguage);
      const statusObj = buildIvrFinalDispatchStatus({
        dispatchPlan,
        assessment,
        ambulanceEtaSeconds,
        responderEtaSeconds,
        doctorConnected: doctorCallState === 'connected',
      });
      const offerDocLine = declinedDoctorCall
        ? `Press 0 to call the doctor · ${getOfferCallDoctorHint(assessment.detectedLanguage).callerText}`
        : faPrompt.keyHintCaller;
      screenLines = [
        `${faPrompt.stepHeaderCaller} ${faPrompt.stepBodyCaller}`,
        offerDocLine,
        `${statusObj.ambulanceLineCaller} · ${statusObj.responderLineCaller}`,
      ];
    }
  } else if (ivrStage === 'final_status') {
    callerIdLabel = connectedLabel;
    const statusObj = buildIvrFinalDispatchStatus({
      dispatchPlan,
      assessment,
      ambulanceEtaSeconds,
      responderEtaSeconds,
      doctorConnected: doctorCallState === 'connected',
    });
    screenLines = [
      statusObj.statusLineCaller,
      statusObj.ambulanceLineCaller,
      statusObj.responderLineCaller,
      declinedDoctorCall
        ? `Press 0 to call the doctor (${getOfferCallDoctorHint(assessment?.detectedLanguage).callerText})`
        : statusObj.keyHintCaller,
    ];
  } else if (ivrStage === 'doctor_incoming') {
    const incomingPrompt = getDoctorIncomingSpokenPrompt(
      assessment?.detectedLanguage || 'English'
    );
    callerIdLabel = 'Emergency Doctor (Simulated)';
    screenLines = [
      'Incoming: Emergency Doctor (Simulated)',
      incomingPrompt.callerText,
      `${resolvedDoctorLabel} · Green Accept / Red Decline`,
    ];
  } else if (ivrStage === 'doctor_connected') {
    callerIdLabel = `${resolvedDoctorLabel} · ${displayNumbers}`;
    const latestDoc = [...doctorMessages].reverse().find((m) => m.sender === 'doctor');
    const quickReplies = getLocalizedCallerQuickRepliesForDoctor(
      assessment?.detectedLanguage || 'English'
    );
    const shortDocMenu =
      latestDoc?.checkOptions && latestDoc.checkOptions.length >= 2
        ? latestDoc.checkOptions
            .map((o) => `Press ${o.digit}: ${o.labelCallerLang}`)
            .join(' · ')
        : quickReplies
            .slice(0, 3)
            .map((r, i) => `${i + 1} ${r.textCallerLang.slice(0, 12)}`)
            .join(' / ');
    screenLines = [
      latestDoc
        ? `${resolvedDoctorLabel}: ${latestDoc.translatedText}`
        : `${resolvedDoctorLabel} joined (Simulated)`,
      shortDocMenu,
      latestDoc?.isAiDemoDoctor || latestDoc?.demoLabel
        ? latestDoc.demoLabel || DEMO_DOCTOR_LABEL
        : 'CALL Speak · 1/2 Reply · * Repeat',
    ];
  } else if (ivrStage === 'ended') {
    callerIdLabel = `${displayNumbers} · Ended`;
    screenLines = [
      'Call ended – help is still on the way',
      assessment
        ? `${activeCountryInfo.flag} ${displayNumbers} · Ambulance ETA: ${formatCountdownMMSS(
            ambulanceEtaSeconds
          )}`
        : '(Simulated)',
    ];
  }

  return (
    <div
      data-testid="caller-phone-view"
      className="w-full flex items-center justify-center py-2 px-2"
    >
      <KeypadPhone
        stage={ivrStage}
        localEmergencyNumber={idleDisplay.localEmergencyNumber}
        callDurationSeconds={callDurationSeconds}
        listeningSeconds={recordingSeconds}
        screenLines={screenLines}
        callerIdLabel={callerIdLabel}
        isSpeakingAloud={isSpeakingAloud}
        isListeningMic={
          (ivrStage === 'listening' || ivrStage === 'doctor_connected') && isAudioRecording
        }
        isAudioBlocked={isAudioBlocked}
        voiceUnavailableNote={voiceUnavailableNote}
        onEnableSound={handleEnableSound}
        onPressCall={handlePressCall}
        onPressEnd={handlePressEnd}
        onPressKey={handlePressKey}
      />
    </div>
  );
};
