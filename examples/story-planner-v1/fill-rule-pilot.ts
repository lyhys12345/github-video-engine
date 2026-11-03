import {sha256} from '../../src/core/util.js';
import {mechanismBinding, type MechanismPlan} from '../../src/mechanism/plan.js';
import {loadStandaloneStory, planCapturedStory, type StorySnapshot} from '../../src/story-planner/runtime.js';

export async function prepareFillRulePilot(_root: string, data: string, output: string) {
  const quote = 'Hypothetical model: start at 5 units. When enabled and below 10 units, add 3 units per check. Manual control can set the value to 2 units.';
  const bytes = Buffer.from(quote + '\n');
  const scenes: {id: string; focus: string; caption: string; event: MechanismPlan['beats'][number]['event']}[] = [
    {id: 'initial', focus: 'vessel', caption: 'An invented container starts at 5 units.', event: {kind: 'context'}},
    {id: 'add', focus: 'vessel', caption: 'Two enabled checks add 3 units each. The second reaches 11.',
      event: {kind: 'conditional-add', rule: 'fill-check', eligible: true, count: 2, atMs: 900}},
    {id: 'limit', focus: 'level', caption: '11 is above the trigger limit. This check holds the value.',
      event: {kind: 'conditional-add', rule: 'fill-check', eligible: true, count: 1, atMs: 1300}},
    {id: 'manual', focus: 'lever', caption: 'The model switches to a manual setting of 2 units.',
      event: {kind: 'manual-assignment', control: 'manual-control', atMs: 1300, value: {
        decimal: '2', provenance: {status: 'illustrative', rationale: 'Invented manual setting.'},
      }}},
  ];
  const snapshot: StorySnapshot = {
    sources: [{id: 'authored-model', bytes}],
    graph: {
      schemaVersion: '1.0', id: 'fill-rule-pilot', name: 'Hypothetical container model',
      timing: {fps: 24, chineseCharsPerSecond: 4, wordsPerSecond: 3},
      evidence: {
        schemaVersion: '1.0', id: 'fill-evidence', name: 'Authored hypothetical model', audience: 'General audience',
        interpretation: 'agent-curated-semantic-graph-not-automatic-source-understanding',
        sources: [{id: 'authored-model', path: 'authored-model.txt',
          url: 'https://example.invalid/authored-hypothetical-fill', sha256: sha256(bytes)}],
        claims: [{id: 'authored-rule', statement: 'An authored scenario stipulates fill and manual settings.',
          kind: 'documented', rationale: 'This exact authored specification defines the hypothetical, with no external factual claim.',
          citations: [{document: 'authored-model', startLine: 1, endLine: 1, quote}]}],
        objects: [{id: 'model', kind: 'code', label: 'Authored model'}, {id: 'display', kind: 'game', label: 'Hypothetical display'}],
        actors: [{id: 'author', role: 'interpreter', label: 'Author'}],
        operations: [{id: 'illustrate', kind: 'rate-change', input: 'model', output: 'display', dependsOn: [],
          claimIds: ['authored-rule'], actorIds: ['author'], parameters: {initialRate: 5, rateMultiplier: 2}}],
        disclosure: 'The reserved URL identifies a local authored example. No external capture, project, or real tank is represented.',
      },
      shots: scenes.map(({id, caption}) => ({id, beat: 'mechanism', narration: caption, visual: caption,
        claimIds: ['authored-rule'], visualSeconds: 3, holdSeconds: 0, transitionSeconds: 0})),
    },
  };
  const task = await planCapturedStory(snapshot, data, output, new AbortController().signal);
  const binding = mechanismBinding(await loadStandaloneStory(data, task.taskId));
  const illustrative = {status: 'illustrative', rationale: 'Invented to demonstrate a generic mechanism.'} as const;
  const literal = (decimal: string) => ({decimal, provenance: illustrative});
  const plan: MechanismPlan = {
    version: 'mechanism-presentation/1.1', binding, title: 'Hypothetical fill rule',
    entities: [
      {id: 'vessel', label: 'Invented container', role: 'world', provenance: illustrative},
      {id: 'level', label: 'Fill level', role: 'state', provenance: illustrative},
      {id: 'lever', label: 'Manual fill slider', role: 'control', provenance: illustrative},
    ],
    localMappings: [],
    state: {entity: 'level', unit: 'Hypothetical fill units', initial: literal('5')},
    rules: [{id: 'fill-check', eligibilityLabel: 'Inlet enabled', eligibilityVisual: 'indicator',
      provenance: illustrative, lessThan: literal('10'), addPerEligibleUpdate: literal('3')}],
    controls: [{id: 'manual-control', entity: 'lever', glyph: 'slider', min: '0', max: '15', provenance: illustrative}],
    projection: {entity: 'vessel', kind: 'opacity', glyph: 'vessel', scale: 1 / 15,
      disclosure: 'Illustrative fill depth and opacity use a display range of 15 units.'},
    beats: scenes.map(({id, caption, focus, event}) => ({id, shot: id, caption, focus,
      claims: ['authored-rule'], durationMs: 3000, event})),
  };
  return plan;
}
