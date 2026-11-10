import {EngineError} from '../core/errors.js';

/** Never silently select a replacement voice. Availability is checked by the local adapter. */
export function requireNarrationVoice(env:NodeJS.ProcessEnv=process.env):'windows-huihui'|'chen-local'|'anna-local'{
 const selected=env.GVE_NARRATION_VOICE;
 if(!selected)return 'anna-local';
 if(selected==='anna-local'||selected==='chen-local'||selected==='windows-huihui')return selected;
 throw new EngineError('NARRATION_VOICE','Unknown narration voice. Choose anna-local, chen-local, or windows-huihui.');
}
