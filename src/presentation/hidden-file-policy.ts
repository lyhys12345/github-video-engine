import type {HiddenFileStoryProposal} from '../contracts/authoring.js';
import type {HiddenFilePlan} from '../contracts/presentation.js';
import {PRESENTATION_FPS, presentationMaxFrames} from '../contracts/presentation.js';
import {EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';

const fail = (message: string): never => {throw new EngineError('PRESENTATION_HIDDEN_FILES', message);};
type Entry = HiddenFilePlan['module']['scenario']['entries'][number];
type Node = Entry & {depth: number; path: string};
type Decision = 'enter-directory' | 'include-file' | 'skip-hidden-file' | 'prune-hidden-directory' | 'unvisited-ancestor';

function checkedTree(entries: Entry[]) {
  const byId = new Map<string, Node>();
  const siblings = new Set<string>();
  for (const entry of entries) {
    const parent = entry.parentId === null ? null : byId.get(entry.parentId);
    const key = JSON.stringify([entry.parentId, entry.name]);
    if (byId.has(entry.id) || siblings.has(key) || (entry.parentId !== null && parent?.kind !== 'directory')) {
      fail('Use unique IDs and sibling names, and put the existing parent directory before its children.');
    }
    const depth = parent ? parent.depth + 1 : 1;
    const path = parent ? parent.path + '/' + entry.name : entry.name;
    if (depth > 3 || path.length > 40) fail('The synthetic tree supports at most three levels and 40 characters per path.');
    byId.set(entry.id, {...entry, depth, path});
    siblings.add(key);
  }
  const ordered: Node[] = [];
  const append = (parentId: string | null) => {
    for (const node of byId.values()) {
      if (node.parentId !== parentId) continue;
      ordered.push(node);
      append(node.id);
    }
  };
  append(null);
  return ordered;
}

function modelPolicy(nodes: Node[], mode: 'default' | 'include-hidden') {
  const decisions = new Map<string, {id: string; decision: Decision; blockedBy: string | null}>();
  for (const node of nodes) {
    const parent = node.parentId === null ? undefined : decisions.get(node.parentId);
    const blockedBy = parent?.decision === 'prune-hidden-directory' ? parent.id : parent?.blockedBy ?? null;
    const hidden = mode === 'default' && node.name.startsWith('.');
    const decision: Decision = blockedBy ? 'unvisited-ancestor' : node.kind === 'directory'
      ? hidden ? 'prune-hidden-directory' : 'enter-directory'
      : hidden ? 'skip-hidden-file' : 'include-file';
    decisions.set(node.id, {id: node.id, decision, blockedBy});
  }
  const rows = [...decisions.values()];
  return {
    rows,
    consideredIds: rows.filter(row => row.decision !== 'unvisited-ancestor').map(row => row.id),
    resultIds: rows.filter(row => row.decision === 'include-file').map(row => row.id),
  };
}

export function compileHiddenFiles(proposal: HiddenFileStoryProposal, plan: HiddenFilePlan) {
  const {module} = plan;
  const [mechanism] = proposal.mechanisms;
  if (module.mechanismId !== mechanism.id || plan.capabilityProfile !== proposal.capabilityProfile ||
      plan.authorship.kind !== proposal.authorship.kind) {
    return fail('The plan must select the proposal’s exact hidden-file mechanism and capability.');
  }
  const nodes = checkedTree(module.scenario.entries);
  const defaultModel = modelPolicy(nodes, 'default');
  const includeModel = modelPolicy(nodes, 'include-hidden');
  if (!defaultModel.resultIds.length ||
      !defaultModel.rows.some((row, index) => row.decision === 'unvisited-ancestor' && nodes[index]!.kind === 'file') ||
      includeModel.resultIds.length <= defaultModel.resultIds.length || includeModel.resultIds.length > 5) {
    return fail('Show a visible file and at least one file below a hidden directory, with at most five result files.');
  }
  const rules = [mechanism.rules.default, mechanism.rules.includeHidden].map(rule => {
    const claim = proposal.claims.find(row => row.id === rule.claimId);
    const citation = claim?.citations[rule.citationIndex];
    if (claim?.basis.kind !== 'documented' || !citation || !mechanism.claimIds.includes(rule.claimId)) {
      return fail('Each policy requires a documented mechanism claim with an exact citation.');
    }
    return {...rule, citation};
  });
  let frame = 0;
  const trace: {
    frame: number; beatId: string; kind: 'evaluate-policy'; mode: 'default' | 'include-hidden'; motionFrames: number;
    claimIds: string[]; rule: typeof rules[number]; model: ReturnType<typeof modelPolicy>;
  }[] = [];
  const beats = plan.beats.map((beat, index) => {
    const authored = proposal.beats[index]!;
    const event = beat.events[0];
    const mode = index === 0 ? 'default' : 'include-hidden';
    const rule = rules[index]!;
    if (event.mode !== mode || event.atFrame > 48 || event.atFrame + event.motionFrames + 36 > beat.frames) {
      fail('Present default first, then include hidden, allowing motion and at least 36 frames for each result.');
    }
    if (!authored.mechanismIds.includes(mechanism.id) || authored.visual.depiction !== 'illustrative' ||
        [...authored.purpose].length > 38 || (module.language === 'en-US' && !/^[ -~]+$/.test(authored.purpose)) ||
        !event.claimIds.includes(rule.claimId) ||
        new Set(event.claimIds).size !== event.claimIds.length ||
        event.claimIds.some(id => !authored.visual.claimIds.includes(id) || !mechanism.claimIds.includes(id))) {
      fail('Use a short illustrative title and reference the exact policy rule in its authored beat.');
    }
    trace.push({frame: frame + event.atFrame, beatId: beat.beatId, kind: event.kind, mode,
      motionFrames: event.motionFrames, claimIds: event.claimIds, rule, model: index === 0 ? defaultModel : includeModel});
    const start = frame;
    frame += beat.frames;
    return {id: beat.beatId, start, end: frame, title: authored.purpose, narration: authored.narration,
      visualDescription: authored.visual.description, visualClaimIds: authored.visual.claimIds,
      narrationClaimIds: authored.narrationClaimIds};
  });
  if (frame > presentationMaxFrames(plan.schemaVersion)) return fail('Presentation exceeds the allowed duration.');
  return {
    schemaVersion: '1.0' as const, moduleId: module.id, capabilityProfile: plan.capabilityProfile,
    proposalHash: plan.proposalHash, planSha256: sha256(canonical(plan)), binding: plan.binding, language: module.language,
    timeline: {fps: PRESENTATION_FPS, totalFrames: frame}, beats, trace, nodes, asset: null,
    scope: {tree: 'synthetic', convention: 'posix-dot-prefix', ignoreRules: 'unchecked', order: 'illustrative',
      targetExecution: 'none'} as const,
  };
}

export type CompiledHiddenFiles = ReturnType<typeof compileHiddenFiles>;
