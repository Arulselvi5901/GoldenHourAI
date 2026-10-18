import React, { useState } from 'react';
import {
  TriageQuestion,
  TriageAnswerOption,
  FirstAidStep,
  SeverityChangeRecord,
  SeverityLevel,
  DoctorCallState,
  DoctorBridgeMessage,
} from '../types/emergency';
import { formatCountdownMMSS } from '../utils/triageFlowLogic';
import {
  HelpCircle,
  Volume2,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertTriangle,
  Truck,
  PhoneCall,
  ShieldAlert,
  ArrowRight,
  Stethoscope,
} from 'lucide-react';

interface TriageFollowUpWizardProps {
  questions: TriageQuestion[];
  currentQuestionIndex: number; // 0 = Q1, 1 = Q2, >= 2 = Guided First Aid
  firstAidSteps: FirstAidStep[];
  currentFirstAidStepIndex: number;
  fatalDonts: string[];
  severityHistory: SeverityChangeRecord[];
  currentSeverity: SeverityLevel;
  currentConfidence: number;
  ambulanceEtaSeconds: number;
  ambulanceName?: string;
  hospitalName?: string;
  updatingTriage: boolean;
  isAudioRecording: boolean;
  recordingSeconds: number;
  showConnectDoctorNow: boolean;
  doctorCallState?: DoctorCallState;
  doctorName?: string;
  latestDoctorMessage?: DoctorBridgeMessage | null;
  onSelectAnswer: (answerCallerLang: string, answerEnglish?: string) => void;
  onStartVoiceAnswer: () => void;
  onStopVoiceAnswer: () => void;
  onReadAloud: (text: string) => void;
  onCompleteFirstAidStep: (stepIndex: number) => void;
  onRequestHelpOrWorsening: (reasonText?: string) => void;
  onConnectToDoctorNow: () => void;
  onOpenDoctorConsole?: () => void;
}

