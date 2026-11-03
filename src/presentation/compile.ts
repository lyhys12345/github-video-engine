import type {StoryProposal} from '../contracts/authoring.js';
import {PRESENTATION_FPS, presentationMaxFrames, type PresentationEventKind, type PresentationPlan} from '../contracts/presentation.js';
import {EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {PAPER_BIRD, PAPER_BIRD_SHA256} from './asset.js';

type Transition = {from: readonly string[]; to: string; roles: readonly string[]; parameters: readonly string[]};
const step = (from: string[], to: string, roles: string[], parameters: string[] = []): Transition => ({from, to, roles, parameters});
const http: Partial<Record<PresentationEventKind, Transition>> = {
  listen: step(['ready'], 'listening', ['listener'], ['port']),
  request: step(['listening'], 'requested', ['listener', 'request'], ['method', 'path']),
  match: step(['requested'], 'matched', ['request', 'handler'], ['method', 'path']),
  respond: step(['matched'], 'responded', ['handler', 'response'], ['body']),
};
const image: Partial<Record<PresentationEventKind, Transition>> = {
  'show-input': step(['ready'], 'input', ['input']),
  'select-cutout': step(['input', 'mask', 'comparison'], 'cutout-selected', ['input', 'cutout'], ['cutoutCommand']),
  'show-cutout': step(['cutout-selected'], 'cutout', ['input', 'cutout'], ['cutoutCommand']),
  'select-mask': step(['input', 'cutout', 'comparison'], 'mask-selected', ['input', 'mask'], ['maskCommand']),
  'show-mask': step(['mask-selected'], 'mask', ['input', 'mask'], ['maskCommand']),
  compare: step(['cutout', 'mask'], 'comparison', ['input', 'cutout', 'mask'], ['cutoutCommand', 'maskCommand']),
};
const fail = (code: string, message: string): never => {throw new EngineError(code, message);};
const subset = (ids: string[], allowed: string[]) => new Set(ids).size === ids.length && ids.every(id => allowed.includes(id));
const labelLength = (text: string) => [...text].length;

export function compilePresentation(proposal: StoryProposal, plan: PresentationPlan) {
  if (sha256(canonical(proposal)) !== plan.proposalHash || proposal.authoringRequestId !== plan.authoringRequestId ||
      canonical(proposal.binding) !== canonical(plan.binding)) {
    fail('PRESENTATION_BINDING', 'Presentation differs from the saved proposal, request or evidence revision.');
  }
  const module = plan.module;
  const isHttp = module.id === 'http-exchange/1';
  const family = isHttp ? 'http' : 'image-mask';
  if (proposal.mechanisms.some(mechanism => mechanism.adapterCandidate !== family)) {
    fail('PRESENTATION_UNSUPPORTED', 'The proposal contains a mechanism without the selected built-in presentation capability.');
  }
  if (proposal.beats.length !== plan.beats.length || proposal.beats.some((beat, index) => beat.id !== plan.beats[index]!.beatId)) {
    fail('PRESENTATION_BEATS', 'Every proposal beat must map once in its original order.');
  }
  const labels = Object.fromEntries(Object.entries(module.entities).map(([role, id]) => {
    const entity = proposal.entities.find(candidate => candidate.id === id);
    if (!entity || labelLength(entity.label) > 48) return fail('PRESENTATION_ENTITY', 'Expected a named proposal entity of at most 48 characters: ' + id);
    return [role, entity.label];
  }));
  if (new Set(Object.values(module.entities)).size !== Object.keys(module.entities).length) {
    fail('PRESENTATION_ENTITY', 'Scene roles require distinct stable entity IDs.');
  }
  const parameters = Object.fromEntries(Object.entries(module.parameters).map(([id, param]) => {
    const claim = proposal.claims.find(row => row.id === param.evidence.claimId);
    const citation = claim?.citations[param.evidence.citationIndex];
    if (!claim || claim.basis.kind !== 'documented' || !citation) {
      return fail('PRESENTATION_PARAMETER', 'Parameter requires a documented claim and an exact citation index: ' + id);
    }
    return [id, {value: param.value, claimId: claim.id, citation}];
  }));
  if (!isHttp && (module.asset.sha256 !== PAPER_BIRD_SHA256 || !proposal.beats.some(beat => beat.visual.claimIds.includes(module.asset.claimId)))) {
    fail('PRESENTATION_ASSET', 'Expected the pinned illustrative subject and a visual claim reference.');
  }
  const transitions = isHttp ? http : image;
  const entityIds: Record<string, string> = module.entities;
  const trace: {frame: number; kind: PresentationEventKind; before: string; after: string; beatId: string;
    claimIds: string[]; entityIds: string[]; parameterIds: readonly string[]; assetId: string | null}[] = [];
  const coveredMechanisms = new Set<string>();
  let frame = 0, state: string = module.initialState, shownCutout = false, shownMask = false;
  const beats = plan.beats.map((beat, index) => {
    const authored = proposal.beats[index]!;
    if (labelLength(authored.purpose) > 70) fail('PRESENTATION_TITLE', 'Beat purpose exceeds the visible title budget: ' + beat.beatId);
    let previous = -1;
    for (const event of beat.events) {
      const transition = transitions[event.kind];
      if (!transition || event.atFrame >= beat.frames || event.atFrame <= previous || !transition.from.includes(state) ||
          (event.kind === 'compare' && (!shownMask || !shownCutout))) {
        fail('PRESENTATION_EVENT', 'Unsupported event, order or state at ' + beat.beatId + ': ' + event.kind);
      }
      const selected = transition!;
      const mechanisms = proposal.mechanisms.filter(mechanism => authored.mechanismIds.includes(mechanism.id));
      const mechanismClaims = [...new Set(mechanisms.flatMap(mechanism => mechanism.claimIds))];
      if (!subset(event.claimIds, authored.visual.claimIds) || !subset(event.claimIds, mechanismClaims) ||
          selected.roles.some(role => !authored.entityIds.includes(entityIds[role]!)) ||
          selected.parameters.some(id => !event.claimIds.includes(parameters[id]!.claimId))) {
        fail('PRESENTATION_REFERENCE', 'Event does not cover its selected beat’s entities and parameter claims: ' + beat.beatId + '/' + event.kind);
      }
      for (const mechanism of mechanisms) if (event.claimIds.some(id => mechanism.claimIds.includes(id))) coveredMechanisms.add(mechanism.id);
      if (event.kind === 'show-cutout') shownCutout = true;
      if (event.kind === 'show-mask') shownMask = true;
      trace.push({frame: frame + event.atFrame, kind: event.kind, before: state, after: selected.to, beatId: beat.beatId,
        claimIds: event.claimIds, entityIds: selected.roles.map(role => entityIds[role]!), parameterIds: selected.parameters,
        assetId: isHttp ? null : module.asset.id});
      state = selected.to;
      previous = event.atFrame;
    }
    const start = frame;
    frame += beat.frames;
    return {id: beat.beatId, start, end: frame, title: authored.purpose, narration: authored.narration,
      visualDescription: authored.visual.description, visualClaimIds: authored.visual.claimIds,
      narrationClaimIds: authored.narrationClaimIds};
  });
  const maxFrames = presentationMaxFrames(plan.schemaVersion);
  if (frame > maxFrames || trace.length === 0) {
    fail('PRESENTATION_DURATION', 'Presentation requires at least one event and at most ' + maxFrames / PRESENTATION_FPS + ' seconds.');
  }
  if (Object.keys(parameters).some(id => !trace.some(event => transitions[event.kind]?.parameters.includes(id)))) {
    fail('PRESENTATION_PARAMETER', 'Each supplied parameter must be used by an authored event.');
  }
  if (proposal.mechanisms.some(mechanism => !coveredMechanisms.has(mechanism.id))) {
    fail('PRESENTATION_REFERENCE', 'Each proposal mechanism must be represented by at least one authored event.');
  }
  return {schemaVersion: '1.0' as const, moduleId: module.id, proposalHash: plan.proposalHash,
    planSha256: sha256(canonical(plan)), binding: plan.binding, timeline: {fps: PRESENTATION_FPS, totalFrames: frame},
    entityIds, labels, parameters, beats, trace, initialState: module.initialState,
    asset: isHttp ? null : {...module.asset, content: PAPER_BIRD},
  };
}
export type CompiledPresentation = ReturnType<typeof compilePresentation>;
