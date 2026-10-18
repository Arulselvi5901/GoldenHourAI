import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectWorseningOrHelpIntent,
  ensureTwoQuestionsWithOptions,
  ensureGuidedFirstAidSteps,
  ensureFatalDontsList,
  computeSeverityTransition,
  formatCountdownMMSS,
  mergeDispatchPlanWithTriageUpdate,
  shouldAutoConnectDoctorAfterTriage,
  getLocalizedCallerQuickRepliesForDoctor,
  buildFallbackDoctorSuggestedPrompts,
  buildFallbackHandoverNote,
  mergeHandoverNoteIntoDispatchPlan,
  resolveRouteFromPathname,
  isEnglishCallerLanguage,
  buildAiPipelineSteps,
  mapLanguageToBcp47,
  getShortReassuranceInCallerLang,
  buildIvrQuestionPrompt,
  buildIvrFirstAidPrompt,
  buildIvrFinalDispatchStatus,
  formatIvrKeypressLog,
  parseSpokenMenuNumber,
  ROOM_SESSION_TTL_MS,
  generateRoomCode,
  normalizeRoomCode,
  resolveRoomCodeFromSearch,
  buildCallerPairingUrl,
  shouldApplyRemoteSession,
  pruneExpiredRoomSessions,
  generateQrMatrix,
  EMERGENCY_NUMBERS_MAP,
  detectCountryFromBrowser,
  resolveActiveEmergencyCountry,
  buildIdlePhoneScreenDisplay,
  buildConnectedCallerIdLabel,
  getCountryDoctorLabel,
  getSimulatedAmbulanceNameForCountry,
  getCommandCentreTitleForCountry,
  ensureWavAudioBase64,
  selectGeminiTtsVoice,
  normalizeDoctorBridgeMessage,
  enqueueCallerSpeechItem,
} from './triageFlowLogic.ts';

test('detectWorseningOrHelpIntent identifies critical and help phrases across languages', () => {
  assert.equal(detectWorseningOrHelpIntent('No, not breathing'), true);
  assert.equal(detectWorseningOrHelpIntent('I need help now'), true);
  assert.equal(detectWorseningOrHelpIntent('இல்லை, மூச்சு விடவில்லை'), true);
  assert.equal(detectWorseningOrHelpIntent('नहीं, सांस नहीं चल रही है'), true);
  assert.equal(detectWorseningOrHelpIntent('Yes, breathing normally'), false);
});

test('ensureTwoQuestionsWithOptions generates 2 questions each with 4 bilingual options', () => {
  const questions = ensureTwoQuestionsWithOptions(
    [
      {
        id: 'q1',
        questionEnglish: 'Is the patient breathing normally?',
        questionCallerLang: 'நோயாளி சீராக மூச்சு விடுகிறாரா?',
        purpose: 'Check airway',
      },
      {
        id: 'q2',
        questionEnglish: 'Does he respond when tapped?',
        questionCallerLang: 'தட்டினால் கண் திறக்கிறாரா?',
        purpose: 'Check consciousness',
      },
    ],
    'Tamil'
  );

  assert.equal(questions.length, 2);
  assert.equal(questions[0].options?.length, 4);
  assert.equal(questions[1].options?.length, 4);
  assert.ok(questions[0].options![0].textCallerLang.length > 0);
  assert.ok(questions[0].options![0].textEnglish.length > 0);
});

test('ensureGuidedFirstAidSteps guarantees 4 to 6 steps in caller language and English', () => {
  const steps = ensureGuidedFirstAidSteps(
    [
      {
        stepNumber: 1,
        stepCallerLang: 'சமமாக படுக்க வைக்கவும்.',
        stepEnglish: 'Lay flat on ground.',
      },
    ],
    'Tamil',
    'Cardiac Arrest'
  );

  assert.ok(steps.length >= 4 && steps.length <= 6);
  assert.equal(steps[0].stepNumber, 1);
  assert.equal(steps[3].stepNumber, 4);
});

test('ensureFatalDontsList returns dangerous myths to avoid', () => {
  const myths = ensureFatalDontsList([], 'Snakebite Envenomation');
  assert.ok(myths.length >= 3);
  assert.ok(myths.some((m) => m.includes('tourniquet')));
});

