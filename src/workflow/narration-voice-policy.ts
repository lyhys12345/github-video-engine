import {EngineError} from '../core/errors.js';

/** Never silently select a replacement voice. Availability is checked by the local adapter. */
export function requireNarrationVoice(env:NodeJS.ProcessEnv=process.env):'windows-huihui'|'chen-local'{
 const selected=env.GVE_NARRATION_VOICE;
 if(selected==='windows-huihui')return selected;
 if(selected&&selected!=='chen-local')throw new EngineError('NARRATION_VOICE','Unknown narration voice. The default is chen-local; windows-huihui requires an explicit per-run choice.');
 return 'chen-local';
}
