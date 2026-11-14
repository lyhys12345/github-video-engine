import {readFile} from 'node:fs/promises';
import type {z} from 'zod';
import type {AuthoringBinding} from '../src/contracts/authoring.js';
import type {Story} from '../src/contracts/story.js';

type FixtureSource = {
  first: {binding: z.infer<typeof AuthoringBinding>; source: {taskId: string; bindingSha256: string}};
  guide: {authoringRequestId: string; sources: Story['evidence']['sources']};
  quote?: string;
};

export async function narrativeAuthorFixture({first, guide, quote}: FixtureSource, mode: 'api' | 'silent' = 'api') {
  const story: Story = JSON.parse(await readFile('examples/http-story-v1/express-story.json', 'utf8'));
  const animation = await readFile('examples/http-story-v1/express-animation.json', 'utf8');
  const source = guide.sources[0]!;
  const silent = mode === 'silent';
  story.evidence.sources = guide.sources;
  // These assertions are fixtures with exact source descriptors and no semantic acceptance.
  for (const claim of story.evidence.claims) {
    claim.citations = [{document: source.id, startLine: 2, endLine: 2, quote: quote ?? 'Removes image backgrounds.'}];
  }
  if (silent) story.evidence.disclosure = 'TEST ONLY. The synthetic routing example is read as evidence text and is never executed.';
  const shots = story.shots.map(shot => ({
    ...shot,
    narration: silent ? 'A fixture illustrates the request and reply.' : '测试旁白。',
    visual: 'TEST ONLY mock author data, no semantic acceptance',
    visualSeconds: 4,
    holdSeconds: 0,
    transitionSeconds: 0,
  }));
  const claims = story.evidence.claims.map(claim => ({
    id: claim.id,
    statement: claim.statement,
    basis: claim.kind === 'inference' ? {kind: claim.kind, reasoning: claim.rationale} : {kind: claim.kind},
    citations: claim.citations.map(({document, ...citation}) => ({...citation, sourceId: document, sourceSha256: source.sha256})),
  }));
  const scenes = shots.map((shot, index) => ({
    id: shot.id, role: ['hook', 'mechanism', 'example'][index],
    title: 'TEST ONLY', narration: shot.narration, visual: shot.visual, onScreenText: [],
    claimIds: shot.claimIds, estimatedSeconds: 4, transitionToNext: 'TEST ONLY',
    execution: {kind: 'supported-story', adapter: 'http', storyTaskId: '$SCENE_STORY_TASK_ID',
      expectedGraphHash: '$SCENE_STORY_GRAPH_HASH', shotIds: [shot.id]},
  }));
  const gap = {narration: 'TEST ONLY unproduced', visual: 'TEST ONLY', onScreenText: [], claimIds: [], estimatedSeconds: 2};
  const narrationIdentity = silent ? {
    schemaVersion: 'repository-narrative-plan/1.0', authorship: {kind: 'human'},
    interpretation: 'human-or-session-agent-authored-not-automatic-repository-understanding',
  } : {
    schemaVersion: 'repository-narrative-plan/1.1', authorship: {kind: 'api-model'},
    interpretation: 'api-model-authored-not-semantic-approval',
  };
  const plan = {
    ...narrationIdentity, binding: first.binding, authoringRequestId: guide.authoringRequestId,
    brief: {
      title: silent ? 'TEST ONLY silent fixture' : 'TEST ONLY API mock', audience: 'structural fixture',
      question: 'TEST ONLY question', thesis: 'TEST ONLY thesis', scope: 'No semantic acceptance',
      exclusions: [], claimIds: claims.map(claim => claim.id),
    },
    claims,
    scenes: [
      ...scenes,
      {...gap, id: 'gap', role: 'limitation', title: 'Unverified', transitionToNext: 'TEST ONLY',
        execution: {kind: 'needs-evidence', reason: 'No runtime observation', missingEvidence: 'Measured output'}},
      {...gap, id: 'closing', role: 'closing', title: 'Pending', transitionToNext: '',
        execution: {kind: 'needs-adapter', reason: 'Not implemented', requiredCapability: 'New capability'}},
    ],
    openQuestions: ['Semantic review pending'],
  };
  const run = {
    schemaVersion: 'repository-narrative-run-author/2.0', profile: 'complete-technical-preview/1.0',
    captureTaskId: first.source.taskId, bindingSha256: first.source.bindingSha256, presentation: 'generic',
    selection: plan.scenes.map(scene => scene.execution.kind === 'supported-story'
      ? {kind: 'story-slice', sceneId: scene.id, slices: [{shotId: scene.id, startFrame: 0, endFrame: 120}]}
      : {kind: 'placeholder', sceneId: scene.id, frames: 60}),
    speech: silent ? [] : shots.map(shot => ({sceneId: shot.id, captions: [
      {startChar: 0, endChar: [...shot.narration].length, startSample: 0, endSample: '$FULL_RECORDING_SAMPLES'},
    ]})),
  };
  return {
    storyJson: JSON.stringify({...story, shots}),
    narrativeJson: JSON.stringify(plan),
    animationJson: JSON.stringify(JSON.parse(animation)),
    runJson: JSON.stringify(run),
  };
}
