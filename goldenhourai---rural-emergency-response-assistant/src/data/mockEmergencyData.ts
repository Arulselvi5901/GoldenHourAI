export interface Ambulance {
  id: string;
  name: string;
  unitCode: string;
  type: 'ALS (Advanced Life Support)' | 'BLS (Basic Life Support)';
  status: 'Available' | 'Busy';
  lat: number;
  lng: number;
  baseStation: string;
  driverName: string;
  paramedic: string;
  contact: string;
  equipment: string[];
}

export interface Hospital {
  id: string;
  name: string;
  level: string;
  lat: number;
  lng: number;
  capabilities: string[];
  bedCapacity: number;
  icuBedsAvailable: number;
  bloodBankUnitsAvailable: number;
  cathLabActive: boolean;
  traumaSurgeonOnCall: boolean;
  contact: string;
  address: string;
}

export interface CommunityVolunteer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  village: string;
  vehicle: string;
  training: string;
  kit: string[];
  responseTimeMinutes: number;
  phone: string;
}

export interface SampleMessage {
  id: string;
  language: string;
  label: string;
  preview: string;
  text: string;
  category: string;
  group: 'Indian' | 'Foreign';
  nativeScript?: string;
  transliteration?: string;
  englishMeaning: string;
  defaultCoords: { lat: number; lng: number };
}

