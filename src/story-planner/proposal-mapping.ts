import {AdaptationMaterial} from '../contracts/proposal-mapping.js';
import {StorySchema, type Story} from '../contracts/story.js';
import {EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {compileAnimation} from './animation.js';
import {compileAudience} from './audience-plan.js';

const fail = (code: string, message: string): never => {throw new EngineError(code, message);};
const subset = (ids: string[], allowed: readonly string[]) => new Set(ids).size === ids.length && ids.every(id => allowed.includes(id));

export function compileProposalMapping(raw: AdaptationMaterial, sources: Story['evidence']['sources']) {
  const {proposal, mapping} = AdaptationMaterial.parse(raw);
  const proposalBytes = canonical(proposal);
  if (Buffer.byteLength(proposalBytes) > 300_000) fail('MAPPING_TEXT_BUDGET', 'The proposal exceeds the 300 kB mapping limit.');
  const proposalHash = sha256(proposalBytes);
  if (mapping.proposalHash !== proposalHash || mapping.authoringRequestId !== proposal.authoringRequestId ||
      canonical(mapping.binding) !== canonical(proposal.binding)) {
    fail('MAPPING_BINDING', 'Mapping differs from the committed proposal or its pinned evidence revision.');
  }
  const mappingSha256 = sha256(canonical(mapping));
  const adaptation = {schemaVersion: '1.0' as const, proposalHash, mappingSha256, profile: mapping.profile};
  const http = mapping.profile === 'audience-http-v1';
  const family = http ? 'http' : 'image-mask';
  if (!proposal.mechanisms.every(mechanism => mechanism.adapterCandidate === family)) {
    fail('MAPPING_UNSUPPORTED', 'The proposal has no mechanism declared for the selected adapter profile.');
  }
  if (proposal.beats.length !== mapping.shots.length) {
    fail('MAPPING_UNSUPPORTED', 'This profile requires a new proposal with exactly three authored beats. Existing beats are never dropped.');
  }
  const id = proposal.binding.projectId;
  const entities = new Map(proposal.entities.map(entity => [entity.id, entity]));
  const mechanisms = new Map(proposal.mechanisms.map(mechanism => [mechanism.id, mechanism]));
  const claims = new Map(proposal.claims.map(claim => [claim.id, claim]));
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const graphKindByEntity = new Map(mapping.objects.map(object => [object.entityId, object.kind]));
  if (graphKindByEntity.size !== mapping.objects.length) fail('MAPPING_REFERENCE', 'Each graph object must bind a distinct proposal entity.');
  const roleKinds = {code: 'code', request: 'http-request', route: 'route-handler', response: 'http-response',
    scene: 'image', cutout: 'cutout', mask: 'mask'} as const;
  const exactText = (value: string, field: string) => {
    if (value.length > 240 || value.trim() !== value) fail('MAPPING_TEXT_BUDGET', `${field} must fit the Story text contract without shortening or trimming.`);
    return value;
  };
  const usedMechanisms = new Set<string>();
  const usedEntities = new Set<string>();
  const visualIdentities = new Map<string, string>();
  const selectedClaims = new Set<string>();
  const selectClaims = (ids: string[]) => {for (const id of ids) selectedClaims.add(id);};
  const label = (entityId: string) => exactText(entities.get(entityId)?.label ?? fail('MAPPING_REFERENCE', 'Unknown proposal entity: ' + entityId), 'Entity ' + entityId);
  const shots = mapping.shots.map(({beatId, beat, visualSeconds, objects, actions}) => {
    const index = proposal.beats.findIndex(row => row.id === beatId);
    const origin = proposal.beats[index];
    if (!origin) return fail('MAPPING_REFERENCE', 'Unknown proposal beat: ' + beatId);
    for (const mechanismId of origin.mechanismIds) {
      if (mechanisms.get(mechanismId)?.adapterCandidate !== family) {
        fail('MAPPING_UNSUPPORTED', 'Mapped beats must use mechanisms declared for the selected adapter profile.');
      }
      usedMechanisms.add(mechanismId);
    }
    for (const object of objects) {
      const previous = visualIdentities.get(object.id);
      if (previous && previous !== object.entityId) fail('MAPPING_REFERENCE', 'A repeated visual ID cannot change its proposal entity.');
      visualIdentities.set(object.id, object.entityId);
    }
    if (new Set(objects.map(object => object.entityId)).size !== objects.length ||
        !objects.every(object => object.visual && Object.hasOwn(roleKinds, object.visual) &&
          origin.entityIds.includes(object.entityId) && graphKindByEntity.get(object.entityId) === roleKinds[object.visual as keyof typeof roleKinds]) ||
        !subset(actions[0]!.claimIds, origin.visual.claimIds) || actions[0]!.claimIds.length !== origin.visual.claimIds.length) {
      fail('MAPPING_REFERENCE', 'Animation must use the selected beat’s entities and cover its exact visual claim set: ' + beatId);
    }
    for (const id of origin.entityIds) usedEntities.add(id);
    const claimIds = [...new Set([...origin.narrationClaimIds, ...origin.visual.claimIds])];
    selectClaims(claimIds);
    return {index, story: {id: beatId, beat, narration: origin.narration, visual: origin.visual.description,
      claimIds, visualSeconds, holdSeconds: 0, transitionSeconds: 0},
    animation: {shotId: beatId, objects: objects.map(({entityId, ...object}) => ({...object, label: label(entityId)})), actions}};
  });
  if (shots.some((row, index) => index > 0 && row.index <= shots[index - 1]!.index)) {
    fail('MAPPING_REFERENCE', 'Mapped beats must be distinct and follow their authored order.');
  }
  const objects = new Map(mapping.objects.map(object => [object.id, object]));
  const profileObjects = http ? ['code', 'http-request', 'http-response', 'route-handler'] : ['code', 'cutout', 'image', 'mask'];
  const profileOperations = http ? ['match-route', 'send-response'] : ['segment'];
  if (canonical(mapping.objects.map(object => object.kind).sort()) !== canonical(profileObjects) ||
      canonical(mapping.operations.map(operation => operation.kind)) !== canonical(profileOperations)) {
    fail('MAPPING_UNSUPPORTED', 'Graph objects and operations do not fit the selected bounded adapter.');
  }
  const operations = mapping.operations.map(({mechanismId, ...operation}) => {
    const origin = mechanisms.get(mechanismId);
    const input = objects.get(operation.input), output = objects.get(operation.output);
    if (!origin || !usedMechanisms.has(mechanismId) || !input || !output ||
        !origin.inputEntityIds.includes(input.entityId) || !origin.outputEntityIds.includes(output.entityId) ||
        !subset(operation.claimIds, origin.claimIds)) {
      fail('MAPPING_REFERENCE', 'Semantic operation differs from the authored mechanism’s input, output or claims: ' + operation.id);
    }
    selectClaims(operation.claimIds);
    return operation;
  });
  if (mapping.actors.some(actor => !usedEntities.has(actor.entityId)) || mapping.objects.some(object => !usedEntities.has(object.entityId))) {
    fail('MAPPING_REFERENCE', 'Graph objects and actors must be tied to an entity in the mapped storyboard.');
  }
  if (usedMechanisms.size !== proposal.mechanisms.length || new Set(mapping.operations.map(operation => operation.mechanismId)).size !== usedMechanisms.size) {
    fail('MAPPING_REFERENCE', 'Every authored mechanism must be represented in the mapped beats and operations.');
  }
  const title = exactText(proposal.useCase.title, 'Title');
  const story = StorySchema.parse({schemaVersion: '1.0', id, name: title,
    timing: {fps: 24, chineseCharsPerSecond: 6, wordsPerSecond: 4}, shots: shots.map(row => row.story),
    evidence: {schemaVersion: '1.0', id, name: title, audience: exactText(proposal.useCase.audience, 'Audience'),
      interpretation: 'agent-curated-semantic-graph-not-automatic-source-understanding',
      sources,
      claims: [...selectedClaims].map(id => {
        const claim = claims.get(id) ?? fail('MAPPING_REFERENCE', 'Unknown proposal claim: ' + id);
        return {id, statement: exactText(claim.statement, 'Claim ' + id), kind: claim.basis.kind,
          rationale: claim.basis.kind === 'inference' ? exactText(claim.basis.reasoning, 'Rationale for ' + id) : 'Exact proposal citation; semantic review remains pending.',
          citations: claim.citations.map(({sourceId, sourceSha256, ...range}) => {
            if (sourceById.get(sourceId)?.sha256 !== sourceSha256) fail('MAPPING_BINDING', 'Claim source hash differs from the pinned source: ' + id);
            if (range.quote.length > 3000) fail('MAPPING_TEXT_BUDGET', 'Claim quote does not fit the Story citation contract: ' + id);
            return {document: sourceId, ...range};
          })};
      }),
      objects: mapping.objects.map(({entityId, ...object}) => ({...object, label: label(entityId)})),
      actors: mapping.actors.map(({entityId, ...actor}) => ({...actor, label: label(entityId)})), operations,
      disclosure: 'Session-authored teaching illustration from a pinned proposal. No execution, model internals, audio or approval are represented.',
    }});
  const animation = {schemaVersion: '1.0' as const, storyId: id, shots: shots.map(row => row.animation)};
  const compiled = compileAnimation(story, animation);
  let audience: ReturnType<typeof compileAudience>;
  try {audience = compileAudience(compiled);}
  catch (error) {
    if (error instanceof EngineError && error.code === 'PREVIEW_AUDIENCE_UNSUPPORTED') {
      return fail('MAPPING_UNSUPPORTED', 'The selected storyboard and exact source excerpts do not fit audience-v1.');
    }
    throw error;
  }
  if (audience.kind !== (http ? 'http' : 'image-outputs')) {
    fail('MAPPING_UNSUPPORTED', 'Animation does not match the declared adapter profile.');
  }
  if (audience.kind === 'http') {
    const entityFor = (kind: string) => mapping.objects.filter(object => object.kind === kind).map(object => label(object.entityId));
    if (canonical(entityFor('http-request')) !== canonical([audience.request]) ||
        canonical(entityFor('http-response')) !== canonical([audience.body]) ||
        canonical(entityFor('code')) !== canonical([`app.listen(${audience.port})`])) {
      fail('MAPPING_REFERENCE', 'Displayed request, port and response must agree with their authored entities and pinned example.');
    }
  }
  if (compiled.totalFrames < 5 * compiled.fps || compiled.totalFrames > 15 * compiled.fps) {
    fail('MAPPING_DURATION', 'The adapted preview must be between 5 and 15 seconds.');
  }
  return {story, animation, adaptation, seconds: compiled.totalFrames / compiled.fps};
}
