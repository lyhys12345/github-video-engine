import {narrationQuoteEditCommand} from './narrative-prose-edit.js';
import {narrativeAuthorRevisionCommand} from './narrative-author-revision.js';
import {narrativeFeedbackCommand} from './narrative-feedback.js';
import {narrativeApiAuthorCommand} from './narrative-api-author.js';
import {narrativeApiFeedbackCommand} from './narrative-api-feedback.js';
import {narrativeSourceExpandCommand} from './narrative-source-expand.js';
import {narrativeWorkspaceCommand} from './narrative-workspace.js';
import {narrativeRunCommand} from './narrative-run.js';
import {projectPortableCommand} from './project-portable.js';
import {explanationNextCommand} from './narrative-next-actions.js';
import {documentCardCommand} from './narrative-document-card.js';
import {narrativeCaptionSafeCommand} from './narrative-audio-safe.js';
import {narrativeAudioCommand} from './narrative-audio.js';
import {narrativeContinuityCommand} from './narrative-continuity.js';
import {narrativeExcerptCommand} from './narrative-preview.js';
import {narrativeCommand} from './narrative.js';
import {portableCommand} from './explanation-portable.js';
import {EngineError} from '../core/errors.js';
import {exportExplanation, exportExplanationFacts, prepareExplanationVoice, renderExplanation, renderNarratedExplanation,
  resumeExplanation, reviseExplanation, startExplanation, statusExplanation, submitExplanation} from './explanation-session.js';

const usage = 'explanation start --spec <request> --data <state> --out <packet> | explanation proposal/render/narrated-render/revise --task <parent> --spec <json> --data <state> | explanation voice-prepare/status/resume --task <checkpoint> --data <state> | explanation export --task <checkpoint> --data <state> --out <directory> | explanation fact-review --task <proposal-checkpoint> --data <state> --out <directory> [--presentation <presentation-wrapper>] [--spec <review-receipt>] | render/narrated-render/revise accept [--review <complete-receipt>]';

export async function explanationCommand(positionals: string[], values: Record<string, unknown>, signal: AbortSignal) {
  const action = positionals[1];
  if(action==='api-feedback'||action==='api-feedback-continue')return narrativeApiFeedbackCommand(positionals,values,signal);
  if(action==='api-author'||action==='api-continue')return narrativeApiAuthorCommand(positionals,values,signal);
  if(action==='feedback-context'||action==='feedback-apply')return narrativeFeedbackCommand(positionals,values,signal);
  if(action==='edit-narration')return narrationQuoteEditCommand(positionals,values,signal);
  if(action==='source-expand')return narrativeSourceExpandCommand(positionals,values,signal);
  if(action==='workspace-status')return narrativeWorkspaceCommand(positionals,values,signal);
  if(action==='run-revise')return narrativeAuthorRevisionCommand(positionals,values,signal);
  if(action==='run')return narrativeRunCommand(positionals,values,signal);
  if(action==='project-export'||action==='project-import')return projectPortableCommand(positionals,values,signal);
  if(action==='next')return explanationNextCommand(positionals,values,signal);
  if(action==='narrative-card'||action?.startsWith('narrative-card-'))return documentCardCommand(positionals,values,signal);
  if(action?.startsWith('narrative-caption-'))return narrativeCaptionSafeCommand(positionals,values,signal);
  if(action?.startsWith('narrative-audio-'))return narrativeAudioCommand(positionals,values,signal);
  if(action?.startsWith('narrative-continuity-preview'))return narrativeContinuityCommand(positionals,values,signal);
  if(action?.startsWith('narrative-preview'))return narrativeExcerptCommand(positionals,values,signal);
  if(action?.startsWith('narrative-'))return narrativeCommand(positionals,values,signal);
  if(action?.startsWith('portable-'))return portableCommand(positionals,values,signal);
  const keys = ['data', action === 'start' ? 'spec' : 'task'];
  if (action === 'start' || action === 'export' || action === 'fact-review') keys.push('out');
  if (action === 'fact-review' && values.spec !== undefined) keys.push('spec');
  if (action === 'fact-review' && values.presentation !== undefined) keys.push('presentation');
  if (['render','narrated-render','revise'].includes(action ?? '') && values.review !== undefined) keys.push('review');
  if (action === 'proposal' || action === 'render' || action === 'narrated-render' || action === 'revise') keys.push('spec');
  if (positionals.length !== 2 || !['start', 'proposal', 'render', 'voice-prepare', 'narrated-render', 'revise', 'status', 'resume', 'export', 'fact-review'].includes(action ?? '') ||
      keys.some(key => typeof values[key] !== 'string' || !String(values[key]).trim()) ||
      Object.entries(values).some(([key, value]) => value !== undefined && !keys.includes(key))) {
    throw new EngineError('USAGE', usage);
  }
  const data = String(values.data), id = String(values.task), spec = String(values.spec), out = String(values.out);
  const announce = (taskId: string) => console.error(JSON.stringify({taskId, stage: 'explanation-' + action}));
  if (action === 'start') return startExplanation(data, spec, out, signal, announce);
  if (action === 'proposal') return submitExplanation(data, id, spec, signal, announce);
  if (action === 'voice-prepare') return prepareExplanationVoice(data, id, signal, announce);
  if (action === 'narrated-render') return renderNarratedExplanation(data, id, spec, signal, announce,typeof values.review==='string'?values.review:undefined);
  if (action === 'render') return renderExplanation(data, id, spec, signal, announce,typeof values.review==='string'?values.review:undefined);
  if (action === 'revise') return reviseExplanation(data, id, spec, signal, announce,typeof values.review==='string'?values.review:undefined);
  if (action === 'resume') return resumeExplanation(data, id, signal, announce);
  if (action === 'export') return exportExplanation(data, id, out, signal);
  if (action === 'fact-review') return exportExplanationFacts(data,id,out,signal,typeof values.spec==='string'?values.spec:undefined,typeof values.presentation==='string'?values.presentation:undefined);
  return statusExplanation(data, id, signal);
}