test('computeSeverityTransition upgrades Serious to Critical on worsening answer', () => {
  const transition = computeSeverityTransition({
    previousSeverity: 'Serious',
    previousConfidence: 86,
    answerText: 'No, not breathing',
    isHelpRequest: false,
  });

  assert.equal(transition.previousSeverity, 'Serious');
  assert.equal(transition.newSeverity, 'Critical');
  assert.ok(transition.newConfidence >= 90);
  assert.ok(transition.reason.length > 10);
});

test('formatCountdownMMSS formats seconds properly', () => {
  assert.equal(formatCountdownMMSS(1080), '18:00');
  assert.equal(formatCountdownMMSS(65), '01:05');
  assert.equal(formatCountdownMMSS(0), '00:00');
});

test('mergeDispatchPlanWithTriageUpdate updates HospitalPreAlert live', () => {
  const mockPlan: any = {
    selectedAmbulance: { id: 'a1', name: 'Amb 1', etaMinutes: 15, selectionReason: 'Closest' },
    selectedHospital: { id: 'h1', name: 'Hosp 1', etaMinutes: 22, capabilityMatch: 'Trauma', selectionReason: 'Best' },
    selectedVolunteer: { id: 'v1', name: 'Vol 1', etaMinutes: 5, vehicle: 'Bike', assignedReason: 'Fast', dispatched: true },
    hospitalPreAlert: {
      patientProfile: 'Male 55',
      primarySymptoms: ['Chest pain'],
      estimatedOnset: '15m ago',
      firstAidAdministered: [],
      destinationHospitalId: 'h1',
      destinationHospitalName: 'Hosp 1',
      etaMinutes: 22,
      requiredPrepTeams: ['Cardiac Team'],
      transmissionStatus: 'Sent',
    },
  };
  const mockAssessment: any = {
    patientSummary: 'Male 55 with chest pain',
  };
  const sevChange = {
    previousSeverity: 'Serious' as const,
    newSeverity: 'Critical' as const,
    previousConfidence: 85,
    newConfidence: 96,
    reason: 'Stopped breathing',
    timestamp: '10:05 AM',
    triggerAnswer: 'No, not breathing',
  };

  const updated = mergeDispatchPlanWithTriageUpdate(
    mockPlan,
    mockAssessment,
    sevChange,
    'Caller confirmed patient not breathing',
    'Step 1: Airway opened'
  );

  assert.ok(updated);
  assert.ok(updated!.hospitalPreAlert.primarySymptoms.some((s) => s.includes('not breathing')));
  assert.ok(updated!.hospitalPreAlert.firstAidAdministered.includes('Step 1: Airway opened'));
  assert.ok(updated!.hospitalPreAlert.patientProfile.includes('Serious → Critical'));
});

test('shouldAutoConnectDoctorAfterTriage returns true only when questions completed and severity is Critical', () => {
  assert.equal(shouldAutoConnectDoctorAfterTriage('Critical', true), true);
  assert.equal(shouldAutoConnectDoctorAfterTriage('Critical', false), false);
  assert.equal(shouldAutoConnectDoctorAfterTriage('Serious', true), false);
});

test('getLocalizedCallerQuickRepliesForDoctor and buildFallbackDoctorSuggestedPrompts return bilingual entries', () => {
  const replies = getLocalizedCallerQuickRepliesForDoctor('Tamil');
  assert.equal(replies.length, 4);
  assert.ok(replies[0].textCallerLang.length > 0);
  assert.ok(replies[0].textEnglish.length > 0);

  const prompts = buildFallbackDoctorSuggestedPrompts(
    {
      detectedLanguage: 'Tamil',
      likelyEmergencyType: 'Cardiac Arrest',
      patientSummary: 'Unconscious male',
    } as any,
    1
  );
  assert.equal(prompts.length, 4);
  assert.ok(prompts[0].english.length > 0);
  assert.ok(prompts[0].translated.length > 0);
});