export const SAMPLE_MESSAGES: SampleMessage[] = [
  // --- 5 INDIAN LANGUAGES ---
  {
    id: 'sample-tamil',
    language: 'Tamil',
    group: 'Indian',
    label: 'Tamil (தமிழ்)',
    preview: 'appa vayalla vilundhutaaru, pesala...',
    nativeScript: 'அப்பா வயல்ல விழுந்துட்டாரு, பேசல, மூச்சு சரியா வரல. கீழப்பட்டி அரசு பள்ளி பின்னாடி வாட்டர் டேங்க் பக்கத்துல',
    transliteration: 'appa vayalla vilundhutaaru, pesala, muchu sariya varala. Keelapatti government school pinnadi water tank pakkathula',
    text: 'appa vayalla vilundhutaaru, pesala, muchu sariya varala. Keelapatti government school pinnadi water tank pakkathula',
    englishMeaning: 'Father collapsed in agricultural field, unresponsive, breathing difficulty behind Keelapatti govt school water tank.',
    category: 'Respiratory / Unconscious / Heatstroke',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-hindi',
    language: 'Hindi',
    group: 'Indian',
    label: 'Hindi (हिन्दी)',
    preview: 'meri maa ko seene mein dard hai...',
    nativeScript: 'मेरी माँ को सीने में तेज दर्द है, पसीना आ रहा है, मंदिर के पास वाला घर, रामपुर गाँव',
    transliteration: 'meri maa ko seene mein tej dard hai, pasina aa raha hai, mandir ke paas wala ghar, Rampur gaon',
    text: 'meri maa ko seene mein dard hai, pasina aa raha hai, mandir ke paas wala ghar, Rampur gaon',
    englishMeaning: 'Mother having acute crushing chest pain, sweating profusely, house near the temple in Rampur village.',
    category: 'Acute Cardiac / Heart Attack',
    defaultCoords: { lat: 10.6310, lng: 78.5720 },
  },
  {
    id: 'sample-telugu',
    language: 'Telugu',
    group: 'Indian',
    label: 'Telugu (తెలుగు)',
    preview: 'mā nānna polamlo padi pōyāru...',
    nativeScript: 'మా నాన్న పొలంలో పడిపోయారు, స్పృహ లేదు, ఛాతీలో తీవ్రమైన నొప్పి. కొత్త చెరువు గట్టు దగ్గర రావి చెట్టు కింద',
    transliteration: 'mā nānna polamlo padi pōyāru, spruha lēdu, chātīlo tīvramaina noppi. Kotha cheruvu gattu daggara rāvi chettu kinda',
    text: 'mā nānna polamlo padi pōyāru, spruha lēdu, chātīlo tīvramaina noppi. Kotha cheruvu gattu daggara rāvi chettu kinda',
    englishMeaning: 'Father collapsed in field, unconscious, severe chest pain under the peepal tree near the new lake bund.',
    category: 'Cardiac Arrest / Unresponsive',
    defaultCoords: { lat: 10.6520, lng: 78.5830 },
  },
  {
    id: 'sample-kannada',
    language: 'Kannada',
    group: 'Indian',
    label: 'Kannada (ಕನ್ನಡ)',
    preview: 'tande holadalli biddu biddaare...',
    nativeScript: 'ತಂದೆ ಹೊಲದಲ್ಲಿ ಬಿದ್ದು ಬಿದ್ದಿದ್ದಾರೆ, ಮಾತು ಬರುತ್ತಿಲ್ಲ, ಉಸಿರಾಟ ತುಂಬಾ ಕಷ್ಟ. ಹಳೆಯ ಆಲದ ಮರ ಹತ್ತಿರದ ಪೆಟ್ರೋಲ್ ಬಂಕ್ ಹಿಂಭಾಗ',
    transliteration: 'tande holadalli biddu biddaare, maatu baruttilla, usiraata tumba kasta. Haleya aalada mara hattirada petrol bunk himbhaaga',
    text: 'tande holadalli biddu biddaare, maatu baruttilla, usiraata tumba kasta. Haleya aalada mara hattirada petrol bunk himbhaaga',
    englishMeaning: 'Father collapsed in farmland, unable to speak, heavy gasping breath behind the petrol bunk near the big banyan tree.',
    category: 'Respiratory Failure / Syncope',
    defaultCoords: { lat: 10.6220, lng: 78.5480 },
  },
  {
    id: 'sample-bengali',
    language: 'Bengali',
    group: 'Indian',
    label: 'Bengali (বাংলা)',
    preview: 'baba maathe pore gechhen, kotha bolchhen na...',
    nativeScript: 'বাবা মাঠে পড়ে গেছেন, কথা বলছেন না, বুকে ভীষণ ব্যথা আর নিঃশ্বাস নিতে পারছেন না। শনির মন্দিরের পেছনে পুকুরের পাড়ে',
    transliteration: 'baba maathe pore gechhen, kotha bolchhen na, buke bishon byatha aar nishwas nite parchhen na. Shonir mandir-er pichhone pukur-er paare',
    text: 'baba maathe pore gechhen, kotha bolchhen na, buke bishon byatha. Shonir mandir-er pichhone pukur-er paare',
    englishMeaning: 'Father collapsed in field, unresponsive, severe chest pain by the village pond behind the Shani temple.',
    category: 'Acute Myocardial Ischemia',
    defaultCoords: { lat: 10.6380, lng: 78.5660 },
  },

  // --- 10 FOREIGN LANGUAGES (Including Chinese, Korean, Japanese) ---
  {
    id: 'sample-chinese',
    language: 'Chinese (Mandarin)',
    group: 'Foreign',
    label: 'Chinese (Mandarin / 中文)',
    preview: '我父亲在农田里晕倒了...',
    nativeScript: '我父亲在稻田里晕倒了，没有意识，呼吸非常微弱。位置在老榕树旁边、村委会大水塔后面，请救护车快来！',
    transliteration: 'Wǒ fùqīn zài dàotián lǐ yūndǎole, méiyǒu yìshí, hūxī fēicháng wēiruò. Wèizhì zài lǎo róngshù pángbiān, cūn wěihuì dà shuǐtǎ hòumiàn, qǐng jiùhùchē kuài lái!',
    text: '我父亲在稻田里晕倒了，没有意识，呼吸非常微弱。位置在老榕树旁边、村委会大水塔后面',
    englishMeaning: 'Father fainted in rice paddy, unconscious, extremely faint breathing beside old banyan tree behind village water tower.',
    category: 'Syncope / Critical Hypoxia',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-japanese',
    language: 'Japanese',
    group: 'Foreign',
    label: 'Japanese (Nihongo / 日本語)',
    preview: '父が畑で急に倒れて意識がありません...',
    nativeScript: '父が畑で急に倒れて意識がありません。呼吸が苦しそうで話せません。古い神社の鳥居の先、大きな農業用給水塔のすぐ裏です。',
    transliteration: 'Chichi ga hatake de kyū ni taorete ishiki ga arimasen. Kokyū ga kurushisō de hanasemasen. Furui jinja no torii no saki, ōkina nōgyō-yō kyūsuitō no sugu ura desu.',
    text: '父が畑で急に倒れて意識がありません。息が苦しそうです。古い神社の鳥居の先、大きな給水塔の裏です',
    englishMeaning: 'Father suddenly collapsed in the field with loss of consciousness and labored breathing past the old shrine gate behind the water tower.',
    category: 'Acute Respiratory Distress / Syncope',
    defaultCoords: { lat: 10.6310, lng: 78.5720 },
  },
  {
    id: 'sample-korean',
    language: 'Korean',
    group: 'Foreign',
    label: 'Korean (Hangul / 한국어)',
    preview: '논에서 아버지가 쓰러지셨는데 의식이 없고...',
    nativeScript: '논에서 아버지가 갑자기 쓰러지셨는데 의식이 없고 숨을 헐떡입니다. 마을 정자나무 지나서 오래된 급수탑 바로 뒤편입니다. 도와주세요!',
    transliteration: 'Non-eseo abeojiga gapjagi sseureojisyeossneunde uisigi eopgo sumeul heoltteogimnida. Maeul jeongjanamu jinaseo oraedoen geupsutap baro dwipyeon-imnida. Dowajuseyo!',
    text: '논에서 아버지가 갑자기 쓰러지셨는데 의식이 없고 숨을 헐떡입니다. 마을 정자나무 지나서 오래된 급수탑 바로 뒤편입니다',
    englishMeaning: 'Father suddenly collapsed in the rice field, unconscious and gasping for breath past the village pavilion tree behind the old water tower.',
    category: 'Agonal Respiration / Cardiac Event',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-bahasa',
    language: 'Bahasa Indonesia',
    group: 'Foreign',
    label: 'Bahasa Indonesia',
    preview: 'Ayah pingsan di sawah, tidak sadar...',
    nativeScript: 'Ayah pingsan di sawah, tidak sadar dan sesak napas berat. Lokasinya di belakang pohon beringin dekat tangki air sekolah desa.',
    transliteration: 'Ayah pingsan di sawah, tidak sadar dan sesak napas berat. Lokasinya di belakang pohon beringin dekat tangki air sekolah desa.',
    text: 'Ayah pingsan di sawah, tidak sadar dan sesak napas berat. Lokasinya di belakang pohon beringin dekat tangki air sekolah desa',
    englishMeaning: 'Father collapsed in paddy field, unconscious and severe shortness of breath behind banyan tree near village school water tank.',
    category: 'Respiratory Failure / Heatstroke',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-spanish',
    language: 'Spanish',
    group: 'Foreign',
    label: 'Spanish (Español)',
    preview: 'Mi padre se desmayó en el campo...',
    nativeScript: 'Mi padre se desmayó en el campo de cultivo, no reacciona y respira con mucha dificultad. Estamos detrás de la escuela rural junto al tanque de agua.',
    transliteration: 'Mi padre se desmayó en el campo de cultivo, no reacciona y respira con mucha dificultad. Estamos detrás de la escuela rural junto al tanque de agua.',
    text: 'Mi padre se desmayó en el campo de cultivo, no reacciona y respira con mucha dificultad. Estamos detrás de la escuela rural junto al tanque de agua',
    englishMeaning: 'Father fainted in crop field, unresponsive and breathing with great difficulty behind the rural school next to the water tank.',
    category: 'Severe Dyspnea / Shock',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-french',
    language: 'French',
    group: 'Foreign',
    label: 'French (Français)',
    preview: "Mon père s'est effondré dans le champ...",
    nativeScript: "Mon père s'est effondré dans le champ, inconscient et respiration agonisante. Nous sommes derrière l'école communale près du grand château d'eau.",
    transliteration: "Mon pere s'est effondre dans le champ, inconscient et respiration agonisante. Derriere l'ecole communale pres du chateau d'eau.",
    text: "Mon père s'est effondré dans le champ, inconscient et respiration agonisante. Derrière l'école communale près du grand château d'eau",
    englishMeaning: 'Father collapsed in the field, unconscious and agonal breathing behind communal school near large water tower.',
    category: 'Agonal Respiration / Syncope',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-arabic',
    language: 'Arabic',
    group: 'Foreign',
    label: 'Arabic (العربية)',
    preview: 'والدي سقط في الحقل فاقد للوعي...',
    nativeScript: 'والدي سقط فجأة في الحقل الزراعي، فاقد للوعي ويتنفس بصعوبة بالغة. الموقع خلف مدرسة القرية بجوار خزان المياه الكبير.',
    transliteration: 'Walidi saqata fajaatan fi al-haql al-ziraee, faqidal-waey wa yatanafasu bi suubah balighah. Al-mawqi khalf madrasat al-qaryah bijiwar khazzan al-miyah.',
    text: 'والدي سقط في الحقل الزراعي، فاقد للوعي ويتنفس بصعوبة بالغة. الموقع خلف مدرسة القرية بجوار خزان المياه الكبير',
    englishMeaning: 'Father suddenly collapsed in agricultural field, unconscious with severe labored breathing behind village school next to large water tank.',
    category: 'Loss of Consciousness / Airway Risk',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-swahili',
    language: 'Swahili',
    group: 'Foreign',
    label: 'Swahili (Kiswahili)',
    preview: 'Baba ameanguka shambani, hazungumzi...',
    nativeScript: 'Baba ameanguka shambani, hazungumzi na anapumua kwa shida kubwa sana. Tuko nyuma ya shule ya kijiji karibu na tangi kubwa la maji.',
    transliteration: 'Baba ameanguka shambani, hazungumzi na anapumua kwa shida kubwa sana. Tuko nyuma ya shule ya kijiji karibu na tangi kubwa la maji.',
    text: 'Baba ameanguka shambani, hazungumzi na anapumua kwa shida kubwa sana. Tuko nyuma ya shule ya kijiji karibu na tangi kubwa la maji',
    englishMeaning: 'Father collapsed in the farm field, unresponsive and breathing with great difficulty behind village school near big water tank.',
    category: 'Severe Hypoxia / Syncope',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-portuguese',
    language: 'Portuguese',
    group: 'Foreign',
    label: 'Portuguese (Português)',
    preview: 'Meu pai desmaiou na plantação...',
    nativeScript: 'Meu pai desmaiou na plantação, está desacordado e com muita falta de ar. Atrás da escola comunitária perto da grande caixa d’água.',
    transliteration: 'Meu pai desmaiou na plantacao, esta desacordado e com muita falta de ar. Atras da escola comunitaria perto da grande caixa d’agua.',
    text: 'Meu pai desmaiou na plantação, está desacordado e com muita falta de ar. Atrás da escola comunitária perto da grande caixa d’água',
    englishMeaning: 'Father fainted on plantation, unconscious with severe shortness of breath behind community school near large water tank.',
    category: 'Unresponsive / Respiratory Arrest',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-german',
    language: 'German',
    group: 'Foreign',
    label: 'German (Deutsch)',
    preview: 'Mein Vater ist auf dem Feld zusammengebrochen...',
    nativeScript: 'Mein Vater ist auf dem Feld zusammengebrochen, nicht ansprechbar und schwere Atemnot. Hinter der Dorfschule beim alten Wasserturm.',
    transliteration: 'Mein Vater ist auf dem Feld zusammengebrochen, nicht ansprechbar und schwere Atemnot. Hinter der Dorfschule beim alten Wasserturm.',
    text: 'Mein Vater ist auf dem Feld zusammengebrochen, nicht ansprechbar und schwere Atemnot. Hinter der Dorfschule beim alten Wasserturm',
    englishMeaning: 'Father collapsed in field, unalert with severe respiratory distress behind the village school by the old water tower.',
    category: 'Acute Respiratory Distress',
    defaultCoords: { lat: 10.6455, lng: 78.5912 },
  },
  {
    id: 'sample-english',
    language: 'English',
    group: 'Foreign',
    label: 'English (Highway Bleeding)',
    preview: 'bike accident near the big banyan tree...',
    nativeScript: 'bike accident near the big banyan tree on the highway after the petrol bunk, lot of bleeding from leg',
    transliteration: 'bike accident near the big banyan tree on the highway after the petrol bunk, lot of bleeding from leg',
    text: 'bike accident near the big banyan tree on the highway after the petrol bunk, lot of bleeding from leg',
    englishMeaning: 'Motorcycle collision on highway, heavy lower extremity hemorrhage near the big banyan tree after petrol bunk.',
    category: 'Trauma / Hemorrhage',
    defaultCoords: { lat: 10.6180, lng: 78.5520 },
  },
];

