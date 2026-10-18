import { EmergencyScenario } from '../types/emergency';

export const COMPREHENSIVE_EMERGENCY_DATASET: EmergencyScenario[] = [
  // =========================================================================
  // 1. SNAKEBITE & ENVENOMATION (Major rural issue #1 - paddy field bite)
  // =========================================================================
  {
    id: 'em-snake-tamil',
    category: 'Venom & Toxicology',
    emergencyType: 'Russell’s Viper Envenomation (Paddy Field Snakebite)',
    severity: 'Critical',
    confidencePercentage: 98,
    goldenHourWindowMinutes: 90,
    goldenHourReason: 'Polyvalent anti-snake venom (ASV) must be administered within 90-120 minutes before irreversible coagulopathy and acute tubular necrosis.',
    language: 'Tamil',
    group: 'Indian',
    scriptName: 'தமிழ்',
    nativeText: 'அப்பா நெல் வயல்ல வரப்பு வெட்டும்போது பாம்பு கடிச்சிருச்சு! கால் வீங்கி ரத்தம் சொட்டுது, கண் சொருகுது! கீழப்பட்டி பஞ்சாயத்து ரேஷன் கடைக்கு பின்னாடி மாந்தோப்பு!',
    transliteration: 'Appa nel vayalla varappu vettumbodhu paambu kadichiruchu! Kaal veengi ratham sottudhu, kan sorugudhu! Keelapatti panchayat ration kadaiku pinnadi maanthoppu!',
    englishTranslation: 'Father was bitten by a snake while clearing paddy bunds! Leg is swelling rapidly with continuous blood oozing, his eyes are drooping! Location is in mango orchard behind Keelapatti panchayat ration shop!',
    callerProfile: 'Son calling in extreme panic from rural paddy field',
    vocalToneNote: 'Breathless, weeping, panting, wind noise in farmland background',
    landmarkAnchors: ['Keelapatti Panchayat Ration Shop', 'Canal bund mango orchard', 'Yellow electrical pole #14'],
    gpsCoordinates: { lat: 10.6472, lng: 78.5945 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Can the patient keep their eyes open and swallow saliva?',
        questionCallerLang: 'நோயாளி கண் முழித்து உமிழ்நீர் முழுங்க முடிகிறதா?',
        purpose: 'Screen for early neurotoxic ptosis and bulbar palsy',
        expectedAnswers: ['No, eyes closing', 'Swallowing is hard', 'Yes still conscious'],
      },
      {
        questionEnglish: 'Has anyone tied a tight rope or cut the bite wound?',
        questionCallerLang: 'கடிபட்ட இடத்தில் கயிறு கட்டினீர்களா அல்லது கீறல் போட்டீர்களா?',
        purpose: 'Detect fatal tourniquet gangrene risk and advise immediate loosening',
        expectedAnswers: ['Tied a cloth tightly', 'No, not touched', 'Washed with water'],
      },
    ],
    criticalDos: [
      'Keep patient absolutely still and immobilize limb with a stick/splint below heart level.',
      'Remove rings, bangles, or tight anklets before severe swelling sets in.',
      'Rush immediately to facility with anti-snake venom (ASV) and ventilator.',
    ],
    fatalDonts: [
      'DO NOT tie a tight tourniquet (causes tissue gangrene and sudden venom rush upon release).',
      'DO NOT cut, incise, or suck the bite wound.',
      'DO NOT apply herbal pastes, cow dung, or electrical shocks.',
    ],
    recommendedHospitalCapability: 'Primary Health Centre or Secondary Hospital with Polyvalent Anti-Snake Venom (ASV) & ICU backup',
    specialDispatchInstruction: 'Dispatch ALS ambulance with oxygen & polyvalent antivenom stocks; alert viralimalai PHC doctor.',
  },

  // =========================================================================
  // 2. ACUTE CORONARY SYNDROME / HEART ATTACK (Major rural issue #2)
  // =========================================================================
  {
    id: 'em-cardiac-hindi',
    category: 'Cardiovascular',
    emergencyType: 'Acute ST-Elevation Myocardial Infarction (STEMI / Heart Attack)',
    severity: 'Critical',
    confidencePercentage: 96,
    goldenHourWindowMinutes: 60,
    goldenHourReason: 'Door-to-balloon cath lab PCI or rural thrombolysis with Tenecteplase within 60 minutes prevents massive ventricular necrosis.',
    language: 'Hindi',
    group: 'Indian',
    scriptName: 'हिन्दी',
    nativeText: 'मेरी माँ की छाती में पत्थर जैसा भारी दर्द है, बाएं हाथ में जा रहा है और ठंडा पसीना बह रहा है! रामपुर गाँव के पुराने शिव मंदिर के सामने नीम का पेड़!',
    transliteration: 'Meri maa ki chhati mein patthar jaisa bhaari dard hai, baayein haath mein ja raha hai aur thanda pasina beh raha hai! Rampur gaon ke purane Shiv mandir ke saamne neem ka ped!',
    englishTranslation: 'My mother has stone-like crushing chest pain radiating to her left arm and is drenched in cold sweat! In front of the neem tree opposite the old Shiva temple in Rampur village!',
    callerProfile: 'Adult daughter witnessing sudden onset cardiac collapse',
    vocalToneNote: 'Trembling voice, high anxiety, caller gasping for reassurance',
    landmarkAnchors: ['Rampur Old Shiva Temple', 'Centenary Neem Tree', 'Gram Panchayat Handpump'],
    gpsCoordinates: { lat: 10.6318, lng: 78.5732 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is she able to speak in full sentences or feeling faint/dizzy?',
        questionCallerLang: 'क्या वह पूरी बात बोल पा रही हैं या चक्कर आकर बेहोश हो रही हैं?',
        purpose: 'Assess cardiogenic shock and hemodynamic stability',
        expectedAnswers: ['Too breathless to speak', 'She is dizzy and pale', 'Speaking weakly'],
      },
      {
        questionEnglish: 'Does she have known heart disease or blood pressure history?',
        questionCallerLang: 'क्या उनको पहले से बीपी या दिल की बीमारी की दवा चल रही है?',
        purpose: 'Risk stratification and preparation of aspirin / statin loading dose',
        expectedAnswers: ['Takes BP pill daily', 'No previous history', 'Not sure'],
      },
    ],
    criticalDos: [
      'Keep patient resting in a half-sitting position with back supported.',
      'Loosen tight neckwear and ensure fresh airy ventilation.',
      'If aspirin 300mg is available and no active gastrointestinal bleeding, have patient chew it immediately.',
    ],
    fatalDonts: [
      'DO NOT allow the patient to walk or exert themselves physically.',
      'DO NOT give heavy water or food while in severe chest pain.',
      'DO NOT ignore radiating arm/jaw pain as simple gas or indigestion.',
    ],
    recommendedHospitalCapability: 'Tertiary Hospital with 24x7 Cath Lab & Intensive Cardiac Care Unit (ICCU)',
    specialDispatchInstruction: 'Route ALS Ambulance with 12-lead ECG monitor; alert Apollo Trichy Cath Lab team.',
  },

  // =========================================================================
  // 3. ACUTE CEREBROVASCULAR ACCIDENT / STROKE (Major rural issue #3)
  // =========================================================================
  {
    id: 'em-stroke-telugu',
    category: 'Stroke & Neurological',
    emergencyType: 'Acute Ischemic Stroke (FAST Protocol / Hemiplegia)',
    severity: 'Critical',
    confidencePercentage: 94,
    goldenHourWindowMinutes: 180,
    goldenHourReason: 'Intravenous thrombolysis (Alteplase/Tenecteplase) window is strictly < 4.5 hours from last known normal time.',
    language: 'Telugu',
    group: 'Indian',
    scriptName: 'తెలుగు',
    nativeText: 'మా మావయ్యకి సడన్ గా మూతి వంకర పోయింది, కుడి చేయి కదలట్లేదు, మాట ముద్దగా వస్తోంది! కొత్త చెరువు గట్టు మిల్క్ డైరీ వెనక!',
    transliteration: 'Maa maavayyaki sudden ga moothi vankara poyindi, kudi cheyi kadalatledhu, maata muddaga vastondi! Kotha cheruvu gattu milk dairy venaka!',
    englishTranslation: 'My uncle suddenly developed a crooked face, his right arm is paralyzed, and his speech is completely slurred! Behind the Milk Dairy on the new lake bund!',
    callerProfile: 'Nephew observing acute neurological deficit at morning breakfast',
    vocalToneNote: 'Urgent, confused by slurred speech, background murmur of relatives',
    landmarkAnchors: ['New Lake Bund (Kotha Cheruvu)', 'Cooperative Milk Society Dairy', 'Borewell shed'],
    gpsCoordinates: { lat: 10.6515, lng: 78.5842 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'What exact time was the patient last seen completely normal?',
        questionCallerLang: 'ఆయన చివరిసారిగా ఎప్పుడు స్పష్టంగా మాట్లాడారు (సరిగ్గా ఎన్ని గంటలకు)?',
        purpose: 'Establish exact Stroke Onset Time for IV thrombolysis eligibility',
        expectedAnswers: ['Just 20 minutes ago at 8 AM', 'Woke up like this', '1 hour ago'],
      },
      {
        questionEnglish: 'Can he lift both arms equally if you ask him to?',
        questionCallerLang: 'రెండు చేతులు పైకెత్తమని చెబితే సమానంగా ఎత్తగలుగుతున్నారా?',
        purpose: 'Confirm motor unilateral weakness (Cincinnati Prehospital Stroke Scale)',
        expectedAnswers: ['Right arm falls down immediately', 'Cannot lift at all', 'Very weak'],
      },
    ],
    criticalDos: [
      'Note the EXACT time symptoms began (critical for clot-busting medicine).',
      'Position patient on their side with head elevated 30 degrees to prevent choking.',
      'Check blood sugar if glucometer is available in village clinic to rule out hypoglycemia.',
    ],
    fatalDonts: [
      'DO NOT give any water, tea, or oral medicines (swallowing reflex is paralyzed; causes fatal aspiration pneumonia).',
      'DO NOT lower high blood pressure aggressively without emergency physician guidance.',
      'DO NOT let patient sleep hoping it will get better.',
    ],
    recommendedHospitalCapability: 'Comprehensive Stroke Center with 24x7 Non-Contrast Head CT & Neurologist on call',
    specialDispatchInstruction: 'Alert Trichy Govt Multi-Super-Speciality Hospital CT console for Code Stroke pre-alert.',
  },

  // =========================================================================
  // 4. AGRICULTURAL THRESHER / TRACTOR CRUSH TRAUMA (Major rural issue #4)
  // =========================================================================
  {
    id: 'em-trauma-kannada',
    category: 'Trauma & Hemorrhage',
    emergencyType: 'Agricultural Thresher Machine Traumatic Amputation & Severe Hemorrhage',
    severity: 'Critical',
    confidencePercentage: 99,
    goldenHourWindowMinutes: 30,
    goldenHourReason: 'Uncontrolled arterial hemorrhage leads to irreversible hemorrhagic shock within 20-30 minutes.',
    language: 'Kannada',
    group: 'Indian',
    scriptName: 'ಕನ್ನಡ',
    nativeText: 'ಹೊಲದಲ್ಲಿ ಭತ್ತದ ಯಂತ್ರದಲ್ಲಿ ಅಣ್ಣನ ಬಲಗೈ ಸಿಕ್ಕಿಹಾಕಿಕೊಂಡು ರಕ್ತ ಧಾರೆಧಾರೆಯಾಗಿ ಹರಿಯುತ್ತಿದೆ! ಪ್ರಜ್ಞೆ ತಪ್ಪುತ್ತಿದೆ! ಹಳೆಯ ಪೆಟ್ರೋಲ್ ಬಂಕ್ ಹಿಂಭಾಗದ ಕೃಷಿ ಗೋದಾಮು!',
    transliteration: 'Holadalli bhattada yantradalli annana balagai sikkihakikondu rakta dhaaredhaareyagi hariyuttide! Prajne tapputtide! Haleya petrol bunk himbhaagada krishi godaamu!',
    englishTranslation: 'Elder brother’s right forearm got caught in the paddy thresher machine, arterial blood is spurting profusely! He is losing consciousness! Behind the old petrol bunk agricultural warehouse!',
    callerProfile: 'Distressed farm laborer shouting over mechanical engine rumble',
    vocalToneNote: 'Screaming, hysterical, background shouting "Stall the engine, get a cloth!"',
    landmarkAnchors: ['Old National Highway Petrol Bunk', 'Primary Agricultural Warehouse', 'High mast light post'],
    gpsCoordinates: { lat: 10.6235, lng: 78.5510 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is blood spurting out like a fountain or steadily pooling?',
        questionCallerLang: 'ರಕ್ತ ಪಂಪ್ ಮಾಡಿದ ಹಾಗೆ ಚಿಮ್ಮುತ್ತಿದೆಯಾ ಅಥವಾ ನಿಧಾನವಾಗಿ ಹರಿಯುತ್ತಿದೆಯಾ?',
        purpose: 'Differentiate arterial vs venous hemorrhage to guide tourniquet application',
        expectedAnswers: ['Spurting rapidly in pulses', 'Heavy non-stop flow', 'Limb is crushed'],
      },
      {
        questionEnglish: 'Have you applied hard direct pressure with clean cloth over the wound?',
        questionCallerLang: 'ಗಾಯದ ಮೇಲೆ ಸ್ವಚ್ಛ ಬಟ್ಟೆಯಿಂದ ಗಟ್ಟಿಯಾಗಿ ಒತ್ತಿ ಹಿಡಿದಿದ್ದೀರಾ?',
        purpose: 'Verify immediate mechanical hemostasis to prevent exsanguination',
        expectedAnswers: ['Pressing hard with towel', 'Tied a rope', 'Still bleeding through'],
      },
    ],
    criticalDos: [
      'Apply continuous, hard, direct pressure directly on the bleeding site with a thick clean cloth.',
      'If arterial spurting continues from a limb, apply a commercial tourniquet or improvised windlass 5cm above wound.',
      'Elevate injured limb above heart level and wrap severed tissue in clean dry cloth sealed in a plastic bag over cool water.',
    ],
    fatalDonts: [
      'DO NOT remove the soaked cloth; keep adding more layers on top with continuous pressure.',
      'DO NOT wash a severed limb with dirty ditch water or place it directly on ice.',
      'DO NOT give oral fluids to a patient going into hemorrhagic shock.',
    ],
    recommendedHospitalCapability: 'Level-1 Trauma & Orthopedic Reconstruction Centre with active Blood Bank',
    specialDispatchInstruction: 'Dispatch nearest Community Volunteer with trauma kit immediately; alert Kaveri Trauma OT.',
  },

  // =========================================================================
  // 5. ORGANOPHOSPHATE PESTICIDE POISONING (Major rural issue #5)
  // =========================================================================
  {
    id: 'em-tox-bengali',
    category: 'Venom & Toxicology',
    emergencyType: 'Acute Organophosphate Pesticide Ingestion / Cholinergic Toxicity',
    severity: 'Critical',
    confidencePercentage: 97,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Immediate administration of high-dose Atropine is vital to reverse fatal bronchospasm and excessive pulmonary secretions.',
    language: 'Bengali',
    group: 'Indian',
    scriptName: 'বাংলা',
    nativeText: 'জমির কীটনাশক খেয়ে ফেলেছে! মুখ দিয়ে সাদা ফেনা বেরোচ্ছে, চোখ ছোট হয়ে গেছে আর খিঁচুনি হচ্ছে! শনির মন্দিরের পেছনের কালভার্টের কাছে!',
    transliteration: 'Jomir keetnashok kheye felechhe! Mukh diye sada fena berocche, chokh chhoto hoye gechhe aar khichuni hocche! Shonir mondir-er pechhoner culvert-er kachhe!',
    englishTranslation: 'He accidentally/intentionally ingested crop pesticide! White froth pouring from mouth, pinpoint pupils, and having active convulsions! Near the culvert behind Shani temple!',
    callerProfile: 'Panicked family member describing toxic exposure in farm shed',
    vocalToneNote: 'Distraught, rapid talking, choking sounds audible from patient',
    landmarkAnchors: ['Shani Temple Culvert', 'Paddy canal bridge', 'Village banyan tree'],
    gpsCoordinates: { lat: 10.6395, lng: 78.5680 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Can the patient breathe through the mouth froth, or are they choking on secretions?',
        questionCallerLang: 'মুখের ফেনার জন্য কি নিঃশ্বাস আটকে যাচ্ছে, না শ্বাস নিতে পারছে?',
        purpose: 'Identify impending airway asphyxiation from profuse bronchorrhea',
        expectedAnswers: ['Gurgling heavily in throat', 'Breathing very shallow', 'Gasping'],
      },
      {
        questionEnglish: 'Do you have the bottle or label of the pesticide bottle nearby?',
        questionCallerLang: 'কীটনাশকের বোতল বা প্যাকেটের নাম কি কাছে দেখতে পাচ্ছেন?',
        purpose: 'Identify specific organophosphate/carbamate for specific antidote dosing',
        expectedAnswers: ['Chlorpyrifos green bottle', 'Monocrotophos can', 'Do not know name'],
      },
    ],
    criticalDos: [
      'Turn patient on their left side immediately (recovery position) to let mouth secretions drain safely.',
      'Remove contaminated clothes and wash skin with soap and plenty of water if pesticide spilled on body.',
      'Safely photograph the pesticide bottle to show emergency medical officers.',
    ],
    fatalDonts: [
      'DO NOT induce vomiting using salt water or fingers (causes fatal aspiration into lungs and corrosive burns).',
      'DO NOT give milk, ghee, or raw eggs (fat enhances absorption of organophosphates).',
      'DO NOT touch contaminated vomitus or clothing with bare unprotected hands.',
    ],
    recommendedHospitalCapability: 'Hospital with Intensive Care Unit, Atropine/Pralidoxime stocks & mechanical ventilation',
    specialDispatchInstruction: 'Dispatch ALS Ambulance with suction unit; alert Viralimalai CHC to prepare Atropine vials.',
  },

  // =========================================================================
  // 6. OBSTETRIC / MATERNAL COMPLICATION (Major rural issue #6 - Remote labor)
  // =========================================================================
  {
    id: 'em-maternal-malayalam',
    category: 'Maternal & Pediatric',
    emergencyType: 'Eclampsia / Severe Pre-Eclampsia Convulsions during Labor',
    severity: 'Critical',
    confidencePercentage: 96,
    goldenHourWindowMinutes: 40,
    goldenHourReason: 'Emergency Magnesium Sulfate and emergency cesarean section within 45 mins prevents maternal cerebral hemorrhage and fetal death.',
    language: 'Malayalam',
    group: 'Indian',
    scriptName: 'മലയാളം',
    nativeText: 'പ്രസവ വേദനയുള്ള പെങ്ങൾക്ക് പെട്ടെന്ന് ബോധംകെട്ട് അപസ്മാരം വന്നു! ശരീരം വല്ലാതെ വിറയ്ക്കുന്നു, അമിത രക്തസ്രാവമുണ്ട്! മലയോര കാപ്പിത്തോട്ടം ചെക്ക്പോസ്റ്റിന് അടുത്ത്!',
    transliteration: 'Prasava vedhanayulla pengalkku pettannu bodhamkettu apasmaram vannu! Shareeram vallathe viraykkunnu, amitha rakthasravamundu! Malayora kaappithottam checkpostinu aduthu!',
    englishTranslation: 'My pregnant sister in active labor suddenly fell unconscious and had severe epileptic convulsions! Body is stiff, shaking, and heavy bleeding! Near the hill coffee estate forest checkpost!',
    callerProfile: 'Elder sister calling from remote hillside tribal/rural settlement',
    vocalToneNote: 'Frantic, weeping, sound of rain and wind on tin roof',
    landmarkAnchors: ['Hill Coffee Estate Forest Checkpost', 'Panchayat water tap', 'Forest boundary milestone #9'],
    gpsCoordinates: { lat: 10.5920, lng: 78.5140 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Has the convulsion stopped, and is she breathing on her side?',
        questionCallerLang: 'വിറയൽ നിന്നോ? അവളെ ഒരു വശത്തേക്ക് ചരിച്ചു കിടത്തിയോ?',
        purpose: 'Prevent supine hypotensive syndrome and saliva aspiration into lungs',
        expectedAnswers: ['Still twitching weakly', 'Turned her to left side', 'Breathing heavily'],
      },
      {
        questionEnglish: 'Can you see the baby head coming out or continuous vaginal blood pooling?',
        questionCallerLang: 'കുഞ്ഞിന്റെ തല കാണുന്നുണ്ടോ അതോ രക്തം തുണിയിൽ നിറയുകയാണോ?',
        purpose: 'Differentiate imminent delivery vs uterine rupture / abruption',
        expectedAnswers: ['Heavy blood clots coming out', 'No baby head visible', 'Severe bleeding'],
      },
    ],
    criticalDos: [
      'Turn the pregnant mother onto her LEFT side immediately (takes uterine weight off vena cava).',
      'Protect her head with a soft pillow/cloth and cushion her during any twitching.',
      'Keep airway clear; ensure someone stays with her continuously.',
    ],
    fatalDonts: [
      'DO NOT put metal keys, spoons, or hands in her mouth during seizures (damages teeth and obstructs airway).',
      'DO NOT attempt to pull the baby forcibly.',
      'DO NOT give any hot tea, herbal decoctions, or oral labor accelerators.',
    ],
    recommendedHospitalCapability: 'Tertiary Maternity Centre with 24x7 Obstetrician, Blood Bank & Neonatal ICU (NICU)',
    specialDispatchInstruction: 'Dispatch ALS Ambulance with midwife/nurse and Magnesium Sulfate; alert Trichy Govt Obstetric OT.',
  },

  // =========================================================================
  // 7. PEDIATRIC CHOKING / INFANT AIRWAY OBSTRUCTION (Major rural issue #7)
  // =========================================================================
  {
    id: 'em-peds-marathi',
    category: 'Maternal & Pediatric',
    emergencyType: 'Pediatric Acute Foreign Body Airway Obstruction (Choking Child)',
    severity: 'Critical',
    confidencePercentage: 99,
    goldenHourWindowMinutes: 5,
    goldenHourReason: 'Complete airway obstruction causes irreversible hypoxic brain damage within 4-6 minutes without immediate back blows.',
    language: 'Marathi',
    group: 'Indian',
    scriptName: 'मराठी',
    nativeText: 'दोन वर्षांच्या मुलाने शेंगदाणा गिळला, श्वास पूर्ण बंद झाला आहे, चेहरा निळा पडतोय आणि आवाज निघत नाहीये! ग्रामपंचायत विहिरीजवळ!',
    transliteration: 'Don varshanchya mulane shengdana gil-la, shwaas poorna band zaala aahe, chehra neela padtoye aani aawaz nighat naahiye! Grampanchayat vihirijawal!',
    englishTranslation: '2-year-old child swallowed a groundnut, airway is completely blocked, face is turning dark blue, and cannot make any sound! Near the Gram Panchayat well!',
    callerProfile: 'Mother in absolute terror holding a silent, struggling toddler',
    vocalToneNote: 'Shrill, weeping, terrified shouting into phone receiver',
    landmarkAnchors: ['Gram Panchayat Community Well', 'Anganwadi Center building', 'Primary school gate'],
    gpsCoordinates: { lat: 10.6350, lng: 78.5810 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Can the child cough or make any cry sound, or is it completely silent?',
        questionCallerLang: 'मूल खोकू शकत आहे का, की आवाज पूर्णपणे बंद झाला आहे?',
        purpose: 'Differentiate partial obstruction (encourage cough) vs complete obstruction (back blows)',
        expectedAnswers: ['Completely silent and turning blue', 'Cannot cry at all', 'Struggling weakly'],
      },
      {
        questionEnglish: 'Is the child still awake or becoming limp in your hands?',
        questionCallerLang: 'मूल अजून शुद्धीत आहे का की हातपाय सैल पडत आहेत?',
        purpose: 'Transition to pediatric CPR if infant becomes unresponsive',
        expectedAnswers: ['Turning limp right now', 'Still conscious and struggling', 'Eyes rolling back'],
      },
    ],
    criticalDos: [
      'IMMEDIATELY give 5 firm back blows with heel of your hand between shoulder blades while leaning child forward.',
      'If not cleared, turn child over and give 5 quick chest thrusts on center of breastbone.',
      'Repeat 5 back blows and 5 chest thrusts until object is expelled or child cries.',
    ],
    fatalDonts: [
      'DO NOT perform blind finger sweeps in the mouth (pushes the foreign object deeper into vocal cords).',
      'DO NOT hold the child upside down by their legs.',
      'DO NOT give water or fluids (causes further drowning of airway).',
    ],
    recommendedHospitalCapability: 'Emergency Pediatric Trauma Center with Pediatric Bronchoscopy & ENT surgeon',
    specialDispatchInstruction: 'Dispatch closest volunteer Murugan immediately (5 min bike ETA) for hands-on Heimlich/CPR.',
  },

  // =========================================================================
  // 8. IRRIGATION PUMP ELECTROCUTION (Major rural issue #8)
  // =========================================================================
  {
    id: 'em-electric-tamil',
    category: 'Environmental & Electrical',
    emergencyType: 'High-Voltage Agricultural Motor Pump Electrocution / Cardiac Arrest',
    severity: 'Critical',
    confidencePercentage: 97,
    goldenHourWindowMinutes: 10,
    goldenHourReason: 'Sudden ventricular fibrillation requires bystander chest compressions (CPR) within 4-8 minutes for survival.',
    language: 'Tamil',
    group: 'Indian',
    scriptName: 'தமிழ்',
    nativeText: 'மோட்டார் ரூம்ல கரண்ட் ஷாக் அடிச்சு அண்ணன் தூக்கி வீசப்பட்டாரு! நாடி துடிக்கல, உடம்பு விரைச்சு கிடக்குது! காவேரி பாசன வாய்க்கால் பம்ப் செட்!',
    transliteration: 'Motor roomla current shock adichu annan thooki veesappattaaru! Naadi thudikkala, udambu viraichu kidakkudhu! Kaveri paasana vaaykkaal pump set!',
    englishTranslation: 'Elder brother was thrown by electric shock in motor shed! No pulse detected, body is stiff and unresponsive! Kaveri irrigation canal pump set!',
    callerProfile: 'Cousin calling immediately after witnessing electrical flash',
    vocalToneNote: 'Shocked, shaking, loud hum of transformer in background',
    landmarkAnchors: ['Kaveri Irrigation Canal Pumping Shed', 'Transformer pole #3', 'Green canal sluice gate'],
    gpsCoordinates: { lat: 10.6610, lng: 78.6050 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is the main power switch OFF, and is the victim completely disconnected from live wires?',
        questionCallerLang: 'மெயின் சுவிட்ச் ஆஃப் செய்யப்பட்டுவிட்டதா? மின் கம்பி தொடாமல் உள்ளாரா?',
        purpose: 'Ensure bystander safety before initiating chest compressions',
        expectedAnswers: ['Power is turned off completely', 'Pushed away with dry wooden stick', 'Safe to touch'],
      },
      {
        questionEnglish: 'Is the victim breathing at all or is the chest completely motionless?',
        questionCallerLang: 'மார்பு ஏறி இறங்குகிறதா அல்லது சுவாசம் முற்றிலும் நின்றுவிட்டதா?',
        purpose: 'Verify cardiac arrest to start immediate hands-only CPR',
        expectedAnswers: ['No breathing at all', 'Gasping strange noises', 'Totally motionless'],
      },
    ],
    criticalDos: [
      'Ensure power switch is turned off using dry wooden pole before touching victim.',
      'Place patient flat on back on hard ground and start hard, fast chest compressions (100-120 per minute in center of chest).',
      'Push down at least 5 cm deep to the beat of "Stayin Alive" without stopping.',
    ],
    fatalDonts: [
      'DO NOT touch victim with bare hands while current is live.',
      'DO NOT pour water on electrocuted person.',
      'DO NOT stop chest compressions until ambulance paramedic arrives.',
    ],
    recommendedHospitalCapability: 'Tertiary Emergency ICU with Defibrillator, Burn Unit & Nephrology for myoglobinuria',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with defibrillator and pacing capabilities; instruct CPR over phone.',
  },

  // =========================================================================
  // 9. WELL DROWNING / NEAR-SUBMERSION (Major rural issue #9)
  // =========================================================================
  {
    id: 'em-drown-tamil',
    category: 'Environmental & Electrical',
    emergencyType: 'Agricultural Deep Well Submersion / Near-Drowning Respiratory Arrest',
    severity: 'Critical',
    confidencePercentage: 95,
    goldenHourWindowMinutes: 8,
    goldenHourReason: 'Anoxic brain injury occurs rapidly; early 5 rescue breaths followed by compressions doubles revival rates.',
    language: 'Tamil',
    group: 'Indian',
    scriptName: 'தமிழ்',
    nativeText: 'ஆழ்துளை கிணற்றில் தவறி விழுந்த பிள்ளையை கயிறு கட்டி தூக்கியாச்சு, ஆனா மூச்சு விடல, வயிறு உப்பி கிடக்கு! கீழப்பட்டி குளக்கரை அரசமரம்!',
    transliteration: 'Aazhthulai kinatril thavari vizhundha pillaiyai kayiru katti thookkiyachu, aana moochu vidala, vayiru uppi kidakku! Keelapatti kulakkarai arasamaram!',
    englishTranslation: 'Pulled child out of the deep agricultural well using ropes, but she is not breathing, belly is distended! Near peepal tree on Keelapatti pond embankment!',
    callerProfile: 'Villager on speakerphone surrounded by shouting crowd',
    vocalToneNote: 'Distressed crowd yelling instructions, sound of water splashing',
    landmarkAnchors: ['Keelapatti Village Pond Bund', 'Sacred Peepal Tree', 'Bathing ghat steps'],
    gpsCoordinates: { lat: 10.6480, lng: 78.5900 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Have you cleared mud or weeds from the mouth and started rescue breaths?',
        questionCallerLang: 'வாயில் உள்ள பாசி சேற்றை விரலால் துடைத்து 5 முறை வாய்வழியாக ஊதினீர்களா?',
        purpose: 'Clear airway and oxygenate hypoxic myocardium in drowning resuscitation',
        expectedAnswers: ['Cleared mouth now', 'Need guidance how to blow', 'She vomited water'],
      },
      {
        questionEnglish: 'Is there any neck or head injury from falling on rocks inside well?',
        questionCallerLang: 'விழுந்ததில் தலையிலோ கழுத்திலோ பலத்த காயம் பட்டுள்ளதா?',
        purpose: 'Spinal precautions while performing airway rescue',
        expectedAnswers: ['Bleeding on forehead', 'No visible bone fracture', 'Not sure'],
      },
    ],
    criticalDos: [
      'Clear visible mud/vomit from mouth, tilt head gently, pinch nose, and deliver 5 slow rescue breaths.',
      'Follow immediately with 30 chest compressions, then 2 breaths, repeating continuously.',
      'Remove wet soaked clothes and wrap in dry warm blanket to prevent hypothermia.',
    ],
    fatalDonts: [
      'DO NOT waste time trying to press stomach to pump water out (causes massive stomach acid aspiration).',
      'DO NOT hold child upside down by ankles.',
      'DO NOT delay chest compressions if there is no normal breathing.',
    ],
    recommendedHospitalCapability: 'Hospital with Pediatric ICU, Mechanical Ventilators & Acute Pulmonary Edema management',
    specialDispatchInstruction: 'Dispatch volunteer Dr. Kavitha Ramesh with portable O2 cylinder; assign ALS ambulance.',
  },

  // =========================================================================
  // 10. MASS CASUALTY RURAL HIGHWAY COLLISION (Major rural issue #10)
  // =========================================================================
  {
    id: 'em-mass-casualty-english',
    category: 'Trauma & Hemorrhage',
    emergencyType: 'Mass Casualty Highway Collision (Rural Minibus Overturn with Multiple Traumas)',
    severity: 'Critical',
    confidencePercentage: 99,
    goldenHourWindowMinutes: 30,
    goldenHourReason: 'Multiple severely trapped victims with hemorrhage and tension pneumothorax require rapid field triage triage prioritization.',
    language: 'English',
    group: 'Indian',
    scriptName: 'English',
    nativeText: 'Major accident on NH-45 bypass! Rural minibus overturned into rocky ditch, at least 8 passengers trapped, 3 severely bleeding from head and limbs, one unconscious! 2 km past Viralimalai toll plaza before the bridge!',
    transliteration: 'Major accident on NH-45 bypass! Rural minibus overturned into rocky ditch, at least 8 passengers trapped...',
    englishTranslation: 'Major accident on NH-45 bypass! Rural minibus overturned into rocky ditch, at least 8 passengers trapped, 3 severely bleeding from head and limbs, one unconscious! 2 km past Viralimalai toll plaza before the bridge!',
    callerProfile: 'Highway truck driver who stopped to assist',
    vocalToneNote: 'Authoritative, urgent, sirens and highway traffic roaring in background',
    landmarkAnchors: ['NH-45 Bypass Km 328 Milestone', 'Viralimalai Toll Plaza +2km', 'Dry riverbed bridge approach'],
    gpsCoordinates: { lat: 10.6120, lng: 78.5390 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is there any fire or diesel fuel leaking from the overturned bus engine?',
        questionCallerLang: 'Is diesel leaking or any risk of fire from the vehicle wreckage?',
        purpose: 'Scene safety assessment before extrication',
        expectedAnswers: ['Smell strong diesel fuel', 'No fire visible yet', 'Engine is smoking'],
      },
      {
        questionEnglish: 'How many victims are completely unresponsive or not breathing?',
        questionCallerLang: 'How many people are unconscious or unable to speak at all?',
        purpose: 'Determine initial Red-Tag count for multi-vehicle dispatch',
        expectedAnswers: ['2 are unresponsive', '4 people trapped screaming', 'Many minor walking wounded'],
      },
    ],
    criticalDos: [
      'Prioritize conscious victims with severe spurting bleeding by applying direct pressure and tourniquets.',
      'Leave steering/roof extrication of heavily pinned victims to trained rescuers unless immediate fire hazard.',
      'Guide walking wounded away from speeding highway traffic to safe embankment.',
    ],
    fatalDonts: [
      'DO NOT yank or pull victims out violently by limbs if spine or neck injury is suspected.',
      'DO NOT light matches, bidis, or cigarettes near overturned diesel vehicles.',
      'DO NOT move victims onto active highway lanes.',
    ],
    recommendedHospitalCapability: 'Apex Level-1 Trauma Center with Multi-Theatres and Emergency Blood Reserve',
    specialDispatchInstruction: 'Trigger Mass Casualty Protocol: Dispatch ALS-45-A1, BLS-45-B4, and volunteer Anand Bolero pickup with spine boards.',
  },

  // =========================================================================
  // 11. EXTREME HEATSTROKE IN SUMMER FIELDS (Major rural issue #11)
  // =========================================================================
  {
    id: 'em-heat-kannada',
    category: 'Environmental & Electrical',
    emergencyType: 'Exertional Heatstroke & Hyperthermic Encephalopathy (>41°C)',
    severity: 'Serious',
    confidencePercentage: 92,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Core body temperature >40.5°C causes irreversible neuronal destruction and rhabdomyolysis without rapid evaporative cooling.',
    language: 'Kannada',
    group: 'Indian',
    scriptName: 'ಕನ್ನಡ',
    nativeText: 'ಬಿಸಿಲಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದ ಅಪ್ಪ ತಲೆತಿರುಗಿ ಬಿದ್ದರು, ಮೈ ಬೆಂಕಿಯಂತೆ ಕಾಯುತ್ತಿದೆ, ಬೆವರುತ್ತಿಲ್ಲ ಮತ್ತು ಬಾಯಲ್ಲಿ ಏನೋ ಗೊಣಗುತ್ತಿದ್ದಾರೆ! ಕೆರೆ ಏರಿಯ ಮೇಲಿರುವ ಅಶ್ವತ್ಥ ಮರ!',
    transliteration: 'Bisilinalli kelasa maaduttidda appa talethirugi biddaru, mai benkiyanthe kaayuttide, bevaruttilla mattu baayalli eno gonaguttiddaare! Kere eriya meliruva ashwattha mara!',
    englishTranslation: 'Father collapsed working under blazing sun, body is burning hot like fire, he stopped sweating completely and is talking incoherently! Peepal tree on the lake bund!',
    callerProfile: 'Son in scorching midday field heat (43°C)',
    vocalToneNote: 'Exhausted, worried, harsh summer wind blowing',
    landmarkAnchors: ['Village Lake Bund', 'Sacred Ashwattha Tree', 'Irrigation canal bridge'],
    gpsCoordinates: { lat: 10.6280, lng: 78.5620 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Have you moved the patient into deep shade and removed excess heavy clothing?',
        questionCallerLang: 'ಅವರನ್ನು ತಂಪಾದ ನೆರಳಿಗೆ ಕರೆದುಕೊಂಡು ಹೋಗಿ ಬಟ್ಟೆ ಸಡಿಲಗೊಳಿಸಿದ್ದೀರಾ?',
        purpose: 'Immediate cessation of radiant heat exposure',
        expectedAnswers: ['Moved under tree shade', 'Poured cool water on body', 'Fan running on him'],
      },
      {
        questionEnglish: 'Can the patient swallow water or are they talking nonsense and drifting off?',
        questionCallerLang: 'ನೀರು ಕುಡಿಯಲು ಸಾಧ್ಯವಿದೆಯೇ ಅಥವಾ ಪ್ರಜ್ಞೆ ಕಳೆದುಕೊಳ್ಳುತ್ತಿದ್ದಾರೆಯೇ?',
        purpose: 'Check for altered sensorium confirming true heat stroke vs heat exhaustion',
        expectedAnswers: ['Cannot drink, drifting away', 'Eyes open but unresponsive', 'Very confused'],
      },
    ],
    criticalDos: [
      'Move immediately to coolest shade, loosen tight clothing, and fan vigorously.',
      'Continuously pour cool (not freezing) water over body and place wet cloths on armpits, groin, and neck.',
      'Elevate feet 15 cm if patient is pale, or turn on side if vomiting.',
    ],
    fatalDonts: [
      'DO NOT force an altered, unconscious patient to drink fluids (causes fatal airway aspiration).',
      'DO NOT give paracetamol or aspirin (ineffective for environmental heatstroke and damages liver/kidneys).',
      'DO NOT immerse fully in freezing ice bath in remote field (can induce shivering and peripheral vasoconstriction).',
    ],
    recommendedHospitalCapability: 'Secondary Primary Health Centre or Taluk Hospital with active IV fluid resuscitation & cold sponging bays',
    specialDispatchInstruction: 'Dispatch BLS-45-B4 with ice packs and IV Normal Saline; alert Viralimalai CHC.',
  },

  // =========================================================================
  // 12. DOMESTIC CYLINDER / CHULHA FLASH BURNS (Major rural issue #12)
  // =========================================================================
  {
    id: 'em-burns-hindi',
    category: 'Trauma & Hemorrhage',
    emergencyType: 'Extensive Thermal Flame Burns (>40% TBSA) & Smoke Inhalation',
    severity: 'Serious',
    confidencePercentage: 94,
    goldenHourWindowMinutes: 60,
    goldenHourReason: 'Fluid resuscitation calculation (Parkland formula) within first 8 hours prevents hypovolemic burn shock and acute renal shutdown.',
    language: 'Hindi',
    group: 'Indian',
    scriptName: 'हिन्दी',
    nativeText: 'रसोई में गैस सिलेंडर से आग भड़क गई! चाची के कपड़े जल गए, छाती और हाथ झुलस गए हैं, सांस लेने में घरघराहट हो रही है! रामपुर प्राथमिक विद्यालय के पास!',
    transliteration: 'Rasoi mein gas cylinder se aag bhadak gayi! Chachi ke kapde jal gaye, chhati aur haath jhulas gaye hain, saans lene mein ghargharahaat ho rahi hai! Rampur prathmik vidyalaya ke paas!',
    englishTranslation: 'Gas cylinder caught fire in kitchen! Aunt’s clothes ignited, severe burns over chest and arms, and she has wheezing, raspy breathing! Near Rampur primary school!',
    callerProfile: 'Family member shouting over domestic panic and extinguishing fire',
    vocalToneNote: 'Coughing, terrified, background cries of children',
    landmarkAnchors: ['Rampur Primary School', 'Old village flour mill', 'Overhead water tank'],
    gpsCoordinates: { lat: 10.6330, lng: 78.5750 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is there black soot around the nose or mouth, or hoarseness when she speaks?',
        questionCallerLang: 'क्या नाक-मुंह के पास काला धुआं लगा है या आवाज भारी हो रही है?',
        purpose: 'Screen for inhalational airway burns requiring immediate early intubation',
        expectedAnswers: ['Yes, black soot in nose', 'Voice is very raspy', 'She is coughing smoke'],
      },
      {
        questionEnglish: 'Have you cooled the burned skin under gentle running clean water?',
        questionCallerLang: 'क्या जले हुए हिस्से पर नल का सादा ठंडा पानी डाला गया है?',
        purpose: 'Stop burn progression and relieve intense pain',
        expectedAnswers: ['Pouring tap water right now', 'Applied toothpaste', 'Covered with sheet'],
      },
    ],
    criticalDos: [
      'Pour gentle, cool, clean tap water continuously over burned skin for 15-20 minutes.',
      'Carefully remove burnt un-stuck clothing and jewelry before swelling locks fingers/wrists.',
      'Cover loosely with a clean, dry, lint-free bedsheet to protect raw dermis from flies and infection.',
    ],
    fatalDonts: [
      'DO NOT apply toothpaste, cow dung, cooking oil, turmeric, or ink on burns.',
      'DO NOT burst blisters or peel skin forcibly.',
      'DO NOT apply ice directly on deep burns (worsens tissue necrosis).',
    ],
    recommendedHospitalCapability: 'Hospital with Specialized Burn ICU & Plastic Surgery / Airway Team',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with humidified O2 and sterile burn packs; alert Kaveri Burn Unit.',
  },

  // =========================================================================
  // 13. CHINESE (MANDARIN) - Agricultural Syncope & Hypoxia
  // =========================================================================
  {
    id: 'em-chinese-field',
    category: 'Stroke & Neurological',
    emergencyType: 'Acute Unresponsive Syncope / Agonal Respiration in Farmland',
    severity: 'Critical',
    confidencePercentage: 97,
    goldenHourWindowMinutes: 30,
    goldenHourReason: 'Unresponsive patient with agonal gasping requires immediate airway patency and CPR evaluation within golden window.',
    language: 'Chinese (Mandarin)',
    group: 'Foreign',
    scriptName: '中文 (普通话)',
    nativeText: '我父亲在稻田里晕倒了，完全没有反应，脸色发紫，呼吸像抽气一样！老榕树旁边村委会大水塔后面，请派救护车！',
    transliteration: 'Wǒ fùqīn zài dàotián lǐ yūndǎole, wánquán méiyǒu fǎnyìng, liǎnsè fāzǐ, hūxī xiàng chōuqì yīyàng! Lǎo róngshù pángbiān cūn wěihuì dà shuǐtǎ hòumiàn, qǐng pài jiùhùchē!',
    englishTranslation: 'My father collapsed in the rice paddy, completely unresponsive, face turning purple, breathing with agonal gasps! Behind the village committee large water tower near the old banyan tree, please send an ambulance!',
    callerProfile: 'Rural agricultural laborer calling in severe distress',
    vocalToneNote: 'Rapid, breathy, urgent pleading tone',
    landmarkAnchors: ['Old Banyan Tree', 'Village Committee Large Water Tower', 'Paddy canal bridge'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'When you tap his shoulder and shout, does he respond at all?',
        questionCallerLang: '拍打肩膀大声呼唤时，他有一点点反应吗？',
        purpose: 'Confirm deep unresponsiveness (AVPU scale)',
        expectedAnswers: ['No response at all', 'Eyes do not open', 'Completely limp'],
      },
      {
        questionEnglish: 'Is his chest moving regularly, or only gasping once every few seconds?',
        questionCallerLang: '胸部有规律起伏吗，还只是几秒钟倒抽一口气？',
        purpose: 'Differentiate normal breathing vs agonal gasps in cardiac arrest',
        expectedAnswers: ['Only gasping weakly', 'Not breathing properly', 'Motionless'],
      },
    ],
    criticalDos: [
      'Lay patient flat on back and place ear near mouth to verify breathing.',
      'If not breathing normally, begin 100-120 chest compressions per minute in center of chest.',
      'Clear mouth if foreign material or mud is visible.',
    ],
    fatalDonts: [
      'DO NOT leave patient face down in mud or water.',
      'DO NOT shake vigorously if neck injury is possible.',
      'DO NOT pour water into mouth.',
    ],
    recommendedHospitalCapability: 'Apex Referral Hospital with Advanced ICU & 24/7 Resuscitation Bay',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with cardiac monitor and oxygen immediately.',
  },

  // =========================================================================
  // 14. JAPANESE - Sudden Collapse & Loss of Consciousness
  // =========================================================================
  {
    id: 'em-japanese-collapse',
    category: 'Cardiovascular',
    emergencyType: 'Sudden Cardiogenic Collapse / Pre-Hospital Arrest',
    severity: 'Critical',
    confidencePercentage: 96,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Immediate bystander recognition and AED application within early minutes determines cardiac resuscitation outcome.',
    language: 'Japanese',
    group: 'Foreign',
    scriptName: '日本語',
    nativeText: '父が畑で突然倒れて意識を失いました。呼びかけに返事がなく、唇が紫色です。古い神社の鳥居の先、大きな農業用給水塔のすぐ裏です！',
    transliteration: 'Chichi ga hatake de totsuzen taorete ishiki o ushinaimashita. Yobikake ni henji ga naku, kuchibiru ga murasaki-iro desu. Furui jinja no torii no saki, ōkina nōgyō-yō kyūsuitō no sugu ura desu!',
    englishTranslation: 'Father suddenly collapsed in the field and lost consciousness. No answer when called, and lips are turning purple. Past the old shrine torii gate, right behind the large agricultural water tower!',
    callerProfile: 'Son witnessing sudden collapse during morning field work',
    vocalToneNote: 'Shaken, polite but extremely tense and urgent',
    landmarkAnchors: ['Old Shrine Torii Gate', 'Large Agricultural Water Tower', 'Dirt road junction'],
    gpsCoordinates: { lat: 10.6310, lng: 78.5720 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Are his lips and fingernails turning pale blue or purple?',
        questionCallerLang: '唇や爪の色が青紫色に変色していますか？',
        purpose: 'Assess peripheral cyanosis and critical oxygenation failure',
        expectedAnswers: ['Lips are dark purple', 'Skin is pale and cold', 'Yes blue'],
      },
      {
        questionEnglish: 'Is he breathing normally right now?',
        questionCallerLang: '今、普段通りに息をしていますか？',
        purpose: 'Assess indication for immediate chest compressions',
        expectedAnswers: ['Not breathing normally', 'Occasional gasps only', 'Chest not moving'],
      },
    ],
    criticalDos: [
      'Place patient flat on their back on a hard surface.',
      'Begin firm chest compressions in center of chest at 100-120 beats per minute.',
      'Loosen any tight clothing around the neck.',
    ],
    fatalDonts: [
      'DO NOT give water or medicine to someone who is unresponsive.',
      'DO NOT put a pillow under the head (blocks airway).',
      'DO NOT delay chest compressions while waiting for help.',
    ],
    recommendedHospitalCapability: 'Tertiary Emergency Medical Center with Defibrillator & ICCU',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with defibrillator and notify emergency team.',
  },

  // =========================================================================
  // 15. KOREAN - Farmland Agonal Respiration
  // =========================================================================
  {
    id: 'em-korean-cardiac',
    category: 'Cardiovascular',
    emergencyType: 'Acute Cardiac Collapse with Agonal Respiration',
    severity: 'Critical',
    confidencePercentage: 98,
    goldenHourWindowMinutes: 30,
    goldenHourReason: 'Agonal breathing is a sign of cardiac arrest; early CPR is mandatory within minutes.',
    language: 'Korean',
    group: 'Foreign',
    scriptName: '한국어',
    nativeText: '논에서 아버지가 갑자기 쓰러지셨는데 의식이 전혀 없고 숨을 헐떡이며 턱을 치켜듭니다! 마을 정자나무 지나서 오래된 급수탑 바로 뒤편입니다. 살려주세요!',
    transliteration: 'Non-eseo abeojiga gapjagi sseureojisyeossneunde uisigi jeonhyeo eopgo sumeul heoltteogimyeo teogeul chikyeodeumnida! Maeul jeongjanamu jinaseo oraedoen geupsutap baro dwipyeon-imnida. Sallyeojuseyo!',
    englishTranslation: 'Father suddenly collapsed in the rice paddy, no consciousness at all, gasping for air with chin thrusting up! Past the village pavilion tree, right behind the old water tower. Please save him!',
    callerProfile: 'Family member crying out in panic from remote paddy',
    vocalToneNote: 'Crying, fast-paced, desperate tone',
    landmarkAnchors: ['Village Pavilion Tree', 'Old Village Water Tower', 'Paddy canal footpath'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'When you speak into his ear, is there any response or eye opening?',
        questionCallerLang: '귀에 대고 불러도 눈을 뜨거나 손을 움직이지 않습니까?',
        purpose: 'Verify GCS level and consciousness',
        expectedAnswers: ['No movement at all', 'Eyes stay closed', 'Limp body'],
      },
      {
        questionEnglish: 'Is his chest rising and falling regularly?',
        questionCallerLang: '가슴이 규칙적으로 오르내립니까?',
        purpose: 'Check for respiratory arrest requiring CPR',
        expectedAnswers: ['Not regular at all', 'Only gasping occasionally', 'No breathing'],
      },
    ],
    criticalDos: [
      'Lay patient on hard flat ground immediately.',
      'Interlock fingers and push hard and fast on center of chest at 100-120 per minute.',
      'Check if airway is clear of vomit.',
    ],
    fatalDonts: [
      'DO NOT try to feed water or honey.',
      'DO NOT waste time pricking fingers with needles (folk myth).',
      'DO NOT bend neck forward with heavy pillows.',
    ],
    recommendedHospitalCapability: 'Super-Specialty Cardiac Hospital with Cath Lab and Resuscitation Team',
    specialDispatchInstruction: 'Dispatch ALS-45-A1; instruct caller on CPR rhythm.',
  },

  // =========================================================================
  // 16. BAHASA INDONESIA - Paddy Field Heatstroke & Dyspnea
  // =========================================================================
  {
    id: 'em-bahasa-respiratory',
    category: 'Environmental & Electrical',
    emergencyType: 'Severe Heatstroke & Respiratory Exhaustion',
    severity: 'Serious',
    confidencePercentage: 93,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Hyperthermic dehydration leads to hypovolemic shock without immediate cooling and fluid support.',
    language: 'Bahasa Indonesia',
    group: 'Foreign',
    scriptName: 'Bahasa Indonesia',
    nativeText: 'Ayah pingsan di sawah, tidak sadar dan sesak napas berat setelah mencangkul di terik matahari. Lokasinya di belakang pohon beringin dekat tangki air sekolah desa!',
    transliteration: 'Ayah pingsan di sawah, tidak sadar dan sesak napas berat setelah mencangkul di terik matahari. Lokasinya di belakang pohon beringin dekat tangki air sekolah desa!',
    englishTranslation: 'Father fainted in paddy field, unconscious and severe shortness of breath after hoeing under blistering sun. Location is behind banyan tree near village school water tank!',
    callerProfile: 'Son seeking urgent emergency help in agricultural hamlet',
    vocalToneNote: 'Breathless, worried, panting',
    landmarkAnchors: ['Big Banyan Tree', 'Village School Water Tank', 'Canal sluice gate'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is his body burning hot to the touch and has he stopped sweating?',
        questionCallerLang: 'Apakah badannya terasa sangat panas dan kulitnya kering tidak berkeringat?',
        purpose: 'Differentiate classic heat stroke from simple exhaustion',
        expectedAnswers: ['Skin is burning hot and dry', 'Very hot to touch', 'Yes completely dry'],
      },
      {
        questionEnglish: 'Can he respond if you tap his face, or is he totally unresponsive?',
        questionCallerLang: 'Bisa merespons saat dipanggil atau sama sekali tidak sadar?',
        purpose: 'Assess coma depth',
        expectedAnswers: ['Totally unconscious', 'Only groaning faintly', 'Unresponsive'],
      },
    ],
    criticalDos: [
      'Move patient into shade immediately.',
      'Douse body with cool water and fan continuously.',
      'Loosen collar and trousers to aid circulation.',
    ],
    fatalDonts: [
      'DO NOT pour liquid into mouth of unconscious person.',
      'DO NOT cover with heavy blankets.',
      'DO NOT give fever medicine like paracetamol for heat stroke.',
    ],
    recommendedHospitalCapability: 'Community Health Centre with emergency IV rehydration and cooling bay',
    specialDispatchInstruction: 'Dispatch BLS-45-B4 with cooling saline packs; alert Viralimalai CHC.',
  },

  // =========================================================================
  // 17. SPANISH - Agricultural Worker Chest Pain
  // =========================================================================
  {
    id: 'em-spanish-cardiac',
    category: 'Cardiovascular',
    emergencyType: 'Acute Angina Pectoris / Suspicion of Infarction',
    severity: 'Critical',
    confidencePercentage: 95,
    goldenHourWindowMinutes: 60,
    goldenHourReason: 'Coronary reperfusion therapy is most effective within the first 60-90 minutes of acute chest pain.',
    language: 'Spanish',
    group: 'Foreign',
    scriptName: 'Español',
    nativeText: '¡Mi padre se desmayó en el campo de cultivo! Se queja de un dolor aplastante en el pecho, le falta el aire y está sudando frío. Detrás de la escuela rural junto al tanque de agua.',
    transliteration: 'Mi padre se desmayo en el campo de cultivo! Se queja de un dolor aplastante en el pecho, le falta el aire y esta sudando frio. Detras de la escuela rural junto al tanque de agua.',
    englishTranslation: 'My father collapsed in crop field! Complaining of crushing chest pain, out of breath and breaking out in cold sweat. Behind rural school next to the water tank.',
    callerProfile: 'Daughter calling from field boundary',
    vocalToneNote: 'Urgent, worried, background wind',
    landmarkAnchors: ['Rural School Building', 'Large Water Tank', 'Farm dirt road'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Does the pain radiate to his left arm, neck, or jaw?',
        questionCallerLang: '¿El dolor se le extiende hacia el brazo izquierdo, cuello o mandíbula?',
        purpose: 'Cardiovascular radiation assessment',
        expectedAnswers: ['Yes, radiating to left arm', 'Pain in jaw and back', 'Central chest pressure'],
      },
      {
        questionEnglish: 'Is he able to sit upright and breathe comfortably?',
        questionCallerLang: '¿Puede mantenerse sentado y respirar mejor?',
        purpose: 'Assess orthopnea and pulmonary congestion',
        expectedAnswers: ['Difficulty breathing lying down', 'Sitting with support', 'Very short of breath'],
      },
    ],
    criticalDos: [
      'Keep patient resting quietly in half-sitting position.',
      'Loosen belt, collar, and tight clothing.',
      'Chew 300mg aspirin if available and not allergic.',
    ],
    fatalDonts: [
      'DO NOT let patient stand up or walk around.',
      'DO NOT give heavy water or food.',
      'DO NOT ignore as simple indigestion.',
    ],
    recommendedHospitalCapability: 'Hospital with Cardiac Cath Lab and Emergency Coronary Care Unit',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with 12-lead ECG monitor immediately.',
  },

  // =========================================================================
  // 18. FRENCH - Farmer Collapse with Agonal Breathing
  // =========================================================================
  {
    id: 'em-french-syncope',
    category: 'Stroke & Neurological',
    emergencyType: 'Acute Syncope with Respiratory Distress',
    severity: 'Critical',
    confidencePercentage: 95,
    goldenHourWindowMinutes: 30,
    goldenHourReason: 'Unconscious patient with abnormal respiration risks immediate cardiac arrest without stabilization.',
    language: 'French',
    group: 'Foreign',
    scriptName: 'Français',
    nativeText: 'Mon père s’est effondré dans le champ agricole, il est inconscient et sa respiration est très difficile et râlante! Nous sommes derrière l’école communale près du grand château d’eau!',
    transliteration: "Mon pere s'est effondre dans le champ agricole, il est inconscient et sa respiration est tres difficile et ralante! Nous sommes derriere l'ecole communale pres du grand chateau d'eau!",
    englishTranslation: 'My father collapsed in the agricultural field, he is unconscious and breathing with great difficulty and rattling sounds! We are behind the communal school near the large water tower!',
    callerProfile: 'Son calling with voice trembling in anxiety',
    vocalToneNote: 'Shaken, clear articulation despite high stress',
    landmarkAnchors: ['Communal School', 'Large Water Tower', 'Field dirt track'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is his airway obstructed by secretions or tongue?',
        questionCallerLang: 'Les voies respiratoires sont-elles encombrées par des sécrétions?',
        purpose: 'Identify upper airway obstruction',
        expectedAnswers: ['Sounds gurgling', 'Airway feels tight', 'Gasping sounds'],
      },
      {
        questionEnglish: 'Does he react if you pinch his shoulder firmly?',
        questionCallerLang: 'Réagit-il si vous lui pincez fermement l’épaule?',
        purpose: 'Assess motor responsiveness',
        expectedAnswers: ['No reaction at all', 'Small grimace only', 'Completely flaccid'],
      },
    ],
    criticalDos: [
      'Turn onto lateral recovery position to keep airway clear if breathing.',
      'Support head gently and ensure neck is straight.',
      'Monitor breathing continuously until ambulance arrives.',
    ],
    fatalDonts: [
      'DO NOT leave patient on their back if unconscious and vomiting.',
      'DO NOT give liquids or medications orally.',
      'DO NOT leave unattended.',
    ],
    recommendedHospitalCapability: 'Apex Referral Hospital with Emergency Resuscitation and ICU',
    specialDispatchInstruction: 'Dispatch ALS-45-A1; volunteer Murugan notified for immediate first response.',
  },

  // =========================================================================
  // 19. SWAHILI - Remote Field Worker Acute Collapse
  // =========================================================================
  {
    id: 'em-swahili-collapse',
    category: 'Environmental & Electrical',
    emergencyType: 'Acute Hypoxic Syncope & Severe Exhaustion',
    severity: 'Serious',
    confidencePercentage: 92,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Prompt bystander recovery position and airway protection prevents hypoxia and secondary brain injury.',
    language: 'Swahili',
    group: 'Foreign',
    scriptName: 'Kiswahili',
    nativeText: 'Baba ameanguka shambani ghafla, hazungumzi na anapumua kwa shida kubwa sana! Tuko nyuma ya shule ya kijiji karibu na tangi kubwa la maji, tafadhali leta msaada!',
    transliteration: 'Baba ameanguka shambani ghafla, hazungumzi na anapumua kwa shida kubwa sana! Tuko nyuma ya shule ya kijiji karibu na tangi kubwa la maji, tafadhali leta msaada!',
    englishTranslation: 'Father collapsed suddenly in field, unable to speak and breathing with great difficulty! We are behind village school near the large water tank, please send help!',
    callerProfile: 'Son reporting from rural farmland',
    vocalToneNote: 'Pleading, loud rural wind sound',
    landmarkAnchors: ['Village School Backwall', 'Large Water Tank', 'Farm path junction'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Can he open his eyes or move his hands when you call his name?',
        questionCallerLang: 'Je, anaweza kufungua macho au kusogeza mikono unapomwita?',
        purpose: 'Assess neurological responsiveness',
        expectedAnswers: ['No movement', 'Eyes closed tightly', 'Only groans'],
      },
      {
        questionEnglish: 'Is there any swelling or bite mark on his legs?',
        questionCallerLang: 'Kuna uvimbe wowote au alama ya kung’atwa mguuni?',
        purpose: 'Screen for hidden venomous bite',
        expectedAnswers: ['No bite marks visible', 'Legs look normal', 'Not sure'],
      },
    ],
    criticalDos: [
      'Move to shade and lay patient on side with mouth angled downward.',
      'Loosen clothing and fan fresh air.',
      'Check breathing every 2 minutes.',
    ],
    fatalDonts: [
      'DO NOT pour water into throat while unconscious.',
      'DO NOT crowd closely around patient.',
      'DO NOT leave lying flat on back.',
    ],
    recommendedHospitalCapability: 'Community Health Centre with Oxygen & Emergency Stabilization',
    specialDispatchInstruction: 'Dispatch BLS-45-B4; instruct local volunteer to carry O2 pack.',
  },

  // =========================================================================
  // 20. ARABIC - Agricultural Worker Sudden Loss of Consciousness
  // =========================================================================
  {
    id: 'em-arabic-unresponsive',
    category: 'Stroke & Neurological',
    emergencyType: 'Acute Unresponsive State / Suspected Cerebrovascular Event',
    severity: 'Critical',
    confidencePercentage: 96,
    goldenHourWindowMinutes: 60,
    goldenHourReason: 'Unresponsive state with respiratory compromise requires emergency airway stabilization within 60 minutes.',
    language: 'Arabic',
    group: 'Foreign',
    scriptName: 'العربية',
    nativeText: 'والدي سقط فجأة في الحقل الزراعي، فاقد للوعي تماماً ويتنفس بصعوبة بالغة ووجهه شاحب! الموقع خلف مدرسة القرية بجوار خزان المياه الكبير، أسرعوا بسيارة الإسعاف!',
    transliteration: 'Walidi saqata fajaatan fi al-haql al-ziraee, faqidal-waey tamamann wa yatanafasu bi suubah balighah wa wajhuh shahib! Al-mawqi khalf madrasat al-qaryah bijiwar khazzan al-miyah al-kabir!',
    englishTranslation: 'My father suddenly collapsed in agricultural field, totally unconscious and breathing with extreme difficulty, pale face! Behind village school next to large water tank, hurry with ambulance!',
    callerProfile: 'Son speaking with deep concern and urgency',
    vocalToneNote: 'Tense, emotional, background commotion',
    landmarkAnchors: ['Village School Back Gate', 'Large Water Reservoir', 'Farm tractor track'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Does he react when you pinch his earlobe or shout?',
        questionCallerLang: 'هل يستجيب عند المناداة عليه أو الضغط على شحمة أذنه؟',
        purpose: 'Consciousness level evaluation',
        expectedAnswers: ['No response at all', 'Very deep sleep-like state', 'Unconscious'],
      },
      {
        questionEnglish: 'Is there any blood or froth coming from his mouth or nose?',
        questionCallerLang: 'هل يخرج دم أو رغوة من فمه أو أنفه؟',
        purpose: 'Screen for seizure or pulmonary edema',
        expectedAnswers: ['Small white froth', 'No blood visible', 'Only saliva'],
      },
    ],
    criticalDos: [
      'Turn patient onto recovery position on their left side.',
      'Ensure neck is extended to keep tongue from blocking airway.',
      'Protect from heat and maintain shade.',
    ],
    fatalDonts: [
      'DO NOT try to feed water or dates to an unconscious person.',
      'DO NOT slap face or shake head violently.',
      'DO NOT delay calling for emergency transport.',
    ],
    recommendedHospitalCapability: 'Tertiary Hospital with ICU, CT Scan and Emergency Neurologist',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with emergency physician support.',
  },

  // =========================================================================
  // 21. PORTUGUESE - Plantation Collapse & Dyspnea
  // =========================================================================
  {
    id: 'em-portuguese-plantation',
    category: 'Cardiovascular',
    emergencyType: 'Acute Plantation Syncope & Cardiogenic Shock',
    severity: 'Critical',
    confidencePercentage: 94,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Rapid restoration of perfusion in cardiogenic shock avoids systemic organ failure.',
    language: 'Portuguese',
    group: 'Foreign',
    scriptName: 'Português',
    nativeText: 'Meu pai desmaiou na plantação, está totalmente desacordado, suando muito frio e com extrema falta de ar! Atrás da escola comunitária perto da grande caixa d’água!',
    transliteration: 'Meu pai desmaiou na plantacao, esta totalmente desacordado, suando muito frio e com extrema falta de ar! Atras da escola comunitaria perto da grande caixa d’agua!',
    englishTranslation: 'My father passed out on plantation, totally unconscious, sweating cold profusely with extreme shortness of breath! Behind community school near the large water tank!',
    callerProfile: 'Son calling in distress from plantation edge',
    vocalToneNote: 'Anxious, trembling, pleading',
    landmarkAnchors: ['Community School Fence', 'Large Water Tank', 'Plantation access road'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is his pulse palpable at the neck or wrist?',
        questionCallerLang: 'Você consegue sentir a pulsação dele no pescoço ou no pulso?',
        purpose: 'Check circulatory adequacy',
        expectedAnswers: ['Very faint and fast', 'Cannot feel wrist pulse', 'Faint neck pulse'],
      },
      {
        questionEnglish: 'Is he breathing with regular chest movements?',
        questionCallerLang: 'A respiração dele é regular com o peito subindo e descendo?',
        purpose: 'Check for respiratory arrest',
        expectedAnswers: ['Gasping irregularly', 'Very shallow breathing', 'Struggling for air'],
      },
    ],
    criticalDos: [
      'Position patient flat or with legs slightly elevated if pale.',
      'Keep head turned to side in case of vomiting.',
      'Provide continuous shade and loosen clothing.',
    ],
    fatalDonts: [
      'DO NOT give drinks or oral stimulants.',
      'DO NOT leave patient sitting upright if fainting.',
      'DO NOT delay seeking medical transport.',
    ],
    recommendedHospitalCapability: 'Tertiary Emergency Center with Cardiac Monitoring & Resuscitation',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with ALS equipment.',
  },

  // =========================================================================
  // 22. GERMAN - Field Worker Respiratory Collapse
  // =========================================================================
  {
    id: 'em-german-dyspnea',
    category: 'Stroke & Neurological',
    emergencyType: 'Severe Dyspnea & Acute Unresponsive Collapse',
    severity: 'Serious',
    confidencePercentage: 93,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Acute respiratory insufficiency requires supplemental oxygen within 45 minutes to prevent hypoxic arrest.',
    language: 'German',
    group: 'Foreign',
    scriptName: 'Deutsch',
    nativeText: 'Mein Vater ist auf dem Feld zusammengebrochen, er ist nicht mehr ansprechbar und hat schwerste Atemnot! Hinter der Dorfschule beim alten Wasserturm, bitte schicken Sie sofort einen Krankenwagen!',
    transliteration: 'Mein Vater ist auf dem Feld zusammengebrochen, er ist nicht mehr ansprechbar und hat schwerste Atemnot! Hinter der Dorfschule beim alten Wasserturm...',
    englishTranslation: 'My father collapsed in field, unalert with severe respiratory distress! Behind village school by old water tower, please send ambulance immediately!',
    callerProfile: 'Family member speaking clearly with urgency',
    vocalToneNote: 'Disciplined, urgent, background tractor noise',
    landmarkAnchors: ['Village School', 'Old Water Tower', 'Farm path'],
    gpsCoordinates: { lat: 10.6455, lng: 78.5912 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Can you hear whistling or gurgling sounds in the chest?',
        questionCallerLang: 'Hören Sie pfeifende oder rasselnde Geräusche beim Atmen?',
        purpose: 'Differentiate bronchospasm vs pulmonary edema',
        expectedAnswers: ['Heavy rattling sounds', 'Wheezing whistling sound', 'Short gasps'],
      },
      {
        questionEnglish: 'Is the patient conscious enough to follow finger movements?',
        questionCallerLang: 'Reagiert er auf Ansprechen oder Berührung?',
        purpose: 'Assess neurological alertness',
        expectedAnswers: ['No reaction at all', 'Completely unconscious', 'Only groaning'],
      },
    ],
    criticalDos: [
      'Place in recovery position on side to prevent tongue swallowing.',
      'Keep head gently tilted back to open airway.',
      'Ensure comfortable temperature and shade.',
    ],
    fatalDonts: [
      'DO NOT give fluids orally.',
      'DO NOT leave unattended on back.',
      'DO NOT administer unknown tablets.',
    ],
    recommendedHospitalCapability: 'Hospital with Intensive Care Unit and Mechanical Ventilation',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with emergency oxygen.',
  },

  // =========================================================================
  // 23. VIETNAMESE - Water Pump Electrocution near Canal
  // =========================================================================
  {
    id: 'em-vietnamese-electric',
    category: 'Environmental & Electrical',
    emergencyType: 'Irrigation Electric Shock & Submersion Risk',
    severity: 'Critical',
    confidencePercentage: 97,
    goldenHourWindowMinutes: 15,
    goldenHourReason: 'Electrical shock with respiratory arrest needs prompt CPR within 5-10 minutes to restore sinus rhythm.',
    language: 'Vietnamese',
    group: 'Foreign',
    scriptName: 'Tiếng Việt',
    nativeText: 'Cha tôi bị điện giật từ máy bơm nước tưới tiêu rơi xuống mép kênh! Bất tỉnh, ngưng thở, người tím tái! Cầu bê tông gần cống lấy nước thôn!',
    transliteration: 'Cha toi bi dien giat tu may bom nuoc tuoi tieu roi xuong mep kenh! Bat tinh, ngung tho, nguoi tim tai! Cau be tong gan cong lay nuoc thon!',
    englishTranslation: 'My father got electric shock from irrigation water pump and fell at canal edge! Unconscious, stopped breathing, turning blue! Concrete bridge near village sluice gate!',
    callerProfile: 'Son screaming from canal bank',
    vocalToneNote: 'Frantic, breathless, rushing water sounds',
    landmarkAnchors: ['Canal Concrete Bridge', 'Village Sluice Gate', 'Irrigation pump shelter'],
    gpsCoordinates: { lat: 10.6620, lng: 78.6080 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Is power disconnected and is the victim out of the water?',
        questionCallerLang: 'Đã ngắt điện hoàn toàn và kéo nạn nhân lên khỏi mép nước chưa?',
        purpose: 'Ensure rescuer safety from live electrical water conduction',
        expectedAnswers: ['Power is cut completely', 'Pulled safely onto dry bank', 'Safe now'],
      },
      {
        questionEnglish: 'Are chest compressions started on hard flat ground?',
        questionCallerLang: 'Đã bắt đầu ép tim trên nền đất phẳng chưa?',
        purpose: 'Verify immediate CPR execution',
        expectedAnswers: ['Starting compressions now', 'Pushed down on center of chest', 'Need guidance'],
      },
    ],
    criticalDos: [
      'Disconnect circuit breaker or pull with dry bamboo before touching.',
      'Begin hard and fast chest compressions immediately (100-120/min).',
      'Keep airway tilted gently back.',
    ],
    fatalDonts: [
      'DO NOT step in water with live electrical current.',
      'DO NOT stop chest compressions.',
      'DO NOT pour water on victim.',
    ],
    recommendedHospitalCapability: 'Hospital with Cardiac Resuscitation, Defibrillator & ICU',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with defibrillator and notify volunteer Anand with rescue ropes.',
  },

  // =========================================================================
  // 24. TAGALOG - Provincial Motorcycle Crash with Compound Fracture
  // =========================================================================
  {
    id: 'em-tagalog-trauma',
    category: 'Trauma & Hemorrhage',
    emergencyType: 'Open Compound Fracture & Heavy Hemorrhage',
    severity: 'Serious',
    confidencePercentage: 95,
    goldenHourWindowMinutes: 45,
    goldenHourReason: 'Open fractures with heavy bleeding require wound stabilization and surgical debridement within golden window.',
    language: 'Tagalog',
    group: 'Foreign',
    scriptName: 'Tagalog / Filipino',
    nativeText: 'Bumangga ang motorsiklo sa gilid ng kanal! Lumabas ang buto sa binti ng kasama ko at malakas ang agos ng dugo, nawawalan siya ng malay! Sa likod ng lumang tulay ng bukid!',
    transliteration: 'Bumangga ang motorsiklo sa gilid ng kanal! Lumabas ang buto sa binti ng kasama ko at malakas ang agos ng dugo...',
    englishTranslation: 'Motorcycle crashed on canal embankment! Bone is sticking out of friend’s leg with heavy flowing bleeding, losing consciousness! Behind old farm bridge!',
    callerProfile: 'Fellow rider in state of shock',
    vocalToneNote: 'Agitated, rapid, sounds of wind and engine idling',
    landmarkAnchors: ['Old Farm Bridge', 'Canal Embankment', 'Mile marker #7'],
    gpsCoordinates: { lat: 10.6190, lng: 78.5530 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Have you applied pressure with a clean cloth above and around the wound?',
        questionCallerLang: 'Nadiinan mo ba ng malinis na tela ang dumudugong bahagi?',
        purpose: 'Assess hemorrhage control',
        expectedAnswers: ['Pressing hard with shirt', 'Bleeding through cloth', 'Bone is protruding'],
      },
      {
        questionEnglish: 'Is he able to answer questions or turning pale and cold?',
        questionCallerLang: 'Nakakasagot pa ba siya o namumutla at nilalamig na?',
        purpose: 'Screen for early hypovolemic shock',
        expectedAnswers: ['Very pale and sweaty', 'Fainting', 'Weak voice'],
      },
    ],
    criticalDos: [
      'Apply direct continuous pressure with clean cloth around the wound.',
      'Immobilize the leg with a stick or board without trying to push the bone back.',
      'Cover with dry cloth and keep warm.',
    ],
    fatalDonts: [
      'DO NOT attempt to push protruding bone back into wound.',
      'DO NOT wash compound fracture with dirty canal water.',
      'DO NOT give anything to drink.',
    ],
    recommendedHospitalCapability: 'Level-1 Trauma & Orthopedic Surgery Center with Blood Bank',
    specialDispatchInstruction: 'Dispatch BLS-45-B4 with splints and pressure dressings.',
  },

  // =========================================================================
  // 25. SEVERE ANAPHYLAXIS FROM HORNET SWARM (Major rural issue #13)
  // =========================================================================
  {
    id: 'em-anaphylaxis-telugu',
    category: 'Venom & Toxicology',
    emergencyType: 'Multiple Hornet Swarm Attack with Acute Anaphylactic Angioedema',
    severity: 'Critical',
    confidencePercentage: 98,
    goldenHourWindowMinutes: 15,
    goldenHourReason: 'Laryngeal edema and bronchospasm from multiple stings causes fatal asphyxiation without immediate Epinephrine/Adrenaline within 15-20 minutes.',
    language: 'Telugu',
    group: 'Indian',
    scriptName: 'తెలుగు',
    nativeText: 'చెరువు గట్టున తుమ్మ చెట్టు మీద ఉన్న కందిరీగల తుట్టె రేగింది! తమ్ముడిని 30 కందిరీగలు కుట్టాయి, ముఖం వాచి గొంతు పూడిపోయింది, శ్వాస ఆడట్లేదు! జవహర్ బస్టాప్ వెనక!',
    transliteration: 'Cheruvu gattuna thumma chettu meeda unna kandireegala thutte regindi! Thammudini 30 kandireegalu kuttayi, mukham vaachi gonthu poodipoyindi, shwaasa aadatledhu! Jawahar bus stop venaka!',
    englishTranslation: 'Hornet nest on the acacia tree by lake was disturbed! Over 30 hornets stung my younger brother, face is swollen shut, throat is closing, he cannot breathe! Behind Jawahar bus stop!',
    callerProfile: 'Brother running away with victim from insect swarm',
    vocalToneNote: 'Breathless, yelling, panicked slapping sounds',
    landmarkAnchors: ['Jawahar Bus Stop Shelter', 'Acacia tree cluster', 'Lake bund culvert'],
    gpsCoordinates: { lat: 10.6550, lng: 78.5870 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Can he swallow saliva or is there high-pitched whistling (stridor) when inhaling?',
        questionCallerLang: 'ఉమ్మి మింగగలుగుతున్నాడా లేదా పీల్చేటప్పుడు పిల్లికూతలు వినపడుతున్నాయా?',
        purpose: 'Detect critical laryngeal edema and impending complete airway closure',
        expectedAnswers: ['High whistling stridor', 'Cannot speak or swallow', 'Drooling saliva'],
      },
      {
        questionEnglish: 'Has he broken out in hives or feeling dizzy like he will faint?',
        questionCallerLang: 'ఒళ్ళంతా దద్దుర్లు వచ్చి కళ్ళు తిరిగి పడిపోతున్నాడా?',
        purpose: 'Verify systemic anaphylactic shock with vascular collapse',
        expectedAnswers: ['Hives everywhere', 'Very dizzy and pale', 'Fainting in my arms'],
      },
    ],
    criticalDos: [
      'Keep patient sitting upright leaning slightly forward to ease breathing.',
      'Scrape off visible stingers immediately with fingernail or edge of plastic card (do not squeeze venoms sacs).',
      'Rush to nearest clinic for emergency intramuscular Epinephrine (Adrenaline).',
    ],
    fatalDonts: [
      'DO NOT lay patient flat if struggling to breathe (worsens suffocation).',
      'DO NOT squeeze stingers with tweezers (injects more venom into bloodstream).',
      'DO NOT delay transport to apply mud or kerosene.',
    ],
    recommendedHospitalCapability: 'Emergency Primary Centre or Hospital with Epinephrine, Hydrocortisone & Intubation kit',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with Epinephrine auto-injector; alert Viralimalai CHC emergency room.',
  },

  // =========================================================================
  // 26. HIGH PALM TREE FALL / SPINAL INJURY (Major rural issue #14)
  // =========================================================================
  {
    id: 'em-fall-spinal-tamil',
    category: 'Trauma & Hemorrhage',
    emergencyType: 'High Fall from Palmyra/Coconut Palm (Suspected Cervical Spinal Injury)',
    severity: 'Serious',
    confidencePercentage: 96,
    goldenHourWindowMinutes: 60,
    goldenHourReason: 'Unstable cervical or thoracic spinal fractures will cause permanent quadriplegia if the patient is carried improperly without a rigid spine board.',
    language: 'Tamil',
    group: 'Indian',
    scriptName: 'தமிழ்',
    nativeText: 'தென்னை மரத்துல இருந்து 25 adi uyarthula irundhu nazhuvi vizhundhuttaaru! Kaal kai unarchi illa, kazhuthu bayangarama valikkudhunu kathuraaru! Keelapatti Murugan kovil thennanthoppu!',
    transliteration: 'Thennai marathula irundhu 25 adi uyarthula irundhu nazhuvi vizhundhuttaaru! Kaal kai unarchi illa, kazhuthu bayangarama valikkudhunu kathuraaru! Keelapatti Murugan kovil thennanthoppu!',
    englishTranslation: 'Fell from 25 feet high while climbing coconut tree! No feeling or movement in legs and arms, screaming that neck has excruciating pain! Coconut grove behind Keelapatti Murugan temple!',
    callerProfile: 'Fellow plantation worker holding bystanders back',
    vocalToneNote: 'Shocked, cautious, background voices shouting "lift him up!"',
    landmarkAnchors: ['Keelapatti Murugan Temple', 'Central Coconut Grove', 'Borewell pump room'],
    gpsCoordinates: { lat: 10.6410, lng: 78.5880 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Can the patient wiggle their toes or feel you touching their feet?',
        questionCallerLang: 'கால் விரல்களை அசைக்க முடிகிறதா? தொட்டால் உணர்ச்சி தெரிகிறதா?',
        purpose: 'Screen for motor and sensory paralysis indicating spinal cord transection',
        expectedAnswers: ['Cannot move toes at all', 'Legs are completely numb', 'Hands tingling weakly'],
      },
      {
        questionEnglish: 'Are bystanders trying to lift or bend the patient’s neck?',
        questionCallerLang: 'யாராவது கழுத்தை வளைத்து தூக்க முயற்சி செய்கிறார்களா?',
        purpose: 'Strictly prohibit flexion-extension movement of unstable spine',
        expectedAnswers: ['Told everyone not to touch', 'He is lying flat', 'Holding neck straight'],
      },
    ],
    criticalDos: [
      'Keep patient lying completely flat on back and DO NOT move their neck or back.',
      'Place rolled blankets, towels, or bricks on BOTH sides of the head to prevent neck turning.',
      'If vomiting occurs, log-roll the entire body like a solid log as one single unit with 3 people.',
    ],
    fatalDonts: [
      'DO NOT bend the neck, lift by arms, or carry in a hammock/cloth (will sever damaged spinal cord!).',
      'DO NOT prop a pillow or cloth under the head.',
      'DO NOT allow the patient to attempt sitting up.',
    ],
    recommendedHospitalCapability: 'Level-1 Tertiary Spine & Neuro-Trauma Institute with MRI & CT',
    specialDispatchInstruction: 'Dispatch ALS-45-A1 with rigid cervical collar and long spine board; instruct volunteer Anand with pickup truck.',
  },

  // =========================================================================
  // 27. RABID STRAY DOG DEEP BITE (Major rural issue #15)
  // =========================================================================
  {
    id: 'em-rabies-tamil',
    category: 'Venom & Toxicology',
    emergencyType: 'Suspected Rabid Stray Dog Deep Category-III Facial & Forearm Lacerations',
    severity: 'Serious',
    confidencePercentage: 94,
    goldenHourWindowMinutes: 120,
    goldenHourReason: 'Immediate 15-minute vigorous washing with soap and running water reduces rabies viral load by 80-90% before anti-rabies immunoglobulin (RIG) infiltration.',
    language: 'Tamil',
    group: 'Indian',
    scriptName: 'தமிழ்',
    nativeText: 'வெறிநாய் கடிச்சு குதறிடுச்சு! தம்பிக்கு முகத்திலும் கையிலும் ஆழமான பற்காயம், ரத்தம் பீச்சிட்டு ஓடுது! நாய் வாய்ல எச்சில் ஒழுகி வெறியா சுத்துது! கீழப்பட்டி பஞ்சாயத்து போர்வெல் பைப்!',
    transliteration: 'Verinaai kadichu kudharidichu! Thambikku mukathilum kaiyilum aazhamaana parkaayam, ratham peechittu odudhu! Naai vaayla echil ozhugi veriyaa suthudhu! Keelapatti panchayat borewell pipe!',
    englishTranslation: 'Suspected rabid stray dog mauled my brother! Deep puncture wounds on face and forearm, bleeding heavily! Dog is roaming around foaming at mouth! At the Keelapatti panchayat borewell pipe!',
    callerProfile: 'Older brother defending wounded boy with a stick',
    vocalToneNote: 'Loud, barking sounds in background, child crying violently',
    landmarkAnchors: ['Panchayat Borewell Continuous Water Pipe', 'Keelapatti Bus Shelter', 'Old banyan tree'],
    gpsCoordinates: { lat: 10.6430, lng: 78.5860 },
    vitalTriageQuestions: [
      {
        questionEnglish: 'Have you put the bite wounds directly under the running water pipe with soap right now?',
        questionCallerLang: 'ஓடும் குழாய் தண்ணீரில் சோப்பு போட்டு காயத்தை உடனடியாக 15 நிமிடம் கழுவுகிறீர்களா?',
        purpose: 'Enforce mandatory WHO Category-III rabies post-exposure prophylaxis washing',
        expectedAnswers: ['Washing under pipe right now', 'Need to know how long', 'Washed once with water'],
      },
      {
        questionEnglish: 'Are the tooth punctures deep and bleeding freely from the face or neck?',
        questionCallerLang: 'பற்கள் ஆழமாக பதிந்து முகத்திலோ கழுத்திலோ பலத்த ரத்த காயம் உள்ளதா?',
        purpose: 'Categorize as WHO Class III requiring urgent Rabies Immunoglobulin (RIG)',
        expectedAnswers: ['Deep puncture on cheek and hand', 'Continuous bleeding', 'Flesh torn'],
      },
    ],
    criticalDos: [
      'IMMEDIATELY wash the wound under running tap water with laundry/bath soap for AT LEAST 15 CONTINUOUS MINUTES.',
      'Pat dry gently with clean cloth and apply povidone-iodine or spirit if available.',
      'Rush to hospital for Human Rabies Immunoglobulin (HRIG) infiltrated directly into wound + Anti-Rabies Vaccine (ARV).',
    ],
    fatalDonts: [
      'DO NOT apply turmeric, lime, chili powder, cow dung, or plant juices to animal bite wounds.',
      'DO NOT bandage or suture the wound tightly (traps the rabies virus inside neural endings).',
      'DO NOT wait for symptoms to appear (once rabies symptoms begin, case fatality rate is 100%).',
    ],
    recommendedHospitalCapability: 'District Headquarters Hospital or Medical College with Rabies Immunoglobulin (RIG) & Anti-Rabies Vaccine (ARV)',
    specialDispatchInstruction: 'Dispatch BLS-45-B4; alert Trichy Govt Hospital anti-rabies vaccination cell.',
  },
];

