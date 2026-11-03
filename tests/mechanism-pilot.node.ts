import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {prepareReaRulePilot} from '../examples/story-planner-v1/rea-rule-pilot.js';
import {prepareFillRulePilot} from '../examples/story-planner-v1/fill-rule-pilot.js';
import {loadMechanism, mechanismBinding} from '../src/mechanism/plan.js';
import {evaluateMechanism, mechanismFrame} from '../src/mechanism/state.js';
import {mechanismSvg} from '../src/mechanism/visual.js';
import {loadStandaloneStory, planCapturedStory, verifyCaptured} from '../src/story-planner/runtime.js';

test('standalone evidence, deterministic rule, strict inputs and reusable visual', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gve-rule-'));
  try {
    const data = join(dir, 'data');
    const plan = await prepareReaRulePilot(process.cwd(), data, join(dir, 'story'));
    const load = (candidate: unknown) => loadMechanism(data, Buffer.from(JSON.stringify(candidate)));
    const valid = await load(plan);
    const evaluation = evaluateMechanism(valid.plan);
    const {trace} = evaluation;
    assert.equal(trace[0]!.value, 60_000);
    assert.equal(trace[1]!.value, 60_010);
    assert.equal(trace[1000]!.value, 70_000);
    assert.equal(trace[1001]!.value, 70_000);
    assert.equal(trace[1001]!.result, 'ineligible');
    assert.equal(trace[7002]!.value, 130_000);
    assert.equal(trace[7002]!.result, 'threshold');
    assert.equal(trace[7003]!.value, 40_000);
    assert.equal(trace[7003]!.update, 7002);
    assert.equal(trace[7003]!.mode, 'manual');
    assert.equal(mechanismFrame(evaluation, 4299).value, 6);
    assert.equal(mechanismFrame(evaluation, 4300).value, 6.001);
    const beforeManual = mechanismFrame(evaluation, 23299);
    const afterManual = mechanismFrame(evaluation, 23300);
    assert.ok(Math.abs(afterManual.integrated - beforeManual.integrated - 0.013) < 1e-10);
    assert.match(mechanismSvg(valid.plan, evaluation, 4300), /6\.001/);
    assert.match(mechanismSvg(valid.plan, evaluation, 10300), /data-condition="collision"/);
    assert.match(mechanismSvg(valid.plan, evaluation, 21999), /13 ≥ 13/);
    assert.match(mechanismSvg(valid.plan, evaluation, 23300), /data-glyph="slider"/);

    const hypothetical = structuredClone(plan);
    const illustrative = {status: 'illustrative', rationale: 'Authored hypothetical inputs'} as const;
    hypothetical.state.initial = {decimal: '12.9995', provenance: illustrative};
    hypothetical.title = 'Threshold boundary hypothesis';
    const eleven = [...hypothetical.beats];
    for (let index = 0; index < 4; index++) {
      eleven.unshift({...hypothetical.beats[0]!, id: 'extra-' + index, event: {kind: 'context'}});
    }
    hypothetical.beats = eleven;
    const variant = await load(hypothetical);
    assert.notEqual(variant.sidecarHash, valid.sidecarHash);
    const variantEval = evaluateMechanism(variant.plan);
    assert.equal(variantEval.trace[1]!.value, 130_005);
    assert.equal(variantEval.trace[2]!.value, 130_005);
    assert.equal(variantEval.trace[2]!.result, 'threshold');
    for (const beat of variantEval.timeline) assert.match(mechanismSvg(variant.plan, variantEval, beat.start), /data-glyph="track"/);
    assert.equal(variantEval.timeline.length, 11);

    const story = await loadStandaloneStory(data, plan.binding.storyTaskId);
    const graph = story.snapshot.graph;
    const [first, , third, , , , last] = graph.shots;
    const grouped = {...story.snapshot, graph: {...graph, id: 'grouped', shots: [first!, third!, last!]}};
    const groupedTask = await planCapturedStory(grouped, data, join(dir, 'grouped'), new AbortController().signal);
    const groupedBinding = mechanismBinding(await loadStandaloneStory(data, groupedTask.taskId));
    const three = await load({...plan, binding: groupedBinding, localMappings: [],
      beats: [plan.beats[0], plan.beats[2], plan.beats[6]]});
    const threeEval = evaluateMechanism(three.plan);
    assert.equal(threeEval.timeline.length, 3);
    for (const beat of threeEval.timeline) assert.match(mechanismSvg(three.plan, threeEval, beat.start), /SILENT PREVIEW/);

    const forgedTask = await planCapturedStory(story.snapshot, data, join(dir, 'forged'),
      new AbortController().signal, {projectId: 'forged', repository: 'https://github.com/morluto/rea',
        commit: '0'.repeat(40), snapshotHash: '0'.repeat(64), evidenceFingerprint: '0'.repeat(64)});
    await assert.rejects(load({...plan, binding: {...plan.binding, storyTaskId: forgedTask.taskId}}), /standalone Story/);
    const sources = story.snapshot.sources.map(source => ({...source, bytes: Buffer.from(source.bytes)}));
    sources[0]!.bytes[0] = sources[0]!.bytes[0]! ^ 1;
    assert.throws(() => verifyCaptured(graph, sources), /Source hash mismatch/);
    await assert.rejects(load({...plan, binding: {...plan.binding, graphHash: '0'.repeat(64)}}), /binding mismatch/);
    await assert.rejects(load({...plan, beats: plan.beats.slice(0, 4)}), /every Story shot/);
    const malformed = structuredClone(plan);
    malformed.rules[0]!.lessThan.decimal = '12.34';
    await assert.rejects(load(malformed), /numeric value is absent/);
    const parameter = plan.rules[0]!.lessThan;
    assert.notEqual(parameter.provenance.status, 'illustrative');
    if (parameter.provenance.status !== 'illustrative') {
      malformed.rules[0]!.lessThan = {...parameter, provenance: {...parameter.provenance, claim: 'handoff'}};
    }
    await assert.rejects(load(malformed), /invalid claim|exact citation/);
    await assert.rejects(load({...plan, beats: plan.beats.map(beat =>
      beat.id === 'first' ? {...beat, event: {...beat.event, kind: 'eval'}} : beat)}));

    const fill = await prepareFillRulePilot(process.cwd(), data, join(dir, 'fill-story'));
    const loadedFill = await load(fill);
    const fillEval = evaluateMechanism(loadedFill.plan);
    assert.deepEqual(fillEval.trace.map(point => [point.value, point.result]),
      [[50000, 'initial'], [80000, 'added'], [110000, 'added'], [110000, 'threshold'], [20000, 'assigned']]);
    const vessel = mechanismSvg(loadedFill.plan, fillEval, 7900);
    assert.match(vessel, /data-glyph="vessel"/);
    assert.match(vessel, /73% display fill/);
    assert.doesNotMatch(vessel, /data-glyph="track"|No collision/);
    const modified = structuredClone(fill);
    modified.state.initial.decimal = '4';
    const changed = await load(modified);
    assert.notEqual(changed.sidecarHash, loadedFill.sidecarHash);
    assert.notEqual(mechanismSvg(changed.plan, evaluateMechanism(changed.plan), 0), mechanismSvg(loadedFill.plan, fillEval, 0));
    assert.equal(mechanismFrame(fillEval, 0).value, 5);
    await assert.rejects(load({...fill, binding: plan.binding}), /invalid beat focus or shot order|beat claim/);
    await assert.rejects(load({...fill, projection: {...fill.projection, glyph: 'track'}}));
    await assert.rejects(load({...fill, controls: fill.controls.map(control => ({...control, max: '1'}))}), /outside slider bounds/);
    await assert.rejects(load({...fill, rules: fill.rules.map(rule => ({...rule, eligibilityVisual: 'collision'}))}), /requires a track/);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
