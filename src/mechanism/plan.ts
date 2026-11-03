import {z} from 'zod';
import {canonical, sha256} from '../core/util.js';
import {loadStandaloneStory} from '../story-planner/runtime.js';
import {isXmlText} from './xml.js';

const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const xmlText = z.string().refine(isXmlText, 'invalid XML 1.0 character');
const text = z.string().refine(isXmlText, 'invalid XML 1.0 character').pipe(z.string().trim().min(1).max(160));
const decimal = z.string().regex(/^-?(0|[1-9][0-9]{0,3})(\.[0-9]{1,4})?$/);
const evidence = z.object({
  status: z.enum(['documented', 'inference']),
  claim: id, source: id, startLine: z.number().int().positive(),
  endLine: z.number().int().positive(), quote: xmlText.pipe(z.string().min(1).max(3000)),
  rationale: text,
}).strict();
const provenance = z.union([evidence, z.object({status: z.literal('illustrative'), rationale: text}).strict()]);
const value = z.object({decimal, provenance}).strict();
const event = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('context')}).strict(),
  z.object({kind: z.literal('conditional-add'), rule: id, eligible: z.boolean(),
    count: z.number().int().min(1).max(10000), atMs: z.number().int().nonnegative()}).strict(),
  z.object({kind: z.literal('manual-assignment'), control: id, value, atMs: z.number().int().nonnegative()}).strict(),
]);
const planSchema = z.object({
  version: z.literal('mechanism-presentation/1.1'),
  binding: z.object({storyTaskId: hash, graphHash: hash, sourceManifestHash: hash}).strict(),
  title: text,
  entities: z.array(z.object({id, label: text, role: z.enum(['world','source','artifact','state','control']),
    provenance}).strict()).min(1).max(12),
  localMappings: z.array(z.object({shot: id, object: id, entity: id}).strict()).max(100),
  state: z.object({entity: id, unit: text, initial: value}).strict(),
  rules: z.array(z.object({id, eligibilityLabel: text, eligibilityVisual: z.enum(['collision', 'indicator']), provenance,
    lessThan: value, addPerEligibleUpdate: value}).strict()).min(1).max(8),
  projection: z.discriminatedUnion('kind', [
    z.object({entity: id, kind: z.literal('integrated-distance'), glyph: z.literal('track'),
      scale: z.number().positive().max(100), disclosure: text}).strict(),
    z.object({entity: id, kind: z.literal('opacity'), glyph: z.literal('vessel'),
      scale: z.number().positive().max(100), disclosure: text}).strict(),
  ]),
  controls: z.array(z.object({id, entity: id, glyph: z.literal('slider'),
    min: decimal, max: decimal, provenance}).strict()).max(8),
  beats: z.array(z.object({id, shot: id, focus: id, caption: text,
    claims: z.array(id).max(10), excerpt: z.object({citation: evidence, from: z.number().int().positive(),
      to: z.number().int().positive()}).strict().optional(),
    durationMs: z.number().int().min(100).max(30000), event}).strict()).min(1).max(100),
}).strict();

export type MechanismPlan = z.infer<typeof planSchema>;
type Evidence = z.infer<typeof evidence>;
type Provenance = z.infer<typeof provenance>;
type Standalone = Awaited<ReturnType<typeof loadStandaloneStory>>;
export const fixed = (decimal: string) => {
  const [whole, fraction = ''] = decimal.replace(/^-/, '').split('.');
  return (Number(whole) * 10000 + Number(fraction.padEnd(4, '0'))) * (decimal.startsWith('-') ? -1 : 1);
};

function demand(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('MECHANISM: ' + message);
}

export function mechanismBinding(story: Standalone): MechanismPlan['binding'] {
  const sources = story.snapshot.graph.evidence.sources.map(({id, url, sha256}) => ({id, url, sha256}));
  return {storyTaskId: story.taskId, graphHash: story.graphHash, sourceManifestHash: sha256(canonical(sources))};
}