export const TriageFollowUpWizard: React.FC<TriageFollowUpWizardProps> = ({
  questions,
  currentQuestionIndex,
  firstAidSteps,
  currentFirstAidStepIndex,
  fatalDonts,
  severityHistory,
  currentSeverity,
  currentConfidence,
  ambulanceEtaSeconds,
  ambulanceName,
  hospitalName,
  updatingTriage,
  isAudioRecording,
  recordingSeconds,
  showConnectDoctorNow,
  doctorCallState = 'idle',
  doctorName = 'Dr. Arvind',
  latestDoctorMessage = null,
  onSelectAnswer,
  onStartVoiceAnswer,
  onStopVoiceAnswer,
  onReadAloud,
  onCompleteFirstAidStep,
  onRequestHelpOrWorsening,
  onConnectToDoctorNow,
  onOpenDoctorConsole,
}) => {
  const [typedAnswer, setTypedAnswer] = useState('');
  const [worseningInput, setWorseningInput] = useState('');

  const totalQuestions = Math.min(2, questions.length || 2);
  const isGuidedFirstAidActive = currentQuestionIndex >= totalQuestions;
  const activeQuestion: TriageQuestion | undefined =
    !isGuidedFirstAidActive ? questions[currentQuestionIndex] : undefined;

  const latestSeverityChange =
    severityHistory.length > 0 ? severityHistory[severityHistory.length - 1] : null;

  const activeStep: FirstAidStep | undefined =
    firstAidSteps[Math.min(currentFirstAidStepIndex, Math.max(0, firstAidSteps.length - 1))];
  const allStepsCompleted =
    firstAidSteps.length > 0 && currentFirstAidStepIndex >= firstAidSteps.length;

  const handleTypedSubmit = () => {
    if (!typedAnswer.trim() || updatingTriage) return;
    onSelectAnswer(typedAnswer.trim(), typedAnswer.trim());
    setTypedAnswer('');
  };

  const handleWorseningSubmit = () => {
    if (!worseningInput.trim() || updatingTriage) return;
    onRequestHelpOrWorsening(worseningInput.trim());
    setWorseningInput('');
  };

  return (
    <div className="space-y-4" data-testid="triage-followup-wizard">
      {/* 1. LIVE SEVERITY UPDATE BANNER (Shown after any answer or escalation) */}
      {latestSeverityChange && (
        <div
          data-testid="severity-update-banner"
          className={`p-4 rounded-xl border-2 shadow-lg transition-all ${
            latestSeverityChange.newSeverity === 'Critical'
              ? 'bg-rose-950/70 border-rose-500/80 text-rose-100'
              : 'bg-amber-950/70 border-amber-500/80 text-amber-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F2A93B] shrink-0" />
              <span className="text-sm font-extrabold tracking-wide text-white">
                Severity updated: {latestSeverityChange.previousSeverity} →{' '}
                {latestSeverityChange.newSeverity}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#F2A93B]">
              Confidence: {latestSeverityChange.previousConfidence}% →{' '}
              {latestSeverityChange.newConfidence}%
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            <strong>Reason:</strong> {latestSeverityChange.reason}
          </p>
          <div className="mt-1.5 text-[11px] text-emerald-300 font-medium">
            ✓ Dispatch map &amp; Hospital Pre-Alert updated live with this clinical change
          </div>
        </div>
      )}

      {/* 2. URGENT "CONNECT TO DOCTOR NOW" CALLOUT (When caller taps "I need help" or patient worsens) */}
      {showConnectDoctorNow && (
        <div
          data-testid="connect-doctor-callout"
          className="p-4 rounded-xl bg-gradient-to-r from-rose-900/90 to-red-900/90 border-2 border-rose-400 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-extrabold text-white">
              <Stethoscope className="w-4 h-4 text-[#F2A93B]" />
              <span>Urgent Medical Escalation — Severity Re-Checked ({currentSeverity})</span>
            </div>
            <p className="text-xs text-rose-100">
              On-call emergency physician has received your full triage &amp; first-aid log and is ready to guide you live.
            </p>
          </div>
          <button
            type="button"
            onClick={onConnectToDoctorNow}
            className="px-4 py-2.5 bg-[#F2A93B] hover:bg-[#e09626] text-[#0E1B2E] font-extrabold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 shrink-0 transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Connect to doctor now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE A: STEP-BY-STEP TRIAGE QUESTIONS ("Question 1 of 2" / "2 of 2") */}
      {/* ===================================================================== */}
      {!isGuidedFirstAidActive && activeQuestion && (
        <div
          data-testid="step-by-step-question-card"
          className="p-5 rounded-xl bg-[#162840] border-2 border-[#F2A93B]/60 shadow-xl space-y-4"
        >
          {/* Step Header & Progress */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-lg bg-[#F2A93B] text-[#0E1B2E] font-extrabold text-xs tracking-wide">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Interactive Triage Follow-Up
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onReadAloud(activeQuestion.questionCallerLang)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f3758] hover:bg-[#294770] text-amber-200 border border-[#F2A93B]/40 text-xs font-bold transition"
                title="Read question aloud in caller's language"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#F2A93B]" />
                <span>Read Aloud</span>
              </button>
            </div>
          </div>

          {/* Step Dots */}
          <div className="flex items-center gap-2 text-xs">
            {questions.slice(0, totalQuestions).map((q, idx) => {
              const isDone = idx < currentQuestionIndex;
              const isCurrent = idx === currentQuestionIndex;
              return (
                <div
                  key={q.id || idx}
                  className={`flex-1 p-2 rounded-lg border text-xs flex items-center gap-2 ${
                    isDone
                      ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                      : isCurrent
                      ? 'bg-[#1e3554] border-[#F2A93B] text-white font-bold'
                      : 'bg-[#101e30] border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-mono text-[11px]">
                    {isDone ? '✓' : `Q${idx + 1}`}
                  </span>
                  <span className="truncate">
                    {isDone
                      ? `Answered: ${q.answeredText || 'Done'}`
                      : `Question ${idx + 1} of ${totalQuestions}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Question in Caller's Language with English Below */}
          <div className="p-4 rounded-xl bg-[#0e1b2d] border border-slate-700 space-y-1.5">
            <div className="text-[11px] font-mono uppercase text-[#F2A93B] flex items-center justify-between">
              <span>Caller Language Question:</span>
              <span className="text-slate-400 normal-case italic">
                Purpose: {activeQuestion.purpose}
              </span>
            </div>
            <p className="text-base sm:text-lg font-extrabold text-white leading-snug">
              {activeQuestion.questionCallerLang}
            </p>
            <p className="text-xs sm:text-sm text-slate-300 pt-1 border-t border-slate-800">
              <strong className="text-slate-400">English:</strong>{' '}
              {activeQuestion.questionEnglish}
            </p>
          </div>

          {/* 3-4 Big Tappable Answer Option Buttons (Caller's Language + English Below) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200 block">
              Tap an answer below (or tap 🎤 to answer by voice, or type):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(activeQuestion.options || []).map((opt: TriageAnswerOption, oIdx: number) => (
                <button
                  key={opt.id || oIdx}
                  type="button"
                  disabled={updatingTriage}
                  onClick={() =>
                    onSelectAnswer(
                      `${opt.textCallerLang} (${opt.textEnglish})`,
                      opt.textEnglish
                    )
                  }
                  className="text-left p-3.5 rounded-xl bg-[#1b314e] hover:bg-[#254268] active:scale-[0.99] disabled:opacity-50 border-2 border-slate-600/80 hover:border-[#F2A93B] transition-all shadow-md group"
                >
                  <div className="text-sm font-extrabold text-white group-hover:text-[#F2A93B] leading-snug">
                    {opt.textCallerLang}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {opt.textEnglish}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Mic & Type Input Row */}
          <div className="pt-2 border-t border-slate-700/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={isAudioRecording ? onStopVoiceAnswer : onStartVoiceAnswer}
              disabled={updatingTriage}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition shadow ${
                isAudioRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500/60'
              }`}
            >
              {isAudioRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Voice (00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>🎤 Answer by Voice</span>
                </>
              )}
            </button>

            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                aria-label={`Type answer for Question ${currentQuestionIndex + 1} of ${totalQuestions}`}
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTypedSubmit()}
                placeholder="Or type your answer in any language..."
                className="flex-1 px-3 py-2.5 bg-[#0b1523] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#F2A93B]"
              />
              <button
                type="button"
                onClick={handleTypedSubmit}
                disabled={updatingTriage || !typedAnswer.trim()}
                className="px-4 py-2.5 bg-[#F2A93B] hover:bg-[#d68f23] disabled:opacity-40 text-[#0E1B2E] font-extrabold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{updatingTriage ? 'Updating...' : 'Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE B: GUIDED FIRST AID (Starts after both questions are answered)  */}
      {/* ===================================================================== */}
      {isGuidedFirstAidActive && (
        <div
          data-testid="guided-first-aid-panel"
          className="rounded-2xl bg-[#102336] border-2 border-emerald-500/70 shadow-2xl overflow-hidden"
        >
          {/* 1. Persistent Ambulance ETA Countdown Bar at the Top the Whole Time */}
          <div
            data-testid="ambulance-eta-countdown-bar"
            className="bg-gradient-to-r from-[#163452] via-[#1b3f63] to-[#142d47] px-4 py-3 border-b border-emerald-500/40 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#F2A93B]/20 text-[#F2A93B] border border-[#F2A93B]/40">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white flex items-center gap-2">
                  <span>{ambulanceName || 'Emergency Ambulance Dispatched'}</span>
                  <span className="text-emerald-300 font-mono text-[11px]">
                    · En-Route to Incident
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Pre-Alerted Destination: <strong className="text-white">{hospitalName || 'Regional Emergency Hospital'}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#0b1828] px-3.5 py-1.5 rounded-xl border border-[#F2A93B]/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs text-slate-300 font-semibold">Ambulance ETA:</span>
              <span
                data-testid="ambulance-eta-timer"
                className="text-base font-mono font-black text-[#F2A93B]"
              >
                {formatCountdownMMSS(ambulanceEtaSeconds)}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Simulated Doctor Connection Banner (Ringing 3s -> Joined) */}
            {doctorCallState === 'ringing' && (
              <div
                data-testid="wizard-doctor-ringing-banner"
                className="p-4 rounded-xl bg-gradient-to-r from-amber-900/90 via-amber-800/90 to-amber-900/90 border-2 border-[#F2A93B] shadow-xl flex items-center justify-between gap-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#F2A93B] text-[#0E1B2E]">
                    <span className="absolute inset-0 rounded-full bg-[#F2A93B] animate-ping opacity-60" />
                    <PhoneCall className="w-5 h-5 animate-bounce relative z-10" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white">
                      Connecting to on-call doctor… (Simulated call)
                    </div>
                    <p className="text-xs text-amber-200">
                      Paging {doctorName} with AI patient brief &amp; conversation log…
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#F2A93B] bg-[#0b1523] px-2.5 py-1 rounded-lg border border-[#F2A93B]/50">
                  RINGING… (Simulated)
                </span>
              </div>
            )}

            {doctorCallState === 'connected' && (
              <div
                data-testid="wizard-doctor-joined-banner"
                className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/95 via-teal-950/95 to-emerald-950/95 border-2 border-emerald-400 shadow-xl space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-sm font-extrabold text-white">
                      👨‍⚕️ {doctorName} joined (Simulated call)
                    </span>
                    <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                      LIVE TRANSLATED BRIDGE (Simulated)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDoctorConsole || onConnectToDoctorNow}
                    className="px-3.5 py-1.5 rounded-lg bg-[#F2A93B] hover:bg-[#e09626] text-[#0E1B2E] font-extrabold text-xs shadow flex items-center gap-1.5 transition"
                  >
                    <span>Open Doctor Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {latestDoctorMessage && (
                  <div className="p-3 rounded-lg bg-[#091826] border border-emerald-500/40 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-emerald-300 font-mono">
                      <span>{doctorName} (Translated to Caller Language):</span>
                      <button
                        type="button"
                        onClick={() => onReadAloud(latestDoctorMessage.translatedText)}
                        className="flex items-center gap-1 text-amber-300 hover:text-white font-sans font-bold"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Read Aloud</span>
                      </button>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {latestDoctorMessage.translatedText}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      <strong>EN:</strong> {latestDoctorMessage.originalText}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Guided First Aid Header + "👨‍⚕️ Connect to Doctor" Button */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 block">
                  Guided First Aid · Tailored to Caller Answers
                </span>
                <h3 className="text-lg font-bold text-white">
                  {allStepsCompleted
                    ? `All ${firstAidSteps.length} First-Aid Steps Completed`
                    : `Step ${currentFirstAidStepIndex + 1} of ${firstAidSteps.length}`}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeStep && (
                  <button
                    type="button"
                    onClick={() => onReadAloud(activeStep.stepCallerLang)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-500/50 text-xs font-bold transition"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Read Step Aloud</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="wizard-connect-doctor-btn"
                  onClick={
                    doctorCallState === 'connected' && onOpenDoctorConsole
                      ? onOpenDoctorConsole
                      : onConnectToDoctorNow
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F2A93B] hover:bg-[#e09626] text-[#0E1B2E] font-extrabold text-xs shadow-md transition"
                >
                  <span>
                    {doctorCallState === 'connected'
                      ? `👨‍⚕️ ${doctorName} Joined · Open Console`
                      : doctorCallState === 'ringing'
                      ? '👨‍⚕️ Connecting to Doctor… (Simulated)'
                      : '👨‍⚕️ Connect to Doctor'}
                  </span>
                </button>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="flex items-center gap-1.5">
              {firstAidSteps.map((s, idx) => (
                <div
                  key={s.stepNumber || idx}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    idx < currentFirstAidStepIndex
                      ? 'bg-emerald-400'
                      : idx === currentFirstAidStepIndex
                      ? 'bg-[#F2A93B]'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* ONE Step at a Time with Large Text */}
            {activeStep && (
              <div
                data-testid="active-first-aid-step"
                className="p-5 rounded-2xl bg-[#0b1726] border-2 border-emerald-500/60 space-y-3 shadow-inner"
              >
                <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                  <span>
                    STEP {currentFirstAidStepIndex + 1} OF {firstAidSteps.length}
                  </span>
                  {allStepsCompleted && (
                    <span className="text-emerald-400">✓ Completed — Continue Monitoring</span>
                  )}
                </div>

                {/* Large Text in Caller's Language */}
                <p className="text-lg sm:text-xl font-extrabold text-white leading-relaxed">
                  {activeStep.stepCallerLang}
                </p>

                {/* English Translation Below */}
                <p className="text-sm sm:text-base text-slate-300 pt-2 border-t border-slate-800 leading-relaxed">
                  <strong className="text-slate-400">English:</strong>{' '}
                  {activeStep.stepEnglish}
                </p>

                {/* Action Buttons: "✅ Done – next step" and "❓ I need help" */}
                <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    disabled={updatingTriage}
                    onClick={() => onCompleteFirstAidStep(currentFirstAidStepIndex)}
                    className="flex-1 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <span>✅ Done – next step</span>
                  </button>

                  <button
                    type="button"
                    disabled={updatingTriage}
                    onClick={() =>
                      onRequestHelpOrWorsening(
                        `Caller tapped "I need help" on First-Aid Step ${
                          currentFirstAidStepIndex + 1
                        }: ${activeStep.stepEnglish}`
                      )
                    }
                    className="py-3.5 px-5 rounded-xl bg-rose-700 hover:bg-rose-600 active:scale-[0.99] text-white font-extrabold text-sm border border-rose-400/60 shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <span>❓ I need help</span>
                  </button>
                </div>
              </div>
            )}

            {/* Report Patient Got Worse / Ask Help Input */}
            <div className="p-3 rounded-xl bg-[#14263c] border border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                aria-label="Report if patient got worse or ask for help"
                value={worseningInput}
                onChange={(e) => setWorseningInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWorseningSubmit()}
                placeholder="If patient got worse or you need help, type or speak here..."
                className="flex-1 px-3 py-2 bg-[#0b1523] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-400"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isAudioRecording ? onStopVoiceAnswer : onStartVoiceAnswer}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-600"
                >
                  <Mic className="w-3.5 h-3.5 text-[#F2A93B]" />
                  <span>{isAudioRecording ? 'Stop' : '🎤 Speak'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleWorseningSubmit}
                  disabled={updatingTriage || !worseningInput.trim()}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition"
                >
                  Re-check Severity
                </button>
              </div>
            </div>

            {/* Clear "⚠️ Do NOT do" List (Dangerous Myths for this Emergency) */}
            <div
              data-testid="do-not-do-list"
              className="p-4 rounded-xl bg-rose-950/50 border-2 border-rose-500/60 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-extrabold text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>⚠️ Do NOT do (Dangerous Myths for this Emergency):</span>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-rose-100 list-disc list-inside">
                {fatalDonts.map((dont, idx) => (
                  <li key={idx} className="leading-snug font-medium">
                    {dont}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
