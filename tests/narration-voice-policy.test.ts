import {expect,it} from 'vitest';
import {requireNarrationVoice} from '../src/workflow/narration-voice-policy.js';

it('defaults to the preferred local Anna-style voice',()=>{
 expect(requireNarrationVoice({})).toBe('anna-local');
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'anna-local'})).toBe('anna-local');
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'chen-local'})).toBe('chen-local');
});
it('allows the legacy local voice only as an explicit per-run alternative and rejects unknown choices',()=>{
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'windows-huihui'})).toBe('windows-huihui');
 expect(()=>requireNarrationVoice({GVE_NARRATION_VOICE:'other'})).toThrow('Unknown narration voice');
});
