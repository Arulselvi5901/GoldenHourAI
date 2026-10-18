import { ensureWavAudioBase64, mapLanguageToBcp47 } from './triageFlowLogic';

export interface SpeakApiResponse {
  audioBase64: string;
  mimeType: string;
  sampleRate: number;
  model?: string;
  language?: string;
}

// Client-side cache of synthesized Gemini TTS clips so repeating (*) or re-playing is instant
const clientSpeakCache = new Map<string, SpeakApiResponse>();
const inFlightSpeakRequests = new Map<string, Promise<SpeakApiResponse | null>>();

// Single shared AudioContext owned by the Caller Phone (unlocked on green CALL button / user tap)
let callerAudioContext: AudioContext | null = null;
let callerAudioUnlocked = false;

// Separate AudioContext for Operations view manual "🔊 play" buttons so Operations NEVER cancels caller audio
let operationsPreviewAudioContext: AudioContext | null = null;
let activeOperationsSource: AudioBufferSourceNode | null = null;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

/**
 * Returns the ONE shared AudioContext for the Caller Phone.
 */
export function getOrCreateCallerAudioContext(): AudioContext | null {
  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) return null;
  if (!callerAudioContext || callerAudioContext.state === 'closed') {
    try {
      callerAudioContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  return callerAudioContext;
}

/**
 * Unlocks and resumes the Caller Phone's single AudioContext on a direct user tap
 * (such as pressing the green CALL button, any keypad key, or "🔇 Tap to enable sound").
 */
export async function unlockCallerAudioContext(): Promise<boolean> {
  const ctx = getOrCreateCallerAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await Promise.race([
        ctx.resume(),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    }
    // Play a 1-sample silent buffer to unlock Web Audio playback on iOS/Android/Chrome
    const silentBuffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(ctx.destination);
    source.start(0);
    callerAudioUnlocked = ctx.state === 'running';
    return callerAudioUnlocked;
  } catch {
    return false;
  }
}

export function isCallerAudioContextRunning(): boolean {
  return Boolean(callerAudioContext && callerAudioContext.state === 'running');
}

/**
 * Calls POST /api/speak to convert text to speech using Gemini TTS in the caller's language.
 * Returns null if Gemini TTS fails so the caller phone can fall back to browser speechSynthesis.
 */
export async function fetchGeminiSpeakAudio(
  text: string,
  language: string = 'English',
  role: 'operator' | 'doctor' | 'caller' = 'operator'
): Promise<SpeakApiResponse | null> {
  const cleanText = (text || '').trim();
  if (!cleanText) return null;

  const cacheKey = `${role}:${(language || 'English').toLowerCase()}:${cleanText}`;
  const cached = clientSpeakCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const existingInFlight = inFlightSpeakRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const requestPromise = (async (): Promise<SpeakApiResponse | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          language: language || 'English',
          role,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data || typeof data.audioBase64 !== 'string' || !data.audioBase64) {
        return null;
      }

      const normalized = ensureWavAudioBase64(
        data.audioBase64,
        data.mimeType || 'audio/wav',
        data.sampleRate || 24000
      );

      const result: SpeakApiResponse = {
        audioBase64: normalized.audioBase64,
        mimeType: normalized.mimeType,
        sampleRate: normalized.sampleRate,
        model: data.model,
        language: data.language || language,
      };

      if (clientSpeakCache.size >= 100) {
        const firstKey = clientSpeakCache.keys().next().value;
        if (firstKey) clientSpeakCache.delete(firstKey);
      }
      clientSpeakCache.set(cacheKey, result);
      return result;
    } catch {
      return null;
    } finally {
      inFlightSpeakRequests.delete(cacheKey);
    }
  })();

  inFlightSpeakRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Decodes a base64 WAV (or raw L16 PCM) payload into a Web Audio API AudioBuffer.
 */
export async function decodeBase64ToAudioBuffer(
  ctx: AudioContext,
  audioBase64: string,
  fallbackSampleRate = 24000
): Promise<AudioBuffer | null> {
  try {
    const clean = audioBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const binary = window.atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    try {
      // Try native browser WAV decoding first (cloning buffer because decodeAudioData detaches it)
      const arrayBufCopy = bytes.buffer.slice(0);
      return await ctx.decodeAudioData(arrayBufCopy);
    } catch {
      // Manual 16-bit signed little-endian PCM fallback (skipping 44-byte RIFF header if present)
      const isRiff =
        bytes.length >= 44 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46;
      const offset = isRiff ? 44 : 0;
      const pcmByteLength = bytes.length - offset;
      const numSamples = Math.floor(pcmByteLength / 2);
      if (numSamples <= 0) return null;

      const audioBuffer = ctx.createBuffer(1, numSamples, fallbackSampleRate);
      const channelData = audioBuffer.getChannelData(0);
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, numSamples * 2);

      for (let i = 0; i < numSamples; i++) {
        const int16 = view.getInt16(i * 2, true);
        channelData[i] = int16 / 32768.0;
      }
      return audioBuffer;
    }
  } catch {
    return null;
  }
}

