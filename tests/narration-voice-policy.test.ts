import {expect,it} from 'vitest';
import {requireNarrationVoice} from '../src/workflow/narration-voice-policy.js';

it('defaults to the preferred local Chen-style voice and fails closed while it is not integrated',()=>{
 expect(()=>requireNarrationVoice({})).toThrow('preferred local Chen-style voice is not integrated');
 expect(()=>requireNarrationVoice({GVE_NARRATION_VOICE:'chen-local'})).toThrow('No paid provider or replacement voice was used');
});
it('allows the legacy local voice only as an explicit per-run alternative and rejects unknown choices',()=>{
 expect(requireNarrationVoice({GVE_NARRATION_VOICE:'windows-huihui'})).toBe('windows-huihui');
 expect(()=>requireNarrationVoice({GVE_NARRATION_VOICE:'other'})).toThrow('Unknown narration voice');
});
