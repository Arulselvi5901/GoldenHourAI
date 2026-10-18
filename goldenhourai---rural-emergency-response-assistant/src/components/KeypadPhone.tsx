import React, { useEffect } from 'react';
import { PhoneCall, PhoneOff, Signal, Battery, Volume2 } from 'lucide-react';
import { getOrCreateCallerAudioContext } from '../utils/audioSpeechEngine';

export type IvrPhoneStage =
  | 'idle'
  | 'calling'
  | 'connected_greeting'
  | 'listening'
  | 'processing'
  | 'reassurance'
  | 'ivr_question'
  | 'affordability_question'
  | 'first_aid'
  | 'final_status'
  | 'doctor_incoming'
  | 'doctor_connected'
  | 'ended';

export interface KeypadPhoneProps {
  stage: IvrPhoneStage;
  localEmergencyNumber: string;
  callDurationSeconds: number;
  listeningSeconds: number;
  screenLines: string[];
  callerIdLabel: string;
  isSpeakingAloud: boolean;
  isListeningMic: boolean;
  isAudioBlocked?: boolean;
  voiceUnavailableNote: string | null;
  onEnableSound?: () => void;
  onPressCall: () => void;
  onPressEnd: () => void;
  onPressKey: (key: string) => void;
}

const KEYPAD_KEYS: Array<{ key: string; sub: string; testId: string }> = [
  { key: '1', sub: 'YES / DONE', testId: 'keypad-key-1' },
  { key: '2', sub: 'NO / NEXT', testId: 'keypad-key-2' },
  { key: '3', sub: 'UNSURE', testId: 'keypad-key-3' },
  { key: '4', sub: 'GHI', testId: 'keypad-key-4' },
  { key: '5', sub: 'JKL', testId: 'keypad-key-5' },
  { key: '6', sub: 'MNO', testId: 'keypad-key-6' },
  { key: '7', sub: 'PQRS', testId: 'keypad-key-7' },
  { key: '8', sub: 'TUV', testId: 'keypad-key-8' },
  { key: '9', sub: 'WXYZ', testId: 'keypad-key-9' },
  { key: '*', sub: 'REPEAT', testId: 'keypad-key-star' },
  { key: '0', sub: 'DOCTOR', testId: 'keypad-key-0' },
  { key: '#', sub: 'SEND', testId: 'keypad-key-hash' },
];