/**
 * Fallback browser speechSynthesis player when Gemini TTS fails.
 * Never calls speechSynthesis.cancel() during normal queue processing so queued utterances never cancel each other.
 */
export function speakWithBrowserFallback(
  text: string,
  detectedLanguage: string | undefined,
  callbacks: {
    onStart?: () => void;
    onDone: () => void;
    onVoiceUnavailable: () => void;
  }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks.onVoiceUnavailable();
    setTimeout(callbacks.onDone, 900);
    return;
  }

  try {
    const voices = window.speechSynthesis.getVoices();
    const { langCode, prefix } = mapLanguageToBcp47(detectedLanguage || 'English');

    const matchingVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(prefix) ||
        v.lang.toLowerCase().replace('_', '-').includes(langCode.toLowerCase())
    );

    if (voices.length > 0 && !matchingVoice) {
      callbacks.onVoiceUnavailable();
      setTimeout(callbacks.onDone, 900);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang || langCode;
    } else {
      utterance.lang = langCode;
    }
    utterance.rate = 0.96;
    utterance.pitch = 1.0;

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      callbacks.onDone();
    };

    const fallbackTimeout = setTimeout(
      finishOnce,
      Math.min(6000, Math.max(1500, text.length * 55))
    );

    utterance.onstart = () => {
      callbacks.onStart?.();
    };
    utterance.onend = () => {
      clearTimeout(fallbackTimeout);
      finishOnce();
    };
    utterance.onerror = () => {
      clearTimeout(fallbackTimeout);
      finishOnce();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    callbacks.onVoiceUnavailable();
    setTimeout(callbacks.onDone, 800);
  }
}

/**
 * Isolated manual audio playback for the Operations Command Centre & Doctor Console "🔊 play" buttons.
 * Uses its own AudioContext and NEVER touches or cancels the Caller Phone's speech queue.
 */
export async function playOperationsManualAudio(
  text: string,
  language: string = 'English',
  role: 'operator' | 'doctor' | 'caller' = 'operator'
): Promise<boolean> {
  const cleanText = (text || '').trim();
  if (!cleanText) return false;

  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) return false;

  if (!operationsPreviewAudioContext || operationsPreviewAudioContext.state === 'closed') {
    try {
      operationsPreviewAudioContext = new AudioCtx();
    } catch {
      return false;
    }
  }

  const ctx = operationsPreviewAudioContext;
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch {
    // Ignore
  }

  if (activeOperationsSource) {
    try {
      activeOperationsSource.stop();
    } catch {
      // Ignore
    }
    activeOperationsSource = null;
  }

  const speakRes = await fetchGeminiSpeakAudio(cleanText, language, role);
  if (!speakRes?.audioBase64) {
    return false;
  }

  const audioBuffer = await decodeBase64ToAudioBuffer(
    ctx,
    speakRes.audioBase64,
    speakRes.sampleRate
  );
  if (!audioBuffer) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeOperationsSource = source;
      source.onended = () => {
        if (activeOperationsSource === source) {
          activeOperationsSource = null;
        }
        resolve(true);
      };
      source.start(0);
    } catch {
      resolve(false);
    }
  });
}

// ============================================================================
// INCOMING DOCTOR CALL RINGTONE (Web Audio API Dual-Tone Cadence)
// ============================================================================
let ringtoneIntervalId: ReturnType<typeof setInterval> | null = null;
let isRingtonePlaying = false;

function playSingleRingBurst(): void {
  const ctx = getOrCreateCallerAudioContext();
  if (!ctx) return;

  const triggerBurst = () => {
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      // Two short ring pulses (0.18s + 0.18s) at gentle volume so speech remains clear
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.setValueAtTime(0.06, now + 0.18);
      gain.gain.setValueAtTime(0.001, now + 0.22);
      gain.gain.setValueAtTime(0.06, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch {
      // Ignore ringtone error
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(triggerBurst).catch(() => {});
  } else if (ctx.state === 'running') {
    triggerBurst();
  }
}

export function startDoctorRingtone(): void {
  if (isRingtonePlaying) return;
  isRingtonePlaying = true;
  playSingleRingBurst();
  ringtoneIntervalId = setInterval(() => {
    if (!isRingtonePlaying) return;
    playSingleRingBurst();
  }, 2400);
}

export function stopDoctorRingtone(): void {
  isRingtonePlaying = false;
  if (ringtoneIntervalId) {
    clearInterval(ringtoneIntervalId);
    ringtoneIntervalId = null;
  }
}

