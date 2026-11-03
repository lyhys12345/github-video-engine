import {resolve} from 'node:path';
import {captureEvidence, loadStandaloneStory, planCapturedStory} from '../../src/story-planner/runtime.js';
import {mechanismBinding, type MechanismPlan} from '../../src/mechanism/plan.js';

export async function prepareReaRulePilot(root: string, data: string, output: string) {
  const snapshot = await captureEvidence(resolve(root, 'examples/story-planner-v1/rea.json'), root);
  const beats = [
    ['source', 'handoff', 'page', 'The official example reports that REA returned the loaded script.'],
    ['first', 'rule', 'code', 'On an eligible update, compare the value before adding.'],
    ['repeat', 'rule', 'track', 'Many eligible updates are compressed into this scene.'],
    ['skip', 'rule', 'speed', 'After a collision, this branch skips its increment.'],
    ['approach', 'rule', 'track', 'Compressed eligible checks bring the value to 13.'],
    ['limit', 'rule', 'speed', 'At 13, the next eligible check leaves speed unchanged.'],
    ['manual', 'rebuild', 'slider', 'The teaching reconstruction sets a fixed value via its slider.'],
  ] as const;
  snapshot.graph = {...snapshot.graph, id: 'rea-rule-pilot', name: 'REA rule pilot',
    shots: beats.map(([id, claim, , caption]) => ({id, beat: 'mechanism', narration: caption,
      visual: caption, claimIds: [claim], visualSeconds: 3, holdSeconds: 0, transitionSeconds: 0}))};
  const signal = new AbortController().signal;
  const task = await planCapturedStory(snapshot, data, output, signal);
  const story = await loadStandaloneStory(data, task.taskId);
  function cite(claimId: string, rationale: string) {
    const claim = story.snapshot.graph.evidence.claims.find(claim => claim.id === claimId)!;
    const {document: source, startLine, endLine, quote} = claim.citations[0]!;
    return {status: claim.kind, claim: claimId, source, startLine, endLine, quote, rationale};
  }
  const reported = cite('handoff', 'The official page describes the script retrieval.');
  const rule = cite('rule', 'The official excerpt states the condition, increment, settings and eligible updates.');
  const control = cite('rebuild', 'The teaching implementation uses a slider to assign fixed speed.');
  const visual = {status: 'illustrative', rationale: 'Synthetic teaching art and authored values.'} as const;
  const events: MechanismPlan['beats'][number]['event'][] = [
    {kind: 'context'},
    {kind: 'conditional-add', rule: 'update-rule', eligible: true, count: 1, atMs: 1300},
    {kind: 'conditional-add', rule: 'update-rule', eligible: true, count: 999, atMs: 400},
    {kind: 'conditional-add', rule: 'update-rule', eligible: false, count: 1, atMs: 1300},
    {kind: 'conditional-add', rule: 'update-rule', eligible: true, count: 6000, atMs: 600},
    {kind: 'conditional-add', rule: 'update-rule', eligible: true, count: 1, atMs: 1300},
    {kind: 'manual-assignment', control: 'slider-input', value: {decimal: '4', provenance: visual}, atMs: 1300},
  ];
  const plan: MechanismPlan = {
    version: 'mechanism-presentation/1.1', binding: mechanismBinding(story), title: 'Inside one speed rule',
    entities: [
      {id: 'page', label: 'Official example page', role: 'source', provenance: reported},
      {id: 'code', label: 'Reported script excerpt', role: 'artifact', provenance: rule},
      {id: 'track', label: 'Teaching runner', role: 'world', provenance: visual},
      {id: 'speed', label: 'Speed value', role: 'state', provenance: rule},
      {id: 'slider', label: 'Teaching reconstruction slider', role: 'control', provenance: control},
    ],
    localMappings: [{shot: 'first', object: 'loaded-code', entity: 'code'},
      {shot: 'repeat', object: 'game', entity: 'track'}, {shot: 'manual', object: 'demo', entity: 'slider'}],
    state: {entity: 'speed', unit: 'Source speed units', initial: {decimal: '6', provenance: rule}},
    rules: [{id: 'update-rule', eligibilityLabel: 'No collision', eligibilityVisual: 'collision', provenance: rule,
      lessThan: {decimal: '13', provenance: rule}, addPerEligibleUpdate: {decimal: '0.001', provenance: rule}}],
    controls: [{id: 'slider-input', entity: 'slider', glyph: 'slider', min: '0', max: '16', provenance: control}],
    projection: {entity: 'track', kind: 'integrated-distance', glyph: 'track', scale: 27,
      disclosure: 'Illustrative runner motion and compressed update schedule.'},
    beats: beats.map(([shot, claim, focus, caption], index) => ({
      id: shot, shot, focus, caption, claims: [claim],
      excerpt: claim === 'handoff' ? {citation: reported, from: 302, to: 303} :
        claim === 'rule' ? {citation: rule, from: 309, to: 311} : {citation: control, from: 339, to: 339},
      durationMs: shot === 'approach' ? 7000 : 3000, event: events[index]!,
    })),
  };
  return plan;
}