export async function loadMechanism(data: string, sidecar: Buffer) {
  demand(sidecar.length <= 256000, 'sidecar exceeds byte limit');
  const plan = planSchema.parse(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(sidecar)));
  const story = await loadStandaloneStory(data, plan.binding.storyTaskId);
  demand(canonical(plan.binding) === canonical(mechanismBinding(story)), 'Story binding mismatch');
  const graph = story.snapshot.graph;
  const claims = new Map(graph.evidence.claims.map(claim => [claim.id, claim]));
  const shots = new Map(graph.shots.map((shot, index) => [shot.id, {index, ...shot}]));
  const entities = new Map(plan.entities.map(entity => [entity.id, entity]));
  const rules = new Map(plan.rules.map(rule => [rule.id, rule]));
  const controls = new Map(plan.controls.map(control => [control.id, control]));
  demand(entities.size === plan.entities.length && rules.size === plan.rules.length, 'duplicate entity or rule');
  demand(controls.size === plan.controls.length, 'duplicate control');
  demand(new Set(plan.beats.map(beat => beat.id)).size === plan.beats.length, 'duplicate beat');
  demand(entities.get(plan.state.entity)?.role === 'state', 'scalar must bind a state entity');
  demand(entities.get(plan.projection.entity)?.role === 'world', 'projection must bind a world entity');

  function verify(ref: Provenance, allowed?: string[]) {
    if (ref.status === 'illustrative') return;
    const claim = claims.get(ref.claim);
    demand(claim && (!allowed || allowed.includes(ref.claim)) &&
      (ref.status === 'inference' || claim.kind === 'documented'), 'invalid claim reference ' + ref.claim);
    demand(claim.citations.some(c => c.document === ref.source && c.startLine === ref.startLine &&
      c.endLine === ref.endLine && c.quote === ref.quote), 'quote is not an exact citation of ' + ref.claim);
  }

  function verifyValue(parameter: z.infer<typeof value>) {
    const ref = parameter.provenance;
    verify(ref);
    if (ref.status !== 'illustrative') {
      const tokens = ref.quote.match(/(?<![\w.])-?\d+(?:\.\d+)?(?!\w|\.\d)/g) ?? [];
      demand(tokens.some(token => decimal.safeParse(token).success && fixed(token) === fixed(parameter.decimal)),
        'cited numeric value is absent from exact quote for ' + ref.claim);
    }
  }

  for (const entity of plan.entities) verify(entity.provenance);
  verifyValue(plan.state.initial);
  const localIds = new Set<string>();
  for (const mapping of plan.localMappings) {
    const key = mapping.shot + '/' + mapping.object;
    demand(!localIds.has(key) && shots.has(mapping.shot) && entities.has(mapping.entity) &&
      graph.evidence.objects.some(object => object.id === mapping.object), 'invalid local mapping ' + key);
    localIds.add(key);
  }
  for (const rule of plan.rules) {
    verify(rule.provenance);
    verifyValue(rule.lessThan);
    verifyValue(rule.addPerEligibleUpdate);
    demand(fixed(rule.addPerEligibleUpdate.decimal) > 0, 'conditional increment must be positive');
    demand(rule.eligibilityVisual !== 'collision' || plan.projection.glyph === 'track',
      'collision visualization requires a track');
  }
  for (const control of plan.controls) {
    demand(entities.get(control.entity)?.role === 'control' && fixed(control.min) < fixed(control.max), 'invalid slider');
    verify(control.provenance);
  }

  let lastShot = -1;
  let updates = 0;
  let manual = false;
  const covered = new Set<string>();
  for (const beat of plan.beats) {
    const shot = shots.get(beat.shot);
    demand(shot && shot.index >= lastShot && entities.has(beat.focus), 'invalid beat focus or shot order');
    lastShot = shot.index;
    covered.add(shot.id);
    demand(beat.claims.every(claim => shot.claimIds.includes(claim)), 'beat claim must belong to its Story shot');
    const verifyBeat = (ref: Evidence | Provenance) => verify(ref, beat.claims);
    if (beat.excerpt) {
      const {citation, from, to} = beat.excerpt;
      verifyBeat(citation);
      demand(from >= citation.startLine && to <= citation.endLine && from <= to, 'excerpt display outside citation');
    }
    const event = beat.event;
    if (event.kind === 'context') continue;
    demand(event.atMs < beat.durationMs, 'event must occur within its beat');
    if (event.kind === 'manual-assignment') {
      manual = true;
      const control = controls.get(event.control);
      demand(control && control.entity === beat.focus, 'manual event must focus its declared control');
      const assigned = fixed(event.value.decimal);
      demand(assigned >= fixed(control.min) && assigned <= fixed(control.max), 'manual value outside slider bounds');
      verifyBeat(control.provenance);
      verifyBeat(event.value.provenance);
      demand(event.value.provenance.status === 'illustrative', 'manual scenario values must be illustrative');
      continue;
    }
    const rule = rules.get(event.rule);
    demand(rule && !manual, 'unknown rule or automatic update after manual control');
    demand(event.count <= beat.durationMs - event.atMs, 'updates must occupy distinct model timestamps');
    updates += event.count;
    demand(updates <= 10000, 'update limit exceeded');
    for (const ref of [rule.provenance, rule.lessThan.provenance, rule.addPerEligibleUpdate.provenance]) verifyBeat(ref);
  }
  demand(covered.size === graph.shots.length, 'every Story shot must be covered');
  return {plan, sidecarHash: sha256(sidecar), sourceOrigin: 'standalone captured sources; no Git association' as const};
}
