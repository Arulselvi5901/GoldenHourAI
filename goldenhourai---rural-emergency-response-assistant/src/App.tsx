import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { EmergencyBanner } from './components/EmergencyBanner';
import { CallerScreen } from './components/CallerScreen';
import { OperationsCommandCentre } from './components/OperationsCommandCentre';
import { CentralRegistryScreen } from './components/CentralRegistryScreen';
import { DatasetExplorerModal } from './components/DatasetExplorerModal';
import { CollectedCallsModal } from './components/CollectedCallsModal';
import {
  TriageAssessment,
  DispatchPlan,
  EmergencyScenario,
  CollectedCallRecord,
  ConversationLogEntry,
  SeverityChangeRecord,
  DoctorCallState,
  DoctorBridgeMessage,
  DoctorHandoverNote,
  AppViewRoute,
  ActiveCallSessionState,
} from './types/emergency';
import {
  getStoredCollectedCalls,
  saveStoredCollectedCall,
  matchClinicalProtocol,
} from './data/emergencyDataset';
import {
  ensureTwoQuestionsWithOptions,
  ensureGuidedFirstAidSteps,
  ensureFatalDontsList,
  buildFallbackHandoverNote,
  mergeHandoverNoteIntoDispatchPlan,
  resolveRouteFromPathname,
  generateRoomCode,
  resolveRoomCodeFromSearch,
  shouldApplyRemoteSession,
  resolveActiveEmergencyCountry,
  getCountryDoctorLabel,
  lookupEmergencyCountry,
  normalizeDoctorBridgeMessage,
  DEMO_DOCTOR_LABEL,
  getDoctorIncomingSpokenPrompt,
  buildFallbackDemoDoctorResponse,
} from './utils/triageFlowLogic';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppViewRoute>(() =>
    resolveRouteFromPathname(
      typeof window !== 'undefined' ? window.location.pathname : '/'
    )
  );

  // Private 6-character room code per visitor session (synced with ?room=CODE in URL)
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const fromUrl = resolveRoomCodeFromSearch(window.location.search);
      if (fromUrl) return fromUrl;
      const freshRoom = generateRoomCode(6);
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?room=${encodeURIComponent(freshRoom)}`
      );
      return freshRoom;
    }
    return 'ABC123';
  });

  // Active call state
  const [sessionVersion, setSessionVersion] = useState<number>(0);
  const [callId, setCallId] = useState<string>(() => `call-${Date.now()}`);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => Date.now());
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(true);
  const [pipelineTimings, setPipelineTimings] = useState<Record<string, number>>({});
  const [isLoadingTriage, setIsLoadingTriage] = useState<boolean>(false);
  const [isUpdatingTriage, setIsUpdatingTriage] = useState<boolean>(false);

  const [assessment, setAssessment] = useState<TriageAssessment | null>(null);
  const [dispatchPlan, setDispatchPlan] = useState<DispatchPlan | null>(null);
  const [isHeaderDatasetOpen, setIsHeaderDatasetOpen] = useState(false);
  const [isCollectedModalOpen, setIsCollectedModalOpen] = useState(false);
  const [collectedCalls, setCollectedCalls] = useState<CollectedCallRecord[]>(() =>
    getStoredCollectedCalls()
  );

  // Shared Triage Follow-Up & Guided First-Aid State
  const [conversationLog, setConversationLog] = useState<ConversationLogEntry[]>([]);
  const [severityHistory, setSeverityHistory] = useState<SeverityChangeRecord[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentFirstAidStepIndex, setCurrentFirstAidStepIndex] = useState<number>(0);
  const [showConnectDoctorNow, setShowConnectDoctorNow] = useState<boolean>(false);
  const [ambulanceEtaSeconds, setAmbulanceEtaSeconds] = useState<number>(1080);

  // Pre-call / manual country override from Operations top bar ("Change country")
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>(
    undefined
  );

  // Shared Doctor Call Bridge State (Simulated Call)
  const [doctorCallState, setDoctorCallState] = useState<DoctorCallState>('idle');
  const [doctorMessages, setDoctorMessages] = useState<DoctorBridgeMessage[]>([]);
  const [demoDoctorEnabled, setDemoDoctorEnabled] = useState<boolean>(true);
  const [humanDoctorTookOver, setHumanDoctorTookOver] = useState<boolean>(false);

  const ringingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoDoctorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoDoctorFollowUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoDoctorEnabledRef = useRef<boolean>(true);
  const humanDoctorTookOverRef = useRef<boolean>(false);
  const doctorCallStateRef = useRef<DoctorCallState>('idle');
  const assessmentRef = useRef<TriageAssessment | null>(null);
  const dispatchPlanRef = useRef<DispatchPlan | null>(null);
  const firstAidStepIndexRef = useRef<number>(0);
  const doctorMessagesRef = useRef<DoctorBridgeMessage[]>([]);

  const lastAppliedVersionRef = useRef<number>(0);
  const inFlightPushCountRef = useRef<number>(0);
  const isApplyingRemoteRef = useRef<boolean>(false);

  useEffect(() => {
    demoDoctorEnabledRef.current = demoDoctorEnabled;
  }, [demoDoctorEnabled]);

  useEffect(() => {
    humanDoctorTookOverRef.current = humanDoctorTookOver;
  }, [humanDoctorTookOver]);

  useEffect(() => {
    doctorCallStateRef.current = doctorCallState;
  }, [doctorCallState]);

  useEffect(() => {
    assessmentRef.current = assessment;
  }, [assessment]);

  useEffect(() => {
    dispatchPlanRef.current = dispatchPlan;
  }, [dispatchPlan]);

  useEffect(() => {
    firstAidStepIndexRef.current = currentFirstAidStepIndex;
  }, [currentFirstAidStepIndex]);

  useEffect(() => {
    doctorMessagesRef.current = doctorMessages;
  }, [doctorMessages]);

  const activeCountryInfo = resolveActiveEmergencyCountry({
    selectedCountryCode,
    assessment,
  });
  const selectedDoctorObj =
    dispatchPlan?.selectedDoctor ||
    dispatchPlan?.centralRegistry?.selectedDoctor;
  const linkedHospitalName =
    dispatchPlan?.hospitalPreAlert?.destinationHospitalName ||
    dispatchPlan?.selectedHospital?.name;
  const doctorName = selectedDoctorObj
    ? `${selectedDoctorObj.name} (${selectedDoctorObj.specialty} · ${
        linkedHospitalName || selectedDoctorObj.hospitalName
      })`
    : getCountryDoctorLabel(activeCountryInfo.country);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(resolveRouteFromPathname(window.location.pathname));
      const urlRoom = resolveRoomCodeFromSearch(window.location.search);
      if (urlRoom && urlRoom !== roomCode) {
        lastAppliedVersionRef.current = 0;
        setSessionVersion(0);
        setRoomCode(urlRoom);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [roomCode]);

  const handleNavigateRoute = (route: AppViewRoute) => {
    const targetPath =
      route === 'caller'
        ? '/caller'
        : route === 'ops'
        ? '/ops'
        : route === 'registry'
        ? '/registry'
        : '/';
    const targetUrl = `${targetPath}?room=${encodeURIComponent(roomCode)}`;
    if (
      typeof window !== 'undefined' &&
      `${window.location.pathname}${window.location.search}` !== targetUrl
    ) {
      window.history.pushState({}, '', targetUrl);
    }
    setCurrentRoute(route);
  };

  // Push local active-call state to server for the current room whenever key call state changes locally
  const pushActiveCallToServer = async (
    partial?: Partial<ActiveCallSessionState> & { reset?: boolean },
    targetRoomOverride?: string
  ) => {
    const activeRoom = targetRoomOverride || roomCode;
    inFlightPushCountRef.current += 1;
    try {
      const res = await fetch(
        `/api/active-call?room=${encodeURIComponent(activeRoom)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            partial?.reset
              ? { roomCode: activeRoom, reset: true }
              : {
                  roomCode: activeRoom,
                  callId,
                  callStartedAt,
                  selectedCountryCode,
                  assessment,
                  dispatchPlan,
                  conversationLog,
                  severityHistory,
                  currentQuestionIndex,
                  currentFirstAidStepIndex,
                  showConnectDoctorNow,
                  ambulanceEtaSeconds,
                  doctorCallState,
                  doctorName,
                  doctorMessages,
                  demoDoctorEnabled,
                  humanDoctorTookOver,
                  pipelineTimings,
                  isLoadingTriage,
                  isUpdatingTriage,
                  ...partial,
                }
          ),
        }
      );
      if (res.ok) {
        const data: ActiveCallSessionState = await res.json();
        if (typeof data.version === 'number') {
          lastAppliedVersionRef.current = Math.max(
            lastAppliedVersionRef.current,
            data.version
          );
          setSessionVersion(data.version);
        }
        setLastSyncedAt(Date.now());
        setIsLiveSynced(true);
      }
    } catch {
      // Non-fatal in offline/preview edge cases
    } finally {
      inFlightPushCountRef.current = Math.max(0, inFlightPushCountRef.current - 1);
    }
  };

  // Automatically push state updates initiated in this tab to /api/active-call?room=CODE
  useEffect(() => {
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }
    if (
      !assessment &&
      conversationLog.length === 0 &&
      doctorCallState === 'idle' &&
      !isLoadingTriage
    ) {
      return;
    }
    pushActiveCallToServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roomCode,
    assessment,
    dispatchPlan,
    conversationLog,
    severityHistory,
    currentQuestionIndex,
    currentFirstAidStepIndex,
    showConnectDoctorNow,
    doctorCallState,
    doctorMessages,
    demoDoctorEnabled,
    humanDoctorTookOver,
    isLoadingTriage,
    isUpdatingTriage,
  ]);

  // Poll /api/active-call?room=CODE every 1000ms using server version numbers (never comparing client and server clocks)
  useEffect(() => {
    const pollRoom = async () => {
      if (inFlightPushCountRef.current > 0) {
        return;
      }
      try {
        const res = await fetch(
          `/api/active-call?room=${encodeURIComponent(roomCode)}`
        );
        if (!res.ok) return;
        const remote: ActiveCallSessionState = await res.json();
        setLastSyncedAt(Date.now());
        setIsLiveSynced(true);

        // Apply remote state strictly when remote.version > lastAppliedVersionRef.current
        if (
          inFlightPushCountRef.current === 0 &&
          shouldApplyRemoteSession(remote.version, lastAppliedVersionRef.current)
        ) {
          isApplyingRemoteRef.current = true;
          lastAppliedVersionRef.current = remote.version;
          setSessionVersion(remote.version);
          setCallId(remote.callId || callId);
          setCallStartedAt(remote.callStartedAt);
          if (remote.selectedCountryCode !== undefined) {
            setSelectedCountryCode(remote.selectedCountryCode);
          }
          setAssessment(remote.assessment);
          setDispatchPlan(remote.dispatchPlan);
          setConversationLog(remote.conversationLog || []);
          setSeverityHistory(remote.severityHistory || []);
          setCurrentQuestionIndex(remote.currentQuestionIndex || 0);
          setCurrentFirstAidStepIndex(remote.currentFirstAidStepIndex || 0);
          setShowConnectDoctorNow(Boolean(remote.showConnectDoctorNow));
          if (typeof remote.ambulanceEtaSeconds === 'number') {
            setAmbulanceEtaSeconds(remote.ambulanceEtaSeconds);
          }
          setDoctorCallState(remote.doctorCallState || 'idle');
          if (remote.demoDoctorEnabled !== undefined) {
            setDemoDoctorEnabled(Boolean(remote.demoDoctorEnabled));
          }
          if (remote.humanDoctorTookOver !== undefined) {
            setHumanDoctorTookOver(Boolean(remote.humanDoctorTookOver));
          }
          setDoctorMessages(
            (remote.doctorMessages || []).map((m) =>
              normalizeDoctorBridgeMessage(
                m,
                remote.assessment?.detectedLanguage || 'Tamil'
              )
            )
          );
          if (remote.pipelineTimings) {
            setPipelineTimings(remote.pipelineTimings);
          }
          setIsLoadingTriage(Boolean(remote.isLoadingTriage));
          setIsUpdatingTriage(Boolean(remote.isUpdatingTriage));
        }
      } catch {
        setIsLiveSynced(false);
      }
    };

    pollRoom();
    const pollInterval = setInterval(pollRoom, 1000);

    return () => clearInterval(pollInterval);
  }, [roomCode, callId]);

  // Live Ambulance ETA countdown timer
  useEffect(() => {
    if (!assessment) return;
    const timer = setInterval(() => {
      setAmbulanceEtaSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [assessment]);

  // Update ETA seconds when dispatchPlan arrives with a specific ambulance ETA
  useEffect(() => {
    if (dispatchPlan?.selectedAmbulance?.etaMinutes) {
      setAmbulanceEtaSeconds((prev) => {
        const planSeconds = dispatchPlan.selectedAmbulance.etaMinutes * 60;
        return Math.abs(prev - 1080) < 15 ? planSeconds : prev;
      });
    }
  }, [dispatchPlan?.selectedAmbulance?.etaMinutes]);

  // When a caller speaks or sends an initial emergency transmission
  const handleTriageComplete = (
    newAssessment: TriageAssessment,
    initialMsg: string,
    channel: 'voice_call' | 'sms' | 'audio_upload' = 'voice_call'
  ) => {
    const triageStartTimestamp = Date.now();
    const matchedProtocol = matchClinicalProtocol(
      initialMsg || newAssessment.transcribedText || ''
    );

    const normalizedQuestions = ensureTwoQuestionsWithOptions(
      newAssessment.triageQuestions,
      newAssessment.detectedLanguage || 'English'
    );
    const normalizedFirstAid = ensureGuidedFirstAidSteps(
      newAssessment.firstAidSteps,
      newAssessment.detectedLanguage || 'English',
      newAssessment.likelyEmergencyType
    );
    const normalizedFatalDonts = ensureFatalDontsList(
      matchedProtocol?.fatalDonts || newAssessment.fatalDonts,
      newAssessment.likelyEmergencyType
    );

    const enrichedAssessment: TriageAssessment = {
      ...newAssessment,
      triageQuestions: normalizedQuestions,
      firstAidSteps: normalizedFirstAid,
      goldenHourWindowMinutes:
        matchedProtocol?.goldenHourWindowMinutes ||
        newAssessment.goldenHourWindowMinutes ||
        60,
      goldenHourReason:
        matchedProtocol?.goldenHourReason ||
        newAssessment.goldenHourReason ||
        'Critical emergency response window',
      criticalDos:
        matchedProtocol?.criticalDos || newAssessment.criticalDos || [],
      fatalDonts: normalizedFatalDonts,
      matchedCategory:
        matchedProtocol?.category || newAssessment.matchedCategory || 'Emergency Triage',
    };

    const newCallId = `call-${Date.now()}`;
    setCallId(newCallId);
    setCallStartedAt(triageStartTimestamp);
    const detectedCountryRecord = lookupEmergencyCountry(
      enrichedAssessment.country || enrichedAssessment.estimatedLocation?.country
    );
    if (detectedCountryRecord) {
      setSelectedCountryCode(detectedCountryRecord.code);
    }
    setAssessment(enrichedAssessment);
    setCurrentQuestionIndex(0);
    setCurrentFirstAidStepIndex(0);
    setSeverityHistory([]);
    setShowConnectDoctorNow(false);
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    if (demoDoctorTimerRef.current) {
      clearTimeout(demoDoctorTimerRef.current);
      demoDoctorTimerRef.current = null;
    }
    if (demoDoctorFollowUpTimerRef.current) {
      clearTimeout(demoDoctorFollowUpTimerRef.current);
      demoDoctorFollowUpTimerRef.current = null;
    }
    setHumanDoctorTookOver(false);
    humanDoctorTookOverRef.current = false;
    setDoctorCallState('idle');
    doctorCallStateRef.current = 'idle';
    setDoctorMessages([]);
    const initEtaMins =
      enrichedAssessment.nearbyAmbulances?.[0]?.etaMinutes || 18;
    setAmbulanceEtaSeconds(initEtaMins * 60);

    const newTimings: Record<string, number> = {
      transcription: 310,
      language_country: 275,
      location_geocoding: 590,
      triage: 760,
    };
    setPipelineTimings(newTimings);

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const initialLog: ConversationLogEntry[] = [
      {
        id: `log-init-${Date.now()}`,
        timestamp: nowStr,
        role: 'caller',
        stage: 'initial_report',
        textCallerLang:
          initialMsg ||
          enrichedAssessment.transcribedText ||
          enrichedAssessment.shortEnglishTranslation,
        textEnglish: enrichedAssessment.shortEnglishTranslation,
      },
    ];

    if (normalizedQuestions[0]) {
      initialLog.push({
        id: `log-q1-ask-${Date.now() + 1}`,
        timestamp: nowStr,
        role: 'ai_operator',
        stage: 'question_1',
        textCallerLang: `Question 1 of 2: ${normalizedQuestions[0].questionCallerLang}`,
        textEnglish: `Question 1 of 2: ${normalizedQuestions[0].questionEnglish}`,
        metadata: { questionIndex: 0 },
      });
    }

    setConversationLog(initialLog);

    // Collect call data into dynamic dataset
    const newRecord: CollectedCallRecord = {
      id: newCallId,
      timestamp: nowStr,
      callerAudioOrText:
        initialMsg || newAssessment.transcribedText || 'Voice Emergency Call',
      detectedLanguage: newAssessment.detectedLanguage || 'Unknown',
      matchedEmergencyCategory: enrichedAssessment.matchedCategory || 'Emergency Triage',
      likelyEmergencyType: newAssessment.likelyEmergencyType,
      severity: enrichedAssessment.severity,
      confidencePercentage: enrichedAssessment.confidencePercentage,
      extractedLandmarks: newAssessment.landmarksMentioned || [],
      resolvedLocation: {
        latitude: newAssessment.estimatedLocation?.latitude || 0,
        longitude: newAssessment.estimatedLocation?.longitude || 0,
        description:
          newAssessment.estimatedLocation?.description ||
          'Resolved Emergency Incident',
      },
      goldenHourWindowMinutes: enrichedAssessment.goldenHourWindowMinutes || 60,
      goldenHourReason: enrichedAssessment.goldenHourReason || '',
      criticalDos: enrichedAssessment.criticalDos || [],
      fatalDonts: enrichedAssessment.fatalDonts || [],
      channel,
    };

    setCollectedCalls((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
    saveStoredCollectedCall(newRecord);

    // Dispatch recommendation with real and simulated units anywhere in the world
    const dispatchStart = Date.now();
    fetch('/api/dispatch-recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emergency: enrichedAssessment,
        ambulances: enrichedAssessment.nearbyAmbulances,
        hospitals: enrichedAssessment.nearbyHospitals,
        volunteers: enrichedAssessment.nearbyVolunteers,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Dispatch computation failed');
        return res.json();
      })
      .then((plan: DispatchPlan) => {
        const dispatchDuration = Math.max(180, Date.now() - dispatchStart);
        setPipelineTimings((prev) => ({
          ...prev,
          dispatch_decision: dispatchDuration,
          hospital_prealert: Math.round(dispatchDuration * 0.55),
        }));
        setDispatchPlan(plan);
      })
      .catch((e) => console.error('Auto dispatch error:', e));
  };

  // AI Demo Doctor turn: speaks greeting + 2-4 safe first-aid steps + 1 check question (Press 1 / Press 2) + ETAs
  const triggerAiDemoDoctorTurn = async (callerReplyEnglish: string = '') => {
    if (
      !demoDoctorEnabledRef.current ||
      humanDoctorTookOverRef.current ||
      doctorCallStateRef.current !== 'connected'
    ) {
      return;
    }

    const activeAssessment = assessmentRef.current;
    const activeDispatchPlan = dispatchPlanRef.current;
    const callerLang = activeAssessment?.detectedLanguage || 'Tamil';
    const isFollowUpTurn =
      Boolean(callerReplyEnglish.trim()) || doctorMessagesRef.current.length > 0;

    let payload = buildFallbackDemoDoctorResponse({
      assessment: activeAssessment,
      dispatchPlan: activeDispatchPlan,
      firstAidStepIndex: firstAidStepIndexRef.current,
      callerReplyEnglish,
      isFollowUpTurn,
      callerLanguage: callerLang,
    });

    try {
      const response = await fetch('/api/demo-doctor-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment: activeAssessment,
          dispatchPlan: activeDispatchPlan,
          firstAidStepIndex: firstAidStepIndexRef.current,
          doctorMessages: doctorMessagesRef.current,
          callerReplyEnglish,
          callerLanguage: callerLang,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.englishText && data.translatedText) {
          payload = {
            ...payload,
            doctorName: data.doctorName || payload.doctorName,
            englishText: data.englishText,
            translatedText: data.translatedText,
            checkQuestionEnglish: data.checkQuestionEnglish || payload.checkQuestionEnglish,
            checkQuestionCallerLang:
              data.checkQuestionCallerLang || payload.checkQuestionCallerLang,
            checkOptions:
              Array.isArray(data.checkOptions) && data.checkOptions.length >= 2
                ? data.checkOptions
                : payload.checkOptions,
            demoLabel: DEMO_DOCTOR_LABEL,
          };
        }
      }
    } catch (e) {
      console.error('Demo Doctor API error, using safe fallback:', e);
    }

    // Re-verify human hasn't taken over and Demo Doctor is still ON while request was in flight
    if (
      !demoDoctorEnabledRef.current ||
      humanDoctorTookOverRef.current ||
      doctorCallStateRef.current !== 'connected'
    ) {
      return;
    }

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const aiDocMsg: DoctorBridgeMessage = {
      id: `doc-ai-msg-${Date.now()}`,
      sender: 'doctor',
      originalText: payload.englishText,
      translatedText: payload.translatedText,
      originalLang: 'English',
      targetLang: callerLang,
      timestamp: nowStr,
      isAiDemoDoctor: true,
      demoLabel: DEMO_DOCTOR_LABEL,
      checkQuestionEnglish: payload.checkQuestionEnglish,
      checkQuestionCallerLang: payload.checkQuestionCallerLang,
      checkOptions: payload.checkOptions,
    };

    setDoctorMessages((prev) => [...prev, aiDocMsg]);
    setConversationLog((prev) => [
      ...prev,
      {
        id: `log-doc-ai-${Date.now()}`,
        timestamp: nowStr,
        role: 'doctor',
        stage: 'doctor_bridge',
        textCallerLang: payload.translatedText,
        textEnglish: payload.englishText,
        metadata: {
          isAiDemoDoctor: true,
          demoLabel: DEMO_DOCTOR_LABEL,
        },
      },
    ]);
  };

  // Called immediately when a human types in the Doctor Console while Demo Doctor is ON
  const handleHumanDoctorTyping = () => {
    if (demoDoctorTimerRef.current) {
      clearTimeout(demoDoctorTimerRef.current);
      demoDoctorTimerRef.current = null;
    }
    if (demoDoctorFollowUpTimerRef.current) {
      clearTimeout(demoDoctorFollowUpTimerRef.current);
      demoDoctorFollowUpTimerRef.current = null;
    }
    if (!humanDoctorTookOverRef.current) {
      humanDoctorTookOverRef.current = true;
      setHumanDoctorTookOver(true);
    }
  };

  // Toggle "Demo Doctor" switch in Operations view (default ON)
  const handleToggleDemoDoctor = (enabled: boolean) => {
    demoDoctorEnabledRef.current = enabled;
    setDemoDoctorEnabled(enabled);
    if (!enabled) {
      if (demoDoctorTimerRef.current) {
        clearTimeout(demoDoctorTimerRef.current);
        demoDoctorTimerRef.current = null;
      }
      if (demoDoctorFollowUpTimerRef.current) {
        clearTimeout(demoDoctorFollowUpTimerRef.current);
        demoDoctorFollowUpTimerRef.current = null;
      }
    } else {
      humanDoctorTookOverRef.current = false;
      setHumanDoctorTookOver(false);
      // If call is already connected and no doctor messages yet, start the 5s timer
      if (
        doctorCallStateRef.current === 'connected' &&
        doctorMessagesRef.current.length === 0
      ) {
        if (demoDoctorTimerRef.current) clearTimeout(demoDoctorTimerRef.current);
        demoDoctorTimerRef.current = setTimeout(() => {
          if (
            doctorCallStateRef.current === 'connected' &&
            demoDoctorEnabledRef.current &&
            !humanDoctorTookOverRef.current
          ) {
            triggerAiDemoDoctorTurn('');
          }
        }, 5000);
      }
    }
  };

  // Connect to On-Call Doctor -> shows "Incoming: Emergency Doctor (Simulated)" on caller phone with Green Accept / Red Decline
  const handleStartDoctorCall = (options?: {
    openConsoleAfterRing?: boolean;
    autoFromCritical?: boolean;
    autoFromFirstAidComplete?: boolean;
  }) => {
    if (
      doctorCallStateRef.current === 'ringing' ||
      doctorCallStateRef.current === 'connected'
    ) {
      return;
    }
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    doctorCallStateRef.current = 'ringing';
    setDoctorCallState('ringing');
    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const reasonText = options?.autoFromCritical
      ? 'Automatic Critical Severity Escalation after follow-up answers'
      : options?.autoFromFirstAidComplete
      ? 'Automatic Doctor Call after completing last first-aid step'
      : 'Caller pressed 0 / requested live doctor support';
    const incomingPrompt = getDoctorIncomingSpokenPrompt(
      assessmentRef.current?.detectedLanguage || 'English'
    );
    setConversationLog((prev) => [
      ...prev,
      {
        id: `log-doc-ring-${Date.now()}`,
        timestamp: nowStr,
        role: 'system',
        stage: 'doctor_bridge',
        textCallerLang: `Incoming: Emergency Doctor (Simulated) — ${incomingPrompt.callerText}`,
        textEnglish: `Incoming: Emergency Doctor (Simulated) — ${reasonText}`,
      },
    ]);
  };

  const handleAcceptDoctorCall = () => {
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    if (demoDoctorTimerRef.current) {
      clearTimeout(demoDoctorTimerRef.current);
      demoDoctorTimerRef.current = null;
    }
    doctorCallStateRef.current = 'connected';
    setDoctorCallState('connected');
    setPipelineTimings((prev) => ({
      ...prev,
      doctor_briefing: 420,
    }));
    const joinTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setConversationLog((prev) => [
      ...prev,
      {
        id: `log-doc-join-${Date.now()}`,
        timestamp: joinTime,
        role: 'doctor',
        stage: 'doctor_bridge',
        textCallerLang: `${doctorName} joined (Simulated call)`,
        textEnglish: `${doctorName} joined the tele-medical bridge (Simulated call)`,
      },
    ]);

    // If Demo Doctor is ON and no human has taken over within 5 seconds of call being accepted,
    // Gemini acts as the doctor for the demo.
    if (demoDoctorEnabledRef.current && !humanDoctorTookOverRef.current) {
      demoDoctorTimerRef.current = setTimeout(() => {
        if (
          doctorCallStateRef.current === 'connected' &&
          demoDoctorEnabledRef.current &&
          !humanDoctorTookOverRef.current
        ) {
          triggerAiDemoDoctorTurn('');
        }
      }, 5000);
    }
  };

  const handleDeclineDoctorCall = () => {
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    if (demoDoctorTimerRef.current) {
      clearTimeout(demoDoctorTimerRef.current);
      demoDoctorTimerRef.current = null;
    }
    doctorCallStateRef.current = 'idle';
    setDoctorCallState('idle');
  };

  // Human Doctor sends or speaks an instruction in English -> Gemini translates to caller's language
  const handleDoctorSendMessage = async (englishText: string, preTranslatedText?: string) => {
    const trimmed = englishText.trim();
    if (!trimmed) return;

    // Human doctor took over — cancel AI Demo Doctor immediately
    handleHumanDoctorTyping();

    if (doctorCallStateRef.current !== 'connected') {
      if (ringingTimerRef.current) {
        clearTimeout(ringingTimerRef.current);
        ringingTimerRef.current = null;
      }
      doctorCallStateRef.current = 'connected';
      setDoctorCallState('connected');
    }

    const callerLang = assessmentRef.current?.detectedLanguage || 'Tamil';
    let translatedText = preTranslatedText?.trim() || '';
    let transliteration = '';

    try {
      const response = await fetch('/api/doctor-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          fromLang: 'English',
          toLang: callerLang,
          speaker: 'doctor',
          direction: 'doctor_to_caller',
          callerLanguage: callerLang,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        translatedText = data.translatedText || preTranslatedText?.trim() || trimmed;
        transliteration = data.transliteration || '';
      }
    } catch (e) {
      console.error('Doctor translation error:', e);
    }

    if (!translatedText) {
      translatedText = preTranslatedText?.trim() || trimmed;
    }

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg: DoctorBridgeMessage = {
      id: `doc-msg-${Date.now()}`,
      sender: 'doctor',
      originalText: trimmed,
      translatedText,
      transliteration,
      originalLang: 'English',
      targetLang: callerLang,
      timestamp: nowStr,
      isAiDemoDoctor: false,
    };

    setDoctorMessages((prev) => [...prev, msg]);
    setConversationLog((prev) => [
      ...prev,
      {
        id: `log-doc-msg-${Date.now()}`,
        timestamp: nowStr,
        role: 'doctor',
        stage: 'doctor_bridge',
        textCallerLang: translatedText,
        textEnglish: trimmed,
      },
    ]);
  };

  // Caller answers by voice, keypad menu number, or text -> Doctor sees English translation with original underneath
  const handleCallerSendMessage = async (callerText: string, englishHint?: string) => {
    const trimmed = callerText.trim();
    if (!trimmed) return;

    const callerLang = assessmentRef.current?.detectedLanguage || 'Tamil';
    let translatedEnglish = englishHint?.trim() || '';

    if (!translatedEnglish) {
      try {
        const response = await fetch('/api/doctor-translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            fromLang: callerLang,
            toLang: 'English',
            speaker: 'caller',
            direction: 'caller_to_doctor',
            callerLanguage: callerLang,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          translatedEnglish = data.englishText || data.translatedText || trimmed;
        } else {
          translatedEnglish = trimmed;
        }
      } catch (e) {
        console.error('Caller translation error:', e);
        translatedEnglish = trimmed;
      }
    }

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg: DoctorBridgeMessage = {
      id: `caller-msg-${Date.now()}`,
      sender: 'caller',
      originalText: trimmed,
      translatedText: translatedEnglish,
      originalLang: callerLang,
      targetLang: 'English',
      timestamp: nowStr,
    };

    setDoctorMessages((prev) => [...prev, msg]);
    setConversationLog((prev) => [
      ...prev,
      {
        id: `log-caller-doc-${Date.now()}`,
        timestamp: nowStr,
        role: 'caller',
        stage: 'doctor_bridge',
        textCallerLang: trimmed,
        textEnglish: translatedEnglish,
      },
    ]);

    // If Demo Doctor is ON and no human took over, AI Demo Doctor responds to the caller's reply
    if (
      demoDoctorEnabledRef.current &&
      !humanDoctorTookOverRef.current &&
      doctorCallStateRef.current === 'connected'
    ) {
      if (demoDoctorFollowUpTimerRef.current) {
        clearTimeout(demoDoctorFollowUpTimerRef.current);
      }
      demoDoctorFollowUpTimerRef.current = setTimeout(() => {
        if (
          demoDoctorEnabledRef.current &&
          !humanDoctorTookOverRef.current &&
          doctorCallStateRef.current === 'connected'
        ) {
          triggerAiDemoDoctorTurn(translatedEnglish);
        }
      }, 900);
    }
  };

  // End simulated doctor call -> Gemini writes handover note (using whatHappened and currentStatus)
  const handleEndDoctorCall = async () => {
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    if (demoDoctorTimerRef.current) {
      clearTimeout(demoDoctorTimerRef.current);
      demoDoctorTimerRef.current = null;
    }
    if (demoDoctorFollowUpTimerRef.current) {
      clearTimeout(demoDoctorFollowUpTimerRef.current);
      demoDoctorFollowUpTimerRef.current = null;
    }
    doctorCallStateRef.current = 'ended';
    setDoctorCallState('ended');

    const fallbackNote = buildFallbackHandoverNote({
      assessment: assessmentRef.current,
      dispatchPlan: dispatchPlanRef.current,
      conversationLog,
      doctorMessages: doctorMessagesRef.current,
      doctorName,
    });

    setDispatchPlan((prev) =>
      mergeHandoverNoteIntoDispatchPlan(prev, fallbackNote, assessmentRef.current)
    );

    const handoverStart = Date.now();
    let finalNote: DoctorHandoverNote = fallbackNote;
    try {
      const response = await fetch('/api/doctor-handover-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment: assessmentRef.current,
          dispatchPlan: dispatchPlanRef.current,
          conversationLog,
          doctorMessages: doctorMessagesRef.current,
          doctorName,
        }),
      });
      if (response.ok) {
        const handoverNote: DoctorHandoverNote = await response.json();
        finalNote = {
          ...fallbackNote,
          ...handoverNote,
          whatHappened: handoverNote.whatHappened || fallbackNote.whatHappened,
          currentStatus: handoverNote.currentStatus || fallbackNote.currentStatus,
        };
        setPipelineTimings((prev) => ({
          ...prev,
          doctor_briefing: Math.max(240, Date.now() - handoverStart),
        }));
        setDispatchPlan((prev) =>
          mergeHandoverNoteIntoDispatchPlan(prev, finalNote, assessmentRef.current)
        );
      }
    } catch (e) {
      console.error('Handover note error:', e);
    }

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setConversationLog((prev) => [
      ...prev,
      {
        id: `log-handover-${Date.now()}`,
        timestamp: nowStr,
        role: 'doctor',
        stage: 'handover_note',
        textCallerLang: finalNote.currentStatus,
        textEnglish: `Handover Note (${finalNote.doctorName}): What happened: ${finalNote.whatHappened} | Current status: ${finalNote.currentStatus}`,
      },
    ]);
  };

  const handleReset = () => {
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    if (demoDoctorTimerRef.current) {
      clearTimeout(demoDoctorTimerRef.current);
      demoDoctorTimerRef.current = null;
    }
    if (demoDoctorFollowUpTimerRef.current) {
      clearTimeout(demoDoctorFollowUpTimerRef.current);
      demoDoctorFollowUpTimerRef.current = null;
    }
    const freshRoom = generateRoomCode(6);
    if (typeof window !== 'undefined') {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?room=${encodeURIComponent(freshRoom)}`
      );
    }
    lastAppliedVersionRef.current = 0;
    setSessionVersion(0);
    setRoomCode(freshRoom);
    const freshCallId = `call-${freshRoom}-${Date.now()}`;
    setCallId(freshCallId);
    setCallStartedAt(null);
    setAssessment(null);
    setDispatchPlan(null);
    setConversationLog([]);
    setSeverityHistory([]);
    setCurrentQuestionIndex(0);
    setCurrentFirstAidStepIndex(0);
    setShowConnectDoctorNow(false);
    doctorCallStateRef.current = 'idle';
    setDoctorCallState('idle');
    setDoctorMessages([]);
    setHumanDoctorTookOver(false);
    humanDoctorTookOverRef.current = false;
    setPipelineTimings({});
    setIsLoadingTriage(false);
    setIsUpdatingTriage(false);
  };

  const handleChangeCountryCode = (newCode: string) => {
    setSelectedCountryCode(newCode);
    const lookedUp = lookupEmergencyCountry(newCode);
    let updatedAssessment = assessment;
    if (assessment) {
      if (lookedUp) {
        updatedAssessment = {
          ...assessment,
          country: lookedUp.country,
          countryFlag: lookedUp.flag,
          localEmergencyNumber: lookedUp.emergencyNumber,
          estimatedLocation: {
            ...assessment.estimatedLocation,
            country: lookedUp.country,
            countryFlag: lookedUp.flag,
            localEmergencyNumber: lookedUp.emergencyNumber,
          },
        };
      } else {
        updatedAssessment = {
          ...assessment,
          country: 'International',
          countryFlag: '🌐',
          localEmergencyNumber: '112',
          estimatedLocation: {
            ...assessment.estimatedLocation,
            country: 'International',
            countryFlag: '🌐',
            localEmergencyNumber: '112',
          },
        };
      }
      setAssessment(updatedAssessment);
    }
    pushActiveCallToServer({
      selectedCountryCode: newCode,
      assessment: updatedAssessment,
    });
  };

  const handleSelectDatasetScenario = async (scenario: EmergencyScenario) => {
    setIsHeaderDatasetOpen(false);
    setIsLoadingTriage(true);
    try {
      const response = await fetch('/api/triage-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: scenario.nativeText }),
      });
      const data: TriageAssessment = await response.json();
      setIsLoadingTriage(false);
      handleTriageComplete(data, scenario.nativeText, 'voice_call');
    } catch (e) {
      setIsLoadingTriage(false);
      console.error('Failed to triage scenario:', e);
    }
  };

  const handleSubmitCustomText = async (text: string) => {
    setIsLoadingTriage(true);
    try {
      const response = await fetch('/api/triage-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data: TriageAssessment = await response.json();
      setIsLoadingTriage(false);
      handleTriageComplete(data, text, 'voice_call');
    } catch (e) {
      setIsLoadingTriage(false);
      console.error('Failed to triage custom text:', e);
    }
  };

  const handleSelectCollectedCall = (call: CollectedCallRecord) => {
    const normalizedQuestions = ensureTwoQuestionsWithOptions([], call.detectedLanguage);
    const normalizedFirstAid = ensureGuidedFirstAidSteps(
      call.criticalDos.map((d: string, i: number) => ({
        stepNumber: i + 1,
        stepEnglish: d,
        stepCallerLang: d,
      })),
      call.detectedLanguage,
      call.likelyEmergencyType
    );

    const reloadedAssessment: TriageAssessment = {
      transcribedText: call.callerAudioOrText,
      detectedLanguage: call.detectedLanguage,
      shortEnglishTranslation: call.callerAudioOrText,
      patientSummary: `Caller reported ${call.likelyEmergencyType}`,
      likelyEmergencyType: call.likelyEmergencyType,
      severity: call.severity,
      confidencePercentage: call.confidencePercentage,
      severityReasoning: `Historical call record from ${call.timestamp}`,
      landmarksMentioned: call.extractedLandmarks,
      estimatedLocation: {
        description: call.resolvedLocation.description,
        latitude: call.resolvedLocation.latitude,
        longitude: call.resolvedLocation.longitude,
        landmarkAnchor: call.extractedLandmarks[0] || 'Resolved Village Landmark',
        accessNotes: 'Access resolved via landmark anchor.',
      },
      triageQuestions: normalizedQuestions,
      firstAidSteps: normalizedFirstAid,
      callerReplySMS: `[${activeCountryInfo.emergencyNumber} RELAY] Help dispatched to ${call.extractedLandmarks[0] || 'location'}.`,
      goldenHourWindowMinutes: call.goldenHourWindowMinutes,
      goldenHourReason: call.goldenHourReason,
      criticalDos: call.criticalDos,
      fatalDonts: ensureFatalDontsList(call.fatalDonts, call.likelyEmergencyType),
      matchedCategory: call.matchedEmergencyCategory,
    };

    handleTriageComplete(reloadedAssessment, call.callerAudioOrText, call.channel);
    setIsCollectedModalOpen(false);
  };

  const handleClearCollectedCalls = () => {
    localStorage.removeItem('goldenhour_collected_calls_v1');
    setCollectedCalls([]);
  };

  const handleToggleDoctorInRegistry = async (doctorId: string) => {
    if (!dispatchPlan?.centralRegistry) return;
    const currentReg = dispatchPlan.centralRegistry;
    try {
      const res = await fetch('/api/central-registry/toggle-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId,
          facilities: currentReg.facilities,
          ambulances: currentReg.ambulances,
          emergencyType: assessment?.likelyEmergencyType || 'Acute Emergency',
          severity: assessment?.severity || 'Serious',
          publicInsuranceHolder:
            assessment?.publicInsuranceHolder ?? currentReg.publicInsuranceHolder,
          callerLat: assessment?.estimatedLocation?.latitude || 10.6455,
          callerLng: assessment?.estimatedLocation?.longitude || 78.5912,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const bestFac = data.selectedFacility;
        const bestDoc = data.selectedDoctor;
        const bestAmb = data.selectedAmbulance;

        const updatedPlan: DispatchPlan = {
          ...dispatchPlan,
          selectedHospital: bestFac
            ? {
                id: bestFac.id,
                name: bestFac.name,
                etaMinutes: bestFac.etaMinutes,
                capabilityMatch:
                  data.scoringBreakdown?.[0]?.requiredCapability || 'Emergency Care',
                selectionReason: data.geminiRationale,
                lat: bestFac.lat,
                lng: bestFac.lng,
                distanceKm: bestFac.distanceKm,
                level: bestFac.type,
                capabilities: bestFac.capabilityLabels,
                isReal: !bestFac.isSimulated,
              }
            : dispatchPlan.selectedHospital,
          selectedDoctor: bestDoc,
          selectedAmbulance: bestAmb
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
            : dispatchPlan.selectedAmbulance,
          hospitalPreAlert: {
            ...dispatchPlan.hospitalPreAlert,
            destinationHospitalId:
              bestFac?.id || dispatchPlan.hospitalPreAlert?.destinationHospitalId,
            destinationHospitalName:
              bestFac?.name || dispatchPlan.hospitalPreAlert?.destinationHospitalName,
            etaMinutes: bestFac?.etaMinutes || dispatchPlan.hospitalPreAlert?.etaMinutes,
          },
          centralRegistry: {
            ...currentReg,
            facilities: data.facilities,
            ambulances: data.ambulances,
            scoringBreakdown: data.scoringBreakdown,
            selectedDoctor: bestDoc,
            selectedFacility: bestFac,
            selectedAmbulance: bestAmb,
            lastRerouteNotice: data.rerouteNotice,
          },
        };

        setDispatchPlan(updatedPlan);

        if (data.rerouteNotice) {
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setConversationLog((prev) => [
            ...prev,
            {
              id: `log-reg-reroute-${Date.now()}`,
              timestamp: nowStr,
              role: 'system',
              stage: 'dispatch_decision',
              textCallerLang: data.rerouteNotice,
              textEnglish: data.rerouteNotice,
              metadata: {
                isSimulatedRegistry: true,
                toggledDoctor: data.toggledDoctor,
              },
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Error toggling doctor in central registry:', err);
    }
  };

  const handleToggleAmbulanceInRegistry = async (ambulanceId: string) => {
    if (!dispatchPlan?.centralRegistry) return;
    const currentReg = dispatchPlan.centralRegistry;
    try {
      const res = await fetch('/api/central-registry/toggle-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambulanceId,
          facilities: currentReg.facilities,
          ambulances: currentReg.ambulances,
          emergencyType: assessment?.likelyEmergencyType || 'Acute Emergency',
          severity: assessment?.severity || 'Serious',
          publicInsuranceHolder:
            assessment?.publicInsuranceHolder ?? currentReg.publicInsuranceHolder,
          callerLat: assessment?.estimatedLocation?.latitude || 10.6455,
          callerLng: assessment?.estimatedLocation?.longitude || 78.5912,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const bestAmb = data.selectedAmbulance;
        const updatedPlan: DispatchPlan = {
          ...dispatchPlan,
          selectedAmbulance: bestAmb
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
            : dispatchPlan.selectedAmbulance,
          centralRegistry: {
            ...currentReg,
            facilities: data.facilities,
            ambulances: data.ambulances,
            scoringBreakdown: data.scoringBreakdown,
            selectedDoctor: data.selectedDoctor,
            selectedFacility: data.selectedFacility,
            selectedAmbulance: bestAmb,
            lastRerouteNotice: data.rerouteNotice,
          },
        };
        setDispatchPlan(updatedPlan);

        if (data.rerouteNotice) {
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setConversationLog((prev) => [
            ...prev,
            {
              id: `log-reg-amb-${Date.now()}`,
              timestamp: nowStr,
              role: 'system',
              stage: 'dispatch_decision',
              textCallerLang: data.rerouteNotice,
              textEnglish: data.rerouteNotice,
              metadata: {
                isSimulatedRegistry: true,
                toggledAmbulance: data.toggledAmbulance,
              },
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Error toggling ambulance in central registry:', err);
    }
  };

  // =========================================================================
  // ALL VIEWS (Split view `/`, Caller phone `/caller`, Operations `/ops`, Registry `/registry`)
  // =========================================================================
  return (
    <div
      data-testid={
        currentRoute === 'caller'
          ? 'route-caller-only'
          : currentRoute === 'ops'
          ? 'route-ops-only'
          : currentRoute === 'registry'
          ? 'route-registry-only'
          : 'route-split-view'
      }
      className="min-h-screen bg-[#0E1B2E] text-slate-100 flex flex-col font-sans"
    >
      {/* Mandatory Protocol Banner */}
      <EmergencyBanner
        localEmergencyNumber={
          assessment?.localEmergencyNumber ||
          assessment?.estimatedLocation?.localEmergencyNumber ||
          activeCountryInfo.emergencyNumber
        }
        countryName={
          assessment?.country ||
          assessment?.estimatedLocation?.country ||
          (activeCountryInfo.isKnown ? activeCountryInfo.country : undefined)
        }
        countryFlag={
          assessment?.countryFlag ||
          assessment?.estimatedLocation?.countryFlag ||
          activeCountryInfo.flag
        }
      />

      {/* Top Navigation Bar with Split / Caller / Operations / Registry Links */}
      <Header
        currentRoute={currentRoute}
        onNavigateRoute={handleNavigateRoute}
        hasActiveEmergency={Boolean(assessment)}
        emergencySeverity={assessment?.severity}
        onReset={handleReset}
        onOpenDataset={() => setIsHeaderDatasetOpen(true)}
        onOpenCollectedCalls={() => setIsCollectedModalOpen(true)}
        collectedCallsCount={collectedCalls.length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentRoute === 'caller' ? (
          <div className="py-6 flex items-center justify-center min-h-[calc(100vh-120px)]">
            <CallerScreen
              key={roomCode}
              assessment={assessment}
              dispatchPlan={dispatchPlan}
              onTriageComplete={handleTriageComplete}
              onUpdateAssessment={setAssessment}
              onUpdateDispatchPlan={setDispatchPlan}
              conversationLog={conversationLog}
              onAppendConversationLog={(entries) =>
                setConversationLog((prev) => [...prev, ...entries])
              }
              severityHistory={severityHistory}
              onAppendSeverityChange={(rec) => {
                setPipelineTimings((prev) => ({
                  ...prev,
                  followup_answers: 340,
                  severity_update: 490,
                }));
                setSeverityHistory((prev) => [...prev, rec]);
              }}
              currentQuestionIndex={currentQuestionIndex}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
              currentFirstAidStepIndex={currentFirstAidStepIndex}
              setCurrentFirstAidStepIndex={setCurrentFirstAidStepIndex}
              showConnectDoctorNow={showConnectDoctorNow}
              setShowConnectDoctorNow={setShowConnectDoctorNow}
              ambulanceEtaSeconds={ambulanceEtaSeconds}
              doctorCallState={doctorCallState}
              doctorName={doctorName}
              doctorMessages={doctorMessages}
              selectedCountryCode={selectedCountryCode}
              isLoadingExternal={isLoadingTriage}
              onStartDoctorCall={handleStartDoctorCall}
              onAcceptDoctorCall={handleAcceptDoctorCall}
              onDeclineDoctorCall={handleDeclineDoctorCall}
              onEndDoctorCall={handleEndDoctorCall}
              onCallerSendToDoctor={handleCallerSendMessage}
              onLoadingStateChange={(loadingTriage, updatingTriage) => {
                setIsLoadingTriage(loadingTriage);
                setIsUpdatingTriage(updatingTriage);
              }}
              onNavigateToDispatch={() => handleNavigateRoute('ops')}
            />
          </div>
        ) : currentRoute === 'registry' ? (
          <CentralRegistryScreen
            assessment={assessment}
            dispatchPlan={dispatchPlan}
            centralRegistry={
              dispatchPlan?.centralRegistry || assessment?.centralRegistry || null
            }
            onToggleDoctor={handleToggleDoctorInRegistry}
            onToggleAmbulance={handleToggleAmbulanceInRegistry}
            onNavigateToOps={() => handleNavigateRoute('ops')}
          />
        ) : currentRoute === 'ops' ? (
          <div className="max-w-[1600px] mx-auto">
            <OperationsCommandCentre
              roomCode={roomCode}
              sessionVersion={sessionVersion}
              callId={callId}
              callStartedAt={callStartedAt}
              lastSyncedAt={lastSyncedAt}
              isLiveSynced={isLiveSynced}
              assessment={assessment}
              dispatchPlan={dispatchPlan}
              setDispatchPlan={setDispatchPlan}
              conversationLog={conversationLog}
              severityHistory={severityHistory}
              ambulanceEtaSeconds={ambulanceEtaSeconds}
              doctorCallState={doctorCallState}
              doctorName={doctorName}
              doctorMessages={doctorMessages}
              pipelineTimings={pipelineTimings}
              isLoadingTriage={isLoadingTriage}
              isUpdatingTriage={isUpdatingTriage}
              onStartDoctorCall={handleStartDoctorCall}
              onDoctorSendMessage={handleDoctorSendMessage}
              onCallerSendMessage={handleCallerSendMessage}
              onEndDoctorCall={handleEndDoctorCall}
              onAppendConversationLog={(entry) =>
                setConversationLog((prev) => [...prev, entry])
              }
              onOpenDataset={() => setIsHeaderDatasetOpen(true)}
              onSelectScenario={handleSelectDatasetScenario}
              onSubmitCustomText={handleSubmitCustomText}
              onOpenCollectedCalls={() => setIsCollectedModalOpen(true)}
              collectedCallsCount={collectedCalls.length}
              isSplitView={false}
              selectedCountryCode={selectedCountryCode}
              onChangeCountryCode={handleChangeCountryCode}
              demoDoctorEnabled={demoDoctorEnabled}
              onToggleDemoDoctor={handleToggleDemoDoctor}
              humanDoctorTookOver={humanDoctorTookOver}
              onHumanDoctorTyping={handleHumanDoctorTyping}
              onToggleDoctor={handleToggleDoctorInRegistry}
              onToggleAmbulance={handleToggleAmbulanceInRegistry}
            />
          </div>
        ) : (
          /* DEMO SPLIT VIEW (/) — Left ~35% Caller Phone | Right ~65% Operations Command Centre */
          <div className="max-w-[1680px] mx-auto flex flex-col lg:flex-row items-start">
            {/* Left Side (~35% width on desktop): Compact 260x520 Feature Phone */}
            <div
              data-testid="split-left-caller-pane"
              className="w-full lg:w-[320px] xl:w-[340px] shrink-0 lg:sticky lg:top-14 flex items-center justify-center py-3 border-b lg:border-b-0 lg:border-r border-slate-800/80"
            >
              <CallerScreen
                key={roomCode}
                assessment={assessment}
                dispatchPlan={dispatchPlan}
                onTriageComplete={handleTriageComplete}
                onUpdateAssessment={setAssessment}
                onUpdateDispatchPlan={setDispatchPlan}
                conversationLog={conversationLog}
                onAppendConversationLog={(entries) =>
                  setConversationLog((prev) => [...prev, ...entries])
                }
                severityHistory={severityHistory}
                onAppendSeverityChange={(rec) => {
                  setPipelineTimings((prev) => ({
                    ...prev,
                    followup_answers: 340,
                    severity_update: 490,
                  }));
                  setSeverityHistory((prev) => [...prev, rec]);
                }}
                currentQuestionIndex={currentQuestionIndex}
                setCurrentQuestionIndex={setCurrentQuestionIndex}
                currentFirstAidStepIndex={currentFirstAidStepIndex}
                setCurrentFirstAidStepIndex={setCurrentFirstAidStepIndex}
                showConnectDoctorNow={showConnectDoctorNow}
                setShowConnectDoctorNow={setShowConnectDoctorNow}
                ambulanceEtaSeconds={ambulanceEtaSeconds}
                doctorCallState={doctorCallState}
                doctorName={doctorName}
                doctorMessages={doctorMessages}
                selectedCountryCode={selectedCountryCode}
                isLoadingExternal={isLoadingTriage}
                onStartDoctorCall={handleStartDoctorCall}
                onAcceptDoctorCall={handleAcceptDoctorCall}
                onDeclineDoctorCall={handleDeclineDoctorCall}
                onEndDoctorCall={handleEndDoctorCall}
                onCallerSendToDoctor={handleCallerSendMessage}
                onLoadingStateChange={(loadingTriage, updatingTriage) => {
                  setIsLoadingTriage(loadingTriage);
                  setIsUpdatingTriage(updatingTriage);
                }}
                onNavigateToDispatch={() => {}}
              />
            </div>

            {/* Right Side: Operations Command Centre */}
            <div
              data-testid="split-right-ops-pane"
              className="w-full flex-1 min-w-0"
            >
              <OperationsCommandCentre
                roomCode={roomCode}
                sessionVersion={sessionVersion}
                callId={callId}
                callStartedAt={callStartedAt}
                lastSyncedAt={lastSyncedAt}
                isLiveSynced={isLiveSynced}
                assessment={assessment}
                dispatchPlan={dispatchPlan}
                setDispatchPlan={setDispatchPlan}
                conversationLog={conversationLog}
                severityHistory={severityHistory}
                ambulanceEtaSeconds={ambulanceEtaSeconds}
                doctorCallState={doctorCallState}
                doctorName={doctorName}
                doctorMessages={doctorMessages}
                pipelineTimings={pipelineTimings}
                isLoadingTriage={isLoadingTriage}
                isUpdatingTriage={isUpdatingTriage}
                onStartDoctorCall={handleStartDoctorCall}
                onDoctorSendMessage={handleDoctorSendMessage}
                onCallerSendMessage={handleCallerSendMessage}
                onEndDoctorCall={handleEndDoctorCall}
                onAppendConversationLog={(entry) =>
                  setConversationLog((prev) => [...prev, entry])
                }
                onOpenDataset={() => setIsHeaderDatasetOpen(true)}
                onSelectScenario={handleSelectDatasetScenario}
                onSubmitCustomText={handleSubmitCustomText}
                onOpenCollectedCalls={() => setIsCollectedModalOpen(true)}
                collectedCallsCount={collectedCalls.length}
                isSplitView={true}
                selectedCountryCode={selectedCountryCode}
                onChangeCountryCode={handleChangeCountryCode}
                demoDoctorEnabled={demoDoctorEnabled}
                onToggleDemoDoctor={handleToggleDemoDoctor}
                humanDoctorTookOver={humanDoctorTookOver}
                onHumanDoctorTyping={handleHumanDoctorTyping}
                onToggleDoctor={handleToggleDoctorInRegistry}
                onToggleAmbulance={handleToggleAmbulanceInRegistry}
              />
            </div>
          </div>
        )}
      </main>

      {/* Global Dataset Explorer Modal */}
      <DatasetExplorerModal
        isOpen={isHeaderDatasetOpen}
        onClose={() => setIsHeaderDatasetOpen(false)}
        onSelectForCall={handleSelectDatasetScenario}
        onSelectForSMS={handleSelectDatasetScenario}
        liveCollectedScenarios={collectedCalls.map((c) => ({
          id: c.id,
          category: (c.matchedEmergencyCategory as any) || 'Trauma & Hemorrhage',
          emergencyType: c.likelyEmergencyType,
          severity: c.severity,
          confidencePercentage: c.confidencePercentage,
          goldenHourWindowMinutes: c.goldenHourWindowMinutes,
          goldenHourReason: c.goldenHourReason,
          language: c.detectedLanguage,
          group: 'Indian',
          scriptName: c.detectedLanguage,
          nativeText: c.callerAudioOrText,
          englishTranslation: c.callerAudioOrText,
          callerProfile: `Live caller (${c.channel})`,
          vocalToneNote: `Transmitted via ${c.channel} at ${c.timestamp}`,
          landmarkAnchors: c.extractedLandmarks,
          gpsCoordinates: {
            lat: c.resolvedLocation?.latitude || 0,
            lng: c.resolvedLocation?.longitude || 0,
          },
          vitalTriageQuestions: [],
          criticalDos: c.criticalDos,
          fatalDonts: c.fatalDonts,
          recommendedHospitalCapability: c.destinationHospitalName || 'Regional Hospital',
          specialDispatchInstruction: c.dispatchedAmbulanceName || 'Emergency Dispatch',
        }))}
      />

      {/* Live Collected Calls Modal */}
      <CollectedCallsModal
        isOpen={isCollectedModalOpen}
        onClose={() => setIsCollectedModalOpen(false)}
        collectedCalls={collectedCalls}
        onSelectCall={handleSelectCollectedCall}
        onClearCalls={handleClearCollectedCalls}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0a1422] text-xs text-slate-400 py-5 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 120 120" width="20" height="20" role="img" aria-label="GoldenHourAI logo">
              <path d="M28 74 A32 32 0 0 1 92 74 Z" fill="#F2A93B"/>
              <line x1="60" y1="22" x2="60" y2="30" stroke="#F2A93B" strokeWidth="5" strokeLinecap="round"/>
              <line x1="26" y1="36" x2="32" y2="42" stroke="#F2A93B" strokeWidth="5" strokeLinecap="round"/>
              <line x1="94" y1="36" x2="88" y2="42" stroke="#F2A93B" strokeWidth="5" strokeLinecap="round"/>
              <polyline points="6,74 38,74 46,74 52,54 60,96 68,44 76,74 114,74" fill="none" stroke="#FFF7EA" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-semibold text-slate-300">
              GoldenHourAI Rural Emergency Tele-Relay (Simulated)
            </span>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span>GSM Cell Tower SMS Gateway</span>
            <span>·</span>
            <span>Gemini Multimodal Reasoning</span>
            <span>·</span>
            <span className="text-[#F2A93B]">Global Emergency Dispatch</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
