import type {
  SeverityLevel,
  TriageQuestion,
  TriageAnswerOption,
  FirstAidStep,
  SeverityChangeRecord,
  DispatchPlan,
  TriageAssessment,
  ConversationLogEntry,
  DoctorCallState,
  DoctorBridgeMessage,
  DoctorCheckOption,
  DoctorHandoverNote,
  AppViewRoute,
  AiPipelineStep,
} from '../types/emergency.ts';

/**
 * Detects whether a caller message or button action indicates worsening condition or need for help.
 */
export function detectWorseningOrHelpIntent(text: string): boolean {
  const lower = (text || '').toLowerCase();
  const keywords = [
    'need help',
    'i need help',
    'worse',
    'getting worse',
    'not breathing',
    'stopped breathing',
    'no pulse',
    'unconscious',
    'unresponsive',
    'bleeding heavily',
    'gurgling',
    'snoring',
    'blue lips',
    'seizure',
    'convulsion',
    'doctor',
    'மூச்சு வரல',
    'மூச்சு இல்ல',
    'மூச்சு விடவில்லை',
    'பேசல',
    'மயக்கம்',
    'கண் திறக்கல',
    'கண் திறக்கவில்லை',
    'அசைவு இல்லை',
    'உதவி',
    'सांस नहीं',
    'बेहोश',
    'खून बह',
    'मदद',
    'ज्यादा खराब',
    '息をしていない',
    '意識がない',
    '悪化',
    'tidak bernapas',
    'pingsan',
    'walang malay',
    'hindi humihinga',
  ];
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Generates localized 3-4 short answer options for a triage question based on language and question topic.
 */
export function getLocalizedOptionsForQuestion(
  questionEnglish: string,
  detectedLanguage: string,
  qIndex: number
): TriageAnswerOption[] {
  const qLower = (questionEnglish || '').toLowerCase();
  const langLower = (detectedLanguage || '').toLowerCase();

  const isBreathing =
    qLower.includes('breath') ||
    qLower.includes('chest') ||
    qLower.includes('airway') ||
    qLower.includes('gurgling') ||
    qLower.includes('chok');
  const isConsciousness =
    qLower.includes('respond') ||
    qLower.includes('conscious') ||
    qLower.includes('awake') ||
    qLower.includes('eyes') ||
    qLower.includes('talk') ||
    qLower.includes('alert') ||
    qLower.includes('tap');
  const isBleedingOrPain =
    qLower.includes('bleed') ||
    qLower.includes('blood') ||
    qLower.includes('wound') ||
    qLower.includes('pain') ||
    qLower.includes('swell') ||
    qLower.includes('bite');

  // Helper to build option list
  const buildOptions = (
    items: Array<{ caller: string; en: string }>
  ): TriageAnswerOption[] =>
    items.map((item, idx) => ({
      id: `opt-q${qIndex + 1}-${idx + 1}`,
      textCallerLang: item.caller,
      textEnglish: item.en,
    }));

  if (langLower.includes('tamil')) {
    if (isBreathing || qIndex === 0) {
      return buildOptions([
        { caller: 'ஆம், சீராக மூச்சு விடுகிறார்', en: 'Yes, breathing normally' },
        { caller: 'இல்லை, மூச்சு விடவில்லை', en: 'No, not breathing' },
        { caller: 'குறட்டை / சத்தத்துடன் மூச்சு விடுகிறார்', en: 'Breathing with gurgling/noise' },
        { caller: 'உறுதியாக தெரியவில்லை', en: 'Not sure' },
      ]);
    }
    if (isConsciousness) {
      return buildOptions([
        { caller: 'ஆம், கண் திறந்து பார்க்கிறார்', en: 'Yes, awake and responding' },
        { caller: 'இல்லை, சுத்தமாக அசைவில்லை', en: 'No, completely unresponsive' },
        { caller: 'லேசாக முனகுகிறார் / அசைவு மட்டும் உள்ளது', en: 'Groaning or slight movement only' },
        { caller: 'உறுதியாக தெரியவில்லை', en: 'Not sure' },
      ]);
    }
    if (isBleedingOrPain) {
      return buildOptions([
        { caller: 'அதிகமாக ரத்தம் வெளியேறுகிறது / வீக்கம் பரவுகிறது', en: 'Heavy bleeding / fast swelling' },
        { caller: 'லேசான ரத்தம் / கட்டுக்குள் உள்ளது', en: 'Mild bleeding / controlled' },
        { caller: 'மிகக் கடுமையான வலி மற்றும் மயக்கம்', en: 'Severe pain and dizziness' },
        { caller: 'உறுதியாக தெரியவில்லை', en: 'Not sure' },
      ]);
    }
    return buildOptions([
      { caller: 'ஆம், அறிகுறி தீவிரமாக உள்ளது', en: 'Yes, symptoms are severe' },
      { caller: 'இல்லை, அசைவு இல்லை / மோசமாகிறது', en: 'No response / getting worse' },
      { caller: 'சிறிது முன்னேற்றம் உள்ளது', en: 'Slightly stable right now' },
      { caller: 'உறுதியாக தெரியவில்லை', en: 'Not sure' },
    ]);
  }

  if (langLower.includes('hindi')) {
    if (isBreathing || qIndex === 0) {
      return buildOptions([
        { caller: 'हाँ, सामान्य सांस चल रही है', en: 'Yes, breathing normally' },
        { caller: 'नहीं, सांस नहीं चल रही है', en: 'No, not breathing' },
        { caller: 'आवाज़ / घरघराहट के साथ सांस आ रही है', en: 'Breathing with noise/gasping' },
        { caller: 'पक्का पता नहीं', en: 'Not sure' },
      ]);
    }
    if (isConsciousness) {
      return buildOptions([
        { caller: 'हाँ, आँखें खोल रहे हैं और जवाब दे रहे हैं', en: 'Yes, awake and responding' },
        { caller: 'नहीं, बिल्कुल बेहोश हैं', en: 'No, completely unresponsive' },
        { caller: 'सिर्फ हल्की हलचल या कराह रहे हैं', en: 'Slight movement or groaning only' },
        { caller: 'पक्का पता नहीं', en: 'Not sure' },
      ]);
    }
    return buildOptions([
      { caller: 'हाँ, हालत बहुत गंभीर है', en: 'Yes, condition is very severe' },
      { caller: 'नहीं, कोई प्रतिक्रिया नहीं है', en: 'No, unresponsive / worsening' },
      { caller: 'तेज दर्द और पसीना आ रहा है', en: 'Severe pain and heavy sweating' },
      { caller: 'पक्का पता नहीं', en: 'Not sure' },
    ]);
  }

  if (langLower.includes('japanese')) {
    if (isBreathing || qIndex === 0) {
      return buildOptions([
        { caller: 'はい、普通に呼吸しています', en: 'Yes, breathing normally' },
        { caller: 'いいえ、呼吸していません', en: 'No, not breathing' },
        { caller: '苦しそうな音・いびきのような呼吸です', en: 'Breathing with noise/gasping' },
        { caller: 'わかりません', en: 'Not sure' },
      ]);
    }
    return buildOptions([
      { caller: 'はい、意識があり反応します', en: 'Yes, conscious and responding' },
      { caller: 'いいえ、呼びかけに反応しません', en: 'No, unresponsive to voice/touch' },
      { caller: '少し動くだけです', en: 'Only slight movement' },
      { caller: 'わかりません', en: 'Not sure' },
    ]);
  }

  if (langLower.includes('indonesian') || langLower.includes('malay') || langLower.includes('bahasa')) {
    if (isBreathing || qIndex === 0) {
      return buildOptions([
        { caller: 'Ya, bernapas dengan normal', en: 'Yes, breathing normally' },
        { caller: 'Tidak, berhenti bernapas', en: 'No, not breathing' },
        { caller: 'Bernapas dengan suara tersengal', en: 'Breathing with noise/gasping' },
        { caller: 'Tidak yakin', en: 'Not sure' },
      ]);
    }
    return buildOptions([
      { caller: 'Ya, sadar dan merespons', en: 'Yes, conscious and responding' },
      { caller: 'Tidak, pingsan / tidak merespons', en: 'No, unconscious / unresponsive' },
      { caller: 'Hanya mengerang lemah', en: 'Weak groaning only' },
      { caller: 'Tidak yakin', en: 'Not sure' },
    ]);
  }

  if (langLower.includes('tagalog') || langLower.includes('filipino')) {
    if (isBreathing || qIndex === 0) {
      return buildOptions([
        { caller: 'Oo, humihinga nang maayos', en: 'Yes, breathing normally' },
        { caller: 'Hindi, hindi humihinga', en: 'No, not breathing' },
        { caller: 'Hirap huminga at may tunog', en: 'Breathing with noise/difficulty' },
        { caller: 'Hindi sigurado', en: 'Not sure' },
      ]);
    }
    return buildOptions([
      { caller: 'Oo, gising at sumasagot', en: 'Yes, awake and responding' },
      { caller: 'Hindi, walang malay', en: 'No, unconscious / unresponsive' },
      { caller: 'Bahagyang gumagalaw lang', en: 'Slight movement only' },
      { caller: 'Hindi sigurado', en: 'Not sure' },
    ]);
  }

  if (langLower.includes('spanish')) {
    if (isBreathing || qIndex === 0) {
      return buildOptions([
        { caller: 'Sí, está respirando', en: 'Yes, breathing' },
        { caller: 'No, no respira', en: 'No, not breathing' },
        { caller: 'Respira con ruido o dificultad', en: 'Breathing with noise' },
        { caller: 'No estoy seguro', en: 'Not sure' },
      ]);
    }
    return buildOptions([
      { caller: 'Sí, responde cuando le hablo', en: 'Yes, responds when spoken to' },
      { caller: 'No, está inconsciente', en: 'No, unconscious' },
      { caller: 'Solo se mueve un poco', en: 'Only moves slightly' },
      { caller: 'No estoy seguro', en: 'Not sure' },
    ]);
  }

  // Default English / Global fallback
  if (isBreathing || qIndex === 0) {
    return buildOptions([
      { caller: 'Yes, breathing', en: 'Yes, breathing normally' },
      { caller: 'No, not breathing', en: 'No, not breathing at all' },
      { caller: 'Breathing with noise', en: 'Gasping or gurgling breathing' },
      { caller: 'Not sure', en: 'Hard to tell / Not sure' },
    ]);
  }
  if (isConsciousness) {
    return buildOptions([
      { caller: 'Yes, awake and responding', en: 'Opens eyes or speaks when tapped' },
      { caller: 'No, completely unresponsive', en: 'No movement or eye opening' },
      { caller: 'Groaning / slight movement', en: 'Reacts slightly to pain/tap' },
      { caller: 'Not sure', en: 'Hard to tell / Not sure' },
    ]);
  }
  return buildOptions([
    { caller: 'Yes, symptoms getting worse', en: 'Yes, severe and progressing fast' },
    { caller: 'No, patient is unresponsive', en: 'No response / critical weakness' },
    { caller: 'Controlled / stable for now', en: 'Stable while waiting for help' },
    { caller: 'Not sure', en: 'Not sure' },
  ]);
}

/**
 * Guarantees exactly 2 triage questions (or preserves existing 2) where each question has 3-4 bilingual answer options.
 */
export function ensureTwoQuestionsWithOptions(
  questions: TriageQuestion[] | undefined,
  detectedLanguage: string
): TriageQuestion[] {
  const baseQuestions: TriageQuestion[] =
    Array.isArray(questions) && questions.length >= 2
      ? questions.slice(0, 2)
      : [
          ...(questions || []),
          {
            id: 'q-fallback-1',
            questionEnglish: 'Is the patient breathing normally or making gasping/gurgling sounds?',
            questionCallerLang: (detectedLanguage || '').toLowerCase().includes('tamil')
              ? 'நோயாளி சீராக மூச்சு விடுகிறாரா அல்லது சத்தத்துடன் மூச்சு விடுகிறாரா?'
              : (detectedLanguage || '').toLowerCase().includes('hindi')
              ? 'क्या मरीज सामान्य रूप से सांस ले रहा है या घरघराहट की आवाज आ रही है?'
              : 'Is the patient breathing normally or making gasping/gurgling sounds?',
            purpose: 'Assess airway patency and spontaneous breathing',
          },
          {
            id: 'q-fallback-2',
            questionEnglish: 'Does the patient open their eyes or respond when you tap their shoulders?',
            questionCallerLang: (detectedLanguage || '').toLowerCase().includes('tamil')
              ? 'தோள்பட்டையை தட்டி கூப்பிட்டால் கண் திறக்கிறாரா அல்லது பதிலளிக்கிறாரா?'
              : (detectedLanguage || '').toLowerCase().includes('hindi')
              ? 'क्या कंधे थपथपाने और आवाज देने पर मरीज आंखें खोल रहा है?'
              : 'Does the patient open their eyes or respond when you tap their shoulders?',
            purpose: 'Assess consciousness and neurological responsiveness',
          },
        ].slice(0, 2);

  return baseQuestions.map((q, idx) => {
    const validOptions =
      Array.isArray(q.options) && q.options.length >= 3
        ? q.options.slice(0, 4).map((opt, oIdx) => ({
            id: opt.id || `opt-q${idx + 1}-${oIdx + 1}`,
            textCallerLang: opt.textCallerLang || opt.textEnglish || 'Yes',
            textEnglish: opt.textEnglish || opt.textCallerLang || 'Yes',
          }))
        : getLocalizedOptionsForQuestion(q.questionEnglish, detectedLanguage, idx);

    return {
      ...q,
      id: q.id || `q${idx + 1}`,
      options: validOptions,
    };
  });
}

/**
 * Guarantees 4-6 step-by-step Guided First Aid instructions in both caller language and English.
 */
export function ensureGuidedFirstAidSteps(
  steps: FirstAidStep[] | undefined,
  detectedLanguage: string,
  emergencyType?: string
): FirstAidStep[] {
  const langLower = (detectedLanguage || '').toLowerCase();
  const isTamil = langLower.includes('tamil');
  const isHindi = langLower.includes('hindi');

  const supplementarySteps: Array<{ caller: string; en: string }> = isTamil
    ? [
        {
          caller: 'நோயாளியை சமமான தரையில் படுக்க வைத்து, காற்றுக்குழாய் திறக்க தாடையை லேசாக உயர்த்தவும்.',
          en: 'Lay the patient flat on firm ground and gently tilt the chin up to keep the airway open.',
        },
        {
          caller: 'கழுத்து, மார்பு மற்றும் இடுப்புப் பகுதியில் உள்ள இறுக்கமான ஆடைகளை உடனடியாக தளர்த்தவும்.',
          en: 'Loosen any tight clothing around the neck, chest, and waist immediately.',
        },
        {
          caller: 'நோயாளியைச் சுற்றி கூட்டம் கூடாமல் பார்த்து, சுத்தமான காற்று கிடைக்கச் செய்யவும்.',
          en: 'Clear bystanders back to allow fresh air circulation around the patient.',
        },
        {
          caller: 'மார்பு அசைவையும் சுவாசத்தையும் ஒவ்வொரு 30 வினாடிக்கும் தொடர்ந்து கண்காணிக்கவும்.',
          en: 'Watch the chest closely every 30 seconds to confirm continuous breathing.',
        },
        {
          caller: 'மயக்க நிலையில் வாய்வழியாக தண்ணீர், பால் அல்லது மருந்து எதுவும் கொடுக்க வேண்டாம்.',
          en: 'Do not give water, milk, food, or oral medication while the patient is drowsy or unconscious.',
        },
        {
          caller: 'ஆம்புலன்ஸ் வரும் வரை நோயாளியின் அருகிலேயே இருந்து, பிரதான சாலையில் ஒருவரை வழிகாட்ட நிறுத்தவும்.',
          en: 'Stay right beside the patient and send one bystander to the landmark to wave down the ambulance.',
        },
      ]
    : isHindi
    ? [
        {
          caller: 'मरीज को समतल जगह पर लिटाएं और सांस की नली खुली रखने के लिए ठोड़ी को हल्का ऊपर उठाएं।',
          en: 'Lay the patient flat on firm ground and gently tilt the chin up to keep the airway open.',
        },
        {
          caller: 'गर्दन, छाती और कमर के पास के तंग कपड़ों को तुरंत ढीला कर दें।',
          en: 'Loosen any tight clothing around the neck, chest, and waist immediately.',
        },
        {
          caller: 'आस-पास भीड़ न लगने दें ताकि मरीज को खुली हवा मिल सके।',
          en: 'Keep bystanders back so fresh air can circulate freely around the patient.',
        },
        {
          caller: 'हर 30 सेकंड में मरीज की सांस और छाती की हलचल पर नजर रखें।',
          en: 'Monitor the patient’s breathing and chest movement closely every 30 seconds.',
        },
        {
          caller: 'बेहोशी की हालत में मुंह से पानी, दूध या कोई भी तरल पदार्थ बिल्कुल न दें।',
          en: 'Do not give water, milk, or any fluids by mouth while the patient is semi-conscious or unconscious.',
        },
        {
          caller: 'मरीज के पास रहें और किसी एक व्यक्ति को मुख्य पहचान चिन्ह के पास एम्बुलेंस को रास्ता दिखाने भेजें।',
          en: 'Stay beside the patient and station someone at the landmark to guide the incoming ambulance.',
        },
      ]
    : [
        {
          caller: 'Position the patient safely on level ground and keep their airway clear by tilting the chin slightly up.',
          en: 'Position the patient safely on level ground and keep their airway clear by tilting the chin slightly up.',
        },
        {
          caller: 'Loosen tight clothing around the neck, chest, and waist to ease breathing and circulation.',
          en: 'Loosen tight clothing around the neck, chest, and waist to ease breathing and circulation.',
        },
        {
          caller: 'Keep the patient completely still and calm; avoid unnecessary movement or exertion.',
          en: 'Keep the patient completely still and calm; avoid unnecessary movement or exertion.',
        },
        {
          caller: 'Check breathing and responsiveness every 30 seconds until emergency responders arrive.',
          en: 'Check breathing and responsiveness every 30 seconds until emergency responders arrive.',
        },
        {
          caller: 'Keep the patient warm with a light cloth or blanket and shield them from direct heat or rain.',
          en: 'Keep the patient warm with a light cloth or blanket and shield them from direct heat or rain.',
        },
      ];

  const existing = Array.isArray(steps) ? [...steps] : [];
  const merged: FirstAidStep[] = existing.map((s, idx) => ({
    stepNumber: idx + 1,
    stepCallerLang: s.stepCallerLang || s.stepEnglish,
    stepEnglish: s.stepEnglish || s.stepCallerLang,
    completed: Boolean(s.completed),
    needsHelp: Boolean(s.needsHelp),
  }));

  let suppIdx = 0;
  while (merged.length < 4 && suppIdx < supplementarySteps.length) {
    const candidate = supplementarySteps[suppIdx];
    suppIdx++;
    const isDuplicate = merged.some(
      (m) => m.stepEnglish.toLowerCase().slice(0, 20) === candidate.en.toLowerCase().slice(0, 20)
    );
    if (!isDuplicate) {
      merged.push({
        stepNumber: merged.length + 1,
        stepCallerLang: candidate.caller,
        stepEnglish: candidate.en,
        completed: false,
        needsHelp: false,
      });
    }
  }

  return merged.slice(0, 6).map((s, idx) => ({
    ...s,
    stepNumber: idx + 1,
  }));
}

/**
 * Ensures a clear list of "⚠️ Do NOT do" dangerous myths for the emergency.
 */
export function ensureFatalDontsList(
  fatalDonts: string[] | undefined,
  emergencyType?: string
): string[] {
  if (Array.isArray(fatalDonts) && fatalDonts.length >= 2) {
    return fatalDonts;
  }
  const typeLower = (emergencyType || '').toLowerCase();
  if (typeLower.includes('snake') || typeLower.includes('venom') || typeLower.includes('bite')) {
    return [
      'Do NOT tie a tight rope or tourniquet — it causes gangrene and limb loss.',
      'Do NOT cut the wound or try to suck out the venom.',
      'Do NOT apply herbal paste, mud, ice, or electric shock to the bite.',
      'Do NOT let the patient walk or run — movement pumps venom faster.',
    ];
  }
  if (typeLower.includes('cardiac') || typeLower.includes('heart') || typeLower.includes('chest')) {
    return [
      'Do NOT let the patient walk or stand up — any exertion increases heart damage.',
      'Do NOT pour water or liquids into the mouth if drowsy or unconscious.',
      'Do NOT wait to see if chest pain goes away with home remedies for gas.',
    ];
  }
  return [
    'Do NOT pour water, milk, or fluids into the mouth of an unconscious or gasping patient.',
    'Do NOT shake, slap, or force the patient to sit or stand up.',
    'Do NOT apply mud, oil, or unsterile substances to wounds or burns.',
    'Do NOT leave the patient unattended at any time before the ambulance arrives.',
  ];
}

/**
 * Computes a deterministic severity transition record after a triage answer or help request.
 */
export function computeSeverityTransition(params: {
  previousSeverity: SeverityLevel;
  previousConfidence: number;
  answerText: string;
  isHelpRequest?: boolean;
  serverUpdatedSeverity?: SeverityLevel;
  serverUpdatedConfidence?: number;
  serverReason?: string;
}): SeverityChangeRecord {
  const {
    previousSeverity,
    previousConfidence,
    answerText,
    isHelpRequest = false,
    serverUpdatedSeverity,
    serverUpdatedConfidence,
    serverReason,
  } = params;

  const isWorsening = isHelpRequest || detectWorseningOrHelpIntent(answerText);

  let newSeverity: SeverityLevel = serverUpdatedSeverity || previousSeverity;
  let EffectivePrevSeverity: SeverityLevel = previousSeverity;

  if (isWorsening) {
    if (previousSeverity === 'Mild') newSeverity = 'Serious';
    else if (previousSeverity === 'Moderate') newSeverity = 'Critical';
    else if (previousSeverity === 'Serious') newSeverity = 'Critical';
    else if (previousSeverity === 'Critical') {
      newSeverity = 'Critical';
      // If it was already Critical and this is an escalation, ensure transition is clearly visible
      if (!serverUpdatedSeverity || serverUpdatedSeverity === 'Critical') {
        EffectivePrevSeverity = previousSeverity;
      }
    }
  }

  const newConfidence =
    serverUpdatedConfidence ||
    Math.min(99, Math.max(previousConfidence + (isWorsening ? 4 : 2), 92));

  const reason =
    serverReason ||
    (isHelpRequest
      ? 'Caller requested urgent assistance during Guided First Aid; immediate physician tele-consultation recommended.'
      : isWorsening
      ? `Critical symptom confirmed ("${answerText}") — immediate airway/circulatory risk requires highest priority dispatch.`
      : `Caller follow-up ("${answerText}") integrated into clinical triage assessment.`);

  return {
    previousSeverity: EffectivePrevSeverity,
    newSeverity,
    previousConfidence,
    newConfidence,
    reason,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    triggerAnswer: answerText,
  };
}

/**
 * Formats seconds into MM:SS for the live Ambulance ETA countdown bar.
 */
export function formatCountdownMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Updates DispatchPlan and HospitalPreAlert live with the caller's latest answer and severity change.
 */
export function mergeDispatchPlanWithTriageUpdate(
  currentPlan: DispatchPlan | null,
  assessment: TriageAssessment,
  severityChange: SeverityChangeRecord,
  answerSummaryEnglish: string,
  completedStepText?: string
): DispatchPlan | null {
  if (!currentPlan) return null;

  const prevSymptoms = currentPlan.hospitalPreAlert?.primarySymptoms || [];
  const symptomEntry = `Triage Update: ${answerSummaryEnglish}`;
  const updatedSymptoms = prevSymptoms.includes(symptomEntry)
    ? prevSymptoms
    : [...prevSymptoms, symptomEntry];

  const prevFirstAid = currentPlan.hospitalPreAlert?.firstAidAdministered || [];
  const updatedFirstAid =
    completedStepText && !prevFirstAid.includes(completedStepText)
      ? [...prevFirstAid, completedStepText]
      : prevFirstAid;

  const prevTeams = currentPlan.hospitalPreAlert?.requiredPrepTeams || [];
  const extraTeam =
    severityChange.newSeverity === 'Critical' &&
    !prevTeams.some((t) => t.toLowerCase().includes('resuscitation'))
      ? ['Resuscitation & Airway Team Alerted (Critical Escalation)']
      : [];

  return {
    ...currentPlan,
    hospitalPreAlert: {
      ...currentPlan.hospitalPreAlert,
      patientProfile: `${assessment.patientSummary} [Severity: ${severityChange.previousSeverity} → ${severityChange.newSeverity} (${severityChange.newConfidence}%)]`,
      primarySymptoms: updatedSymptoms,
      firstAidAdministered: updatedFirstAid,
      requiredPrepTeams: [...prevTeams, ...extraTeam],
      transmissionStatus: `Live Updated at ${severityChange.timestamp} (${severityChange.previousSeverity} → ${severityChange.newSeverity})`,
    },
  };
}

/**
 * Determines whether to automatically connect to the on-call doctor after triage answers complete.
 * Requirement 1: "Also connect automatically when severity is Critical after the triage answers."
 */
export function shouldAutoConnectDoctorAfterTriage(
  severity: SeverityLevel,
  questionsCompleted: boolean
): boolean {
  return Boolean(questionsCompleted && severity === 'Critical');
}

/**
 * Generates an initial localized greeting from the on-call doctor when joining the simulated call.
 */
export function getInitialDoctorGreetingMessage(
  doctorName: string,
  detectedLanguage: string,
  patientSummary?: string
): DoctorBridgeMessage {
  const langLower = (detectedLanguage || 'English').toLowerCase();
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const englishText = `Hello, this is ${doctorName} on the emergency medical line. I have reviewed your triage answers and first-aid progress. How is the patient breathing right now?`;

  let translatedText = englishText;
  let transliteration = '';

  if (langLower.includes('tamil')) {
    translatedText = `வணக்கம், நான் அவசர மருத்துவர் ${doctorName} பேசுகிறேன். உங்கள் முதலுதவி விவரங்களைப் பார்த்தேன். இப்போது நோயாளி எப்படி மூச்சு விடுகிறார்?`;
    transliteration = `Vanakkam, naan avasara maruthuvar ${doctorName} pesugiren. Ippodhu noyali eppadi moochu vidugirar?`;
  } else if (langLower.includes('hindi')) {
    translatedText = `नमस्ते, मैं इमरजेंसी डॉक्टर ${doctorName} बोल रहा हूँ। मैंने आपकी जानकारी देख ली है। अभी मरीज की सांस कैसी चल रही है?`;
    transliteration = `Namaste, main emergency doctor ${doctorName} bol raha hoon. Abhi mareez ki saans kaisi chal rahi hai?`;
  } else if (langLower.includes('japanese')) {
    translatedText = `こんにちは、救急医の${doctorName}です。トリアージと応急処置の状況を確認しました。現在、患者さんの呼吸はどうですか？`;
  } else if (langLower.includes('indonesian') || langLower.includes('malay') || langLower.includes('bahasa')) {
    translatedText = `Halo, saya ${doctorName} dari tim medis darurat. Saya sudah melihat laporan Anda. Bagaimana napas pasien saat ini?`;
  } else if (langLower.includes('tagalog') || langLower.includes('filipino')) {
    translatedText = `Kumusta, ito si ${doctorName} mula sa emergency medical team. Nakita ko na ang inyong ulat. Kumusta ang paghinga ng pasyente ngayon?`;
  } else if (langLower.includes('spanish')) {
    translatedText = `Hola, soy el ${doctorName} de emergencias médicas. He revisado sus respuestas. ¿Cómo está respirando el paciente ahora mismo?`;
  }

  return {
    id: `doc-join-${Date.now()}`,
    sender: 'doctor',
    originalText: englishText,
    translatedText,
    transliteration: transliteration || undefined,
    originalLang: 'English',
    targetLang: detectedLanguage || 'English',
    timestamp: nowStr,
  };
}

/**
 * Returns 4 localized tappable quick-reply options for the caller to answer the doctor on the phone.
 */
export function getLocalizedCallerQuickRepliesForDoctor(
  detectedLanguage: string
): Array<{ id: string; textCallerLang: string; textEnglish: string }> {
  const langLower = (detectedLanguage || '').toLowerCase();

  if (langLower.includes('tamil')) {
    return [
      {
        id: 'qr-ta-1',
        textCallerLang: 'டாக்டர், சொன்னபடி முதலுதவி செய்தோம், மூச்சு கொஞ்சம் சீராக உள்ளது',
        textEnglish: 'Doctor, we did the first aid as told, breathing is slightly steadier now',
      },
      {
        id: 'qr-ta-2',
        textCallerLang: 'இன்னும் கண் திறக்கவில்லை டாக்டர், மார்பு மட்டும் லேசாக அசைகிறது',
        textEnglish: 'Still has not opened eyes Doctor, only slight chest movement',
      },
      {
        id: 'qr-ta-3',
        textCallerLang: 'ரத்தப்போக்கு / வீக்கம் கட்டுக்குள் உள்ளது, ஆம்புலன்ஸுக்காக காத்திருக்கிறோம்',
        textEnglish: 'Bleeding / swelling is controlled, waiting for the ambulance',
      },
      {
        id: 'qr-ta-4',
        textCallerLang: 'நிலைமை இன்னும் கவலைக்கிடமாக உள்ளது, உடனே உதவி தேவை',
        textEnglish: 'Condition is still critical, need immediate guidance',
      },
    ];
  }

  if (langLower.includes('hindi')) {
    return [
      {
        id: 'qr-hi-1',
        textCallerLang: 'डॉक्टर साहब, प्राथमिक उपचार कर दिया है, सांस अब थोड़ी बेहतर है',
        textEnglish: 'Doctor, we performed the first aid, breathing is slightly better now',
      },
      {
        id: 'qr-hi-2',
        textCallerLang: 'अभी भी आँखें नहीं खोल रहे हैं डॉक्टर, बस हल्की सांस चल रही है',
        textEnglish: 'Still not opening eyes Doctor, only shallow breathing',
      },
      {
        id: 'qr-hi-3',
        textCallerLang: 'खून बहना रुक गया है, हम एम्बुलेंस का इंतज़ार कर रहे हैं',
        textEnglish: 'Bleeding is controlled, we are waiting for the ambulance',
      },
      {
        id: 'qr-hi-4',
        textCallerLang: 'हालत अभी भी गंभीर है डॉक्टर, कृपया अगला कदम बताएं',
        textEnglish: 'Condition is still critical Doctor, please tell us the next step',
      },
    ];
  }

  if (langLower.includes('japanese')) {
    return [
      {
        id: 'qr-ja-1',
        textCallerLang: '先生、指示通りに応急処置を行い、呼吸は少し落ち着いています',
        textEnglish: 'Doctor, we did the first aid as instructed, breathing is slightly steadier',
      },
      {
        id: 'qr-ja-2',
        textCallerLang: 'まだ目を開けませんが、胸は少し動いています',
        textEnglish: 'Still not opening eyes, but chest is moving slightly',
      },
      {
        id: 'qr-ja-3',
        textCallerLang: '出血は止まっています。救急車を待っています',
        textEnglish: 'Bleeding is controlled. Waiting for the ambulance',
      },
      {
        id: 'qr-ja-4',
        textCallerLang: '状態がまだ危険です。次の指示をお願いします',
        textEnglish: 'Condition is still critical. Please advise next step',
      },
    ];
  }

  return [
    {
      id: 'qr-en-1',
      textCallerLang: 'Doctor, we completed the first-aid step and breathing is slightly steadier',
      textEnglish: 'Doctor, we completed the first-aid step and breathing is slightly steadier',
    },
    {
      id: 'qr-en-2',
      textCallerLang: 'Patient is still unresponsive, only shallow chest movement',
      textEnglish: 'Patient is still unresponsive, only shallow chest movement',
    },
    {
      id: 'qr-en-3',
      textCallerLang: 'We kept airway clear and loosened tight clothing as instructed',
      textEnglish: 'We kept airway clear and loosened tight clothing as instructed',
    },
    {
      id: 'qr-en-4',
      textCallerLang: 'Condition is still critical, please advise what to do until ambulance arrives',
      textEnglish: 'Condition is still critical, please advise what to do until ambulance arrives',
    },
  ];
}

/**
 * Builds context-aware Gemini-style suggested next instructions for the doctor as one-click buttons.
 */
export function buildFallbackDoctorSuggestedPrompts(
  assessment: TriageAssessment | null,
  completedStepsCount: number = 0
): Array<{ english: string; translated: string; category: string }> {
  const langLower = (assessment?.detectedLanguage || 'English').toLowerCase();
  const typeLower = `${assessment?.likelyEmergencyType || ''} ${assessment?.patientSummary || ''}`.toLowerCase();

  const isSnake = /snake|viper|cobra|bite|venom/i.test(typeLower);
  const isBleed = /bleed|artery|trauma|cut|wound|fracture|accident/i.test(typeLower);
  const isCardiac = /cardiac|heart|chest|stemi|coronary/i.test(typeLower);

  if (langLower.includes('tamil')) {
    if (isSnake) {
      return [
        {
          english: 'Keep the bitten leg completely still below heart level; do not remove the splint.',
          translated: 'கடிபட்ட காலை இதய மட்டத்திற்கு கீழே அசைக்காமல் வைக்கவும்; கட்டையை அகற்ற வேண்டாம்.',
          category: 'Immobilization',
        },
        {
          english: 'Watch closely if the patient has difficulty swallowing saliva or drooping eyelids.',
          translated: 'நோயாளிக்கு எச்சில் விழுங்க சிரமம் அல்லது கண் இமைகள் சொருகுகிறதா என்று கவனிக்கவும்.',
          category: 'Neuro-Check',
        },
        {
          english: 'Do NOT apply any tight rope tourniquet or herbal paste on the bite.',
          translated: 'கடிபட்ட இடத்தில் இறுக்கமாக கயிறு கட்டவோ இலை பற்று போடவோ வேண்டாம்.',
          category: 'Safety Alert',
        },
        {
          english: 'Anti-snake venom is ready at the receiving hospital; ambulance is arriving shortly.',
          translated: 'மருத்துவமனையில் விஷ முறிவு மருந்து தயாராக உள்ளது; ஆம்புலன்ஸ் விரைவில் வந்துவிடும்.',
          category: 'Reassurance',
        },
      ];
    }
    if (isBleed) {
      return [
        {
          english: 'Keep pressing firmly on the cloth pad with both hands; do not lift the cloth to check.',
          translated: 'இரண்டு கைகளாலும் துணியை தொடர்ந்து அழுத்திப் பிடியுங்கள்; ரத்தம் நின்றதா என துணியை எடுத்துப் பார்க்க வேண்டாம்.',
          category: 'Hemostasis',
        },
        {
          english: 'Keep the patient lying flat and raise their legs slightly on a folded cloth.',
          translated: 'நோயாளியை சமமாக படுக்க வைத்து கால்களை சற்று உயர்த்தி வைக்கவும்.',
          category: 'Shock Prevention',
        },
        {
          english: 'Cover the patient with a dry cloth or sheet to keep them warm.',
          translated: 'உடல் குளிராமல் இருக்க நோயாளியின் மீது போர்வை அல்லது துணியை போர்த்தவும்.',
          category: 'Thermal Care',
        },
        {
          english: 'Paramedics with blood-loss resuscitation fluids are on the way.',
          translated: 'ரத்த இழப்பை சரிசெய்யும் மருத்துவக் குழு ஆம்புலன்ஸில் வந்து கொண்டிருக்கிறது.',
          category: 'Reassurance',
        },
      ];
    }
    if (isCardiac) {
      return [
        {
          english: 'Keep the patient seated at 45 degrees supported by pillows; do not let them walk.',
          translated: 'நோயாளியை தலையணை சாய்வில் 45 டிகிரி உட்கார வைக்கவும்; நடக்க விட வேண்டாம்.',
          category: 'Cardiac Posture',
        },
        {
          english: 'Count how many breaths the patient takes in 10 seconds and tell me.',
          translated: '10 விநாடிகளில் நோயாளி எத்தனை முறை மூச்சு விடுகிறார் என்று எண்ணிச் சொல்லுங்கள்.',
          category: 'Vitals Check',
        },
        {
          english: 'If the patient becomes unresponsive and stops breathing, start firm chest compressions.',
          translated: 'நோயாளி மயங்கி மூச்சு நின்றால், உடனே மார்பின் நடுவே இரண்டு கைகளால் தொடர்ந்து அழுத்தவும்.',
          category: 'CPR Standby',
        },
        {
          english: 'Cath Lab team is alerted at the hospital; stay calm with the patient.',
          translated: 'மருத்துவமனையில் இதய சிகிச்சை குழு தயாராக உள்ளது; தைரியமாக இருங்கள்.',
          category: 'Reassurance',
        },
      ];
    }
    return [
      {
        english: `Good job completing ${completedStepsCount || 1} first-aid step(s). Keep the chin tilted up so the airway stays open.`,
        translated: 'முதலுதவி படிகளை சரியாக செய்தீர்கள். காற்றுக்குழாய் திறந்திருக்க தாடையை லேசாக உயர்த்தி வைக்கவும்.',
        category: 'Airway Control',
      },
      {
        english: 'Place the back of your hand near the nostrils—do you feel warm air coming out?',
        translated: 'மூக்கின் அருகே உங்கள் கையை வைத்துப் பாருங்கள்—மூச்சுக்காற்று வருகிறதா?',
        category: 'Breathing Check',
      },
      {
        english: 'If the patient vomits or gurgles, roll their whole body onto their left side immediately.',
        translated: 'வாந்தி அல்லது குறட்டை சத்தம் வந்தால், உடனே உடலை இடது பக்கமாக ஒருக்களித்து படுக்க வைக்கவும்.',
        category: 'Recovery Position',
      },
      {
        english: 'Do NOT give water, milk, or anything by mouth. Ambulance is arriving shortly.',
        translated: 'வாயில் தண்ணீர் அல்லது பால் எதுவும் ஊற்ற வேண்டாம். ஆம்புலன்ஸ் நெருங்கிவிட்டது.',
        category: 'Safety & ETA',
      },
    ];
  }

  return [
    {
      english: 'Maintain gentle head-tilt chin-lift and monitor chest rise every 15 seconds.',
      translated: 'Keep the chin gently tilted up and watch the chest rise every 15 seconds.',
      category: 'Airway Check',
    },
    {
      english: 'Roll patient onto their left side (recovery position) if any gurgling or fluid appears.',
      translated: 'Turn the patient onto their left side if you hear gurgling or see fluid.',
      category: 'Aspiration Safety',
    },
    {
      english: 'If breathing stops completely, push hard and fast in the center of the chest (100-120/min).',
      translated: 'If breathing stops, push hard and fast in the center of the chest.',
      category: 'CPR Protocol',
    },
    {
      english: 'Keep patient warm and still. Ambulance crew has your GPS pin and is minutes away.',
      translated: 'Keep the patient still. The ambulance crew has your location and is arriving soon.',
      category: 'Reassurance',
    },
  ];
}

/**
 * Builds a structured clinical handover note for the ambulance crew and hospital when the doctor call ends.
 */
export function buildFallbackHandoverNote(params: {
  assessment: TriageAssessment | null;
  dispatchPlan?: DispatchPlan | null;
  conversationLog: ConversationLogEntry[];
  doctorMessages: DoctorBridgeMessage[];
  doctorName?: string;
}): DoctorHandoverNote {
  const {
    assessment,
    conversationLog = [],
    doctorMessages = [],
    doctorName = 'Dr. Arvind (On-Call ER Physician)',
  } = params;

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const whatHappened = assessment
    ? `${assessment.likelyEmergencyType} (${assessment.severity}, ${assessment.confidencePercentage}% confidence). ${assessment.patientSummary}. Location: ${
        assessment.estimatedLocation?.description ||
        assessment.estimatedLocation?.landmarkAnchor ||
        'Resolved Incident Site'
      }.`
    : 'Acute emergency incident triaged via GoldenHourAI tele-medical relay.';

  // Extract first-aid steps & doctor instructions with timestamps
  const firstAidGivenWithTimes: Array<{ time: string; action: string }> = [];

  conversationLog.forEach((entry) => {
    if (
      entry.stage === 'guided_first_aid' &&
      (entry.textEnglish.toLowerCase().includes('completed') ||
        entry.textCallerLang.includes('✅'))
    ) {
      firstAidGivenWithTimes.push({
        time: entry.timestamp || nowStr,
        action: entry.textEnglish,
      });
    }
  });

  // Also include doctor instructions sent during the call
  doctorMessages
    .filter((m) => m.sender === 'doctor')
    .forEach((m) => {
      firstAidGivenWithTimes.push({
        time: m.timestamp || nowStr,
        action: `Physician Guided Instruction: ${m.originalText}`,
      });
    });

  // If no explicit completed step entries yet, include the active first aid steps from assessment
  if (firstAidGivenWithTimes.length === 0 && assessment?.firstAidSteps?.length) {
    assessment.firstAidSteps.slice(0, 2).forEach((s) => {
      firstAidGivenWithTimes.push({
        time: nowStr,
        action: `Guided First-Aid Step ${s.stepNumber}: ${s.stepEnglish}`,
      });
    });
  }

  if (firstAidGivenWithTimes.length === 0) {
    firstAidGivenWithTimes.push({
      time: nowStr,
      action: 'Airway positioning and bystander safety precautions instructed via tele-triage.',
    });
  }

  const latestCallerMsg = [...doctorMessages]
    .reverse()
    .find((m) => m.sender === 'caller');
  const latestTriageAnswers = conversationLog
    .filter((e) => e.role === 'caller' && (e.stage === 'question_1' || e.stage === 'question_2'))
    .map((e) => e.textEnglish)
    .join('; ');

  const currentStatus = latestCallerMsg
    ? `Patient supervised via live translated physician bridge (${doctorName}). Latest bystander report: "${latestCallerMsg.translatedText}". ${
        latestTriageAnswers ? `Triage findings: ${latestTriageAnswers}.` : ''
      } Ready for paramedic handover.`
    : `Severity: ${assessment?.severity || 'Critical'}. ${
        latestTriageAnswers ? `Triage findings: ${latestTriageAnswers}. ` : ''
      }Bystander guided through first-aid stabilization; awaiting ambulance crew arrival.`;

  const summaryNote = `[HANDOVER TO AMBULANCE CREW & RECEIVING ER] ${whatHappened} First-aid & tele-medical interventions logged (${firstAidGivenWithTimes.length} actions). Current status: ${currentStatus}`;

  return {
    whatHappened,
    firstAidGivenWithTimes,
    currentStatus,
    summaryNote,
    generatedAt: nowStr,
    doctorName,
  };
}

/**
 * Merges the generated DoctorHandoverNote into DispatchPlan.hospitalPreAlert so it appears in the Hospital Pre-Alert card.
 */
export function mergeHandoverNoteIntoDispatchPlan(
  currentPlan: DispatchPlan | null,
  handoverNote: DoctorHandoverNote,
  assessment?: TriageAssessment | null
): DispatchPlan {
  const basePlan: DispatchPlan = currentPlan || {
    selectedAmbulance: {
      id: 'amb-1',
      name:
        assessment?.nearbyAmbulances?.[0]?.name ||
        getSimulatedAmbulanceNameForCountry(
          assessment?.countryCode || assessment?.estimatedLocation?.countryCode,
          assessment?.country || assessment?.estimatedLocation?.country
        ),
      etaMinutes: assessment?.nearbyAmbulances?.[0]?.etaMinutes || 15,
      selectionReason: 'Nearest available Advanced Life Support unit',
    },
    selectedHospital: {
      id: 'hosp-1',
      name: assessment?.nearbyHospitals?.[0]?.name || 'Regional Emergency Hospital',
      etaMinutes: assessment?.nearbyHospitals?.[0]?.etaMinutes || 25,
      capabilityMatch: 'Emergency & Resuscitation Capable',
      selectionReason: 'Nearest capable receiving facility',
    },
    selectedVolunteer: {
      id: 'vol-1',
      name: assessment?.nearbyVolunteers?.[0]?.name || 'Community First Responder',
      etaMinutes: 5,
      vehicle: 'Motorbike First-Aid Responder',
      assignedReason: 'Rapid first-aid stabilization',
      dispatched: true,
    },
    hospitalPreAlert: {
      patientProfile: assessment?.patientSummary || handoverNote.whatHappened,
      primarySymptoms: [assessment?.likelyEmergencyType || 'Acute Emergency'],
      estimatedOnset: 'Immediate / Active',
      firstAidAdministered: [],
      destinationHospitalId: 'hosp-1',
      destinationHospitalName:
        assessment?.nearbyHospitals?.[0]?.name || 'Regional Emergency Hospital',
      etaMinutes: 25,
      requiredPrepTeams: ['Emergency Resuscitation Team', 'On-Call Specialist'],
      transmissionStatus: 'Transmitted & Acknowledged',
    },
  };

  const existingFirstAid = basePlan.hospitalPreAlert?.firstAidAdministered || [];
  const timedActions = handoverNote.firstAidGivenWithTimes.map(
    (item) => `[${item.time}] ${item.action}`
  );
  const mergedFirstAid = Array.from(new Set([...existingFirstAid, ...timedActions]));

  return {
    ...basePlan,
    hospitalPreAlert: {
      ...basePlan.hospitalPreAlert,
      firstAidAdministered: mergedFirstAid,
      transmissionStatus: `Doctor Handover Transmitted at ${handoverNote.generatedAt} (Simulated)`,
      doctorHandoverNote: handoverNote,
    },
  };
}

/**
 * Resolves the active view route ('split' | 'caller' | 'ops') from a URL pathname.
 */
export function resolveRouteFromPathname(pathname: string): AppViewRoute {
  const clean = (pathname || '/').trim().toLowerCase();
  if (clean === '/caller' || clean.startsWith('/caller/')) {
    return 'caller';
  }
  if (clean === '/ops' || clean.startsWith('/ops/')) {
    return 'ops';
  }
  if (clean === '/registry' || clean.startsWith('/registry/')) {
    return 'registry';
  }
  return 'split';
}

/**
 * Returns true ONLY if the caller's detected language is English (and not a non-English regional language).
 * Used on VIEW 1 (/caller) so the phone shows no English unless the caller speaks it.
 */
export function isEnglishCallerLanguage(detectedLanguage?: string): boolean {
  if (!detectedLanguage) return false;
  const lower = detectedLanguage.toLowerCase();
  const nonEnglishMarkers = [
    'tamil',
    'hindi',
    'telugu',
    'kannada',
    'malayalam',
    'marathi',
    'bengali',
    'gujarati',
    'punjabi',
    'odia',
    'urdu',
    'japanese',
    'chinese',
    'mandarin',
    'indonesian',
    'malay',
    'bahasa',
    'tagalog',
    'filipino',
    'spanish',
    'french',
    'arabic',
    'sinhala',
    'vernacular',
  ];
  if (nonEnglishMarkers.some((m) => lower.includes(m))) {
    return false;
  }
  return lower.includes('english');
}

/**
 * Builds the 9-step expandable AI Pipeline live log for the Operations Command Centre:
 * Transcription → Language & country → Location geocoding → Triage → Follow-up answers →
 * Severity update → Dispatch decision → Hospital pre-alert → Doctor briefing
 */
export function buildAiPipelineSteps(params: {
  assessment: TriageAssessment | null;
  dispatchPlan: DispatchPlan | null;
  conversationLog: ConversationLogEntry[];
  severityHistory: SeverityChangeRecord[];
  doctorCallState: DoctorCallState;
  doctorName?: string;
  doctorMessages?: DoctorBridgeMessage[];
  pipelineTimings?: Record<string, number>;
  isLoadingTriage?: boolean;
  isUpdatingTriage?: boolean;
}): AiPipelineStep[] {
  const {
    assessment,
    dispatchPlan,
    conversationLog,
    severityHistory,
    doctorCallState,
    doctorName,
    doctorMessages = [],
    pipelineTimings = {},
    isLoadingTriage = false,
    isUpdatingTriage = false,
  } = params;

  const hasAssessment = Boolean(assessment);
  const hasDispatch = Boolean(dispatchPlan);

  const callerFollowUpEntries = conversationLog.filter(
    (e) => e.role === 'caller' && (e.stage === 'question_1' || e.stage === 'question_2')
  );
  const answeredQuestionsCount = Math.max(
    callerFollowUpEntries.length,
    (assessment?.triageQuestions || []).filter((q) => Boolean(q.answeredText)).length
  );
  const completedFirstAidStepsCount = (assessment?.firstAidSteps || []).filter(
    (s) => Boolean(s.completed)
  ).length;

  const latestSeverityChange =
    severityHistory.length > 0 ? severityHistory[severityHistory.length - 1] : null;

  const resolvedCountry =
    assessment?.country || assessment?.estimatedLocation?.country || 'Inferred from dialect';
  const resolvedCountryCode =
    assessment?.countryCode || assessment?.estimatedLocation?.countryCode || '';
  const resolvedFlag =
    assessment?.countryFlag || assessment?.estimatedLocation?.countryFlag || '';
  const emergencyNumber =
    assessment?.localEmergencyNumber ||
    assessment?.estimatedLocation?.localEmergencyNumber ||
    (isIndiaCountry(resolvedCountryCode, resolvedCountry) ? '112 / 108' : '112');
  const resolvedDoctorName =
    doctorName || getDoctorLabelForCountry(resolvedCountryCode, resolvedCountry);

  return [
    {
      id: 'transcription',
      stepNumber: 1,
      title: 'Transcription',
      status: hasAssessment ? 'completed' : isLoadingTriage ? 'running' : 'pending',
      durationMs: hasAssessment ? pipelineTimings.transcription || 380 : undefined,
      summary: hasAssessment
        ? `"${(assessment?.transcribedText || '').slice(0, 68)}${
            (assessment?.transcribedText || '').length > 68 ? '…' : ''
          }"`
        : isLoadingTriage
        ? 'Transcribing caller audio/text stream…'
        : 'Waiting for incoming emergency transmission',
      whatGeminiDecided: hasAssessment
        ? `Transcript: "${assessment?.transcribedText || 'Emergency report'}" → English: "${
            assessment?.shortEnglishTranslation || ''
          }"`
        : 'Pending caller voice or SMS input.',
      whyGeminiDecided: hasAssessment
        ? 'Extracted spoken phonetic tokens, medical symptoms, and colloquial rural landmark descriptors without stripping local place names.'
        : 'Awaiting audio or text payload.',
      details: hasAssessment
        ? [
            { label: 'Original Words', value: assessment?.transcribedText || '—' },
            { label: 'English Translation', value: assessment?.shortEnglishTranslation || '—' },
          ]
        : [],
    },
    {
      id: 'language_country',
      stepNumber: 2,
      title: 'Language & country',
      status: hasAssessment ? 'completed' : isLoadingTriage ? 'running' : 'pending',
      durationMs: hasAssessment ? pipelineTimings.language_country || 310 : undefined,
      summary: hasAssessment
        ? `${assessment?.detectedLanguage || 'Detected'} · ${resolvedFlag} ${resolvedCountry} (${emergencyNumber})`.trim()
        : isLoadingTriage
        ? 'Detecting language, dialect & country…'
        : 'Waiting for transcript',
      whatGeminiDecided: hasAssessment
        ? `Language: ${assessment?.detectedLanguage}${
            assessment?.dialect ? ` (${assessment.dialect})` : ''
          } | Country: ${resolvedFlag} ${resolvedCountry}${
            resolvedCountryCode ? ` [${resolvedCountryCode}]` : ''
          } | Emergency Line: ${emergencyNumber}`
        : 'Pending language & country inference.',
      whyGeminiDecided: hasAssessment
        ? assessment?.estimatedLocation?.inferredCountryReason ||
          `Inferred ${resolvedCountry} from caller language (${assessment?.detectedLanguage}) and regional place/landmark mentions.`
        : 'Awaiting linguistic markers.',
      details: hasAssessment
        ? [
            { label: 'Detected Language', value: assessment?.detectedLanguage || '—' },
            {
              label: 'Inferred Country',
              value: `${resolvedFlag} ${resolvedCountry} ${
                resolvedCountryCode ? `(${resolvedCountryCode})` : ''
              }`.trim(),
            },
            { label: 'Local Emergency Number', value: emergencyNumber },
          ]
        : [],
    },
    {
      id: 'location_geocoding',
      stepNumber: 3,
      title: 'Location geocoding & landmark extraction',
      status: hasAssessment ? 'completed' : isLoadingTriage ? 'running' : 'pending',
      durationMs: hasAssessment ? pipelineTimings.location_geocoding || 540 : undefined,
      summary: hasAssessment
        ? `${assessment?.estimatedLocation?.description || 'Location geocoded'} (${assessment?.locationConfidence || 'Geocoded (high)'})`
        : isLoadingTriage
        ? 'Geocoding mentioned village/town/district...'
        : 'Waiting for location extraction',
      whatGeminiDecided: hasAssessment
        ? `Location resolved to ${assessment?.estimatedLocation?.landmarkAnchor || assessment?.estimatedLocation?.description || 'Incident location'} (${assessment?.estimatedLocation?.latitude.toFixed(4)}, ${assessment?.estimatedLocation?.longitude.toFixed(4)}).`
        : 'Pending location extraction.',
      whyGeminiDecided: hasAssessment
        ? `Geocoded town/district/country with confidence ${assessment?.locationConfidence || 'high'}. Landmark anchor set to ${assessment?.estimatedLocation?.landmarkAnchor || 'incident site'}.`
        : 'Awaiting place mentions from caller.',
      details: hasAssessment
        ? [
            {
              label: 'Geocoded Location',
              value: assessment?.estimatedLocation?.description || '—',
            },
            {
              label: 'Landmark Anchor',
              value: assessment?.estimatedLocation?.landmarkAnchor || '—',
            },
            {
              label: 'Coordinates',
              value: `${assessment?.estimatedLocation?.latitude.toFixed(4)}, ${assessment?.estimatedLocation?.longitude.toFixed(4)}`,
            },
            {
              label: 'Confidence',
              value: assessment?.locationConfidence || 'Geocoded (high)',
            },
          ]
        : [],
    },
    {
      id: 'cell_tower',
      stepNumber: 4,
      title: 'Cell tower & landmark narrowing (Simulated)',
      status: hasAssessment ? 'completed' : isLoadingTriage ? 'running' : 'pending',
      durationMs: hasAssessment ? pipelineTimings.cell_tower || 380 : undefined,
      summary: hasAssessment
        ? `Tower area ${assessment?.servingCellTower?.coverageRadiusKm || 3.8} km → landmark match → ${assessment?.servingCellTower?.narrowedRadiusMeters || 300} m`
        : isLoadingTriage
        ? 'Triangulating serving cell sector & landmark correlation…'
        : 'Waiting for cell tower telemetry',
      whatGeminiDecided: hasAssessment
        ? `Serving Tower: ${assessment?.servingCellTower?.towerId || 'TOW-IND-408'} (${assessment?.servingCellTower?.operatorName || 'Simulated Telecom'}). Narrowed sector ${assessment?.servingCellTower?.coverageRadiusKm || 3.8} km → 300 m radius using verbal landmarks (${(assessment?.landmarksMentioned || []).join(', ') || 'local anchors'}).`
        : 'Pending tower triangulation.',
      whyGeminiDecided: hasAssessment
        ? `Serving cell tower provides coarse 3.8 km sector radius. Gemini correlated caller verbal landmarks against OpenStreetMap topography to pinpoint the incident to ~300 m precision.`
        : 'Awaiting tower and landmark mentions.',
      details: hasAssessment
        ? [
            { label: 'Serving Tower ID', value: `${assessment?.servingCellTower?.towerId || 'TOW-IND-408'} · (Simulated)` },
            { label: 'Operator Name', value: assessment?.servingCellTower?.operatorName || 'Simulated Telecom' },
            { label: 'Initial Tower Sector', value: `${assessment?.servingCellTower?.coverageRadiusKm || 3.8} km radius` },
            { label: 'Landmark Correlation', value: (assessment?.landmarksMentioned || []).join(', ') || 'Rural landmarks' },
            { label: 'Narrowed Accuracy', value: `~${assessment?.servingCellTower?.narrowedRadiusMeters || 300} m radius circle` },
          ]
        : [],
    },
    {
      id: 'triage',
      stepNumber: 5,
      title: 'Triage',
      status: hasAssessment ? 'completed' : isLoadingTriage ? 'running' : 'pending',
      durationMs: hasAssessment ? pipelineTimings.triage || 690 : undefined,
      summary: hasAssessment
        ? `${assessment?.likelyEmergencyType} · ${assessment?.severity} (${assessment?.confidencePercentage}%)`
        : isLoadingTriage
        ? 'Running clinical triage & Golden Hour reasoning…'
        : 'Waiting for symptom extraction',
      whatGeminiDecided: hasAssessment
        ? `Classification: ${assessment?.likelyEmergencyType} | Severity: ${
            assessment?.severity
          } (${assessment?.confidencePercentage}% confidence) | Golden Hour Window: ${
            assessment?.goldenHourWindowMinutes || 60
          } mins`
        : 'Pending clinical triage.',
      whyGeminiDecided: hasAssessment
        ? `${assessment?.severityReasoning || ''} ${
            assessment?.goldenHourReason ? `Golden Hour: ${assessment.goldenHourReason}` : ''
          }`.trim()
        : 'Awaiting clinical symptom analysis.',
      details: hasAssessment
        ? [
            { label: 'Emergency Type', value: assessment?.likelyEmergencyType || '—' },
            { label: 'Patient Summary', value: assessment?.patientSummary || '—' },
            {
              label: 'Golden Hour Window',
              value: `${assessment?.goldenHourWindowMinutes || 60} mins — ${
                assessment?.goldenHourReason || 'Immediate intervention required'
              }`,
            },
          ]
        : [],
    },
    {
      id: 'followup_answers',
      stepNumber: 6,
      title: 'Follow-up answers',
      status: isUpdatingTriage
        ? 'running'
        : answeredQuestionsCount > 0 ||
          conversationLog.some((e) => e.textEnglish?.startsWith('Caller pressed '))
        ? 'completed'
        : hasAssessment
        ? 'running'
        : 'pending',
      durationMs:
        answeredQuestionsCount > 0
          ? pipelineTimings.followup_answers || 460
          : hasAssessment
          ? 240
          : undefined,
      summary: (() => {
        const keypresses = conversationLog.filter((e) =>
          e.textEnglish?.startsWith('Caller pressed ')
        );
        if (keypresses.length > 0) {
          const latestKp = keypresses[keypresses.length - 1];
          return `${latestKp.textEnglish} (${answeredQuestionsCount}/2 Qs · ${completedFirstAidStepsCount} steps)`;
        }
        if (answeredQuestionsCount >= 2) {
          return `2 of 2 triage questions answered · ${completedFirstAidStepsCount} first-aid steps done`;
        }
        if (answeredQuestionsCount === 1) {
          return '1 of 2 triage questions answered (awaiting Q2)';
        }
        if (hasAssessment) {
          return 'IVR numbered menu active on caller phone (awaiting keypress 1–3)';
        }
        return 'Waiting for initial triage';
      })(),
      whatGeminiDecided: (() => {
        const keypresses = conversationLog.filter((e) =>
          e.textEnglish?.startsWith('Caller pressed ')
        );
        if (keypresses.length > 0) {
          return `IVR Keypress Log: ${keypresses
            .map((e) => e.textEnglish)
            .join(' | ')}`;
        }
        if (answeredQuestionsCount > 0) {
          return `Recorded ${answeredQuestionsCount}/2 triage answers: ${
            callerFollowUpEntries
              .map((e, idx) => `Q${idx + 1}: "${e.textEnglish}"`)
              .join(' | ') || 'Answered on caller phone'
          }`;
        }
        if (hasAssessment) {
          return `IVR Menu Q1: "${
            assessment?.triageQuestions?.[0]?.questionEnglish || ''
          }" & Q2: "${assessment?.triageQuestions?.[1]?.questionEnglish || ''}"`;
        }
        return 'Pending triage question generation.';
      })(),
      whyGeminiDecided: hasAssessment
        ? `Q1 Purpose: ${
            assessment?.triageQuestions?.[0]?.purpose || 'Assess airway/breathing'
          } | Q2 Purpose: ${
            assessment?.triageQuestions?.[1]?.purpose || 'Assess consciousness/circulation'
          }. Turned into DTMF keypad menus (1, 2, 3, * repeat, 0 doctor) for basic feature phone accessibility.`
        : 'Awaiting initial triage assessment.',
      details: hasAssessment
        ? [
            ...(assessment?.triageQuestions || []).map((q, idx) => ({
              label: `Question ${idx + 1} of 2`,
              value: `${q.questionEnglish} → Answer: ${
                q.answeredEnglish ||
                callerFollowUpEntries[idx]?.textEnglish ||
                'Awaiting caller keypress'
              }`,
            })),
            ...conversationLog
              .filter((e) => e.textEnglish?.startsWith('Caller pressed '))
              .map((kp, idx) => ({
                label: `Keypress #${idx + 1} (${kp.timestamp})`,
                value: kp.textEnglish,
              })),
          ]
        : [],
    },
    {
      id: 'severity_update',
      stepNumber: 7,
      title: 'Severity update',
      status: isUpdatingTriage
        ? 'running'
        : latestSeverityChange
        ? 'completed'
        : hasAssessment
        ? 'completed'
        : 'pending',
      durationMs: latestSeverityChange
        ? pipelineTimings.severity_update || 490
        : hasAssessment
        ? 290
        : undefined,
      summary: latestSeverityChange
        ? `Severity updated: ${latestSeverityChange.previousSeverity} → ${latestSeverityChange.newSeverity} (${latestSeverityChange.newConfidence}%)`
        : hasAssessment
        ? `Baseline ${assessment?.severity} (${assessment?.confidencePercentage}% confidence)`
        : 'Waiting for triage evaluation',
      whatGeminiDecided: latestSeverityChange
        ? `Severity updated: ${latestSeverityChange.previousSeverity} → ${latestSeverityChange.newSeverity} (${latestSeverityChange.previousConfidence}% → ${latestSeverityChange.newConfidence}% confidence) on trigger "${latestSeverityChange.triggerAnswer}"`
        : hasAssessment
        ? `Active Severity: ${assessment?.severity} (${assessment?.confidencePercentage}% confidence)`
        : 'Pending severity evaluation.',
      whyGeminiDecided: latestSeverityChange
        ? latestSeverityChange.reason
        : hasAssessment
        ? assessment?.severityReasoning || 'Initial clinical severity established.'
        : 'Awaiting clinical data.',
      details: latestSeverityChange
        ? severityHistory.map((h, i) => ({
            label: `Update #${i + 1} (${h.timestamp})`,
            value: `${h.previousSeverity} → ${h.newSeverity} (${h.newConfidence}%): ${h.reason}`,
          }))
        : hasAssessment
        ? [
            {
              label: 'Current Severity',
              value: `${assessment?.severity} (${assessment?.confidencePercentage}%)`,
            },
            { label: 'Clinical Reason', value: assessment?.severityReasoning || '—' },
          ]
        : [],
    },
    {
      id: 'dispatch_decision',
      stepNumber: 8,
      title: 'Dispatch decision',
      status: hasDispatch ? 'completed' : hasAssessment ? 'running' : 'pending',
      durationMs: hasDispatch ? pipelineTimings.dispatch_decision || 520 : undefined,
      summary: hasDispatch
        ? `${dispatchPlan?.selectedAmbulance.name} (${dispatchPlan?.selectedAmbulance.etaMinutes}m) → ${dispatchPlan?.selectedHospital.name}`
        : hasAssessment
        ? 'Selecting nearest ALS ambulance, hospital & volunteer…'
        : 'Waiting for location & triage',
      whatGeminiDecided: hasDispatch
        ? `Ambulance: ${dispatchPlan?.selectedAmbulance.name} (ETA ${dispatchPlan?.selectedAmbulance.etaMinutes}m) | Hospital: ${dispatchPlan?.selectedHospital.name} (ETA ${dispatchPlan?.selectedHospital.etaMinutes}m) | Volunteer: ${dispatchPlan?.selectedVolunteer.name} (ETA ${dispatchPlan?.selectedVolunteer.etaMinutes}m)`
        : 'Pending dispatch routing.',
      whyGeminiDecided: hasDispatch
        ? `${dispatchPlan?.selectedAmbulance.selectionReason}. Hospital: ${dispatchPlan?.selectedHospital.selectionReason}. Volunteer: ${dispatchPlan?.selectedVolunteer.assignedReason}`
        : 'Awaiting coordinates and clinical capability requirements.',
      details: hasDispatch
        ? [
            {
              label: 'Selected Ambulance (Simulated)',
              value: `${dispatchPlan?.selectedAmbulance.name} · ETA ${dispatchPlan?.selectedAmbulance.etaMinutes} min`,
            },
            {
              label: 'Destination Hospital',
              value: `${dispatchPlan?.selectedHospital.name} (${dispatchPlan?.selectedHospital.capabilityMatch}) · ETA ${dispatchPlan?.selectedHospital.etaMinutes} min`,
            },
            {
              label: 'Community First Responder (Simulated)',
              value: `${dispatchPlan?.selectedVolunteer.name} (${dispatchPlan?.selectedVolunteer.vehicle}) · ETA ${dispatchPlan?.selectedVolunteer.etaMinutes} min`,
            },
          ]
        : [],
    },
    {
      id: 'hospital_prealert',
      stepNumber: 9,
      title: 'Hospital pre-alert',
      status: dispatchPlan?.hospitalPreAlert
        ? 'completed'
        : hasAssessment
        ? 'running'
        : 'pending',
      durationMs: dispatchPlan?.hospitalPreAlert
        ? pipelineTimings.hospital_prealert || 340
        : undefined,
      summary: dispatchPlan?.hospitalPreAlert
        ? `${dispatchPlan.hospitalPreAlert.destinationHospitalName} · ${(
            dispatchPlan.hospitalPreAlert.requiredPrepTeams || []
          )
            .slice(0, 2)
            .join(', ')}`
        : hasAssessment
        ? 'Transmitting pre-arrival alert to receiving hospital…'
        : 'Waiting for hospital selection',
      whatGeminiDecided: dispatchPlan?.hospitalPreAlert
        ? `Pre-Alert transmitted to ${
            dispatchPlan.hospitalPreAlert.destinationHospitalName
          } (ETA ${dispatchPlan.hospitalPreAlert.etaMinutes}m). Standby Teams: ${(
            dispatchPlan.hospitalPreAlert.requiredPrepTeams || []
          ).join(', ')}`
        : 'Pending hospital pre-alert packet.',
      whyGeminiDecided: dispatchPlan?.hospitalPreAlert
        ? `Activated specialist trauma/resuscitation teams ahead of ambulance arrival based on ${
            assessment?.likelyEmergencyType || 'triage'
          }. Status: ${dispatchPlan.hospitalPreAlert.transmissionStatus}`
        : 'Awaiting dispatch plan.',
      details: dispatchPlan?.hospitalPreAlert
        ? [
            {
              label: 'Receiving Facility',
              value: dispatchPlan.hospitalPreAlert.destinationHospitalName,
            },
            {
              label: 'Required Prep Teams',
              value: (dispatchPlan.hospitalPreAlert.requiredPrepTeams || []).join(' · '),
            },
            {
              label: 'First Aid Logged',
              value:
                (dispatchPlan.hospitalPreAlert.firstAidAdministered || []).join(' · ') ||
                'In progress',
            },
            ...(dispatchPlan.hospitalPreAlert.doctorHandoverNote
              ? [
                  {
                    label: 'Doctor Handover Note',
                    value: dispatchPlan.hospitalPreAlert.doctorHandoverNote.summaryNote,
                  },
                ]
              : []),
          ]
        : [],
    },
    {
      id: 'doctor_briefing',
      stepNumber: 10,
      title: 'Doctor briefing',
      status: hasAssessment ? 'completed' : 'pending',
      durationMs: hasAssessment ? pipelineTimings.doctor_briefing || 410 : undefined,
      summary:
        doctorCallState === 'connected'
          ? `${resolvedDoctorName} live on translated bridge (${doctorMessages.length} msgs) · (Simulated)`
          : doctorCallState === 'ended'
          ? `Call ended · Handover note added to Hospital Pre-Alert`
          : doctorCallState === 'ringing'
          ? `Connecting to ${resolvedDoctorName}… (Simulated call)`
          : hasAssessment
          ? `Patient brief & ${conversationLog.length} log entries synced to ${resolvedDoctorName}`
          : 'Waiting for active call',
      whatGeminiDecided: hasAssessment
        ? `Compiled AI Patient Brief for ${resolvedDoctorName} (${assessment?.severity}, ${
            assessment?.likelyEmergencyType
          }), synced ${conversationLog.length} conversation log items, and generated one-click physician instructions.`
        : 'Pending active emergency.',
      whyGeminiDecided:
        doctorCallState === 'connected' || doctorCallState === 'ended'
          ? `Real-time bidirectional translation (${
              assessment?.detectedLanguage || 'Caller language'
            } ↔ English) and automated paramedic/hospital handover synthesis.`
          : hasAssessment
          ? 'Enables instant physician tele-supervision with zero repetition of caller history.'
          : 'Awaiting triage completion.',
      details: hasAssessment
        ? [
            { label: 'On-Call Physician', value: `${resolvedDoctorName} (Simulated)` },
            {
              label: 'Call Bridge Status',
              value:
                doctorCallState === 'connected'
                  ? 'Connected — Live Translated Audio & Text'
                  : doctorCallState === 'ringing'
                  ? 'Ringing (3s simulated connection)…'
                  : doctorCallState === 'ended'
                  ? 'Ended — Handover Note Generated'
                  : 'Briefed & Ready',
            },
            {
              label: 'Synced Log Entries',
              value: `${conversationLog.length} chronological events`,
            },
          ]
        : [],
    },
  ];
}

// ============================================================================
// IVR VOICE-MENU & BASIC KEYPAD PHONE HELPERS
// ============================================================================

/**
 * Maps a detected language string to the appropriate BCP-47 voice tag and language prefix
 * for speechSynthesis (e.g. ta-IN, hi-IN, ja-JP, id-ID, en-IN, etc.).
 */
export function mapLanguageToBcp47(detectedLanguage?: string): {
  langCode: string;
  prefix: string;
} {
  const lower = (detectedLanguage || '').toLowerCase();
  if (lower.includes('tamil')) return { langCode: 'ta-IN', prefix: 'ta' };
  if (lower.includes('hindi')) return { langCode: 'hi-IN', prefix: 'hi' };
  if (lower.includes('japanese')) return { langCode: 'ja-JP', prefix: 'ja' };
  if (lower.includes('indonesian') || lower.includes('bahasa') || lower.includes('malay')) {
    return { langCode: 'id-ID', prefix: 'id' };
  }
  if (lower.includes('telugu')) return { langCode: 'te-IN', prefix: 'te' };
  if (lower.includes('kannada')) return { langCode: 'kn-IN', prefix: 'kn' };
  if (lower.includes('malayalam')) return { langCode: 'ml-IN', prefix: 'ml' };
  if (lower.includes('marathi')) return { langCode: 'mr-IN', prefix: 'mr' };
  if (lower.includes('bengali')) return { langCode: 'bn-IN', prefix: 'bn' };
  if (lower.includes('gujarati')) return { langCode: 'gu-IN', prefix: 'gu' };
  if (lower.includes('punjabi')) return { langCode: 'pa-IN', prefix: 'pa' };
  if (lower.includes('sinhala')) return { langCode: 'si-LK', prefix: 'si' };
  if (lower.includes('tagalog') || lower.includes('filipino')) {
    return { langCode: 'fil-PH', prefix: 'fil' };
  }
  if (lower.includes('chinese') || lower.includes('mandarin')) {
    return { langCode: 'zh-CN', prefix: 'zh' };
  }
  if (lower.includes('korean')) return { langCode: 'ko-KR', prefix: 'ko' };
  if (lower.includes('spanish')) return { langCode: 'es-ES', prefix: 'es' };
  if (lower.includes('french')) return { langCode: 'fr-FR', prefix: 'fr' };
  if (lower.includes('german')) return { langCode: 'de-DE', prefix: 'de' };
  if (lower.includes('portuguese')) return { langCode: 'pt-BR', prefix: 'pt' };
  if (lower.includes('arabic')) return { langCode: 'ar-SA', prefix: 'ar' };
  if (lower.includes('swahili')) return { langCode: 'sw-KE', prefix: 'sw' };
  return { langCode: 'en-IN', prefix: 'en' };
}

/**
 * Returns a short, reassuring Step 3 phrase in the caller's language ("Help is being arranged.").
 */
export function getShortReassuranceInCallerLang(detectedLanguage?: string): {
  callerText: string;
  englishText: string;
} {
  const lower = (detectedLanguage || '').toLowerCase();
  if (lower.includes('tamil')) {
    return {
      callerText: 'உதவி ஏற்பாடு செய்யப்படுகிறது.',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('hindi')) {
    return {
      callerText: 'मदद की व्यवस्था की जा रही है।',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('japanese')) {
    return {
      callerText: '救急車を手配しています。',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('indonesian') || lower.includes('bahasa') || lower.includes('malay')) {
    return {
      callerText: 'Bantuan sedang diatur.',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('telugu')) {
    return {
      callerText: 'సహాయం ఏర్పాటు చేయబడుతోంది.',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('kannada')) {
    return {
      callerText: 'ಸಹಾಯವನ್ನು ವ್ಯವಸ್ಥೆ ಮಾಡಲಾಗುತ್ತಿದೆ.',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('malayalam')) {
    return {
      callerText: 'സഹായം ക്രമീകരിക്കുന്നുണ്ട്.',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('bengali')) {
    return {
      callerText: 'সাহায্যের ব্যবস্থা করা হচ্ছে।',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('spanish')) {
    return {
      callerText: 'Se está organizando la ayuda.',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('french')) {
    return {
      callerText: 'Les secours sont en cours d’organisation.',
      englishText: 'Help is being arranged.',
    };
  }
  if (lower.includes('arabic')) {
    return {
      callerText: 'يتم ترتيب المساعدة الآن.',
      englishText: 'Help is being arranged.',
    };
  }
  return {
    callerText: 'Help is being arranged.',
    englishText: 'Help is being arranged.',
  };
}

export interface IvrMenuOptionItem {
  key: '1' | '2' | '3';
  shortCaller: string;
  shortEnglish: string;
  fullCaller: string;
  fullEnglish: string;
}

/**
 * Turns a TriageQuestion into a numbered 3-option IVR menu in the caller's language:
 * - Spoken prompt: e.g. "Press 1 if he is breathing. Press 2 if he is not breathing. Press 3 if not sure."
 * - Short screen menu line: e.g. "1 Breathing / 2 Not breathing / 3 Not sure"
 */
export function buildIvrQuestionPrompt(
  question: TriageQuestion,
  detectedLanguage?: string,
  qIndex: number = 0
): {
  questionTitleCaller: string;
  menuShortLine: string;
  repeatHintCaller: string;
  spokenPrompt: string;
  options: IvrMenuOptionItem[];
} {
  const lower = (detectedLanguage || '').toLowerCase();
  const rawOpts =
    Array.isArray(question.options) && question.options.length >= 3
      ? question.options.slice(0, 3)
      : getLocalizedOptionsForQuestion(question.questionEnglish, detectedLanguage || 'English', qIndex).slice(0, 3);

  const keys: Array<'1' | '2' | '3'> = ['1', '2', '3'];

  const shortenLabel = (txt: string, maxLen = 18): string => {
    const cleaned = (txt || '')
      .replace(/^(yes|no|ஆம்|இல்லை|हाँ|नहीं|はい|いいえ|ya|tidak|sí|oui)[,\s]+/i, '')
      .trim();
    const base = cleaned || txt || '';
    return base.length > maxLen ? `${base.slice(0, maxLen - 1)}…` : base;
  };

  const options: IvrMenuOptionItem[] = keys.map((k, idx) => {
    const opt = rawOpts[idx] || {
      id: `opt-${k}`,
      textCallerLang: k === '1' ? 'Yes' : k === '2' ? 'No' : 'Not sure',
      textEnglish: k === '1' ? 'Yes, breathing' : k === '2' ? 'No, not breathing' : 'Not sure',
    };
    return {
      key: k,
      shortCaller: shortenLabel(opt.textCallerLang, 16),
      shortEnglish: shortenLabel(opt.textEnglish, 18),
      fullCaller: opt.textCallerLang,
      fullEnglish: opt.textEnglish,
    };
  });

  const menuShortLine = options.map((o) => `${o.key} ${o.shortCaller}`).join(' / ');

  let spokenPrompt = '';
  let repeatHintCaller = '* Repeat';

  if (lower.includes('tamil')) {
    spokenPrompt = `${question.questionCallerLang}. ${options
      .map((o) => `${o.fullCaller} என்றால் ${o.key}-ஐ அழுத்தவும்`)
      .join('. ')}. மீண்டும் கேட்க * அழுத்தவும்.`;
    repeatHintCaller = '* மீண்டும் கேட்க';
  } else if (lower.includes('hindi')) {
    spokenPrompt = `${question.questionCallerLang}. ${options
      .map((o) => `${o.fullCaller} के लिए ${o.key} दबाएं`)
      .join('. ')}. दोहराने के लिए * दबाएं।`;
    repeatHintCaller = '* दोहराएं';
  } else if (lower.includes('japanese')) {
    spokenPrompt = `${question.questionCallerLang}。${options
      .map((o) => `${o.fullCaller}場合は${o.key}を押してください`)
      .join('。')}。もう一度聞くには＊を押してください。`;
    repeatHintCaller = '* もう一度聞く';
  } else if (lower.includes('indonesian') || lower.includes('bahasa') || lower.includes('malay')) {
    spokenPrompt = `${question.questionCallerLang}. ${options
      .map((o) => `Tekan ${o.key} jika ${o.fullCaller}`)
      .join('. ')}. Tekan * untuk mengulang.`;
    repeatHintCaller = '* Ulangi';
  } else if (lower.includes('spanish')) {
    spokenPrompt = `${question.questionCallerLang}. ${options
      .map((o) => `Presione ${o.key} si ${o.fullCaller}`)
      .join('. ')}. Presione * para repetir.`;
    repeatHintCaller = '* Repetir';
  } else {
    spokenPrompt = `${question.questionCallerLang} ${options
      .map((o) => `Press ${o.key} if ${o.fullCaller.toLowerCase()}.`)
      .join(' ')} Press star to repeat.`;
    repeatHintCaller = '* Repeat';
  }

  return {
    questionTitleCaller: question.questionCallerLang,
    menuShortLine,
    repeatHintCaller,
    spokenPrompt,
    options,
  };
}

/**
 * Formats a Guided First-Aid step for the compact IVR screen and voice prompt:
 * "Step 1: … Press 1 when done. Press * to repeat. Press 0 to talk to a doctor."
 */
export function buildIvrFirstAidPrompt(
  step: FirstAidStep,
  detectedLanguage?: string
): {
  stepHeaderCaller: string;
  stepBodyCaller: string;
  keyHintCaller: string;
  spokenPrompt: string;
} {
  const lower = (detectedLanguage || '').toLowerCase();
  const num = step.stepNumber || 1;
  const body = step.stepCallerLang || step.stepEnglish;

  if (lower.includes('tamil')) {
    return {
      stepHeaderCaller: `முதல் உதவி ${num}:`,
      stepBodyCaller: body,
      keyHintCaller: '1 முடிந்தது · * மீண்டும் · 0 டாக்டர்',
      spokenPrompt: `படி ${num}: ${body}. முடிந்ததும் 1-ஐ அழுத்தவும். மீண்டும் கேட்க * அழுத்தவும். மருத்துவரிடம் பேச 0 அழுத்தவும்.`,
    };
  }
  if (lower.includes('hindi')) {
    return {
      stepHeaderCaller: `प्राथमिक उपचार ${num}:`,
      stepBodyCaller: body,
      keyHintCaller: '1 पूरा · * दोहराएं · 0 डॉक्टर',
      spokenPrompt: `कदम ${num}: ${body}। पूरा होने पर 1 दबाएं। दोहराने के लिए * दबाएं। डॉक्टर से बात करने के लिए 0 दबाएं।`,
    };
  }
  if (lower.includes('japanese')) {
    return {
      stepHeaderCaller: `応急処置 ステップ ${num}:`,
      stepBodyCaller: body,
      keyHintCaller: '1 完了 · * 再読 · 0 医師',
      spokenPrompt: `ステップ ${num}: ${body}。完了したら1を押してください。もう一度聞くには＊を、医師と話すには0を押してください。`,
    };
  }
  if (lower.includes('indonesian') || lower.includes('bahasa') || lower.includes('malay')) {
    return {
      stepHeaderCaller: `Langkah ${num}:`,
      stepBodyCaller: body,
      keyHintCaller: '1 Selesai · * Ulangi · 0 Dokter',
      spokenPrompt: `Langkah ${num}: ${body}. Tekan 1 jika selesai. Tekan * untuk mengulang. Tekan 0 untuk bicara dengan dokter.`,
    };
  }

  return {
    stepHeaderCaller: `Step ${num}:`,
    stepBodyCaller: body,
    keyHintCaller: '1 Done · * Repeat · 0 Doctor',
    spokenPrompt: `Step ${num}: ${body} Press 1 when done. Press star to repeat. Press 0 to talk to a doctor.`,
  };
}

/**
 * Formats the Step 6 Final Status using real dispatch results:
 * "Emergency doctor connected. Ambulance arriving in 14 minutes. Emergency responder arriving in 5 minutes."
 */
export function buildIvrFinalDispatchStatus(params: {
  dispatchPlan: DispatchPlan | null | undefined;
  assessment: TriageAssessment | null | undefined;
  ambulanceEtaSeconds: number;
  responderEtaSeconds: number;
  doctorConnected: boolean;
}): {
  spokenStatus: string;
  statusLineCaller: string;
  ambulanceLineCaller: string;
  responderLineCaller: string;
  keyHintCaller: string;
} {
  const {
    dispatchPlan,
    assessment,
    ambulanceEtaSeconds,
    responderEtaSeconds,
    doctorConnected,
  } = params;
  const lower = (assessment?.detectedLanguage || '').toLowerCase();

  const ambMins = Math.max(
    1,
    Math.ceil(
      ambulanceEtaSeconds > 0
        ? ambulanceEtaSeconds / 60
        : dispatchPlan?.selectedAmbulance?.etaMinutes ||
            assessment?.nearbyAmbulances?.[0]?.etaMinutes ||
            14
    )
  );
  const respMins = Math.max(
    1,
    Math.ceil(
      responderEtaSeconds > 0
        ? responderEtaSeconds / 60
        : dispatchPlan?.selectedVolunteer?.etaMinutes ||
            assessment?.nearbyVolunteers?.[0]?.etaMinutes ||
            5
    )
  );

  const ambClock = formatCountdownMMSS(ambulanceEtaSeconds);
  const respClock = formatCountdownMMSS(responderEtaSeconds);

  if (lower.includes('tamil')) {
    const docPhrase = doctorConnected
      ? 'அவசர மருத்துவர் இணைக்கப்பட்டுள்ளார்.'
      : 'மருத்துவர் தயார் நிலையில் உள்ளார்.';
    return {
      spokenStatus: `${docPhrase} ஆம்புலன்ஸ் ${ambMins} நிமிடங்களில் வருகிறது. முதல் உதவி தன்னார்வலர் ${respMins} நிமிடங்களில் வருகிறார்.`,
      statusLineCaller: `${
        doctorConnected ? 'மருத்துவர் இணைப்பு.' : 'உதவி வருகிறது.'
      } ஆம்புலன்ஸ் ${ambMins} நிமி, தன்னார்வலர் ${respMins} நிமி.`,
      ambulanceLineCaller: `ஆம்புலன்ஸ் ETA: ${ambClock}`,
      responderLineCaller: `தன்னார்வலர் ETA: ${respClock}`,
      keyHintCaller: '0 டாக்டர் · * மீண்டும்',
    };
  }

  if (lower.includes('hindi')) {
    const docPhrase = doctorConnected
      ? 'आपातकालीन डॉक्टर जुड़ चुके हैं।'
      : 'आपातकालीन डॉक्टर तैयार हैं।';
    return {
      spokenStatus: `${docPhrase} एम्बुलेंस ${ambMins} मिनट में पहुँच रही है। आपातकालीन सहायक ${respMins} मिनट में पहुँच रहे हैं।`,
      statusLineCaller: `${
        doctorConnected ? 'डॉक्टर जुड़े हैं।' : 'मदद आ रही है।'
      } एम्बुलेंस ${ambMins} मि, सहायक ${respMins} मि।`,
      ambulanceLineCaller: `एम्बुलेंस ETA: ${ambClock}`,
      responderLineCaller: `सहायक ETA: ${respClock}`,
      keyHintCaller: '0 डॉक्टर · * दोहराएं',
    };
  }

  if (lower.includes('japanese')) {
    const docPhrase = doctorConnected ? '救急医が接続しました。' : '救急医が待機しています。';
    return {
      spokenStatus: `${docPhrase}救急車は${ambMins}分で到着します。応急処置員は${respMins}分で到着します。`,
      statusLineCaller: `${
        doctorConnected ? '救急医接続済。' : '救急隊接近中。'
      }救急車${ambMins}分・応急員${respMins}分`,
      ambulanceLineCaller: `救急車 ETA: ${ambClock}`,
      responderLineCaller: `応急員 ETA: ${respClock}`,
      keyHintCaller: '0 医師 · * 再読',
    };
  }

  if (lower.includes('indonesian') || lower.includes('bahasa') || lower.includes('malay')) {
    const docPhrase = doctorConnected
      ? 'Dokter darurat terhubung.'
      : 'Dokter darurat siap.';
    return {
      spokenStatus: `${docPhrase} Ambulans tiba dalam ${ambMins} menit. Perespons darurat tiba dalam ${respMins} menit.`,
      statusLineCaller: `${
        doctorConnected ? 'Dokter terhubung.' : 'Bantuan dikirim.'
      } Ambulans ${ambMins}m, Perespons ${respMins}m.`,
      ambulanceLineCaller: `Ambulans ETA: ${ambClock}`,
      responderLineCaller: `Perespons ETA: ${respClock}`,
      keyHintCaller: '0 Dokter · * Ulangi',
    };
  }

  return {
    spokenStatus: `Emergency doctor connected. Ambulance arriving in ${ambMins} minutes. Emergency responder arriving in ${respMins} minutes.`,
    statusLineCaller: `Doctor connected. Ambulance in ${ambMins}m, Responder in ${respMins}m.`,
    ambulanceLineCaller: `Ambulance ETA: ${ambClock} (${ambMins}m)`,
    responderLineCaller: `Responder ETA: ${respClock} (${respMins}m)`,
    keyHintCaller: '0 Doctor · * Repeat',
  };
}

/**
 * Formats an IVR keypress log entry for the Operations Command Centre AI pipeline and conversation log,
 * e.g. "Caller pressed 2 → Not breathing".
 */
export function formatIvrKeypressLog(
  key: string,
  meaningEnglish: string,
  meaningCallerLang?: string
): {
  logEnglish: string;
  logCallerLang: string;
} {
  const cleanMeaningEn = (meaningEnglish || '').trim();
  const cleanMeaningCaller = (meaningCallerLang || cleanMeaningEn).trim();
  return {
    logEnglish: `Caller pressed ${key} → ${cleanMeaningEn}`,
    logCallerLang: `Caller pressed ${key} → ${cleanMeaningCaller}`,
  };
}

/**
 * Parses a spoken transcript to see if the caller spoke a menu digit (1, 2, 3, 0, *) in their language or English.
 */
export function parseSpokenMenuNumber(transcript: string): '1' | '2' | '3' | '0' | '*' | null {
  const clean = (transcript || '').trim().toLowerCase();
  if (!clean) return null;
  if (/\b1\b|one|first|ஒன்று|ஒன்னு|एक|いち|一|satu|uno/i.test(clean)) return '1';
  if (/\b2\b|two|second|இரண்டு|ரெண்டு|दो|に|二|dua|dos/i.test(clean)) return '2';
  if (/\b3\b|three|third|மூன்று|மூணு|तीन|さん|三|tiga|tres/i.test(clean)) return '3';
  if (/\b0\b|zero|doctor|டாக்டர்|மருத்துவர்|डॉक्टर|शून्य|医師|dokter/i.test(clean)) return '0';
  if (/\*|star|repeat|மீண்டும்|दोहराएं|もう一度|ulangi/i.test(clean)) return '*';
  return null;
}

/**
 * 2-hour TTL in milliseconds for active room sessions on the server.
 */
export const ROOM_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Generates a random 6-character uppercase alphanumeric room code (e.g. "ABC123").
 */
export function generateRoomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

/**
 * Normalizes and validates a room code string (uppercase alphanumeric, 3-16 chars).
 */
export function normalizeRoomCode(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 3 || cleaned.length > 16) return null;
  return cleaned;
}

/**
 * Extracts and normalizes the `?room=CODE` query parameter from a URL search string.
 */
export function resolveRoomCodeFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search || '');
    return normalizeRoomCode(params.get('room'));
  } catch {
    return null;
  }
}

/**
 * Builds the mobile caller phone pairing URL: `<origin>/caller?room=ABC123`.
 */
export function buildCallerPairingUrl(origin: string, roomCode: string): string {
  const cleanOrigin = (origin || '').replace(/\/+$/, '');
  const code = normalizeRoomCode(roomCode) || roomCode.trim().toUpperCase();
  return `${cleanOrigin}/caller?room=${encodeURIComponent(code)}`;
}

/**
 * Version-based sync check: returns true strictly when remoteVersion > lastAppliedVersion.
 * Never compares client and server clocks.
 */
export function shouldApplyRemoteSession(
  remoteVersion: number | undefined,
  lastAppliedVersion: number
): boolean {
  if (typeof remoteVersion !== 'number' || Number.isNaN(remoteVersion)) {
    return false;
  }
  return remoteVersion > lastAppliedVersion;
}

/**
 * Deletes sessions older than maxAgeMs (defaults to 2 hours) from the room sessions Map.
 * Returns the number of expired sessions deleted.
 */
export function pruneExpiredRoomSessions<T extends { updatedAt: number }>(
  store: Map<string, T>,
  nowMs: number = Date.now(),
  maxAgeMs: number = ROOM_SESSION_TTL_MS
): number {
  let deletedCount = 0;
  for (const [roomKey, session] of store.entries()) {
    if (!session || nowMs - session.updatedAt > maxAgeMs) {
      store.delete(roomKey);
      deletedCount += 1;
    }
  }
  return deletedCount;
}

/**
 * Generates a deterministic 21x21 QR-code matrix with standard 7x7 finder patterns,
 * timing lines, and payload bit encoding for rendering an inline SVG QR code.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isCenter;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns along row 6 and col 6
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  reserved[size - 8][8] = true;
  matrix[size - 8][8] = true;

  // Encode text bytes + FNV-like hash stream into remaining cells
  const payload = text || 'GOLDENHOUR';
  const bytes: number[] = [];
  for (let i = 0; i < payload.length; i++) {
    bytes.push(payload.charCodeAt(i) & 0xff);
  }
  if (bytes.length === 0) bytes.push(0x47);

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const byteVal = bytes[bitIdx % bytes.length];
      const shift = bitIdx % 8;
      const mask = (r * 3 + c * 5 + bitIdx) % 2 === 0;
      const bit = ((byteVal >> shift) & 1) === 1;
      matrix[r][c] = bit !== mask;
      bitIdx += 1;
    }
  }

  return matrix;
}

// ============================================================================
// GLOBAL EMERGENCY NUMBERS MAP & BROWSER COUNTRY DETECTION
// ============================================================================

export interface CountryEmergencyRecord {
  code: string;
  country: string;
  flag: string;
  numbers: string;
  emergencyNumber: string;
  primary: string;
  medical: string;
}

export const EMERGENCY_NUMBERS_MAP: Record<string, CountryEmergencyRecord> = {
  IN: { country: 'India', code: 'IN', flag: '🇮🇳', numbers: '112 / 108', emergencyNumber: '112 / 108', primary: '112', medical: '108' },
  JP: { country: 'Japan', code: 'JP', flag: '🇯🇵', numbers: '119', emergencyNumber: '119', primary: '119', medical: '119' },
  CN: { country: 'China', code: 'CN', flag: '🇨🇳', numbers: '120', emergencyNumber: '120', primary: '120', medical: '120' },
  SG: { country: 'Singapore', code: 'SG', flag: '🇸🇬', numbers: '995', emergencyNumber: '995', primary: '995', medical: '995' },
  ID: { country: 'Indonesia', code: 'ID', flag: '🇮🇩', numbers: '112 / 119', emergencyNumber: '112 / 119', primary: '112', medical: '119' },
  PH: { country: 'Philippines', code: 'PH', flag: '🇵🇭', numbers: '911', emergencyNumber: '911', primary: '911', medical: '911' },
  MY: { country: 'Malaysia', code: 'MY', flag: '🇲🇾', numbers: '999', emergencyNumber: '999', primary: '999', medical: '999' },
  LK: { country: 'Sri Lanka', code: 'LK', flag: '🇱🇰', numbers: '1990', emergencyNumber: '1990', primary: '1990', medical: '1990' },
  AU: { country: 'Australia', code: 'AU', flag: '🇦🇺', numbers: '000', emergencyNumber: '000', primary: '000', medical: '000' },
  NZ: { country: 'New Zealand', code: 'NZ', flag: '🇳🇿', numbers: '111', emergencyNumber: '111', primary: '111', medical: '111' },
  US: { country: 'United States', code: 'US', flag: '🇺🇸', numbers: '911', emergencyNumber: '911', primary: '911', medical: '911' },
  CA: { country: 'Canada', code: 'CA', flag: '🇨🇦', numbers: '911', emergencyNumber: '911', primary: '911', medical: '911' },
  GB: { country: 'United Kingdom', code: 'GB', flag: '🇬🇧', numbers: '999 / 112', emergencyNumber: '999 / 112', primary: '999', medical: '999' },
  DE: { country: 'Germany', code: 'DE', flag: '🇩🇪', numbers: '112', emergencyNumber: '112', primary: '112', medical: '112' },
  FR: { country: 'France', code: 'FR', flag: '🇫🇷', numbers: '15 / 112', emergencyNumber: '15 / 112', primary: '112', medical: '15' },
  IT: { country: 'Italy', code: 'IT', flag: '🇮🇹', numbers: '112 / 118', emergencyNumber: '112 / 118', primary: '112', medical: '118' },
  ES: { country: 'Spain', code: 'ES', flag: '🇪🇸', numbers: '112', emergencyNumber: '112', primary: '112', medical: '112' },
  MX: { country: 'Mexico', code: 'MX', flag: '🇲🇽', numbers: '911', emergencyNumber: '911', primary: '911', medical: '911' },
  BR: { country: 'Brazil', code: 'BR', flag: '🇧🇷', numbers: '192', emergencyNumber: '192', primary: '192', medical: '192' },
  ZA: { country: 'South Africa', code: 'ZA', flag: '🇿🇦', numbers: '10177 / 112', emergencyNumber: '10177 / 112', primary: '112', medical: '10177' },
  NG: { country: 'Nigeria', code: 'NG', flag: '🇳🇬', numbers: '112', emergencyNumber: '112', primary: '112', medical: '112' },
  KE: { country: 'Kenya', code: 'KE', flag: '🇰🇪', numbers: '999 / 112', emergencyNumber: '999 / 112', primary: '999', medical: '999' },
  PK: { country: 'Pakistan', code: 'PK', flag: '🇵🇰', numbers: '1122', emergencyNumber: '1122', primary: '1122', medical: '1122' },
  BD: { country: 'Bangladesh', code: 'BD', flag: '🇧🇩', numbers: '999', emergencyNumber: '999', primary: '999', medical: '999' },
  NP: { country: 'Nepal', code: 'NP', flag: '🇳🇵', numbers: '102', emergencyNumber: '102', primary: '102', medical: '102' },
  TH: { country: 'Thailand', code: 'TH', flag: '🇹🇭', numbers: '1669', emergencyNumber: '1669', primary: '1669', medical: '1669' },
  VN: { country: 'Vietnam', code: 'VN', flag: '🇻🇳', numbers: '115', emergencyNumber: '115', primary: '115', medical: '115' },
  KR: { country: 'South Korea', code: 'KR', flag: '🇰🇷', numbers: '119', emergencyNumber: '119', primary: '119', medical: '119' },
  RU: { country: 'Russia', code: 'RU', flag: '🇷🇺', numbers: '112 / 103', emergencyNumber: '112 / 103', primary: '112', medical: '103' },
  AE: { country: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', numbers: '998 / 999', emergencyNumber: '998 / 999', primary: '999', medical: '998' },
  SA: { country: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', numbers: '997', emergencyNumber: '997', primary: '997', medical: '997' },
  EG: { country: 'Egypt', code: 'EG', flag: '🇪🇬', numbers: '123', emergencyNumber: '123', primary: '123', medical: '123' },
};

export const EMERGENCY_COUNTRY_OPTIONS: CountryEmergencyRecord[] = Object.values(
  EMERGENCY_NUMBERS_MAP
);

export interface ResolvedCountryEmergencyInfo {
  code: string;
  countryCode: string;
  country: string;
  flag: string;
  numbers: string;
  emergencyNumber: string;
  primary: string;
  medical: string;
  isUnknown?: boolean;
  isKnown: boolean;
}

export function lookupEmergencyCountry(
  countryOrCode?: string | null
): CountryEmergencyRecord | null {
  if (!countryOrCode) return null;
  const trimmed = countryOrCode.trim();
  if (!trimmed || trimmed.toUpperCase() === 'UNKNOWN') return null;
  const upper = trimmed.toUpperCase();
  if (EMERGENCY_NUMBERS_MAP[upper]) {
    return EMERGENCY_NUMBERS_MAP[upper];
  }
  const lower = trimmed.toLowerCase();
  for (const rec of Object.values(EMERGENCY_NUMBERS_MAP)) {
    if (
      rec.country.toLowerCase() === lower ||
      lower.includes(rec.country.toLowerCase())
    ) {
      return rec;
    }
  }
  return null;
}

/**
 * Looks up a country by ISO-2 code or country name in EMERGENCY_NUMBERS_MAP.
 * If unknown, returns the international GSM default (112) with isUnknown: true / isKnown: false.
 */
export function getCountryEmergencyInfo(
  countryCode?: string | null,
  countryName?: string | null
): ResolvedCountryEmergencyInfo {
  const code = (countryCode || '').toUpperCase().trim();
  if (code === 'UNKNOWN' || code === 'INTL') {
    return {
      code: 'UNKNOWN',
      countryCode: '',
      country: 'Unknown',
      flag: '🌐',
      numbers: '112',
      emergencyNumber: '112',
      primary: '112',
      medical: '112',
      isUnknown: true,
      isKnown: false,
    };
  }
  const byCode = lookupEmergencyCountry(code);
  if (byCode) {
    return {
      ...byCode,
      countryCode: byCode.code,
      isUnknown: false,
      isKnown: true,
    };
  }
  const byName = lookupEmergencyCountry(countryName);
  if (byName) {
    return {
      ...byName,
      countryCode: byName.code,
      isUnknown: false,
      isKnown: true,
    };
  }
  return {
    code: 'UNKNOWN',
    countryCode: '',
    country: countryName && countryName !== 'Unknown' ? countryName : 'Unknown',
    flag: '🌐',
    numbers: '112',
    emergencyNumber: '112',
    primary: '112',
    medical: '112',
    isUnknown: true,
    isKnown: false,
  };
}

const TIMEZONE_TO_COUNTRY_CODE: Record<string, string> = {
  'asia/kolkata': 'IN',
  'asia/calcutta': 'IN',
  'asia/tokyo': 'JP',
  'asia/shanghai': 'CN',
  'asia/chongqing': 'CN',
  'asia/urumqi': 'CN',
  'asia/harbin': 'CN',
  'asia/singapore': 'SG',
  'singapore': 'SG',
  'asia/jakarta': 'ID',
  'asia/makassar': 'ID',
  'asia/jayapura': 'ID',
  'asia/pontianak': 'ID',
  'asia/manila': 'PH',
  'asia/kuala_lumpur': 'MY',
  'asia/kuching': 'MY',
  'asia/colombo': 'LK',
  'australia/sydney': 'AU',
  'australia/melbourne': 'AU',
  'australia/brisbane': 'AU',
  'australia/perth': 'AU',
  'australia/adelaide': 'AU',
  'australia/darwin': 'AU',
  'australia/hobart': 'AU',
  'pacific/auckland': 'NZ',
  'pacific/chatham': 'NZ',
  'europe/london': 'GB',
  'europe/berlin': 'DE',
  'europe/busingen': 'DE',
  'europe/paris': 'FR',
  'europe/rome': 'IT',
  'europe/madrid': 'ES',
  'atlantic/canary': 'ES',
  'america/mexico_city': 'MX',
  'america/cancun': 'MX',
  'america/monterrey': 'MX',
  'america/tijuana': 'MX',
  'america/sao_paulo': 'BR',
  'america/manaus': 'BR',
  'america/fortaleza': 'BR',
  'america/recife': 'BR',
  'africa/johannesburg': 'ZA',
  'africa/lagos': 'NG',
  'africa/nairobi': 'KE',
  'asia/karachi': 'PK',
  'asia/dhaka': 'BD',
  'asia/kathmandu': 'NP',
  'asia/katmandu': 'NP',
  'asia/bangkok': 'TH',
  'asia/ho_chi_minh': 'VN',
  'asia/saigon': 'VN',
  'asia/seoul': 'KR',
  'europe/moscow': 'RU',
  'asia/yekaterinburg': 'RU',
  'asia/novosibirsk': 'RU',
  'asia/vladivostok': 'RU',
  'asia/dubai': 'AE',
  'asia/riyadh': 'SA',
  'africa/cairo': 'EG',
  'america/toronto': 'CA',
  'america/vancouver': 'CA',
  'america/edmonton': 'CA',
  'america/winnipeg': 'CA',
  'america/halifax': 'CA',
  'america/new_york': 'US',
  'america/chicago': 'US',
  'america/denver': 'US',
  'america/los_angeles': 'US',
  'america/phoenix': 'US',
  'america/anchorage': 'US',
  'pacific/honolulu': 'US',
};

const LANGUAGE_PREFIX_TO_COUNTRY_CODE: Record<string, string> = {
  ja: 'JP',
  zh: 'CN',
  ta: 'IN',
  hi: 'IN',
  te: 'IN',
  kn: 'IN',
  ml: 'IN',
  mr: 'IN',
  bn: 'IN',
  gu: 'IN',
  pa: 'IN',
  id: 'ID',
  fil: 'PH',
  tl: 'PH',
  ms: 'MY',
  si: 'LK',
  ko: 'KR',
  th: 'TH',
  vi: 'VN',
  de: 'DE',
  fr: 'FR',
  it: 'IT',
  es: 'ES',
  pt: 'BR',
  ru: 'RU',
  ar: 'SA',
  sw: 'KE',
  ur: 'PK',
  ne: 'NP',
};

/**
 * Automatically detects the caller's likely country BEFORE the call from:
 * 1) Browser timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
 * 2) Browser language: navigator.language
 * Looks up that country in EMERGENCY_NUMBERS_MAP. If unknown, returns 112 with isUnknown: true.
 */
export function detectCountryFromBrowser(
  timeZoneOverride?: string,
  languageOverride?: string
): ResolvedCountryEmergencyInfo {
  const rawTz =
    timeZoneOverride !== undefined
      ? timeZoneOverride
      : typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      : '';
  const rawLang =
    languageOverride !== undefined
      ? languageOverride
      : typeof navigator !== 'undefined'
      ? navigator.language || ''
      : '';

  const tzLower = rawTz.trim().toLowerCase();
  const langClean = rawLang.trim();

  let tzCountryCode: string | null = null;
  if (tzLower) {
    if (TIMEZONE_TO_COUNTRY_CODE[tzLower]) {
      tzCountryCode = TIMEZONE_TO_COUNTRY_CODE[tzLower];
    } else if (tzLower.startsWith('australia/')) {
      tzCountryCode = 'AU';
    } else if (tzLower.startsWith('us/')) {
      tzCountryCode = 'US';
    } else if (tzLower.startsWith('canada/')) {
      tzCountryCode = 'CA';
    }
  }

  let langCountryCode: string | null = null;
  if (langClean) {
    const parts = langClean.replace('_', '-').split('-');
    const langPrefix = (parts[0] || '').toLowerCase();
    const regionPart = (parts[1] || '').toUpperCase();

    if (regionPart && EMERGENCY_NUMBERS_MAP[regionPart]) {
      if (
        regionPart === 'US' &&
        langPrefix !== 'en' &&
        LANGUAGE_PREFIX_TO_COUNTRY_CODE[langPrefix]
      ) {
        langCountryCode = LANGUAGE_PREFIX_TO_COUNTRY_CODE[langPrefix];
      } else {
        langCountryCode = regionPart;
      }
    } else if (LANGUAGE_PREFIX_TO_COUNTRY_CODE[langPrefix]) {
      langCountryCode = LANGUAGE_PREFIX_TO_COUNTRY_CODE[langPrefix];
    }
  }

  if (tzCountryCode && tzCountryCode !== 'US' && EMERGENCY_NUMBERS_MAP[tzCountryCode]) {
    return getCountryEmergencyInfo(tzCountryCode);
  }

  if (langCountryCode && langCountryCode !== 'US' && EMERGENCY_NUMBERS_MAP[langCountryCode]) {
    return getCountryEmergencyInfo(langCountryCode);
  }

  if (tzCountryCode && EMERGENCY_NUMBERS_MAP[tzCountryCode]) {
    return getCountryEmergencyInfo(tzCountryCode);
  }
  if (langCountryCode && EMERGENCY_NUMBERS_MAP[langCountryCode]) {
    return getCountryEmergencyInfo(langCountryCode);
  }

  return getCountryEmergencyInfo('UNKNOWN');
}

/**
 * Resolves the active country & emergency number:
 * - During a call (when Gemini has detected the country in assessment), uses the detected country.
 * - Before a call (or when overridden by the Operations "Change country" selector), uses selectedCountryCode or browser detection.
 */
export function resolveActiveEmergencyCountry(params: {
  assessment?: TriageAssessment | null;
  selectedCountryCode?: string | null;
  browserTimeZone?: string;
  browserLanguage?: string;
}): ResolvedCountryEmergencyInfo {
  const { assessment, selectedCountryCode, browserTimeZone, browserLanguage } = params;

  if (assessment) {
    const detectedCode =
      assessment.countryCode || assessment.estimatedLocation?.countryCode;
    const detectedName =
      assessment.country || assessment.estimatedLocation?.country;
    const detectedNum =
      assessment.localEmergencyNumber ||
      assessment.estimatedLocation?.localEmergencyNumber;

    if (detectedCode || detectedName) {
      const fromAssessment = getCountryEmergencyInfo(detectedCode, detectedName);
      if (!fromAssessment.isUnknown) {
        const finalNum = detectedNum || fromAssessment.numbers;
        return {
          ...fromAssessment,
          numbers: finalNum,
          emergencyNumber: finalNum,
        };
      }
    }
  }

  if (selectedCountryCode) {
    return getCountryEmergencyInfo(selectedCountryCode, selectedCountryCode);
  }

  return detectCountryFromBrowser(browserTimeZone, browserLanguage);
}

/**
 * Formats the idle phone screen lines BEFORE the call:
 * - Known country: "Emergency? Dial 119" (Japan) / "Dial 120" (China) / "Dial 112 / 108" (India) / "Dial 995" (Singapore),
 *   with the country flag in small text.
 * - Unknown country: "Dial your local emergency number" and uses 112 as default.
 */
export function buildIdlePhoneScreenDisplay(
  countryInfo: ResolvedCountryEmergencyInfo,
  dialledDigits = ''
): {
  callerIdLabel: string;
  localEmergencyNumber: string;
  screenLines: string[];
} {
  const cleanDigits = (dialledDigits || '').trim();
  if (
    countryInfo.isUnknown ||
    countryInfo.code === 'UNKNOWN' ||
    !EMERGENCY_NUMBERS_MAP[countryInfo.code]
  ) {
    return {
      callerIdLabel: '112 · International Emergency (Simulated)',
      localEmergencyNumber: '112',
      screenLines: [
        'Dial your local emergency number',
        '🌐 International GSM: 112',
        cleanDigits
          ? `Dialled: ${cleanDigits} → Press Green Call`
          : 'Press Green Button to Call',
      ],
    };
  }

  return {
    callerIdLabel: `${countryInfo.flag} ${countryInfo.country} · ${countryInfo.numbers} (Simulated)`,
    localEmergencyNumber: countryInfo.numbers,
    screenLines: [
      `Emergency? Dial ${countryInfo.numbers}`,
      `${countryInfo.flag} ${countryInfo.country}`,
      cleanDigits
        ? `Dialled: ${cleanDigits} → Press Green Call`
        : 'Press Green Button to Call',
    ],
  };
}

/**
 * Formats the connected Caller ID label DURING the call once Gemini detects the country
 * (or using the pre-call country before speech is analysed):
 * e.g. "Connected – 119 Emergency (Japan) via GoldenHourAI"
 */
export function formatConnectedEmergencyLabel(
  countryInfo: ResolvedCountryEmergencyInfo
): string {
  if (
    countryInfo.isUnknown ||
    countryInfo.code === 'UNKNOWN' ||
    !countryInfo.country ||
    countryInfo.country === 'Unknown'
  ) {
    return `Connected – ${countryInfo.numbers || '112'} Emergency via GoldenHourAI (Simulated)`;
  }
  return `Connected – ${countryInfo.numbers} Emergency (${countryInfo.country}) via GoldenHourAI (Simulated)`;
}

export const buildConnectedCallerIdLabel = formatConnectedEmergencyLabel;

export function buildDialingCallerIdLabel(
  countryInfo: ResolvedCountryEmergencyInfo
): string {
  return `Calling ${countryInfo.numbers || '112'}… (Simulated)`;
}

/**
 * Returns true ONLY when the detected or selected country is India.
 */
export function isIndiaCountry(
  countryCode?: string | null,
  countryName?: string | null
): boolean {
  if ((countryCode || '').toUpperCase().trim() === 'IN') return true;
  if ((countryCode || '').toLowerCase().includes('india')) return true;
  if ((countryName || '').toLowerCase().includes('india')) return true;
  return false;
}

const COUNTRY_DOCTOR_NAMES: Record<string, string> = {
  IN: 'Dr. Arvind (108 ER)',
  JP: 'Dr. Kenji Sato (Emergency Doctor)',
  CN: 'Dr. Wei Chen (Emergency Doctor)',
  SG: 'Dr. Rachel Tan (Emergency Doctor)',
  ID: 'Dr. Budi Santoso (Emergency Doctor)',
  PH: 'Dr. Maria Santos (Emergency Doctor)',
  MY: 'Dr. Amirul Hakim (Emergency Doctor)',
  LK: 'Dr. Nimal Perera (Emergency Doctor)',
  AU: 'Dr. Liam O’Connor (Emergency Doctor)',
  NZ: 'Dr. Hannah Taylor (Emergency Doctor)',
  US: 'Dr. Sarah Mitchell (Emergency Doctor)',
  CA: 'Dr. David Tremblay (Emergency Doctor)',
  GB: 'Dr. Eleanor Vance (Emergency Doctor)',
  DE: 'Dr. Lukas Weber (Emergency Doctor)',
  FR: 'Dr. Claire Moreau (Emergency Doctor)',
  IT: 'Dr. Marco Rossi (Emergency Doctor)',
  ES: 'Dr. Carlos Rivera (Emergency Doctor)',
  MX: 'Dr. Sofía Hernández (Emergency Doctor)',
  BR: 'Dr. Mateus Silva (Emergency Doctor)',
  ZA: 'Dr. Sipho Nkosi (Emergency Doctor)',
  NG: 'Dr. Chidi Okafor (Emergency Doctor)',
  KE: 'Dr. Amina Wanjiku (Emergency Doctor)',
  PK: 'Dr. Tariq Mahmood (Emergency Doctor)',
  BD: 'Dr. Farhana Rahman (Emergency Doctor)',
  NP: 'Dr. Rajesh Thapa (Emergency Doctor)',
  TH: 'Dr. Somchai Charoen (Emergency Doctor)',
  VN: 'Dr. Minh Nguyen (Emergency Doctor)',
  KR: 'Dr. Min-jun Kim (Emergency Doctor)',
  RU: 'Dr. Elena Rostova (Emergency Doctor)',
  AE: 'Dr. Tariq Al-Mansoor (Emergency Doctor)',
  SA: 'Dr. Faisal Al-Harbi (Emergency Doctor)',
  EG: 'Dr. Omar Hassan (Emergency Doctor)',
};

/**
 * Returns a country-matched or neutral doctor label ("Dr. [name] (Emergency Doctor)").
 * Keeps "Dr. Arvind (108 ER)" only when the country is India.
 */
export function getDoctorLabelForCountry(
  countryCode?: string | null,
  countryName?: string | null
): string {
  const info = getCountryEmergencyInfo(countryCode, countryName || countryCode);
  if (info.code && COUNTRY_DOCTOR_NAMES[info.code]) {
    return COUNTRY_DOCTOR_NAMES[info.code];
  }
  return 'Dr. Elena Rostova (Emergency Doctor)';
}

export const getCountryDoctorLabel = getDoctorLabelForCountry;

/**
 * Returns the Command Centre title: "108 Emergency Command Centre" only when India,
 * otherwise "Emergency Command Centre".
 */
export function getCommandCentreTitleForCountry(
  countryCode?: string | null,
  countryName?: string | null
): string {
  return isIndiaCountry(countryCode, countryName)
    ? '108 Emergency Command Centre'
    : 'Emergency Command Centre';
}

/**
 * Returns a country-aware simulated ambulance name:
 * Keeps "108 Ambulance" only when the detected country is India; otherwise "Ambulance (Simulated)".
 */
export function getSimulatedAmbulanceNameForCountry(
  countryCodeOrName?: string | null,
  unitOrCountryName?: number | string | null,
  unitLabel?: string
): string {
  const countryName =
    typeof unitOrCountryName === 'string' ? unitOrCountryName : countryCodeOrName;
  const unitNum =
    typeof unitOrCountryName === 'number' ? unitOrCountryName : 1;

  if (isIndiaCountry(countryCodeOrName, countryName)) {
    if (unitLabel) return `108 Ambulance (${unitLabel} · Simulated)`;
    if (unitNum === 2) return '108 Ambulance Bravo (Simulated)';
    if (unitNum === 3) return '108 Ambulance Charlie (Simulated)';
    return '108 Ambulance Alpha (Simulated)';
  }
  if (unitLabel) return `Ambulance (Simulated) · ${unitLabel}`;
  if (unitNum === 2) return 'Ambulance Unit 2 (Simulated)';
  if (unitNum === 3) return 'Ambulance Unit 3 (Simulated)';
  return 'Ambulance (Simulated)';
}

// ============================================================================
// GEMINI TTS AUDIO NORMALIZATION & CALLER SPEECH QUEUE HELPERS
// ============================================================================

function decodeBase64ToBytes(base64: string): Uint8Array {
  const clean = (base64 || '').replace(/^data:[^;]+;base64,/, '').trim();
  if (!clean) return new Uint8Array(0);
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Ensures base64 audio returned by Gemini TTS models is a valid 44-byte RIFF WAV file
 * (24kHz mono 16-bit PCM) so the browser Web Audio API (`decodeAudioData`) can play
 * both `gemini-3.8-flash-lite-tts` (which returns RIFF WAV) and `gemini-2.5-flash-preview-tts`
 * (which returns raw L16 PCM) seamlessly.
 */
export function ensureWavAudioBase64(
  rawBase64: string,
  mimeType?: string,
  defaultSampleRate = 24000
): {
  audioBase64: string;
  mimeType: string;
  sampleRate: number;
} {
  const cleanBase64 = (rawBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
  const bytes = decodeBase64ToBytes(cleanBase64);

  let sampleRate = defaultSampleRate;
  const rateMatch = (mimeType || '').match(/rate=(\d+)/i);
  if (rateMatch) {
    const parsedRate = parseInt(rateMatch[1], 10);
    if (parsedRate >= 8000 && parsedRate <= 96000) {
      sampleRate = parsedRate;
    }
  }

  // Check if bytes already start with "RIFF" (0x52 0x49 0x46 0x46) and "WAVE" at offset 8
  const isRiffWav =
    bytes.length >= 44 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45;

  if (isRiffWav) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const headerSampleRate = view.getUint32(24, true);
    return {
      audioBase64: cleanBase64,
      mimeType: 'audio/wav',
      sampleRate:
        headerSampleRate >= 8000 && headerSampleRate <= 96000
          ? headerSampleRate
          : sampleRate,
    };
  }

  // Wrap raw L16 16-bit mono little-endian PCM bytes in a 44-byte RIFF WAV header
  const pcmLength = bytes.length;
  const wavBytes = new Uint8Array(44 + pcmLength);
  const view = new DataView(wavBytes.buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcmLength, true);

  wavBytes.set(bytes, 44);

  return {
    audioBase64: encodeBytesToBase64(wavBytes),
    mimeType: 'audio/wav',
    sampleRate,
  };
}

/**
 * Selects a distinct Gemini prebuilt voice for emergency operator vs. doctor vs. caller.
 */
export function selectGeminiTtsVoice(
  _language?: string,
  role: 'operator' | 'doctor' | 'caller' = 'operator'
): string {
  if (role === 'doctor') return 'Charon';
  if (role === 'caller') return 'Puck';
  return 'Kore';
}

/**
 * Normalizes a DoctorBridgeMessage to guarantee `originalLang` and `targetLang` are always set,
 * even if an older payload used `originalLanguage` or `targetLanguage`.
 */
export function normalizeDoctorBridgeMessage(
  raw: Partial<DoctorBridgeMessage> & {
    originalLanguage?: string;
    targetLanguage?: string;
  },
  fallbackCallerLang = 'Tamil'
): DoctorBridgeMessage {
  const sender = raw.sender === 'caller' ? 'caller' : 'doctor';
  const originalLang =
    raw.originalLang ||
    raw.originalLanguage ||
    (sender === 'doctor' ? 'English' : fallbackCallerLang);
  const targetLang =
    raw.targetLang ||
    raw.targetLanguage ||
    (sender === 'doctor' ? fallbackCallerLang : 'English');

  return {
    id: raw.id || `doc-msg-${Date.now()}`,
    sender,
    originalText: raw.originalText || '',
    translatedText: raw.translatedText || raw.originalText || '',
    transliteration: raw.transliteration,
    originalLang,
    targetLang,
    timestamp: raw.timestamp || '',
    ...(raw.isAiDemoDoctor !== undefined ? { isAiDemoDoctor: raw.isAiDemoDoctor } : {}),
    ...(raw.demoLabel !== undefined ? { demoLabel: raw.demoLabel } : {}),
    ...(raw.checkOptions !== undefined ? { checkOptions: raw.checkOptions } : {}),
  };
}

export interface CallerSpeechQueueEntry {
  id: string;
  text: string;
  language: string;
  role: 'operator' | 'doctor';
}

/**
 * Appends a speech item to the Caller Phone's FIFO speech queue without cancelling existing items.
 */
export function enqueueCallerSpeechItem(
  queue: CallerSpeechQueueEntry[],
  item: CallerSpeechQueueEntry
): CallerSpeechQueueEntry[] {
  const trimmed = (item.text || '').trim();
  if (!trimmed) return queue;
  return [
    ...queue,
    {
      ...item,
      text: trimmed,
      language: item.language || 'English',
    },
  ];
}

// ============================================================================
// DOCTOR CONNECTION & DEMO DOCTOR (AI DEMO) HELPERS
// ============================================================================

export const DEMO_DOCTOR_LABEL =
  'Simulated doctor (AI demo) – real deployments connect a licensed on-call doctor';

/**
 * Returns the spoken prompt when an incoming doctor call rings on the Caller Phone:
 * "A doctor is calling you. Press the green button to answer." in the caller's language.
 */
export function getDoctorIncomingSpokenPrompt(detectedLanguage?: string): {
  spokenCallerLang: string;
  spokenEnglish: string;
  callerText: string;
} {
  const lower = (detectedLanguage || '').toLowerCase();
  const english = 'A doctor is calling you. Press the green button to answer.';

  if (lower.includes('tamil')) {
    const text = 'மருத்துவர் உங்களை அழைக்கிறார். பதிலளிக்க பச்சை பட்டனை அழுத்தவும்.';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('hindi')) {
    const text = 'एक डॉक्टर आपको कॉल कर रहे हैं। उत्तर देने के लिए हरा बटन दबाएं।';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('japanese')) {
    const text = '医師から着信があります。緑のボタンを押して応答してください。';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (
    lower.includes('indonesian') ||
    lower.includes('bahasa') ||
    lower.includes('malay')
  ) {
    const text = 'Dokter sedang menelepon Anda. Tekan tombol hijau untuk menjawab.';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('spanish')) {
    const text = 'Un médico le está llamando. Presione el botón verde para contestar.';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('french')) {
    const text = 'Un médecin vous appelle. Appuyez sur le bouton vert pour répondre.';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('arabic')) {
    const text = 'طبيب يتصل بك الآن. اضغط على الزر الأخضر للرد.';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('telugu')) {
    const text = 'డాక్టర్ మీకు కాల్ చేస్తున్నారు. సమాధానం ఇవ్వడానికి ఆకుపచ్చ బటన్ నొక్కండి.';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('kannada')) {
    const text = 'ವೈದ್ಯರು ನಿಮಗೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದಾರೆ. ಉತ್ತರಿಸಲು ಹಸಿರು ಬಟನ್ ಒತ್ತಿರಿ.';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }
  if (lower.includes('bengali')) {
    const text = 'একজন ডাক্তার আপনাকে কল করছেন। উত্তর দিতে সবুজ বোতাম টিপুন।';
    return { spokenCallerLang: text, spokenEnglish: english, callerText: text };
  }

  return {
    spokenCallerLang: english,
    spokenEnglish: english,
    callerText: english,
  };
}

/**
 * Returns the screen & spoken offer "Press 0 to call the doctor" when a caller declines the incoming doctor call.
 */
export function getOfferCallDoctorHint(detectedLanguage?: string): {
  screenHint: string;
  spokenHintCallerLang: string;
  callerText: string;
} {
  const lower = (detectedLanguage || '').toLowerCase();
  if (lower.includes('tamil')) {
    const text = 'மருத்துவரை அழைக்க 0-ஐ அழுத்தவும்.';
    return {
      screenHint: 'Press 0 to call the doctor (0 டாக்டர்)',
      spokenHintCallerLang: text,
      callerText: text,
    };
  }
  if (lower.includes('hindi')) {
    const text = 'डॉक्टर को कॉल करने के लिए 0 दबाएं।';
    return {
      screenHint: 'Press 0 to call the doctor (0 डॉक्टर)',
      spokenHintCallerLang: text,
      callerText: text,
    };
  }
  if (lower.includes('japanese')) {
    const text = '医師に電話するには0を押してください。';
    return {
      screenHint: 'Press 0 to call the doctor (0 医師に発信)',
      spokenHintCallerLang: text,
      callerText: text,
    };
  }
  if (
    lower.includes('indonesian') ||
    lower.includes('bahasa') ||
    lower.includes('malay')
  ) {
    const text = 'Tekan 0 untuk menelepon dokter.';
    return {
      screenHint: 'Press 0 to call the doctor (Tekan 0 untuk dokter)',
      spokenHintCallerLang: text,
      callerText: text,
    };
  }
  const text = 'Press 0 to call the doctor.';
  return {
    screenHint: 'Press 0 to call the doctor',
    spokenHintCallerLang: text,
    callerText: text,
  };
}

/**
 * Determines whether the doctor call should trigger immediately after follow-up answers
 * when severity becomes or is Critical.
 */
export function shouldTriggerDoctorCallOnTriageUpdate(params: {
  previousSeverity?: SeverityLevel;
  newSeverity?: SeverityLevel;
  questionsCompleted?: boolean;
  isFollowUpComplete?: boolean;
  currentDoctorCallState?: DoctorCallState;
  doctorCallState?: DoctorCallState;
}): boolean {
  const {
    previousSeverity,
    newSeverity,
    questionsCompleted,
    isFollowUpComplete,
    currentDoctorCallState,
    doctorCallState,
  } = params;
  const activeState = doctorCallState || currentDoctorCallState || 'idle';
  const isDone = Boolean(isFollowUpComplete ?? questionsCompleted);

  if (activeState === 'ringing' || activeState === 'connected') {
    return false;
  }
  if (newSeverity === 'Critical' && isDone) {
    return true;
  }
  if (previousSeverity !== 'Critical' && newSeverity === 'Critical') {
    return true;
  }
  return false;
}

/**
 * Determines whether the doctor call should trigger automatically after the last first-aid step.
 */
export function shouldTriggerDoctorCallAfterFirstAidStep(params: {
  completedStepIndex: number;
  totalSteps: number;
  currentDoctorCallState?: DoctorCallState;
  doctorCallState?: DoctorCallState;
}): boolean {
  const {
    completedStepIndex,
    totalSteps,
    currentDoctorCallState,
    doctorCallState,
  } = params;
  const activeState = doctorCallState || currentDoctorCallState || 'idle';

  if (activeState === 'ringing' || activeState === 'connected') {
    return false;
  }
  const safeTotal = Math.max(1, totalSteps);
  return completedStepIndex + 1 >= safeTotal;
}

/**
 * Ensures Demo Doctor instructions contain safe first aid only (no diagnosis, no medicines/drugs).
 */
export function sanitizeDemoDoctorFirstAidText(text: string): string {
  const raw = (text || '').trim();
  if (!raw) return 'Keep the patient still, maintain an open airway, and watch breathing closely.';
  const forbiddenMedicineOrDiagnosisPattern =
    /\b(aspirin|sorbitrate|nitroglycerin|atropine|paracetamol|ibuprofen|epinephrine|adrenaline|insulin|antibiotic|medicine|medication|medications|tablet|tablets|pill|pills|dosage|prescribe|diagnosis|diagnosed)\b/gi;
  if (forbiddenMedicineOrDiagnosisPattern.test(raw)) {
    return raw
      .replace(forbiddenMedicineOrDiagnosisPattern, 'first-aid support')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return raw;
}

export interface DemoDoctorResponsePayload {
  doctorName: string;
  greetingEnglish: string;
  instructionsEnglish: string[];
  checkQuestionEnglish: string;
  checkQuestionCallerLang?: string;
  reassuranceEtaEnglish: string;
  combinedEnglish: string;
  combinedCallerLang: string;
  englishText: string;
  translatedText: string;
  checkOptions: DoctorCheckOption[];
  demoLabel: string;
  isAiDemoDoctor: true;
}

/**
 * Builds a deterministic, context-aware Demo Doctor response (first aid only, no diagnosis, no medicines)
 * using the patient brief, triage answers, first-aid progress, and ambulance/responder ETAs.
 */
export function buildFallbackDemoDoctorResponse(params: {
  assessment: TriageAssessment | null;
  dispatchPlan?: DispatchPlan | null;
  conversationLog?: ConversationLogEntry[];
  doctorMessages?: DoctorBridgeMessage[];
  doctorName?: string;
  ambulanceEtaSeconds?: number;
  responderEtaSeconds?: number;
  firstAidStepIndex?: number;
  callerReplyText?: string;
  callerReplyEnglish?: string;
  isFollowUpTurn?: boolean;
  callerLanguage?: string;
}): DemoDoctorResponsePayload {
  const {
    assessment,
    dispatchPlan,
    conversationLog = [],
    doctorName: rawDoctorName,
    ambulanceEtaSeconds = 840,
    responderEtaSeconds = 300,
    callerReplyText,
    callerReplyEnglish,
    callerLanguage,
  } = params;

  const cleanDocName = (
    rawDoctorName ||
    getCountryDoctorLabel(assessment?.country) ||
    'Dr. Elena Rostova (Emergency Doctor)'
  ).replace(/\s*\(Simulated.*\)$/i, '');

  const callerLang = callerLanguage || assessment?.detectedLanguage || 'English';
  const langLower = callerLang.toLowerCase();
  const typeText = `${assessment?.likelyEmergencyType || ''} ${
    assessment?.patientSummary || ''
  }`.toLowerCase();

  const ambMins = Math.max(
    1,
    Math.ceil(
      ambulanceEtaSeconds > 0
        ? ambulanceEtaSeconds / 60
        : dispatchPlan?.selectedAmbulance?.etaMinutes ||
            assessment?.nearbyAmbulances?.[0]?.etaMinutes ||
            14
    )
  );
  const respMins = Math.max(
    1,
    Math.ceil(
      responderEtaSeconds > 0
        ? responderEtaSeconds / 60
        : dispatchPlan?.selectedVolunteer?.etaMinutes ||
            assessment?.nearbyVolunteers?.[0]?.etaMinutes ||
            5
    )
  );

  const completedStepsCount = (assessment?.firstAidSteps || []).filter((s) =>
    Boolean(s.completed)
  ).length;
  const triageAnswersCount = conversationLog.filter(
    (e) => e.role === 'caller' && (e.stage === 'question_1' || e.stage === 'question_2')
  ).length;

  const replyStr = callerReplyEnglish || callerReplyText || '';
  const greetingEnglish = replyStr
    ? `Hello, this is ${cleanDocName}. Thank you for your update ("${replyStr}").`
    : `Hello, this is ${cleanDocName}. I have reviewed your patient brief, ${
        triageAnswersCount || 2
      } triage answers, and ${completedStepsCount} completed first-aid step(s).`;

  let instructionsEnglish: string[] = [];
  if (/bleed|trauma|wound|cut|fracture|artery/i.test(typeText)) {
    instructionsEnglish = [
      'Step 1: Keep firm, steady direct pressure on the clean cloth pad over the wound with both hands.',
      'Step 2: Keep the person lying flat on a safe surface and gently elevate the legs on a folded cloth.',
      'Step 3: Cover the person with a dry cloth or sheet to keep body warmth steady, and do not give anything by mouth.',
    ];
  } else if (/snake|bite|venom/i.test(typeText)) {
    instructionsEnglish = [
      'Step 1: Keep the bitten limb completely still and resting below heart level.',
      'Step 2: Loosen any tight clothing, rings, or watches near the swelling without cutting or sucking the wound.',
      'Step 3: Keep the person calm and lying still on their side so the airway stays clear.',
    ];
  } else {
    instructionsEnglish = [
      'Step 1: Keep the person resting safely on their back or side and gently tilt the chin up so the airway stays clear.',
      'Step 2: Loosen any tight clothing around the neck, chest, and waist so fresh air can circulate.',
      'Step 3: Do not give water or food by mouth, and keep watching the chest rise and fall closely.',
    ];
  }

  instructionsEnglish = instructionsEnglish.map(sanitizeDemoDoctorFirstAidText);

  const checkQuestionEnglish =
    'Check question: Is the breathing or movement steadier right now? Press 1 for Yes, Press 2 for No.';
  const reassuranceEtaEnglish = `Stay calm—your emergency responder arrives in ${respMins} minutes and the ambulance arrives in ${ambMins} minutes.`;

  const combinedEnglish = `${greetingEnglish} ${instructionsEnglish.join(
    ' '
  )} ${checkQuestionEnglish} ${reassuranceEtaEnglish}`;

  let combinedCallerLang = combinedEnglish;
  let checkOptions: DoctorCheckOption[] = [
    {
      key: '1',
      digit: '1',
      textCallerLang: 'Yes, breathing is steadier now',
      labelCallerLang: 'Yes, breathing is steadier now',
      textEnglish: 'Yes, breathing is steadier now',
      labelEnglish: 'Yes, breathing is steadier now',
    },
    {
      key: '2',
      digit: '2',
      textCallerLang: 'No, still struggling or needs more help',
      labelCallerLang: 'No, still struggling or needs more help',
      textEnglish: 'No, still struggling or needs more help',
      labelEnglish: 'No, still struggling or needs more help',
    },
  ];

  if (langLower.includes('tamil')) {
    combinedCallerLang = `வணக்கம், நான் ${cleanDocName} பேசுகிறேன். உங்கள் முதலுதவி மற்றும் பதில்களைப் பார்த்தேன். படி 1: நோயாளியின் தாடையை லேசாக உயர்த்தி காற்றுக்குழாயை திறந்த நிலையில் வைக்கவும். படி 2: கழுத்து மற்றும் இடுப்பு ஆடைகளை தளர்த்தி காற்றோட்டமாக வைக்கவும். படி 3: வாயில் தண்ணீர் அல்லது எதுவும் கொடுக்க வேண்டாம், மார்பு அசைவை தொடர்ந்து கவனிக்கவும். இப்போது மூச்சு சற்று சீராக உள்ளதா? ஆம் என்றால் 1-ஐ அழுத்தவும், இல்லை என்றால் 2-ஐ அழுத்தவும். தைரியமாக இருங்கள்—முதல் உதவி தன்னார்வலர் ${respMins} நிமிடங்களில் மற்றும் ஆம்புலன்ஸ் ${ambMins} நிமிடங்களில் வந்துவிடும்.`;
    checkOptions = [
      {
        key: '1',
        digit: '1',
        textCallerLang: 'ஆம், மூச்சு இப்போது சற்று சீராக உள்ளது',
        labelCallerLang: 'ஆம், மூச்சு சீராக உள்ளது',
        textEnglish: 'Yes, breathing is steadier now',
        labelEnglish: 'Yes, breathing is steadier now',
      },
      {
        key: '2',
        digit: '2',
        textCallerLang: 'இல்லை, இன்னும் மூச்சு விட சிரமப்படுகிறார்',
        labelCallerLang: 'இல்லை, சிரமப்படுகிறார்',
        textEnglish: 'No, still struggling to breathe',
        labelEnglish: 'No, still struggling to breathe',
      },
    ];
  } else if (langLower.includes('hindi')) {
    combinedCallerLang = `नमस्ते, मैं ${cleanDocName} बोल रहा हूँ। मैंने मरीज की जानकारी और प्राथमिक उपचार प्रगति देख ली है। कदम 1: मरीज की ठोड़ी को हल्का ऊपर उठाकर सांस का रास्ता खुला रखें। कदम 2: गले और कमर के तंग कपड़े ढीले करें और ताजी हवा आने दें। कदम 3: मुंह से पानी या कुछ भी न दें और छाती की हलचल पर नज़र रखें। क्या अब सांस थोड़ी बेहतर चल रही है? हाँ के लिए 1 दबाएं, नहीं के लिए 2 दबाएं। घबराएं नहीं—आपातकालीन सहायक ${respMins} मिनट में और एम्बुलेंस ${ambMins} मिनट में पहुँच रही है।`;
    checkOptions = [
      {
        key: '1',
        digit: '1',
        textCallerLang: 'हाँ, सांस अब थोड़ी बेहतर चल रही है',
        labelCallerLang: 'हाँ, सांस बेहतर है',
        textEnglish: 'Yes, breathing is steadier now',
        labelEnglish: 'Yes, breathing is steadier now',
      },
      {
        key: '2',
        digit: '2',
        textCallerLang: 'नहीं, अभी भी सांस लेने में तकलीफ है',
        labelCallerLang: 'नहीं, तकलीफ है',
        textEnglish: 'No, still struggling to breathe',
        labelEnglish: 'No, still struggling to breathe',
      },
    ];
  } else if (langLower.includes('japanese')) {
    combinedCallerLang = `こんにちは、${cleanDocName}です。患者さんの状況と応急処置の進捗を確認しました。ステップ1：顎を軽く持ち上げて気道を確保してください。ステップ2：首や腰の衣服を緩めて風通しを良くしてください。ステップ3：口から水や食べ物を与えず、胸の動きを観察してください。現在、呼吸は少し落ち着いていますか？「はい」は1を、「いいえ」は2を押してください。安心してください—応急処置員はあと${respMins}分、救急車はあと${ambMins}分で到着します。`;
    checkOptions = [
      {
        key: '1',
        digit: '1',
        textCallerLang: 'はい、呼吸は少し落ち着いています',
        labelCallerLang: 'はい（落ち着いている）',
        textEnglish: 'Yes, breathing is steadier now',
        labelEnglish: 'Yes, breathing is steadier now',
      },
      {
        key: '2',
        digit: '2',
        textCallerLang: 'いいえ、まだ呼吸が苦しそうです',
        labelCallerLang: 'いいえ（苦しそう）',
        textEnglish: 'No, still struggling to breathe',
        labelEnglish: 'No, still struggling to breathe',
      },
    ];
  } else if (
    langLower.includes('indonesian') ||
    langLower.includes('bahasa') ||
    langLower.includes('malay')
  ) {
    combinedCallerLang = `Halo, saya ${cleanDocName}. Saya telah memeriksa kondisi pasien dan langkah pertolongan pertama Anda. Langkah 1: Angkat dagu perlahan agar jalan napas tetap terbuka. Langkah 2: Longgarkan pakaian ketat di sekitar leher dan dada. Langkah 3: Jangan berikan air atau makanan melalui mulut, dan pantau gerakan dada. Apakah napas pasien lebih stabil sekarang? Tekan 1 untuk Ya, Tekan 2 untuk Tidak. Tetap tenang—perespons darurat tiba dalam ${respMins} menit dan ambulans tiba dalam ${ambMins} menit.`;
    checkOptions = [
      {
        key: '1',
        digit: '1',
        textCallerLang: 'Ya, napas pasien lebih stabil sekarang',
        labelCallerLang: 'Ya, lebih stabil',
        textEnglish: 'Yes, breathing is steadier now',
        labelEnglish: 'Yes, breathing is steadier now',
      },
      {
        key: '2',
        digit: '2',
        textCallerLang: 'Tidak, masih kesulitan bernapas',
        labelCallerLang: 'Tidak, masih sulit',
        textEnglish: 'No, still struggling to breathe',
        labelEnglish: 'No, still struggling to breathe',
      },
    ];
  }

  const checkQuestionCallerLang =
    checkOptions[0]?.textCallerLang && checkOptions[1]?.textCallerLang
      ? `${checkOptions[0].textCallerLang} (1) / ${checkOptions[1].textCallerLang} (2)`
      : checkQuestionEnglish;

  return {
    doctorName: cleanDocName,
    greetingEnglish,
    instructionsEnglish,
    checkQuestionEnglish,
    checkQuestionCallerLang,
    reassuranceEtaEnglish,
    combinedEnglish,
    combinedCallerLang,
    englishText: combinedEnglish,
    translatedText: combinedCallerLang,
    checkOptions,
    demoLabel: DEMO_DOCTOR_LABEL,
    isAiDemoDoctor: true,
  };
}

