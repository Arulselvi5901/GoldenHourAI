export interface RuralEmergencyCase {
  id: string;
  title: string;
  category:
    | 'Snakebite & Envenomation'
    | 'Pesticide & Toxic Ingestion'
    | 'Farm Machinery & Trauma'
    | 'Maternal & Obstetric Crisis'
    | 'Cardiac & Chest Crisis'
    | 'Heatstroke & Agricultural Syncope'
    | 'High Fall & Spinal Trauma'
    | 'Electrocution & Pump Motor Shock'
    | 'Well Fall & Near Drowning'
    | 'Swarm Stings & Anaphylaxis'
    | 'Pediatric Airway Choking'
    | 'Burn & Fire Scalds';
  clinicalIssue: string;
  majorRuralChallenge: string;
  fatalRuralMythToPrevent: string;
  callerTranscript: string;
  callerAudioSim: {
    durationSec: number;
    tone: 'Panic / Screaming' | 'Gasping / Breathless' | 'Frantic Bystander' | 'Desperate Relative';
    ambientNoise: string;
  };
  callerLanguage: string;
  nativeDialogue: string;
  englishTranslation: string;
  landmarksMentioned: string[];
  estimatedLocation: {
    description: string;
    latitude: number;
    longitude: number;
    landmarkAnchor: string;
    accessRoadType: string;
  };
  triageRisk: 'Critical' | 'Serious' | 'Moderate';
  confidencePercentage: number;
  triageQuestions: [
    {
      questionEnglish: string;
      questionCallerLang: string;
      purpose: string;
    },
    {
      questionEnglish: string;
      questionCallerLang: string;
      purpose: string;
    }
  ];
  immediateFirstAid: {
    doSteps: string[];
    doNotSteps: string[];
  };
  dispatchRule: {
    ambulanceType: 'ALS (Advanced Life Support)' | 'BLS (Basic Life Support)';
    hospitalCapabilityRequired: string;
    volunteerNeeded: boolean;
    volunteerGear: string;
    clinicalRationale: string;
  };
}