test('buildFallbackHandoverNote and mergeHandoverNoteIntoDispatchPlan attach handover note to HospitalPreAlert', () => {
  const handover = buildFallbackHandoverNote({
    assessment: {
      likelyEmergencyType: 'Acute Respiratory Distress',
      severity: 'Critical',
      confidencePercentage: 98,
      patientSummary: 'Elderly male collapsed in field',
      estimatedLocation: {
        description: 'Keelapatti Water Tank',
        latitude: 10.64,
        longitude: 78.59,
        landmarkAnchor: 'Water Tank',
        accessNotes: 'Dirt track',
      },
      firstAidSteps: [],
    } as any,
    conversationLog: [
      {
        id: '1',
        timestamp: '10:12 AM',
        role: 'caller',
        stage: 'guided_first_aid',
        textCallerLang: '✅ Done – Step 1',
        textEnglish: 'Completed First-Aid Step 1: Head-tilt chin-lift',
      },
    ],
    doctorMessages: [
      {
        id: 'd1',
        sender: 'doctor',
        originalText: 'Keep airway open and monitor chest rise.',
        translatedText: 'காற்றுக்குழாய் திறந்திருக்கட்டும்.',
        originalLang: 'English',
        targetLang: 'Tamil',
        timestamp: '10:13 AM',
      },
      {
        id: 'c1',
        sender: 'caller',
        originalText: 'மூச்சு சீராக உள்ளது',
        translatedText: 'Breathing is steadier now',
        originalLang: 'Tamil',
        targetLang: 'English',
        timestamp: '10:14 AM',
      },
    ],
    doctorName: 'Dr. Arvind',
  });

  assert.ok(handover.whatHappened.includes('Acute Respiratory Distress'));
  assert.ok(handover.firstAidGivenWithTimes.length >= 2);
  assert.ok(handover.currentStatus.includes('Breathing is steadier now'));

  const mergedPlan = mergeHandoverNoteIntoDispatchPlan(null, handover);
  assert.ok(mergedPlan.hospitalPreAlert.doctorHandoverNote);
  assert.equal(
    mergedPlan.hospitalPreAlert.doctorHandoverNote?.whatHappened,
    handover.whatHappened
  );
});

test('resolveRouteFromPathname maps /, /caller, and /ops accurately', () => {
  assert.equal(resolveRouteFromPathname('/'), 'split');
  assert.equal(resolveRouteFromPathname('/caller'), 'caller');
  assert.equal(resolveRouteFromPathname('/caller/'), 'caller');
  assert.equal(resolveRouteFromPathname('/ops'), 'ops');
  assert.equal(resolveRouteFromPathname('/ops/'), 'ops');
});

test('isEnglishCallerLanguage returns false for regional languages and true for English', () => {
  assert.equal(isEnglishCallerLanguage('Tamil (Rural Pudukkottai Dialect)'), false);
  assert.equal(isEnglishCallerLanguage('Hindi'), false);
  assert.equal(isEnglishCallerLanguage('Japanese'), false);
  assert.equal(isEnglishCallerLanguage('English / Vernacular'), false);
  assert.equal(isEnglishCallerLanguage('English'), true);
  assert.equal(isEnglishCallerLanguage('English (India)'), true);
});

