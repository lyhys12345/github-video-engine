import {EngineError} from '../core/errors.js';

/** The owner's preferred local Chen-style voice is not yet connected to this runtime. */
export function requireNarrationVoice(env:NodeJS.ProcessEnv=process.env):'windows-huihui'{
 const selected=env.GVE_NARRATION_VOICE;
 if(selected==='windows-huihui')return selected;
 if(selected&&selected!=='chen-local')throw new EngineError('NARRATION_VOICE','Unknown narration voice. The default is chen-local; windows-huihui requires an explicit per-run choice.');
 throw new EngineError('CHEN_LOCAL_UNAVAILABLE','The preferred local Chen-style voice is not integrated into this narration pipeline on this machine. No paid provider or replacement voice was used. Configure a supported local Chen-style adapter before generating speech; use GVE_NARRATION_VOICE=windows-huihui only when the user explicitly requests that alternative.');
}