export const KeypadPhone: React.FC<KeypadPhoneProps> = ({
  stage,
  localEmergencyNumber = '112',
  callDurationSeconds,
  screenLines,
  callerIdLabel,
  isSpeakingAloud,
  isListeningMic,
  isAudioBlocked = false,
  voiceUnavailableNote,
  onEnableSound,
  onPressCall,
  onPressEnd,
  onPressKey,
}) => {
  // Audio DTMF tone generator using the single shared Caller Phone AudioContext
  const playDtmfTone = (freq: number = 852) => {
    try {
      const ctx = getOrCreateCallerAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignore AudioContext errors when muted/restricted
    }
  };

  // Format MM:SS timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Listen for physical computer keyboard number keys (1-9, *, 0, #)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        playDtmfTone(697 + (e.key.charCodeAt(0) % 10) * 45);
        onPressKey(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPressKey]);

  const isCallActive = stage !== 'idle' && stage !== 'ended';
  const isIncomingDoctor = stage === 'doctor_incoming';

  // Ensure max 4-5 lines on the 220x170 screen
  const visibleLines = screenLines.slice(0, 4);

  return (
    <div
      data-testid="caller-phone-shell"
      data-ivr-stage={stage}
      className="w-[260px] h-[520px] shrink-0 mx-auto select-none flex flex-col items-center justify-between bg-gradient-to-b from-[#1e2d42] via-[#142030] to-[#0b131e] rounded-[36px] p-[18px] border-[3px] border-[#314866] shadow-2xl shadow-black/90 relative"
    >
      {/* Top Earpiece Grill */}
      <div className="w-full flex flex-col items-center pt-0.5">
        <div className="w-14 h-1.5 rounded-full bg-[#080f18] border border-slate-700/70 mb-1.5" />
        <div className="text-[9px] font-mono tracking-widest uppercase text-slate-400 font-bold">
          GOLDENHOUR · SIMULATED
        </div>
      </div>

      {/* ================================================================= */}
      {/* SMALL LCD SCREEN: 220px wide x 170px tall, max 4-5 lines           */}
      {/* Shows ONLY: number/caller ID, call timer, and current reply/menu  */}
      {/* ================================================================= */}
      <div
        data-testid="feature-phone-screen"
        className={`w-[220px] h-[170px] shrink-0 rounded-xl border-2 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner transition-colors ${
          isIncomingDoctor
            ? 'bg-[#d7e8a7] border-[#F2A93B] text-[#10200c]'
            : 'bg-[#9bb394] border-[#63785d] text-[#0c1c0c]'
        }`}
      >
        {/* Line 1: Top Status Bar — Caller ID / Number + Call Timer */}
        <div className="flex items-center justify-between border-b border-[#6e8568] pb-1 text-[11px] font-mono font-extrabold leading-none">
          <div className="flex items-center gap-1 truncate max-w-[125px]">
            <Signal className="w-3 h-3 shrink-0 text-[#0c1c0c]" />
            <span data-testid="phone-caller-id" className="truncate">
              {callerIdLabel || localEmergencyNumber}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isSpeakingAloud && (
              <span
                data-testid="phone-speaking-indicator"
                className="inline-flex items-center gap-0.5 text-[10px] font-black animate-pulse text-[#0c1c0c]"
                title="Speaking aloud"
              >
                <span>🔊</span>
                <Volume2 className="w-3 h-3 text-[#0c1c0c]" />
              </span>
            )}
            <span data-testid="phone-call-timer" className="tabular-nums">
              {isCallActive ? formatTimer(callDurationSeconds) : 'SIM'}
            </span>
            <Battery className="w-3.5 h-3.5 text-[#0c1c0c]" />
          </div>
        </div>

        {/* Lines 2–5: Main Body Text (Large, Simple Text, Max 4-5 Lines) */}
        <div
          data-testid="phone-screen-content"
          className="flex-1 flex flex-col justify-center py-0.5 space-y-1 overflow-hidden font-sans"
        >
          {visibleLines.map((line, idx) => (
            <div
              key={idx}
              className={`leading-[1.22] break-words ${
                stage === 'idle' && idx === 0
                  ? 'text-center text-[13px] font-black tracking-tight py-0.5 text-[#081508]'
                  : stage === 'idle' && idx === 1
                  ? 'text-center text-[11px] font-extrabold text-[#142814]'
                  : stage === 'idle'
                  ? 'text-center text-[10px] font-bold text-[#1d361d]'
                  : isIncomingDoctor && idx === 0
                  ? 'text-center text-[13px] font-black animate-pulse'
                  : idx === 0
                  ? 'text-[12px] font-black text-[#081508] line-clamp-3'
                  : 'text-[11px] font-bold text-[#142814] line-clamp-2'
              }`}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Bottom Status / Sound Unlock / Voice Note Bar */}
        {(isAudioBlocked || voiceUnavailableNote || isListeningMic || isSpeakingAloud) && (
          <div className="border-t border-[#6e8568]/70 pt-0.5 flex items-center justify-between text-[10px] font-extrabold leading-none">
            {isAudioBlocked ? (
              <button
                type="button"
                data-testid="phone-enable-sound-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  playDtmfTone(941);
                  if (onEnableSound) onEnableSound();
                }}
                className="w-full py-0.5 px-1.5 rounded bg-[#0c1c0c] text-[#d7e8a7] hover:bg-[#183218] text-[10px] font-black flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <span>🔇 Tap to enable sound</span>
              </button>
            ) : voiceUnavailableNote ? (
              <span
                data-testid="phone-voice-unavailable"
                className="truncate text-[#2c1d04] font-bold"
              >
                {voiceUnavailableNote}
              </span>
            ) : isListeningMic ? (
              <span className="text-[#7f1d1d] animate-pulse truncate">
                REC (stops on 2s silence)
              </span>
            ) : (
              <span className="text-[#0c1c0c] animate-pulse truncate">
                🔊 Speaking aloud…
              </span>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* PHYSICAL KEYPAD: Green CALL, Red END/DECLINE, Keys 1–9, *, 0, #   */}
      {/* ================================================================= */}
      <div className="w-[220px] flex-1 flex flex-col justify-end pt-1 space-y-1.5">
        {/* Call & End/Decline Action Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            data-testid="keypad-btn-call"
            aria-label={isIncomingDoctor ? 'Accept Doctor Call' : 'Call Emergency'}
            onClick={() => {
              playDtmfTone(941);
              onPressCall();
            }}
            className="h-10 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 active:scale-95 text-white font-black text-xs shadow-md border border-emerald-300/60 flex items-center justify-center gap-1.5 transition"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            <span>{isIncomingDoctor ? 'ACCEPT' : 'CALL'}</span>
          </button>

          <button
            type="button"
            data-testid="keypad-btn-end"
            aria-label={isIncomingDoctor ? 'Decline Doctor Call' : 'End Emergency Call'}
            onClick={() => {
              playDtmfTone(440);
              onPressEnd();
            }}
            className="h-10 rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 active:scale-95 text-white font-black text-xs shadow-md border border-rose-300/60 flex items-center justify-center gap-1.5 transition"
          >
            <PhoneOff className="w-4 h-4 shrink-0" />
            <span>{isIncomingDoctor ? 'DECLINE' : 'END'}</span>
          </button>
        </div>

        {/* 12-Key Physical DTMF Matrix (1–9, *, 0, #) */}
        <div className="grid grid-cols-3 gap-1.5">
          {KEYPAD_KEYS.map((item) => (
            <button
              key={item.key}
              type="button"
              data-testid={item.testId}
              aria-label={`Keypad key ${item.key}`}
              onClick={() => {
                playDtmfTone(697 + (item.key.charCodeAt(0) % 10) * 45);
                onPressKey(item.key);
              }}
              className="h-[46px] rounded-xl bg-gradient-to-b from-[#263952] to-[#172436] hover:from-[#304866] hover:to-[#1e3047] active:scale-95 text-white border border-[#3d5675] shadow flex flex-col items-center justify-center transition"
            >
              <span className="text-base font-black leading-none text-white">
                {item.key}
              </span>
              <span className="text-[8px] font-mono font-bold text-[#F2A93B] tracking-tight leading-none mt-1">
                {item.sub}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
