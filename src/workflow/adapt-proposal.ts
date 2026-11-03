import {resolve} from 'node:path';
import {ProposalMapping} from '../contracts/proposal-mapping.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {planMappedAssetPack} from '../story-planner/asset-pack.js';
import {compileProposalMapping} from '../story-planner/proposal-mapping.js';
import {boundedFile, planCapturedStory} from '../story-planner/runtime.js';
import {loadAuthoringProposal} from './agent-authoring.js';
import type {WorkflowStore} from './store.js';

export async function adaptAuthoringProposal(store: WorkflowStore, id: string, hash: string, spec: string, data: string, signal: AbortSignal) {
  checkAbort(signal);
  const bytes = await boundedFile(resolve(spec), 200_000);
  let value: unknown;
  try {value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));}
  catch {throw new EngineError('MAPPING_JSON', 'Expected valid UTF-8 mapping JSON.');}
  const mapping = ProposalMapping.safeParse(value);
  if (!mapping.success) throw new EngineError('MAPPING_SCHEMA', 'Expected a bounded audience-http-v1 or audience-rembg-outputs-v1 mapping. ' +
    mapping.error.issues.slice(0, 6).map(issue => issue.path.join('.') + ' ' + issue.message).join(', '));
  const {proposal, workspace} = await loadAuthoringProposal(store, id, hash, signal);
  const checkCurrent = () => {
    if (store.project(id).snapshotHash !== proposal.binding.snapshotHash) {
      throw new EngineError('AUTHORING_STALE', 'Obtain a proposal for the current evidence revision. Previously committed tasks remain readable.');
    }
  };
  checkCurrent();
  const material = {proposal, mapping: mapping.data};
  const {story, adaptation, seconds} = compileProposalMapping(material, workspace.manifest.sources);
  const sources = workspace.manifest.sources.map(source => ({id: source.id, bytes: workspace.files.get(source.path)!}));
  const planned = await planCapturedStory({graph: story, sources}, data, undefined, signal, proposal.binding, material);
  checkCurrent();
  const assets = await planMappedAssetPack(planned.taskId, data, signal);
  checkCurrent();
  return {adaptation, binding: proposal.binding, storyTaskId: planned.taskId, assetTaskId: assets.taskId,
    storyCached: planned.cached, assetsCached: assets.cached, seconds,
    presentation: 'audience-v1', audio: 'silent', semanticReview: 'pending', editorialReview: 'pending', audiovisualReview: 'pending'};
}
