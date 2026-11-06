import {sha256} from '../src/core/util.js';
/** Predetermined mock response builder, not a language model or user review. */
export function feedbackFixture(body:any){
 const p=JSON.parse(body.messages[1].content),c=p.context,s=c.scenes.find((s:any)=>s.scene.execution.kind==='supported-story'),animation=structuredClone(s.sceneAnimation);
 animation.animation.shots[0].actions[0].end=.28;
 const text='请求先到服务器。';
 return{schemaVersion:'narrative-feedback-plan/1.1',expectedCurrentResultSha256:c.expectedCurrentResultSha256,expectedAuthorSha256:c.expectedAuthorSha256,source:c.source,feedback:{text:p.feedback,origin:'session-agent-validation',interpretedBy:'api-model',interpretation:'TEST ONLY: simplify first scene narration and accelerate its existing illustrative transfer; no new claims.'},changes:[{sceneId:s.scene.id,expectedSceneSha256:s.expectedSceneSha256,reason:'TEST ONLY explicit feedback',narration:{expectedNarrationSha256:sha256(s.scene.narration),text,captions:[{startChar:0,endChar:[...text].length,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]},visual:{expectedAnimationSha256:s.expectedAnimationSha256,description:'TEST ONLY faster authored transfer; not observed runtime speed',sceneAnimation:animation}}]};
}