export const MOCK_AMBULANCES: Ambulance[] = [
  {
    id: 'amb-1',
    name: '108 Ambulance Unit TN-45-A1',
    unitCode: 'ALS-45-A1',
    type: 'ALS (Advanced Life Support)',
    status: 'Available',
    lat: 10.6012,
    lng: 78.5380,
    baseStation: 'Viralimalai Highway Health Post',
    driverName: 'Karthik Raja',
    paramedic: 'Dr. Vignesh (Emergency Tech)',
    contact: '108-DISPATCH-01',
    equipment: ['Ventilator', 'Defibrillator', 'Infusion Pump', 'Cardiac Monitor', 'Spinal Board', 'Oxygen Tanks'],
  },
  {
    id: 'amb-2',
    name: '108 Ambulance Unit TN-45-B4',
    unitCode: 'BLS-45-B4',
    type: 'BLS (Basic Life Support)',
    status: 'Available',
    lat: 10.6420,
    lng: 78.5890,
    baseStation: 'Keelapatti Panchayat Outpost',
    driverName: 'Senthil Kumar',
    paramedic: 'Manikandan (EMT)',
    contact: '108-DISPATCH-04',
    equipment: ['Oxygen Supply', 'Splints', 'Stretcher', 'Basic Dressing Kit', 'BP Apparatus'],
  },
  {
    id: 'amb-3',
    name: '108 Ambulance Unit TN-45-C9',
    unitCode: 'ALS-45-C9',
    type: 'ALS (Advanced Life Support)',
    status: 'Busy',
    lat: 10.6080,
    lng: 78.4150,
    baseStation: 'Manapparai South Post',
    driverName: 'Ramesh Babu',
    paramedic: 'Sister Priya',
    contact: '108-DISPATCH-09',
    equipment: ['Ventilator', 'Defibrillator', 'Critical Care Monitor'],
  },
];

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'Trichy Govt Multi-Super-Speciality Hospital',
    level: 'Tertiary Apex Referral Centre',
    lat: 10.8050,
    lng: 78.6920,
    capabilities: ['cardiac', 'stroke', 'trauma', 'general', 'icu', 'cath_lab', 'pediatric'],
    bedCapacity: 650,
    icuBedsAvailable: 18,
    bloodBankUnitsAvailable: 95,
    cathLabActive: true,
    traumaSurgeonOnCall: true,
    contact: '+91 431 240 1000',
    address: 'Collector Office Road, Cantonment, Tiruchirappalli',
  },
  {
    id: 'hosp-2',
    name: 'Viralimalai Taluk Community Health Centre',
    level: 'Secondary Primary Health Post',
    lat: 10.6080,
    lng: 78.5420,
    capabilities: ['general', 'basic_trauma', 'maternity', 'stabilization'],
    bedCapacity: 50,
    icuBedsAvailable: 2,
    bloodBankUnitsAvailable: 8,
    cathLabActive: false,
    traumaSurgeonOnCall: false,
    contact: '+91 433 222 108',
    address: 'Viralimalai Main Bazaar, Pudukkottai District',
  },
  {
    id: 'hosp-3',
    name: 'Kaveri Emergency & Trauma Care Centre',
    level: 'Specialized Level-1 Trauma Institute',
    lat: 10.7720,
    lng: 78.6810,
    capabilities: ['trauma', 'orthopedic', 'burns', 'general', 'icu', 'blood_bank'],
    bedCapacity: 180,
    icuBedsAvailable: 9,
    bloodBankUnitsAvailable: 64,
    cathLabActive: false,
    traumaSurgeonOnCall: true,
    contact: '+91 431 400 1122',
    address: 'Thennur High Road, Tiruchirappalli',
  },
  {
    id: 'hosp-4',
    name: 'Apollo Specialty & Heart Institute Trichy',
    level: 'Super-Specialty Cardiac & Stroke Hub',
    lat: 10.7910,
    lng: 78.7050,
    capabilities: ['cardiac', 'stroke', 'neuro', 'icu', 'cath_lab'],
    bedCapacity: 220,
    icuBedsAvailable: 12,
    bloodBankUnitsAvailable: 45,
    cathLabActive: true,
    traumaSurgeonOnCall: false,
    contact: '+91 431 222 9999',
    address: 'Chennai-Madurai Highway Bypass, Trichy',
  },
];