export const RURAL_EMERGENCY_DATASET: RuralEmergencyCase[] = [
  // 1. SNAKEBITE (Viper / Krait in Paddy Field)
  {
    id: 'rural-snakebite-01',
    title: 'Russell’s Viper Bite in Paddy Field',
    category: 'Snakebite & Envenomation',
    clinicalIssue: 'Hemotoxic envenomation with progressive tissue necrosis and bleeding risk.',
    majorRuralChallenge: 'Zero street access, 30km to hospital with Anti-Snake Venom (ASV) and cold-chain storage.',
    fatalRuralMythToPrevent: 'DO NOT cut wound with blade, suck venom, or apply tight wire tourniquet causing gangrene.',
    callerTranscript: 'Kaala paambu kadichiruchu! Vayalla kalai edukkumbothu periya viriyan paambu. Kaalu veengi pochu, ratham varudhu! Keelapatti erikkarai thoppula irukkom!',
    callerAudioSim: {
      durationSec: 18,
      tone: 'Panic / Screaming',
      ambientNoise: 'Wind howling in agricultural field, distant cattle bells',
    },
    callerLanguage: 'Tamil (Rural Colloquial)',
    nativeDialogue: 'காலா பாம்பு கடிச்சிருச்சு! வயல்ல களை எடுக்கும்போது பெரிய விரியன் பாம்பு. காலு வீங்கி போச்சு, ரத்தம் வருது! கீழப்பட்டி ஏரிக்கரை தோப்புல இருக்கோம்!',
    englishTranslation: 'Snake bite on leg! While weeding the paddy field, a large Russell’s Viper bit. Leg is rapidly swelling and bleeding. We are at Keelapatti lake bund grove!',
    landmarksMentioned: ['Keelapatti lake bund (Erikkarai)', 'Coconut grove', 'Paddy canal bridge'],
    estimatedLocation: {
      description: 'North-west bank of Keelapatti irrigation lake bund near coconut grove pump shed',
      latitude: 10.6488,
      longitude: 78.5882,
      landmarkAnchor: 'Keelapatti Lake Bund Pump Shed',
      accessRoadType: 'Unpaved dirt canal bank; 4-wheeler cannot enter last 200m; motorcycle accessible.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 96,
    triageQuestions: [
      {
        questionEnglish: 'Is there active bleeding from the bite marks or drooping of eyelids / slurred speech?',
        questionCallerLang: 'கடித்த இடத்தில் ரத்தம் நிற்காமல் வருகிறதா? கண் இமைகள் சொருகுகிறதா?',
        purpose: 'Differentiate hemotoxic vs neurotoxic systemic envenomation.',
      },
      {
        questionEnglish: 'Can the patient walk, or have you immobilized the leg with a stick/splint?',
        questionCallerLang: 'நோயாளியை நடக்க விடாமல் காலில் குச்சி வைத்து அசையாமல் கட்டியுள்ளீர்களா?',
        purpose: 'Ensure complete limb immobilization to retard venom spread.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Immobilize the bitten leg completely using a broad wooden stick or rolled cardboard.',
        'Keep patient lying totally calm and still—walking pumps venom into circulation.',
        'Remove anklets, rings, or tight waist threads before severe swelling begins.',
      ],
      doNotSteps: [
        'NEVER cut the bite with a blade or try to suck out venom.',
        'NEVER tie a tight rope or wire tourniquet (cuts off blood supply, leads to amputation).',
        'DO NOT apply native black herbal stones, kerosene, or cow dung.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Polyvalent Anti-Snake Venom (ASV) + ICU Dialysis Backup',
      volunteerNeeded: true,
      volunteerGear: 'Pressure immobilization bandage, splints, snake identification chart',
      clinicalRationale: 'Direct routing to Trichy Multi-Speciality Hospital with ASV stocks and renal monitoring.',
    },
  },

  // 2. PESTICIDE POISONING (Organophosphate Ingestion/Inhalation)
  {
    id: 'rural-pesticide-02',
    title: 'Organophosphate Pesticide Inhalation & Collapse',
    category: 'Pesticide & Toxic Ingestion',
    clinicalIssue: 'Acute cholinergic toxidrome (bronchorrhea, bradycardia, bronchospasm, pin-point pupils).',
    majorRuralChallenge: 'Victim clothes drenched in poison; secondary poisoning of family members and responders.',
    fatalRuralMythToPrevent: 'DO NOT induce vomiting with salt water or raw eggs—causes lethal chemical aspiration.',
    callerTranscript: 'Marundhu adikkumbothu mayangi vizhundhutaaru! Vaai-la nurai thalludhu, kannu theriya matengudhu. Pasiya illa, soththu kitta illa. Viralimalai therku kattu thottam!',
    callerAudioSim: {
      durationSec: 22,
      tone: 'Frantic Bystander',
      ambientNoise: 'Pumping motor sound in background, weeping family members',
    },
    callerLanguage: 'Tamil (Rural Dialect)',
    nativeDialogue: 'மருந்து அடிக்கும்போது மயங்கி விழுந்துட்டாரு! வாயில நுரை தள்ளுது, மூச்சு திணறுது. விராலிமலை தெற்கு காட்டு தோட்டம்!',
    englishTranslation: 'Fainted while spraying chemical pesticide! Frothing at the mouth, gasping for breath and pin-point vision. South forest farm in Viralimalai!',
    landmarksMentioned: ['Viralimalai South forest farm', 'Power-sprayer pump set', 'Cart track end'],
    estimatedLocation: {
      description: 'Viralimalai South farm border, 400m off the forest boundary road',
      latitude: 10.5960,
      longitude: 78.5320,
      landmarkAnchor: 'South Forest Farm Pump Shed',
      accessRoadType: 'Narrow cart-track, muddy after irrigation.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 97,
    triageQuestions: [
      {
        questionEnglish: 'Is there excessive salivation or frothing from mouth, and is he able to swallow?',
        questionCallerLang: 'வாயில் அதிகப்படியான எச்சில் அல்லது நுரை வருகிறதா?',
        purpose: 'Confirm acute cholinergic hyper-secretory crisis requiring immediate Atropine.',
      },
      {
        questionEnglish: 'Have you removed his pesticide-soaked shirt and washed skin with clean water?',
        questionCallerLang: 'மருந்து நனைந்த சட்டையை கழற்றி உடலை சுத்தமான தண்ணீரில் கழுவினீர்களா?',
        purpose: 'Stop continued transdermal absorption of organophosphate toxins.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Strip off contaminated shirt, trousers, and boots immediately using a stick or gloves.',
        'Wash affected skin thoroughly with plain water and soap if available.',
        'Turn patient on their left side into recovery position to drain secretions.',
      ],
      doNotSteps: [
        'DO NOT force him to drink salt water, milk, or raw eggs to cause vomiting.',
        'DO NOT perform mouth-to-mouth resuscitation without a protective barrier.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'High-dose Atropine + Pralidoxime (PAM) + Mechanical Ventilator ICU',
      volunteerNeeded: true,
      volunteerGear: 'Nitrile protective gloves, suction bulb, PPE face shield',
      clinicalRationale: 'Direct transfer to Tertiary Hospital ICU for continuous Atropine infusion protocol.',
    },
  },

  // 3. FARM MACHINERY CRUSH & TRAUMATIC AMPUTATION
  {
    id: 'rural-machinery-03',
    title: 'Sugarcane Crusher Arm Entrapment & Severe Bleeding',
    category: 'Farm Machinery & Trauma',
    clinicalIssue: 'Traumatic crush injury with high-pressure arterial spurting hemorrhage and fracture.',
    majorRuralChallenge: 'Spurting hemorrhage causing hemorrhagic shock within 10 minutes in remote cane field.',
    fatalRuralMythToPrevent: 'DO NOT leave bleeding uncompressed; DO NOT apply mud or turmeric to deep arterial wound.',
    callerTranscript: 'Ayyo aabathu! Karumbu machine-la kai maattikkichu! Ratham pitchukittu adikidhu! Kai thundaaga pochu! Keelapatti sugar cane weigh bridge pinnadi!',
    callerAudioSim: {
      durationSec: 16,
      tone: 'Panic / Screaming',
      ambientNoise: 'Loud diesel engine idling, screams for help',
    },
    callerLanguage: 'Tamil (Urgent)',
    nativeDialogue: 'ஐயோ ஆபத்து! கரும்பு மிஷின்ல கை மாட்டிக்கிச்சு! ரத்தம் பீச்சுக்கிட்டு அடிக்குது! கீழப்பட்டி எடை மேடை பின்னாடி!',
    englishTranslation: 'Horrific accident! Arm caught in the sugarcane crusher machine! Blood is spurting uncontrollably! Behind the Keelapatti sugarcane weigh-bridge!',
    landmarksMentioned: ['Keelapatti sugarcane weigh-bridge', 'Diesel generator shed', 'Main cane loading yard'],
    estimatedLocation: {
      description: 'Behind the Keelapatti cooperative sugarcane weigh-bridge yard',
      latitude: 10.6410,
      longitude: 78.5840,
      landmarkAnchor: 'Keelapatti Cane Weigh Bridge',
      accessRoadType: 'Wide gravel road accessible by heavy 108 ambulance.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 98,
    triageQuestions: [
      {
        questionEnglish: 'Is the blood spurting in pulses like a fountain from the arm?',
        questionCallerLang: 'ரத்தம் தாரை தாரையாக பீச்சி அடிக்கிறதா? அல்லது மெதுவாக வழிகிறதா?',
        purpose: 'Identify brachial arterial rupture requiring immediate tactical tourniquet.',
      },
      {
        questionEnglish: 'Is the patient pale, cold, or fainting from blood loss?',
        questionCallerLang: 'நோயாளி முகம் வெளுத்துப்போய் மயக்கம் வருகிறதா?',
        purpose: 'Detect Class III hemorrhagic shock.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Take a thick clean towel or folded cotton cloth and press with FULL BODY WEIGHT directly on wound.',
        'Apply an emergency tourniquet (broad belt or folded cloth 5cm wide) 2 inches above wound; tighten with stick.',
        'Keep patient lying completely flat with legs elevated 30cm to preserve cerebral blood flow.',
      ],
      doNotSteps: [
        'DO NOT remove the soaked cloth—add more layers on top.',
        'DO NOT apply mud, coffee powder, or cow dung powder.',
        'DO NOT give liquids if patient is dizzy or unalert.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Level-1 Trauma & Orthopedic Reconstruction with O-Negative Blood Bank',
      volunteerNeeded: true,
      volunteerGear: 'Combat Application Tourniquet (CAT), sterile trauma gauze, pressure bandage',
      clinicalRationale: 'Direct transit to Kaveri Emergency & Trauma Centre with active blood bank.',
    },
  },

  // 4. OBSTETRIC & MATERNAL CRISIS (Obstructed Labor & Postpartum Hemorrhage)
  {
    id: 'rural-maternal-04',
    title: 'Obstructed Labor with Severe Postpartum Hemorrhage',
    category: 'Maternal & Obstetric Crisis',
    clinicalIssue: 'Severe postpartum uterine atony hemorrhage and obstructed delivery in remote hamlet.',
    majorRuralChallenge: 'Unpaved village path, no female doctor within 25km, rapid maternal hypovolemic shock.',
    fatalRuralMythToPrevent: 'DO NOT pull the umbilical cord forcibly; DO NOT administer unmonitored oxytocin injections.',
    callerTranscript: 'Veetla prasavam aachu aana ratham nirka maattengudhu! Thaai mayangittaanga, naadi thudippu romba kurainjuduchu! Kunnathur theru kodi, Pillaiyar kovil kitta!',
    callerAudioSim: {
      durationSec: 20,
      tone: 'Desperate Relative',
      ambientNoise: 'Newborn crying faintly in background, frantic women praying',
    },
    callerLanguage: 'Tamil (Rural)',
    nativeDialogue: 'வீட்ல பிரசவம் ஆச்சு ஆனா ரத்தம் நிற்க மாட்டேங்குது! தாய் மயங்கிட்டாங்க, நாடி துடிப்பு ரொம்ப குறைஞ்சுடுச்சு! குன்னத்தூர் தெருக் கோடி, பிள்ளையார் கோவில் கிட்ட!',
    englishTranslation: 'Delivery happened at home but the heavy bleeding will not stop! Mother has fainted, pulse is very weak! Kunnathur village end near Pillaiyar temple!',
    landmarksMentioned: ['Kunnathur village street end', 'Pillaiyar Temple', 'Old well lane'],
    estimatedLocation: {
      description: 'Kunnathur village east lane, 50m behind Pillaiyar Temple courtyard',
      latitude: 10.6285,
      longitude: 78.5645,
      landmarkAnchor: 'Kunnathur Pillaiyar Temple East Lane',
      accessRoadType: 'Narrow concrete village lane.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 97,
    triageQuestions: [
      {
        questionEnglish: 'Has the placenta (afterbirth) come out completely or is it retained inside?',
        questionCallerLang: 'நச்சுக்கொடி (மஞ்சு) முழுமையாக வெளியே வந்துவிட்டதா அல்லது உள்ளே தங்கியுள்ளதா?',
        purpose: 'Differentiate retained placenta from uterine atony.',
      },
      {
        questionEnglish: 'Is the mother responsive when spoken to, and are her feet and hands cold?',
        questionCallerLang: 'தாய் பேசுகிறாரா அல்லது கை கால்கள் குளிர்ந்து போய்விட்டதா?',
        purpose: 'Detect impending maternal cardiac arrest.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Perform gentle firm circular massage on the lower abdomen (fundal massage) to help uterus contract.',
        'Keep mother warm with blankets and elevate her legs 30 degrees.',
        'Keep the newborn warm against mother’s bare chest (skin-to-skin contact) and encourage gentle suckling.',
      ],
      doNotSteps: [
        'DO NOT pull forcefully on the umbilical cord.',
        'DO NOT pack the vagina with cloth or unsterile rags.',
        'DO NOT delay transit for religious or customary rituals.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Comprehensive Emergency Obstetric Care (CEmONC) with Emergency C-Section & Blood Bank',
      volunteerNeeded: true,
      volunteerGear: 'Sterile delivery clamp, IV fluids, disposable delivery kit',
      clinicalRationale: 'Direct transport to Trichy Govt Multi-Speciality Hospital Maternity & NICU Block.',
    },
  },

  // 5. TODDY TAPPER PALMYRA TREE FALL (Spinal Trauma)
  {
    id: 'rural-spinal-05',
    title: '35-Foot Palmyra Tree Fall with Suspected Cervical Injury',
    category: 'High Fall & Spinal Trauma',
    clinicalIssue: 'High-energy cervical/thoracic spinal trauma with paraplegia risk.',
    majorRuralChallenge: 'Well-meaning bystanders often drag or bend the patient, causing permanent transection of the spinal cord.',
    fatalRuralMythToPrevent: 'DO NOT lift the patient by arms and legs; DO NOT bend or twist the neck or spine.',
    callerTranscript: 'Panai marathula irundhu 35 adi keezha vilundhutaaru! Kazhuthu valikkudhu, kaal kai asaikka mudila-ngraaru. Alangudi vadakku thottam, karumbu thottam pakkam!',
    callerAudioSim: {
      durationSec: 19,
      tone: 'Gasping / Breathless',
      ambientNoise: 'Crowd murmuring, rustling dry palm leaves',
    },
    callerLanguage: 'Tamil (Rural)',
    nativeDialogue: 'பனை மரத்துல இருந்து 35 அடி கீழே விழுந்துட்டாரு! கழுத்து வலிக்குது, கால் கை அசைக்க முடியலங்கறாரு. ஆலங்குடி வடக்கு தோட்டம்!',
    englishTranslation: 'Fell 35 feet from a palmyra tree! Severe neck pain, unable to move legs or hands. Alangudi north garden near the sugarcane plot!',
    landmarksMentioned: ['Alangudi north garden', 'Palmyra grove', 'Sugarcane plot entrance'],
    estimatedLocation: {
      description: 'North agricultural grove of Alangudi, 250m inside the palmyra orchard cart track',
      latitude: 10.6655,
      longitude: 78.6190,
      landmarkAnchor: 'Alangudi North Palmyra Grove',
      accessRoadType: 'Unpaved dirt field road, requires 4x4 pickup or stretcher carry.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 96,
    triageQuestions: [
      {
        questionEnglish: 'Can he feel his fingers or toes, or has sensation completely gone?',
        questionCallerLang: 'கை விரல்கள் அல்லது கால் விரல்களில் தொடு உணர்வு உள்ளதா? அசைக்க முடிகிறதா?',
        purpose: 'Assess acute level of spinal cord injury.',
      },
      {
        questionEnglish: 'Is he breathing normally from chest or only with his belly pushing out?',
        questionCallerLang: 'மார்பு மூலம் சுவாசிக்கிறாரா அல்லது வயிறு மட்டும் ஏறி இறங்குகிறதா?',
        purpose: 'Detect diaphragmatic breathing indicating high cervical cord compromise (C3-C5).',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Keep him completely flat and STILL. Place rolled towels or heavy stones wrapped in cloth beside both sides of head.',
        'Tell patient NOT to move head, neck, or back even an inch.',
        'If vomiting occurs, log-roll the ENTIRE body in one straight axis keeping head, neck, and torso aligned.',
      ],
      doNotSteps: [
        'NEVER pick him up by the shoulders and knees.',
        'NEVER place a pillow under his head.',
        'NEVER transport him in a sitting posture in an auto-rickshaw.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Tertiary Neuro-trauma & Spinal Surgery with 64-Slice CT Scan',
      volunteerNeeded: true,
      volunteerGear: 'Rigid cervical collar, spine immobilization board, head blocks',
      clinicalRationale: 'Direct routing to Trichy Multi-Super-Speciality Neurotrauma center.',
    },
  },

  // 6. AGRICULTURAL WELL FALL & SUBMERSION (Near Drowning)
  {
    id: 'rural-well-06',
    title: '50-Foot Agricultural Open Well Submersion',
    category: 'Well Fall & Near Drowning',
    clinicalIssue: 'Acute respiratory asphyxia, pulmonary aspiration, severe hypothermia, blunt head injury.',
    majorRuralChallenge: 'Extracting victim up 50-foot vertical stone well wall without spine board.',
    fatalRuralMythToPrevent: 'DO NOT hold patient upside down to pour water out of stomach—causes regurgitation and death.',
    callerTranscript: 'Thottam thoravula vilundhutaaru! 50 adi aazham. Thooki veliya eduthuttom aana moochu illa! Manapparaai bypass, tea kadai pinnadi!',
    callerAudioSim: {
      durationSec: 21,
      tone: 'Frantic Bystander',
      ambientNoise: 'Splashing water echoes, heavy coughing and yelling',
    },
    callerLanguage: 'Tamil (Urgent)',
    nativeDialogue: 'தோட்டம் தொரவுல விழுந்துட்டாரு! 50 அடி ஆழம். தூக்கி வெளிய எடுத்திட்டோம் ஆனா மூச்சு இல்ல! மணப்பாறை பைபாஸ், டீ கடை பின்னாடி!',
    englishTranslation: 'Fell into the 50-foot farm open well! We pulled him out with ropes but he is not breathing! Behind the tea stall on Manapparai bypass!',
    landmarksMentioned: ['Manapparai Bypass Highway', 'Roadside Tea Stall', '50-foot stone step-well'],
    estimatedLocation: {
      description: 'Behind the roadside tea stall 300m west of Manapparai highway junction',
      latitude: 10.6090,
      longitude: 78.4160,
      landmarkAnchor: 'Manapparai Bypass Tea Stall Well',
      accessRoadType: 'Direct highway tarmac access.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 99,
    triageQuestions: [
      {
        questionEnglish: 'Is there any chest rising and falling, or is he completely limp with no breath?',
        questionCallerLang: 'மார்பு அசைகிறதா? அல்லது மூச்சு முற்றிலும் நின்றுவிட்டதா?',
        purpose: 'Verify respiratory/cardiac arrest to trigger immediate CPR.',
      },
      {
        questionEnglish: 'Is there water or vomit in mouth blocking the airway?',
        questionCallerLang: 'வாயில் நீர் அல்லது சேறு அடைத்துள்ளதா?',
        purpose: 'Clear foreign material before chest compressions.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Place flat on back on solid ground. Tilt head back slightly.',
        'START CHEST COMPRESSIONS IMMEDIATELY: Place both hands in center of chest, push HARD and FAST (100-120 per minute) to the beat of "Stayin Alive".',
        'Remove wet clothes and wrap in dry sacks/blankets to prevent lethal hypothermia.',
      ],
      doNotSteps: [
        'DO NOT waste time trying to hold him upside down to get water out of lungs.',
        'DO NOT stop chest compressions until ambulance paramedic arrives or patient wakes up.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Emergency Resuscitation & ICU Ventilator with Bronchoscopy capability',
      volunteerNeeded: true,
      volunteerGear: 'Pocket CPR mask, automated external defibrillator (AED) if available, thermal blankets',
      clinicalRationale: 'Volunteer dispatched in 5 mins to perform continuous bystander CPR.',
    },
  },

  // 7. SUBMERSIBLE PUMP HIGH-VOLTAGE ELECTROCUTION
  {
    id: 'rural-electrocution-07',
    title: '3-Phase Agricultural Motor Switchboard Electric Shock',
    category: 'Electrocution & Pump Motor Shock',
    clinicalIssue: 'High-voltage electric shock induced Ventricular Fibrillation (VF) and exit point burns.',
    majorRuralChallenge: 'Live current in wet pump shed; risk of bystander electrocution during rescue.',
    fatalRuralMythToPrevent: 'DO NOT touch the victim with bare hands while power is connected; DO NOT apply earth/mud to burns.',
    callerTranscript: 'Electric shock adichiruchu! Motor room-la switch podumbothu shock adichu thalli vizhundhutaaru! Thudikkiraaru, kural varala! Keelapatti EB transformer kitta!',
    callerAudioSim: {
      durationSec: 17,
      tone: 'Panic / Screaming',
      ambientNoise: 'High-pitched electrical buzzing sound, screaming relatives',
    },
    callerLanguage: 'Tamil (Urgent)',
    nativeDialogue: 'எலக்ட்ரிக் ஷாக் அடிச்சிருச்சு! மோட்டார் ரூம்ல சுவிட்ச் போடும்போது ஷாக் அடிச்சு விழுந்துட்டாரு! குரல் வரல! கீழப்பட்டி டிரான்ஸ்பார்மர் கிட்ட!',
    englishTranslation: 'Severe electric shock! Thrown back while switching on the agricultural pump in motor room! Convulsing, unable to speak near Keelapatti EB transformer!',
    landmarksMentioned: ['Keelapatti EB Transformer', 'Agricultural Motor Room', 'Well pumphouse'],
    estimatedLocation: {
      description: 'Agricultural pump shed 80m north of Keelapatti electricity transformer post',
      latitude: 10.6435,
      longitude: 78.5895,
      landmarkAnchor: 'Keelapatti EB Transformer Post',
      accessRoadType: 'Tractor cart-track along electricity line.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 98,
    triageQuestions: [
      {
        questionEnglish: 'Has the main electricity switch been turned OFF, and is the victim safe from live wires?',
        questionCallerLang: 'மின்சார சுவிட்ச் அணைக்கப்பட்டுவிட்டதா? கம்பி ஏதும் அவர் மேல் உள்ளதா?',
        purpose: 'Rescuer safety and power disconnection verification.',
      },
      {
        questionEnglish: 'Is there a pulse in the neck or is he unresponsive without breathing?',
        questionCallerLang: 'கழுத்தில் நாடி துடிப்பு உள்ளதா அல்லது மூச்சு நின்றுவிட்டதா?',
        purpose: 'Detect ventricular fibrillation / sudden cardiac arrest.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Turn OFF the main fuse/breaker immediately using a dry wooden stick—do not touch victim with bare hands.',
        'Once safe, check for breathing. If no breathing, start CONTINUOUS CHEST COMPRESSIONS immediately.',
        'Cover electrical burn entry/exit wounds on hands and feet with clean dry cloth.',
      ],
      doNotSteps: [
        'DO NOT touch victim with bare hands while power is connected.',
        'DO NOT apply water or oils to electrical burns.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Cardiology with Defibrillator, 12-lead ECG, ICU Burn Resuscitation',
      volunteerNeeded: true,
      volunteerGear: 'Automated External Defibrillator (AED), CPR barrier mask',
      clinicalRationale: 'High-priority ALS dispatch with defibrillator for electrical dysrhythmia.',
    },
  },

  // 8. EXTREME AGRICULTURAL HEATSTROKE (Sunstroke)
  {
    id: 'rural-heatstroke-08',
    title: 'Agricultural Heatstroke & Delirium at 43°C',
    category: 'Heatstroke & Agricultural Syncope',
    clinicalIssue: 'Severe core hyperthermia (>40.5°C) with central nervous system dysfunction and anhidrosis.',
    majorRuralChallenge: 'Working in open paddy field with no shade, dehydrating under afternoon sun.',
    fatalRuralMythToPrevent: 'DO NOT wrap in thick clothes; DO NOT give hot beverages or delay rapid cooling.',
    callerTranscript: 'Veyil-la mayangi vizhundhutaaru! Udambu kolundhu vittu eriyudhu, aana pasina varala. உளறல் pesuraaru, kannu sorugudhu! Keelapatti south field!',
    callerAudioSim: {
      durationSec: 15,
      tone: 'Frantic Bystander',
      ambientNoise: 'Cicadas buzzing loudly, bright midday heat ambience',
    },
    callerLanguage: 'Tamil (Rural)',
    nativeDialogue: 'வெயில்ல மயங்கி விழுந்துட்டாரு! உடம்பு கொழுந்து விட்டு எரியுது, ஆனா வியர்க்கல. உளறிட்டே இருக்காரு! கீழப்பட்டி தெற்கு வயல்!',
    englishTranslation: 'Collapsed from the blistering heat! Body is burning hot to the touch, but zero sweat. Talking incoherently and eyes rolling back! Keelapatti south field!',
    landmarksMentioned: ['Keelapatti south field', 'Old irrigation canal', 'Dry tamarind tree'],
    estimatedLocation: {
      description: 'Keelapatti South paddy perimeter near the single dry tamarind tree',
      latitude: 10.6390,
      longitude: 78.5940,
      landmarkAnchor: 'Keelapatti South Tamarind Tree',
      accessRoadType: 'Dirt bund path, accessible by volunteer bike.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 94,
    triageQuestions: [
      {
        questionEnglish: 'Is his skin burning hot and dry without any sweat?',
        questionCallerLang: 'உடல் கொதிக்கும் அளவு சூடாகவும், வியர்வை ஏதும் இல்லாமலும் உள்ளதா?',
        purpose: 'Differentiate true Heatstroke (life-threatening) from simple heat exhaustion.',
      },
      {
        questionEnglish: 'Is he confused, talking incoherently, or having convulsions?',
        questionCallerLang: 'பேச்சு குளறுகிறதா அல்லது வலிப்பு வருகிறதா?',
        purpose: 'Assess encephalopathy / cerebral edema.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'Move patient immediately into shade under tree or shed.',
        'RAPID COOLING: Douse his body with cool water; fan vigorously to promote evaporative cooling.',
        'Place wet cloths or ice wrapped in cloth on neck, armpits, and groin.',
      ],
      doNotSteps: [
        'DO NOT give paracetamol or aspirin (ineffective for environmental hyperthermia and harms liver).',
        'DO NOT pour water into mouth if confused or unalert.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Emergency Department with Active Cooling, Electrolyte Management, and ICU',
      volunteerNeeded: true,
      volunteerGear: 'Electrolyte cold packs, portable fan, water spray mister',
      clinicalRationale: 'Immediate core temperature reduction before permanent neurological injury occurs.',
    },
  },

  // 9. PEDIATRIC TAMARIND SEED CHOKING
  {
    id: 'rural-choking-09',
    title: 'Toddler Foreign Body Airway Obstruction (Tamarind Seed)',
    category: 'Pediatric Airway Choking',
    clinicalIssue: 'Complete acute upper airway obstruction, rapid hypoxia, cyanosis, cardiac arrest within 4 minutes.',
    majorRuralChallenge: 'Panic causes relatives to shove fingers blindly down throat, pushing seed past vocal cords.',
    fatalRuralMythToPrevent: 'DO NOT perform blind finger sweeps; DO NOT shake toddler upside down by feet.',
    callerTranscript: 'Kuzhandhai-kku puliyankottai thondaila maattikkichu! Moochu thinarudhu, udhadu neelamaa pochu! Kural varala, kaapathunga! Keelapatti anganwadi pakkam!',
    callerAudioSim: {
      durationSec: 14,
      tone: 'Panic / Screaming',
      ambientNoise: 'Mother weeping hysterically, muffled choking gasps',
    },
    callerLanguage: 'Tamil (High Urgency)',
    nativeDialogue: 'குழந்தைக்கு புளியங்கொட்டை தொண்டையில மாட்டிக்கிச்சு! மூச்சு திணறுது, உதடு நீலமா போச்சு! குரல் வரல! கீழப்பட்டி அங்கன்வாடி பக்கம்!',
    englishTranslation: 'Tamarind seed stuck in 2-year-old child’s throat! Choking, lips turning blue, unable to make any sound! Near Keelapatti Anganwadi!',
    landmarksMentioned: ['Keelapatti Anganwadi Center', 'Village school gate', 'Community water tap'],
    estimatedLocation: {
      description: 'House directly opposite the Keelapatti Government Anganwadi Center',
      latitude: 10.6460,
      longitude: 78.5925,
      landmarkAnchor: 'Keelapatti Anganwadi Center',
      accessRoadType: 'Paved village street, accessible by all vehicles.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 99,
    triageQuestions: [
      {
        questionEnglish: 'Is the child completely silent and unable to cry, cough, or breathe?',
        questionCallerLang: 'குழந்தையால் அழவோ, இருமவோ, சத்தம் போடவோ முடியவில்லையா?',
        purpose: 'Verify complete airway obstruction.',
      },
      {
        questionEnglish: 'Are the lips or fingernails turning blue or purple?',
        questionCallerLang: 'உதடுகள் அல்லது விரல் நகங்கள் நீல நிறமாக மாறுகிறதா?',
        purpose: 'Assess severe cerebral cyanosis.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        '5 BACK BLOWS: Lay child face down along your forearm with head lower than chest, support jaw with hand. Deliver 5 firm slaps between shoulder blades with heel of hand.',
        '5 CHEST THRUSTS: Turn child face up on forearm; give 5 quick downward chest thrusts over breastbone with two fingers.',
        'Repeat 5 back blows and 5 chest thrusts until seed pops out or ambulance arrives.',
      ],
      doNotSteps: [
        'NEVER do blind finger sweeps inside child’s mouth (pushes foreign body deeper).',
        'DO NOT hold child upside down by ankles.',
        'DO NOT give water to drink.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Pediatric Emergency & Pediatric Bronchoscopy / ENT Extraction',
      volunteerNeeded: true,
      volunteerGear: 'Pediatric bag-valve mask, Magill forceps, suction unit',
      clinicalRationale: 'Immediate physical bystander intervention required within 3-minute window.',
    },
  },

  // 10. KEROSENE STOVE EXPLOSION IN THATCHED HUT
  {
    id: 'rural-burns-10',
    title: 'Kerosene Stove Flare-up & Major Scald in Thatched Hut',
    category: 'Burn & Fire Scalds',
    clinicalIssue: '35% Total Body Surface Area (TBSA) 2nd/3rd degree burns, inhalation injury risk, hypovolemic burn shock.',
    majorRuralChallenge: 'No clean water in hut, traditional application of ink, ash, or mud introduces lethal sepsis.',
    fatalRuralMythToPrevent: 'DO NOT apply ink, toothpaste, raw eggs, or cow dung; DO NOT break burn blisters.',
    callerTranscript: 'Veetla kerosene stove vedichiruchu! Amma-kku udambu muzhuka theekkaayam! Thuni ottikkichu, romba kathuraanga! Keelapatti kizhakku theru, kottagai!',
    callerAudioSim: {
      durationSec: 20,
      tone: 'Desperate Relative',
      ambientNoise: 'Crackling fire, screams of pain, people throwing buckets of water',
    },
    callerLanguage: 'Tamil (Rural)',
    nativeDialogue: 'வீட்ல மண்ணெண்ணெய் ஸ்டவ் வெடிச்சிருச்சு! அம்மாக்கு உடம்பு முழுக்க தீக்காயம்! துணி ஒட்டிக்கிச்சு! கீழப்பட்டி கிழக்குத் தெரு!',
    englishTranslation: 'Kerosene stove exploded at home! Mother has burns over her entire body! Clothes are sticking to her skin, screaming in agony! Keelapatti east street!',
    landmarksMentioned: ['Keelapatti East Street', 'Cattle shed (Kottagai)', 'Old threshing floor'],
    estimatedLocation: {
      description: 'Keelapatti East Street thatched residential dwelling beside cattle shed',
      latitude: 10.6475,
      longitude: 78.5955,
      landmarkAnchor: 'Keelapatti East Street Cattle Shed',
      accessRoadType: 'Narrow village street.',
    },
    triageRisk: 'Critical',
    confidencePercentage: 95,
    triageQuestions: [
      {
        questionEnglish: 'Are the burns covering the face, chest, or neck, and is she having difficulty breathing?',
        questionCallerLang: 'முகம், கழுத்து அல்லது மார்பில் தீக்காயம் உள்ளதா? மூச்சு விடுவதில் சிரமம் உள்ளதா?',
        purpose: 'Detect airway burn inhalation and impending laryngeal edema.',
      },
      {
        questionEnglish: 'Has the fire been extinguished and burned clothes gently cut away?',
        questionCallerLang: 'நெருப்பு அணைக்கப்பட்டுவிட்டதா? ஒட்டாத துணிகள் அகற்றப்பட்டுவிட்டதா?',
        purpose: 'Halt active thermal destruction.',
      },
    ],
    immediateFirstAid: {
      doSteps: [
        'COOL WITH RUNNING WATER: Pour clean, room-temperature water over burns for 15-20 minutes to stop heat burning deep.',
        'Cover loosely with a clean, dry cotton cloth or bedsheet.',
        'Keep patient warm once cooled to avoid hypothermia.',
      ],
      doNotSteps: [
        'NEVER apply ice or ice water (causes tissue vasoconstriction and deepens burn).',
        'NEVER apply ink, toothpaste, turmeric, mud, or cow dung.',
        'DO NOT peel off clothes that are stuck tight to burned skin.',
        'DO NOT pop or burst burn blisters.',
      ],
    },
    dispatchRule: {
      ambulanceType: 'ALS (Advanced Life Support)',
      hospitalCapabilityRequired: 'Specialized Burn ICU with Parkland Fluid Resuscitation & Plastic Surgery',
      volunteerNeeded: true,
      volunteerGear: 'Sterile burn sheets, silver sulfadiazine drape, IV Ringer’s Lactate',
      clinicalRationale: 'Direct routing to Trichy Government Hospital Specialized Burn Unit.',
    },
  },
];