// Helper search & filter functions
export function filterEmergencyDataset(options: {
  searchQuery?: string;
  category?: string;
  languageGroup?: 'all' | 'Indian' | 'Foreign';
  severity?: string;
}): EmergencyScenario[] {
  let results = [...COMPREHENSIVE_EMERGENCY_DATASET];

  if (options.category && options.category !== 'all') {
    results = results.filter((s) => s.category === options.category);
  }

  if (options.languageGroup && options.languageGroup !== 'all') {
    results = results.filter((s) => s.group === options.languageGroup);
  }

  if (options.severity && options.severity !== 'all') {
    results = results.filter((s) => s.severity === options.severity);
  }

  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    results = results.filter(
      (s) =>
        s.emergencyType.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.englishTranslation.toLowerCase().includes(q) ||
        s.nativeText.toLowerCase().includes(q) ||
        (s.transliteration && s.transliteration.toLowerCase().includes(q)) ||
        s.landmarkAnchors.some((lm) => lm.toLowerCase().includes(q)) ||
        s.criticalDos.some((d) => d.toLowerCase().includes(q)) ||
        s.fatalDonts.some((d) => d.toLowerCase().includes(q))
    );
  }

  return results;
}

// =========================================================================
// Dynamic Matcher: Extracts clinical protocol from the person's spoken call
// =========================================================================
export function matchClinicalProtocol(spokenOrText: string): Partial<EmergencyScenario> | null {
  if (!spokenOrText || !spokenOrText.trim()) return null;
  const t = spokenOrText.toLowerCase();

  // Snakebite patterns
  if (
    t.includes('பாம்பு') ||
    t.includes('paambu') ||
    t.includes('snake') ||
    t.includes('viper') ||
    t.includes('सांप') ||
    t.includes('పాము') ||
    t.includes('bite') ||
    t.includes('venom')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-snake-tamil') || null;
  }

  // Cardiac / Chest Pain patterns
  if (
    t.includes('மார்பு') ||
    t.includes('marbu') ||
    t.includes('seene') ||
    t.includes('सीने') ||
    t.includes('dard') ||
    t.includes('दर्द') ||
    t.includes('heart') ||
    t.includes('chest') ||
    t.includes('ఛాతీ') ||
    t.includes('cardiac') ||
    t.includes('pecho') ||
    t.includes('심장')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-cardiac-hindi') || null;
  }

  // Stroke / FAST / Paralysis patterns
  if (
    t.includes('மூதி') ||
    t.includes('mouth') ||
    t.includes('stroke') ||
    t.includes('మూతి') ||
    t.includes('ముఖం') ||
    t.includes('paralysis') ||
    t.includes('slurred') ||
    t.includes('hemiplegia') ||
    t.includes('fast')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-stroke-telugu') || null;
  }

  // Machinery / Tractor / Amputation / Arterial Hemorrhage
  if (
    t.includes('machine') ||
    t.includes('thresher') ||
    t.includes('ಯಂತ್ರ') ||
    t.includes('amputation') ||
    t.includes('tractor') ||
    t.includes('bleed') ||
    t.includes('ರಕ್ತ') ||
    t.includes('cut off') ||
    t.includes('hemorrhage')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-trauma-kannada') || null;
  }

  // Pesticide / Poisoning patterns
  if (
    t.includes('பூச்சி மருந்து') ||
    t.includes('কীটনাশক') ||
    t.includes('keetnashok') ||
    t.includes('pesticide') ||
    t.includes('poison') ||
    t.includes('froth') ||
    t.includes('फ्रेना') ||
    t.includes('organophosphate')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-tox-bengali') || null;
  }

  // Electric Shock patterns
  if (
    t.includes('கரண்ட்') ||
    t.includes('current') ||
    t.includes('shock') ||
    t.includes('electric') ||
    t.includes('motor') ||
    t.includes('மின்சாரம்') ||
    t.includes('pump')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-electric-tamil') || null;
  }

  // Pediatric Choking patterns
  if (
    t.includes('குழந்தை') ||
    t.includes('choking') ||
    t.includes('मुलाने') ||
    t.includes('swallowed') ||
    t.includes('toddler') ||
    t.includes('infant') ||
    t.includes('blue')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-peds-marathi') || null;
  }

  // Maternal / Delivery / Labor patterns
  if (
    t.includes('பிரசவம்') ||
    t.includes('labor') ||
    t.includes('pregnant') ||
    t.includes('പ്രസവ') ||
    t.includes('eclampsia') ||
    t.includes('convulsion') ||
    t.includes('delivery')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-maternal-malayalam') || null;
  }

  // Drowning / Well submersion
  if (
    t.includes('கிணறு') ||
    t.includes('kinaru') ||
    t.includes('well') ||
    t.includes('drown') ||
    t.includes('submersion') ||
    t.includes('pond')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-drown-tamil') || null;
  }

  // Burn patterns
  if (
    t.includes('தீ') ||
    t.includes('burn') ||
    t.includes('fire') ||
    t.includes('आग') ||
    t.includes('gas') ||
    t.includes('cylinder')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-burns-hindi') || null;
  }

  // Heatstroke patterns
  if (
    t.includes('வெயில்') ||
    t.includes('heat') ||
    t.includes('sun') ||
    t.includes('ಬಿಸಿಲು') ||
    t.includes('sweat') ||
    t.includes('fainted')
  ) {
    return COMPREHENSIVE_EMERGENCY_DATASET.find((s) => s.id === 'em-heat-kannada') || null;
  }

  // Default fallback if general match
  return COMPREHENSIVE_EMERGENCY_DATASET[0];
}

const STORAGE_KEY_COLLECTED_CALLS = 'goldenhour_collected_calls_v1';

export function getStoredCollectedCalls(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLLECTED_CALLS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCollectedCall(record: any): void {
  try {
    const existing = getStoredCollectedCalls();
    const updated = [record, ...existing.filter((r) => r.id !== record.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_COLLECTED_CALLS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save collected call record:', err);
  }
}
