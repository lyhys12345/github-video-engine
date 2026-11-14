import {EngineError} from '../core/errors.js';

export const localNarrationVoices = ['anna-local', 'chen-local', 'windows-huihui', 'qwen-public'] as const;
export type LocalNarrationVoice = typeof localNarrationVoices[number];
export const compositionLanguages = ['zh-CN', 'en-US'] as const;
export type CompositionLanguage = typeof compositionLanguages[number];
export const publicVoicePresets = {'zh-CN': 'Serena', 'en-US': 'Ryan'} as const;

export function isLocalNarrationVoice(value: string): value is LocalNarrationVoice {
  return localNarrationVoices.some(voice => voice === value);
}

export function isCompositionLanguage(value: string): value is CompositionLanguage {
  return compositionLanguages.some(language => language === value);
}

export function narrationAdapterBlocker(mode: string, language: string, profile?: LocalNarrationVoice): string | undefined {
  if (mode === 'undecided') return 'Choose a supported narration mode.';
  if (mode === 'reference') return 'Reference audio alone needs a voice-cloning adapter. A configured local voice or authorized finished WAV can be used.';
  if (mode === 'byo-api') return 'Custom API narration needs an adapter in the standard run. Use an authorized finished WAV.';
  if (mode === 'local' && profile === 'qwen-public') {
    if (!isCompositionLanguage(language)) return 'The public Qwen presets support zh-CN (Serena) and en-US (Ryan).';
  } else if (mode === 'local' && language !== 'zh-CN') return 'This local synthesis profile supports zh-CN only.';
  if ((mode === 'imported' || mode === 'none') && !isCompositionLanguage(language)) return 'The standard preview supports zh-CN and en-US. This language needs a composition adapter.';
  return undefined;
}

/** Never silently select a replacement voice. Availability is checked by the local adapter. */
export function requireNarrationVoice(env: NodeJS.ProcessEnv = process.env): LocalNarrationVoice {
  const selected = env.GVE_NARRATION_VOICE;
  if (!selected) return 'anna-local';
  if (isLocalNarrationVoice(selected)) return selected;
  throw new EngineError('NARRATION_VOICE', `Unknown narration voice. Choose ${localNarrationVoices.join(', ')}.`);
}