test('buildAiPipelineSteps produces all 9 expandable Gemini pipeline steps in order', () => {
  const emptySteps = buildAiPipelineSteps({
    assessment: null,
    dispatchPlan: null,
    conversationLog: [],
    severityHistory: [],
    doctorCallState: 'idle',
  });
  assert.equal(emptySteps.length, 9);
  assert.deepEqual(
    emptySteps.map((s) => s.title),
    [
      'Transcription',
      'Language & country',
      'Location geocoding',
      'Triage',
      'Follow-up answers',
      'Severity update',
      'Dispatch decision',
      'Hospital pre-alert',
      'Doctor briefing',
    ]
  );
  assert.ok(emptySteps.every((s) => s.status === 'pending'));

  const populatedSteps = buildAiPipelineSteps({
    assessment: {
      transcribedText: 'appa vayalla vilundhutaaru',
      detectedLanguage: 'Tamil',
      country: 'India',
      countryCode: 'IN',
      countryFlag: '🇮🇳',
      localEmergencyNumber: '112 / 108',
      shortEnglishTranslation: 'Father collapsed in field',
      patientSummary: 'Elderly male collapsed',
      likelyEmergencyType: 'Cardiac Arrest',
      severity: 'Critical',
      confidencePercentage: 96,
      severityReasoning: 'Unresponsive with abnormal breathing',
      landmarksMentioned: ['Keelapatti school'],
      estimatedLocation: {
        description: 'Keelapatti Village, Tamil Nadu',
        latitude: 10.6455,
        longitude: 78.5912,
        landmarkAnchor: 'School',
        accessNotes: 'Paved road',
      },
      triageQuestions: [
        {
          id: 'q1',
          questionEnglish: 'Is he breathing?',
          questionCallerLang: 'மூச்சு விடுகிறாரா?',
          purpose: 'Airway check',
          answeredText: 'இல்லை',
          answeredEnglish: 'No, not breathing',
        },
      ],
      firstAidSteps: [],
      callerReplySMS: 'Help sent',
    } as any,
    dispatchPlan: {
      selectedAmbulance: {
        id: 'amb-1',
        name: '108 ALS Ambulance',
        etaMinutes: 14,
        selectionReason: 'Nearest ALS unit',
      },
      selectedHospital: {
        id: 'hosp-1',
        name: 'Apollo Trichy',
        etaMinutes: 24,
        capabilityMatch: 'Cath Lab',
        selectionReason: '24/7 Cath Lab',
      },
      selectedVolunteer: {
        id: 'vol-1',
        name: 'Murugan',
        etaMinutes: 5,
        vehicle: 'Motorbike',
        assignedReason: 'Rapid airway response',
        dispatched: true,
      },
      hospitalPreAlert: {
        patientProfile: 'Elderly male',
        primarySymptoms: ['Unconscious'],
        estimatedOnset: '15m ago',
        firstAidAdministered: ['Chin lift'],
        destinationHospitalId: 'hosp-1',
        destinationHospitalName: 'Apollo Trichy',
        etaMinutes: 24,
        requiredPrepTeams: ['Cath Lab Team'],
        transmissionStatus: 'Transmitted',
      },
    },
    conversationLog: [
      {
        id: 'c1',
        timestamp: '10:01 AM',
        role: 'caller',
        stage: 'question_1',
        textCallerLang: 'இல்லை',
        textEnglish: 'No, not breathing',
      },
    ],
    severityHistory: [
      {
        previousSeverity: 'Serious',
        newSeverity: 'Critical',
        previousConfidence: 88,
        newConfidence: 98,
        reason: 'Confirmed apnea',
        timestamp: '10:01 AM',
        triggerAnswer: 'No, not breathing',
      },
    ],
    doctorCallState: 'connected',
    pipelineTimings: {
      transcription: 412,
      language_country: 295,
      location_geocoding: 530,
    },
  });

  assert.equal(populatedSteps[0].status, 'completed');
  assert.equal(populatedSteps[0].durationMs, 412);
  assert.equal(populatedSteps[5].status, 'completed');
  assert.ok(populatedSteps[5].summary.includes('Serious → Critical'));
  assert.equal(populatedSteps[6].status, 'completed');
  assert.equal(populatedSteps[8].status, 'completed');
});

test('mapLanguageToBcp47 maps languages to speechSynthesis BCP-47 tags', () => {
  assert.deepEqual(mapLanguageToBcp47('Tamil'), { langCode: 'ta-IN', prefix: 'ta' });
  assert.deepEqual(mapLanguageToBcp47('Hindi'), { langCode: 'hi-IN', prefix: 'hi' });
  assert.deepEqual(mapLanguageToBcp47('Japanese'), { langCode: 'ja-JP', prefix: 'ja' });
  assert.deepEqual(mapLanguageToBcp47('Bahasa Indonesia'), { langCode: 'id-ID', prefix: 'id' });
  assert.deepEqual(mapLanguageToBcp47('English'), { langCode: 'en-IN', prefix: 'en' });
});

test('buildIvrQuestionPrompt builds numbered 1-2-3 menu and spoken prompt', () => {
  const q = {
    id: 'q1',
    questionEnglish: 'Is he breathing?',
    questionCallerLang: 'Is he breathing?',
    purpose: 'Airway check',
    options: [
      { id: '1', textCallerLang: 'Breathing', textEnglish: 'Breathing' },
      { id: '2', textCallerLang: 'Not breathing', textEnglish: 'Not breathing' },
      { id: '3', textCallerLang: 'Not sure', textEnglish: 'Not sure' },
    ],
  };
  const prompt = buildIvrQuestionPrompt(q, 'English', 0);
  assert.equal(prompt.options.length, 3);
  assert.equal(prompt.menuShortLine, '1 Breathing / 2 Not breathing / 3 Not sure');
  assert.ok(prompt.spokenPrompt.includes('Press 1 if breathing'));
  assert.ok(prompt.spokenPrompt.includes('Press 2 if not breathing'));
  assert.ok(prompt.spokenPrompt.includes('Press 3 if not sure'));
});

