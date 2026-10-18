import React, { useState } from 'react';
import { CollectedCallRecord } from '../types/emergency';
import {
  PhoneCall,
  Clock,
  MapPin,
  Download,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileSpreadsheet,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface CollectedCallsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectedCalls: CollectedCallRecord[];
  onSelectCall: (call: CollectedCallRecord) => void;
  onClearCalls: () => void;
}

export const CollectedCallsModal: React.FC<CollectedCallsModalProps> = ({
  isOpen,
  onClose,
  collectedCalls,
  onSelectCall,
  onClearCalls,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(collectedCalls, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `goldenhour_collected_calls_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloadSuccess('JSON exported');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleExportCSV = () => {
    if (collectedCalls.length === 0) return;
    const headers = [
      'ID',
      'Timestamp',
      'Language',
      'Channel',
      'Emergency Type',
      'Category',
      'Severity',
      'Confidence %',
      'Golden Hour Mins',
      'Caller Spoken Words',
      'Extracted Landmarks',
      'Latitude',
      'Longitude',
    ];

    const rows = collectedCalls.map((c) => [
      c.id,
      `"${c.timestamp}"`,
      `"${c.detectedLanguage}"`,
      `"${c.channel}"`,
      `"${c.likelyEmergencyType}"`,
      `"${c.matchedEmergencyCategory}"`,
      c.severity,
      c.confidencePercentage,
      c.goldenHourWindowMinutes,
      `"${c.callerAudioOrText.replace(/"/g, '""')}"`,
      `"${c.extractedLandmarks.join('; ')}"`,
      c.resolvedLocation.latitude,
      c.resolvedLocation.longitude,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    a.download = `goldenhour_collected_calls_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloadSuccess('CSV exported');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0E1B2E] border border-[#F2A93B]/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 bg-[#142338] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <PhoneCall className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Live Collected Emergency Call Records
              </h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {collectedCalls.length} Call Records Collected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dataset built organically from callers' actual spoken calls. Every time someone speaks, their emergency is extracted, triaged, and recorded here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {collectedCalls.length > 0 && (
              <>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a2d48] hover:bg-[#22395a] text-slate-200 border border-slate-700 transition"
                  title="Export collected calls as JSON"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F2A93B]" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a2d48] hover:bg-[#22395a] text-slate-200 border border-slate-700 transition"
                  title="Export collected calls as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={onClearCalls}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition"
                  title="Clear collected records"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{downloadSuccess} successfully.</span>
            </div>
          )}

          {collectedCalls.length === 0 ? (
            <div className="text-center py-16 bg-[#0c1624] border border-slate-800 rounded-2xl p-6">
              <PhoneCall className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Calls Collected Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                The dataset is built from callers' real emergency calls. Press the green <strong>"CALL"</strong> button on the phone, speak into your microphone, or choose a caller scenario to collect your first emergency record.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {collectedCalls.map((call, index) => (
                <div
                  key={call.id}
                  className="p-4 bg-[#122238] hover:bg-[#162a45] rounded-2xl border border-slate-700/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        #{collectedCalls.length - index} · {call.timestamp}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1f3756] text-[#F2A93B]">
                        {call.detectedLanguage} · {call.channel === 'voice_call' ? '📞 Voice Call' : '💬 SMS'}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          call.severity === 'Critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {call.severity} ({call.confidencePercentage}%)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{call.goldenHourWindowMinutes}m Golden Hour</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {call.likelyEmergencyType}
                    </h4>

                    {/* Spoken words */}
                    <div className="bg-[#09121d] p-2 rounded-xl border border-slate-800">
                      <p className="text-xs text-amber-100 font-medium">
                        "{call.callerAudioOrText}"
                      </p>
                    </div>

                    {/* Extracted landmarks */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="font-semibold text-slate-400">Landmarks:</span>
                      {call.extractedLandmarks.length > 0 ? (
                        call.extractedLandmarks.map((lm: string, i: number) => (
                          <span
                            key={i}
                            className="bg-[#1b2e47] text-slate-200 px-2 py-0.5 rounded border border-slate-700 text-[10px]"
                          >
                            {lm}
                          </span>
                        ))
                      ) : (
                        <span className="italic text-slate-500 text-[10px]">
                          {call.resolvedLocation.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 md:self-center">
                    <button
                      onClick={() => {
                        onSelectCall(call);
                        onClose();
                      }}
                      className="px-3.5 py-2 bg-[#F2A93B] hover:bg-[#d68f23] text-slate-950 font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Load into Triage &amp; Dispatch</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
