import {StorySchema} from '../contracts/story.js';
export function compileStory(raw:unknown){
 const story=StorySchema.parse(raw),{fps,chineseCharsPerSecond,wordsPerSecond}=story.timing;let frame=0;
 const shots=story.shots.map(shot=>{const han=(shot.narration.match(/\p{Script=Han}/gu)||[]).length;const words=(shot.narration.replace(/\p{Script=Han}/gu,' ').match(/[\p{L}\p{N}]+/gu)||[]).length;const speechSeconds=han/chineseCharsPerSecond+words/wordsPerSecond;const seconds=Math.max(speechSeconds,shot.visualSeconds)+shot.holdSeconds+shot.transitionSeconds;const frames=Math.ceil(seconds*fps-1e-9);const startFrame=frame;frame+=frames;return {...shot,startFrame,endFrame:frame,estimatedSpeechSeconds:speechSeconds};});
 if(frame>300*fps)throw new Error(`Estimated story exceeds five-minute limit (${frame} frames at ${fps} fps); edit content or timing`);
 return {schemaVersion:'1.0',compilerVersion:'story-planner-1',timingBasis:'estimate-not-recorded',fps,totalFrames:frame,estimatedSeconds:frame/fps,shots};
}
