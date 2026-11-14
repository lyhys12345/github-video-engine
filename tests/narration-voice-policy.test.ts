import {expect,it} from 'vitest';
import {narrationAdapterBlocker, publicVoicePresets, requireNarrationVoice} from '../src/workflow/narration-voice-policy.js';

it('defaults to the preferred local Anna-style voice',()=>{
 expect(requireNarrationVoice({})).toBe('anna-local');
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'anna-local'})).toBe('anna-local');
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'chen-local'})).toBe('chen-local');
});
it('allows the legacy local voice only as an explicit per-run alternative and rejects unknown choices',()=>{
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'windows-huihui'})).toBe('windows-huihui');
 expect(()=>requireNarrationVoice({GVE_NARRATION_VOICE:'other'})).toThrow('Unknown narration voice');
});

it('offers both public speaker presets while keeping private alternatives Chinese-only',()=>{
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'qwen-public'})).toBe('qwen-public');
 expect(publicVoicePresets).toEqual({'zh-CN':'Serena','en-US':'Ryan'});
 for(const language of ['zh-CN','en-US']){
  expect(narrationAdapterBlocker('local',language,'qwen-public')).toBeUndefined();
 }
 expect(narrationAdapterBlocker('local','ja-JP','qwen-public')).toContain('Serena');
 for(const profile of ['anna-local','chen-local','windows-huihui'] as const){
  expect(narrationAdapterBlocker('local','en-US',profile)).toContain('zh-CN only');
 }
});