export const MOCK_VOLUNTEERS: CommunityVolunteer[] = [
  {
    id: 'vol-1',
    name: 'Murugan Selvam',
    lat: 10.6490,
    lng: 78.5950,
    village: 'Keelapatti North Field Zone',
    vehicle: 'Bajaj Pulsar 150 (Motorcycle with First-Aid Pack)',
    training: 'St. John Ambulance Certified First Responder (Level 2)',
    kit: ['Tourniquet & Pressure Bandages', 'Splints & Neck Brace', 'Emergency Blanket', 'Pocket CPR Mask'],
    responseTimeMinutes: 5,
    phone: '+91 94431 52819',
  },
  {
    id: 'vol-2',
    name: 'Dr. Kavitha Ramesh',
    lat: 10.6280,
    lng: 78.5620,
    village: 'Kunnathur Panchayat Post',
    vehicle: 'TVS Scooty (with Portable O2 Cylinder)',
    training: 'Red Cross Emergency Healthcare Volunteer / Rural Nurse',
    kit: ['Compact Oxygen Canister', 'Blood Pressure Cuff', 'Pulse Oximeter', 'IV Cannula & Saline Kit'],
    responseTimeMinutes: 7,
    phone: '+91 98422 66310',
  },
  {
    id: 'vol-3',
    name: 'Anand Kumar',
    lat: 10.6650,
    lng: 78.6180,
    village: 'Alangudi North Junction',
    vehicle: 'Mahindra Bolero Pickup (Rough Terrain Stretcher Bed)',
    training: 'District Disaster Management Volunteer',
    kit: ['Spine board', 'High-lumens Searchlights', 'Rope & Extrication straps', 'Heavy Trauma Gauze'],
    responseTimeMinutes: 9,
    phone: '+91 97860 88204',
  },
];