test('buildIvrFirstAidPrompt and buildIvrFinalDispatchStatus format IVR instructions', () => {
  const fa = buildIvrFirstAidPrompt(
    {
      stepNumber: 1,
      stepEnglish: 'Tilt head back and lift chin.',
      stepCallerLang: 'Tilt head back and lift chin.',
    },
    'English'
  );
  assert.ok(fa.spokenPrompt.includes('Step 1:'));
  assert.ok(fa.spokenPrompt.includes('Press 1 when done.'));
  assert.ok(fa.spokenPrompt.includes('Press 0 to talk to a doctor.'));

  const finalStatus = buildIvrFinalDispatchStatus({
    dispatchPlan: null,
    assessment: null,
    ambulanceEtaSeconds: 14 * 60,
    responderEtaSeconds: 5 * 60,
    doctorConnected: true,
  });
  assert.equal(
    finalStatus.spokenStatus,
    'Emergency doctor connected. Ambulance arriving in 14 minutes. Emergency responder arriving in 5 minutes.'
  );
  assert.ok(finalStatus.ambulanceLineCaller.includes('14:00'));
  assert.ok(finalStatus.responderLineCaller.includes('05:00'));
});

test('formatIvrKeypressLog and parseSpokenMenuNumber handle DTMF and voice digits', () => {
  const kp = formatIvrKeypressLog('2', 'Not breathing', 'மூச்சு விடவில்லை');
  assert.equal(kp.logEnglish, 'Caller pressed 2 → Not breathing');
  assert.equal(kp.logCallerLang, 'Caller pressed 2 → மூச்சு விடவில்லை');

  assert.equal(parseSpokenMenuNumber('press 1'), '1');
  assert.equal(parseSpokenMenuNumber('இரண்டு'), '2');
  assert.equal(parseSpokenMenuNumber('तीन'), '3');
  assert.equal(parseSpokenMenuNumber('0'), '0');
  assert.equal(parseSpokenMenuNumber('repeat *'), '*');

  const stepsWithKeypress = buildAiPipelineSteps({
    assessment: {
      transcribedText: 'test',
      detectedLanguage: 'English',
      shortEnglishTranslation: 'test',
      patientSummary: 'test',
      likelyEmergencyType: 'Cardiac',
      severity: 'Critical',
      confidencePercentage: 95,
      severityReasoning: 'test',
      landmarksMentioned: [],
      estimatedLocation: {
        description: 'test',
        latitude: 10,
        longitude: 78,
        landmarkAnchor: 'test',
        accessNotes: 'test',
      },
      triageQuestions: [],
      firstAidSteps: [],
      callerReplySMS: 'test',
    },
    dispatchPlan: null,
    conversationLog: [
      {
        id: 'kp-1',
        timestamp: '10:05 AM',
        role: 'caller',
        stage: 'question_1',
        textCallerLang: kp.logCallerLang,
        textEnglish: kp.logEnglish,
      },
    ],
    severityHistory: [],
    doctorCallState: 'idle',
  });
  assert.ok(stepsWithKeypress[4].summary.includes('Caller pressed 2 → Not breathing'));
  assert.ok(stepsWithKeypress[4].whatGeminiDecided.includes('Caller pressed 2 → Not breathing'));
});

test('room code generation, URL search parsing, and mobile caller pairing URL builder', () => {
  const code = generateRoomCode(6);
  assert.equal(code.length, 6);
  assert.match(code, /^[A-Z0-9]{6}$/);

  assert.equal(normalizeRoomCode(' abc123 '), 'ABC123');
  assert.equal(normalizeRoomCode('a-b_c 99'), 'ABC99');
  assert.equal(normalizeRoomCode('ab'), null);

  assert.equal(resolveRoomCodeFromSearch('?room=xyz789'), 'XYZ789');
  assert.equal(resolveRoomCodeFromSearch('?foo=1&room=k9p2m4'), 'K9P2M4');
  assert.equal(resolveRoomCodeFromSearch(''), null);

  assert.equal(
    buildCallerPairingUrl('https://goldenhour.example.com/', 'abc123'),
    'https://goldenhour.example.com/caller?room=ABC123'
  );
});

test('shouldApplyRemoteSession compares version numbers strictly without clock comparison', () => {
  assert.equal(shouldApplyRemoteSession(1, 0), true);
  assert.equal(shouldApplyRemoteSession(5, 2), true);
  assert.equal(shouldApplyRemoteSession(2, 2), false);
  assert.equal(shouldApplyRemoteSession(1, 3), false);
  assert.equal(shouldApplyRemoteSession(undefined, 0), false);
});

