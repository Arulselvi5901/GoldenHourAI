import React, { useState, useMemo } from 'react';
import {
  COMPREHENSIVE_EMERGENCY_DATASET,
  filterEmergencyDataset,
} from '../data/emergencyDataset';
import { EmergencyScenario } from '../types/emergency';
import {
  Search,
  Filter,
  PhoneCall,
  MessageSquare,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Download,
  Copy,
  Check,
  X,
  MapPin,
  HeartPulse,
  Flame,
  Zap,
  Baby,
  Skull,
  ExternalLink,
} from 'lucide-react';

interface DatasetExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForCall: (scenario: EmergencyScenario) => void;
  onSelectForSMS: (scenario: EmergencyScenario) => void;
  liveCollectedScenarios?: EmergencyScenario[];
}

export const DatasetExplorerModal: React.FC<DatasetExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelectForCall,
  onSelectForSMS,
  liveCollectedScenarios = [],
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'Indian' | 'Foreign'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showOnlyLiveCollected, setShowOnlyLiveCollected] = useState(false);
  const [activeScenarioDetail, setActiveScenarioDetail] = useState<EmergencyScenario | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const categories = [
    { id: 'all', label: 'All Issues', icon: ShieldAlert },
    { id: 'Venom & Toxicology', label: 'Venom & Poisoning', icon: Skull },
    { id: 'Cardiovascular', label: 'Cardiac & Chest Pain', icon: HeartPulse },
    { id: 'Trauma & Hemorrhage', label: 'Trauma & Amputation', icon: Flame },
    { id: 'Stroke & Neurological', label: 'Stroke (FAST)', icon: AlertTriangle },
    { id: 'Maternal & Pediatric', label: 'Maternal & Infant', icon: Baby },
    { id: 'Environmental & Electrical', label: 'Electrical & Drowning', icon: Zap },
  ];

  const sourceDataset = useMemo(() => {
    if (showOnlyLiveCollected) {
      return liveCollectedScenarios;
    }
    // Combine live collected with comprehensive dataset
    return [...liveCollectedScenarios, ...COMPREHENSIVE_EMERGENCY_DATASET.filter((s) => !liveCollectedScenarios.some((l) => l.id === s.id))];
  }, [showOnlyLiveCollected, liveCollectedScenarios]);

  const filtered = useMemo(() => {
    let list = sourceDataset;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.emergencyType.toLowerCase().includes(q) ||
          s.nativeText.toLowerCase().includes(q) ||
          s.englishTranslation.toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.landmarkAnchors.some((l) => l.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      list = list.filter((s) => s.category === selectedCategory);
    }

    if (selectedGroup !== 'all') {
      list = list.filter((s) => s.group === selectedGroup);
    }

    if (selectedSeverity !== 'all') {
      list = list.filter((s) => s.severity === selectedSeverity);
    }

    return list;
  }, [sourceDataset, search, selectedCategory, selectedGroup, selectedSeverity]);

  const handleCopy = (scenario: EmergencyScenario) => {
    const textToCopy = `[GoldenHourAI Emergency Scenario]\nType: ${scenario.emergencyType}\nLanguage: ${scenario.language} (${scenario.scriptName})\nSeverity: ${scenario.severity} (${scenario.confidencePercentage}% confidence)\nGolden Hour: ${scenario.goldenHourWindowMinutes} mins - ${scenario.goldenHourReason}\nSpoken Voice Text: "${scenario.nativeText}"\nEnglish Translation: "${scenario.englishTranslation}"\nLandmarks: ${scenario.landmarkAnchors.join(', ')}\nCritical DOs: ${scenario.criticalDos.join('; ')}\nFatal DON'Ts: ${scenario.fatalDonts.join('; ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(scenario.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(COMPREHENSIVE_EMERGENCY_DATASET, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'goldenhour_emergency_dataset.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#0E1B2E] border border-[#F2A93B]/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-700/80 bg-[#142338] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#F2A93B]/20 text-[#F2A93B] border border-[#F2A93B]/40">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Rural Emergency Possibilities Dataset
              </h2>
              <span className="text-xs bg-[#F2A93B]/20 text-[#F2A93B] font-semibold px-2.5 py-0.5 rounded-full border border-[#F2A93B]/30">
                {COMPREHENSIVE_EMERGENCY_DATASET.length} Scenarios · 17 Languages
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Engineered specifically for rural & low-connectivity settings: snakebites, acute coronary, stroke, machinery amputations, pesticide ingestions, maternal seizures, choking, and electrocution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a2d48] hover:bg-[#22395a] text-slate-200 border border-slate-700 transition"
              title="Download entire dataset as JSON"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Downloaded JSON</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#F2A93B]" />
                  <span>Export JSON</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-[#101e33] border-b border-slate-700/60 space-y-3">
          {/* Top Collection Source Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-700/40">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnlyLiveCollected(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  !showOnlyLiveCollected
                    ? 'bg-[#F2A93B] text-slate-950 shadow-md'
                    : 'bg-[#182b45] text-slate-300 hover:text-white'
                }`}
              >
                <span>Full Emergency Dataset ({COMPREHENSIVE_EMERGENCY_DATASET.length})</span>
              </button>
              <button
                onClick={() => setShowOnlyLiveCollected(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  showOnlyLiveCollected
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-[#182b45] text-emerald-300 hover:bg-emerald-950/60 border border-emerald-600/40'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Collected from Real-Time Calls ({liveCollectedScenarios.length})</span>
              </button>
            </div>

            {liveCollectedScenarios.length > 0 && showOnlyLiveCollected && (
              <span className="text-[11px] text-emerald-400 bg-emerald-950/70 border border-emerald-600/50 px-2.5 py-0.5 rounded-full font-semibold">
                ● Showing organic scenarios dynamically extracted from callers' voices
              </span>
            )}
          </div>

          {/* Search bar & quick filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by symptom, issue (snake, heart, tractor, baby, burn), language or landmark..."
                className="w-full pl-10 pr-4 py-2 bg-[#0a1320] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2A93B]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Language Group Filter */}
            <div className="flex items-center bg-[#0a1320] border border-slate-700 rounded-xl p-1 text-xs">
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedGroup === 'all'
                    ? 'bg-[#F2A93B] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Languages ({sourceDataset.length})
              </button>
              <button
                onClick={() => setSelectedGroup('Indian')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedGroup === 'Indian'
                    ? 'bg-[#F2A93B] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇮🇳 Indian (5+)
              </button>
              <button
                onClick={() => setSelectedGroup('Foreign')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedGroup === 'Foreign'
                    ? 'bg-[#F2A93B] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌐 Global (10+)
              </button>
            </div>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-[#0a1320] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#F2A93B]"
            >
              <option value="all">All Severities</option>
              <option value="Critical">🔴 Critical (Immediate Threat)</option>
              <option value="Serious">🟠 Serious (Urgent Care)</option>
              <option value="Moderate">🟡 Moderate</option>
            </select>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((c) => {
              const Icon = c.icon;
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-[#F2A93B]/20 border-[#F2A93B] text-[#F2A93B] font-semibold'
                      : 'bg-[#0a1320] border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area: Split List & Detail */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Scenarios Cards List */}
          <div className={`${activeScenarioDetail ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Showing {filtered.length} matched emergency scenarios</span>
              <span className="text-[#F2A93B] text-[11px]">Click any scenario to simulate Call or SMS</span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 bg-[#0c1624] border border-slate-800 rounded-2xl p-6">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No emergency scenarios matched</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing your search query or changing category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((item) => {
                  const isSelected = activeScenarioDetail?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveScenarioDetail(item)}
                      className={`cursor-pointer text-left p-3.5 rounded-2xl border transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#182942] border-[#F2A93B] shadow-lg shadow-[#F2A93B]/10'
                          : 'bg-[#0e1b2c] border-slate-800 hover:border-slate-600 hover:bg-[#122238]'
                      }`}
                    >
                      <div>
                        {/* Badges row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#193252] text-slate-300 border border-slate-700">
                            {item.language} · {item.scriptName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                item.severity === 'Critical'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {item.severity} ({item.confidencePercentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Title & Category */}
                        <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">
                          {item.emergencyType}
                        </h4>

                        {/* Spoken Native Text */}
                        <div className="bg-[#09121d] p-2 rounded-xl border border-slate-800/80 mb-2">
                          <p className="text-[11px] text-amber-100 font-medium line-clamp-2">
                            "{item.nativeText}"
                          </p>
                          {item.transliteration && item.transliteration !== item.nativeText && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                              {item.transliteration}
                            </p>
                          )}
                        </div>

                        {/* English translation */}
                        <p className="text-[11px] text-slate-300 line-clamp-2 mb-2">
                          <span className="text-slate-400 font-semibold">EN:</span> {item.englishTranslation}
                        </p>
                      </div>

                      {/* Footer: Golden hour + Action buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-[#F2A93B] font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>{item.goldenHourWindowMinutes}m window</span>
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              onSelectForCall(item);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] shadow transition"
                            title="Place Voice Emergency Call with this scenario"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>Call</span>
                          </button>
                          <button
                            onClick={() => {
                              onSelectForSMS(item);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#1c3352] hover:bg-[#25436c] text-[#F2A93B] font-bold rounded-lg text-[10px] border border-[#F2A93B]/40 transition"
                            title="Load into Keypad SMS Simulator"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>SMS</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detailed Deep-Dive Drawer for Selected Scenario */}
          {activeScenarioDetail && (
            <div className="lg:col-span-6 bg-[#122238] border border-[#F2A93B]/40 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto max-h-[600px] shadow-xl">
              <div className="space-y-4">
                {/* Header & badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#F2A93B] bg-[#F2A93B]/10 px-2.5 py-1 rounded-lg border border-[#F2A93B]/20">
                      {activeScenarioDetail.category}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">
                      {activeScenarioDetail.emergencyType}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Language: {activeScenarioDetail.language} ({activeScenarioDetail.scriptName}) · {activeScenarioDetail.callerProfile}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveScenarioDetail(null)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Golden Hour Window Alert */}
                <div className="bg-amber-950/40 border border-amber-600/40 p-3 rounded-xl flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#F2A93B] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-[#F2A93B]">
                      Golden Hour Threshold: {activeScenarioDetail.goldenHourWindowMinutes} Minutes
                    </p>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      {activeScenarioDetail.goldenHourReason}
                    </p>
                  </div>
                </div>

                {/* Original Voice Audio Note / Spoken Script */}
                <div className="bg-[#091321] border border-slate-700/80 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>CALLER SPOKEN TRANSCRIPT:</span>
                    <span className="text-xs text-[#F2A93B] italic">{activeScenarioDetail.vocalToneNote}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    "{activeScenarioDetail.nativeText}"
                  </p>
                  {activeScenarioDetail.transliteration && (
                    <p className="text-xs text-slate-400 italic mt-1">
                      {activeScenarioDetail.transliteration}
                    </p>
                  )}
                  <p className="text-xs text-emerald-300 mt-2 pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-400">English Meaning: </span>
                    {activeScenarioDetail.englishTranslation}
                  </p>
                </div>

                {/* Rural Landmarks Mentioned */}
                <div className="bg-[#0e1b2c] border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>RURAL LANDMARK ANCHORS (NO STREET ADDRESS):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeScenarioDetail.landmarkAnchors.map((lm, i) => (
                      <span
                        key={i}
                        className="text-xs bg-[#192b45] text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700"
                      >
                        📍 {lm}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Critical DOs and Fatal DONTs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-950/30 border border-emerald-600/40 rounded-xl p-3">
                    <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Critical First-Aid DOs
                    </h5>
                    <ul className="text-[11px] text-slate-200 space-y-1.5 list-disc list-inside">
                      {activeScenarioDetail.criticalDos.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-rose-950/30 border border-rose-600/40 rounded-xl p-3">
                    <h5 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Fatal Folk Myths to AVOID
                    </h5>
                    <ul className="text-[11px] text-slate-200 space-y-1.5 list-disc list-inside">
                      {activeScenarioDetail.fatalDonts.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Required Hospital & Dispatch Plan */}
                <div className="bg-[#0b1624] border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="font-bold text-[#F2A93B]">Clinical Capability Match: </span>
                  <span className="text-slate-300">{activeScenarioDetail.recommendedHospitalCapability}</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    <span className="font-semibold text-slate-300">Dispatch Directive: </span>
                    {activeScenarioDetail.specialDispatchInstruction}
                  </p>
                </div>
              </div>

              {/* Bottom Actions for Scenario Detail */}
              <div className="pt-4 mt-4 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleCopy(activeScenarioDetail)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  {copiedId === activeScenarioDetail.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Scenario Data</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectForSMS(activeScenarioDetail);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1b2f4a] hover:bg-[#254167] text-[#F2A93B] font-bold rounded-xl text-xs border border-[#F2A93B]/40 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Load into SMS Simulator</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectForCall(activeScenarioDetail);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/40 transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Start Live Emergency Call</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