test('pruneExpiredRoomSessions deletes sessions older than 2 hours and keeps active sessions', () => {
  const now = 1_700_000_000_000;
  const twoHoursPlusOneMin = now - ROOM_SESSION_TTL_MS - 60_000;
  const oneHourAgo = now - 60 * 60 * 1000;

  const store = new Map<string, { updatedAt: number; version: number }>([
    ['OLD123', { updatedAt: twoHoursPlusOneMin, version: 3 }],
    ['NEW456', { updatedAt: oneHourAgo, version: 5 }],
  ]);

  const deleted = pruneExpiredRoomSessions(store, now, ROOM_SESSION_TTL_MS);
  assert.equal(deleted, 1);
  assert.equal(store.has('OLD123'), false);
  assert.equal(store.has('NEW456'), true);
});

test('generateQrMatrix generates a 21x21 QR matrix with corner finder patterns', () => {
  const matrix = generateQrMatrix('http://localhost:3000/caller?room=ABC123');
  assert.equal(matrix.length, 21);
  assert.equal(matrix[0].length, 21);
  // Top-left finder corners and center
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[0][6], true);
  assert.equal(matrix[3][3], true);
  // Top-right finder corner
  assert.equal(matrix[0][20], true);
  // Bottom-left finder corner
  assert.equal(matrix[20][0], true);
});

test('detectCountryFromBrowser resolves country from timezone and language with 112 fallback', () => {
  const jp = detectCountryFromBrowser('Asia/Tokyo', 'en-US');
  assert.equal(jp.country, 'Japan');
  assert.equal(jp.emergencyNumber, '119');
  assert.equal(jp.flag, '🇯🇵');
  assert.equal(jp.isKnown, true);

  const cn = detectCountryFromBrowser('Asia/Shanghai', 'zh-CN');
  assert.equal(cn.country, 'China');
  assert.equal(cn.emergencyNumber, '120');
  assert.equal(cn.flag, '🇨🇳');

  const ind = detectCountryFromBrowser('Asia/Kolkata', 'ta-IN');
  assert.equal(ind.country, 'India');
  assert.equal(ind.emergencyNumber, '112 / 108');
  assert.equal(ind.flag, '🇮🇳');

  const sg = detectCountryFromBrowser('Asia/Singapore', 'en-SG');
  assert.equal(sg.country, 'Singapore');
  assert.equal(sg.emergencyNumber, '995');
  assert.equal(sg.flag, '🇸🇬');

  const langFallback = detectCountryFromBrowser('Etc/UTC', 'ja-JP');
  assert.equal(langFallback.country, 'Japan');
  assert.equal(langFallback.emergencyNumber, '119');

  const unknown = detectCountryFromBrowser('Etc/UTC', 'xx');
  assert.equal(unknown.isKnown, false);
  assert.equal(unknown.emergencyNumber, '112');
});

test('buildIdlePhoneScreenDisplay and buildConnectedCallerIdLabel format country numbers and flags', () => {
  const jpInfo = detectCountryFromBrowser('Asia/Tokyo', 'ja-JP');
  const jpIdle = buildIdlePhoneScreenDisplay(jpInfo, '');
  assert.equal(jpIdle.screenLines[0], 'Emergency? Dial 119');
  assert.ok(jpIdle.screenLines[1].includes('🇯🇵 Japan'));

  const inInfo = detectCountryFromBrowser('Asia/Kolkata', 'en-IN');
  const inIdle = buildIdlePhoneScreenDisplay(inInfo, '');
  assert.equal(inIdle.screenLines[0], 'Emergency? Dial 112 / 108');
  assert.ok(inIdle.screenLines[1].includes('🇮🇳 India'));

  const unknownInfo = detectCountryFromBrowser('Etc/UTC', 'xx');
  const unknownIdle = buildIdlePhoneScreenDisplay(unknownInfo, '');
  assert.equal(unknownIdle.screenLines[0], 'Dial your local emergency number');
  assert.ok(unknownIdle.screenLines[1].includes('112'));

  // Any number dialled still shows local number on screen
  const dialledIdle = buildIdlePhoneScreenDisplay(jpInfo, '999');
  assert.equal(dialledIdle.screenLines[0], 'Emergency? Dial 119');
  assert.ok(dialledIdle.screenLines.some((l) => l.includes('999')));

  // Connected caller ID updates to detected country during call
  const connectedJp = buildConnectedCallerIdLabel(jpInfo);
  assert.equal(
    connectedJp,
    'Connected – 119 Emergency (Japan) via GoldenHourAI (Simulated)'
  );
});

test('country-based labels replace fixed India-only text unless country is India', () => {
  assert.equal(getCountryDoctorLabel('India'), 'Dr. Arvind (108 ER)');
  assert.equal(getCountryDoctorLabel('Japan'), 'Dr. Kenji Sato (Emergency Doctor)');
  assert.equal(getCountryDoctorLabel(undefined), 'Dr. Elena Rostova (Emergency Doctor)');

  assert.equal(
    getSimulatedAmbulanceNameForCountry('India', 1),
    '108 Ambulance Alpha (Simulated)'
  );
  assert.equal(
    getSimulatedAmbulanceNameForCountry('Japan', 1),
    'Ambulance (Simulated)'
  );
  assert.equal(
    getSimulatedAmbulanceNameForCountry(undefined, 1),
    'Ambulance (Simulated)'
  );

  assert.equal(
    getCommandCentreTitleForCountry('India'),
    '108 Emergency Command Centre'
  );
  assert.equal(
    getCommandCentreTitleForCountry('Singapore'),
    'Emergency Command Centre'
  );
  assert.equal(
    getCommandCentreTitleForCountry(undefined),
    'Emergency Command Centre'
  );
  assert.ok(EMERGENCY_NUMBERS_MAP.JP.emergencyNumber === '119');
});

test('ensureWavAudioBase64 wraps raw PCM in a 44-byte RIFF WAV header and preserves existing WAV buffers', () => {
  // 4 bytes of raw 16-bit PCM (2 samples)
  const rawPcm = Buffer.from([0x00, 0x10, 0x00, 0x20]).toString('base64');
  const wrapped = ensureWavAudioBase64(rawPcm, 'audio/L16;codec=pcm;rate=24000');
  assert.equal(wrapped.mimeType, 'audio/wav');
  assert.equal(wrapped.sampleRate, 24000);

  const wavBuf = Buffer.from(wrapped.audioBase64, 'base64');
  assert.equal(wavBuf.length, 44 + 4);
  assert.equal(wavBuf.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(wavBuf.subarray(8, 12).toString('ascii'), 'WAVE');

  // Calling ensureWavAudioBase64 again on an already-wrapped WAV keeps it unchanged
  const preserved = ensureWavAudioBase64(wrapped.audioBase64, 'audio/wav');
  assert.equal(preserved.audioBase64, wrapped.audioBase64);
  assert.equal(preserved.sampleRate, 24000);
});

test('selectGeminiTtsVoice, normalizeDoctorBridgeMessage, and enqueueCallerSpeechItem work as expected', () => {
  assert.equal(selectGeminiTtsVoice('Tamil', 'operator'), 'Kore');
  assert.equal(selectGeminiTtsVoice('Tamil', 'doctor'), 'Charon');
  assert.equal(selectGeminiTtsVoice('Tamil', 'caller'), 'Puck');

  const normalized = normalizeDoctorBridgeMessage(
    {
      id: 'm1',
      sender: 'doctor',
      originalText: 'Keep patient calm',
      translatedText: 'நோயாளியை அமைதியாக வைத்திருங்கள்',
      originalLanguage: 'English',
      targetLanguage: 'Tamil',
      timestamp: '10:00 AM',
    },
    'Tamil'
  );
  assert.equal(normalized.originalLang, 'English');
  assert.equal(normalized.targetLang, 'Tamil');

  let queue = enqueueCallerSpeechItem([], {
    id: 's1',
    text: 'உதவி ஏற்பாடு செய்யப்படுகிறது.',
    language: 'Tamil',
    role: 'operator',
  });
  queue = enqueueCallerSpeechItem(queue, {
    id: 's2',
    text: 'நோயாளி பேச முடிகிறதா? ஆம் என்றால் 1-ஐ அழுத்தவும்.',
    language: 'Tamil',
    role: 'operator',
  });
  assert.equal(queue.length, 2);
  assert.equal(queue[0].id, 's1');
  assert.equal(queue[1].id, 's2');
});
