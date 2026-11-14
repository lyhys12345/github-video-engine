import {lstat, mkdir, mkdtemp, readdir, rename, rm, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {checkAbort} from '../core/errors.js';
import {command} from '../core/process.js';
import {canonical, fileHash, sha256} from '../core/util.js';
import {ffmpegPath, ffprobePath, projectRoot} from '../providers/local.js';
import {showcasePanels, showcasePanelVisible, showcaseShotProgress} from '../renderer/showcase-geometry.js';
import {showcasePanelSourceFrame} from '../renderer/showcase-timing.js';
import {ancestors, boundedFile} from '../story-planner/runtime.js';
import {AudienceAuditBindings, AudienceAuditReport, AudienceAuditRequest, AudienceEvidenceEntry} from './audience-contract.js';
import {evaluateAudienceCorrespondence} from './audience-correspondence.js';
import {extractAudienceCandidate, validateAudienceCandidate} from './audience-media.js';
import {loadAudienceSource} from './audience-source.js';
import {loadAudienceSpeech} from './audience-speech.js';
import {fail, json, MAX_JSON} from './inputs.js';

const implementation = [
  'src/showcase/audience-audit.ts', 'src/showcase/audience-contract.ts', 'src/showcase/audience-correspondence.ts',
  'src/showcase/audience-media.ts', 'src/showcase/audience-source.ts', 'src/showcase/audience-speech.ts',
  'src/showcase/audience-render.ts', 'src/showcase/inputs.ts', 'src/showcase/revision-baseline.ts',
  'src/showcase/timeline.ts', 'src/renderer/approved-reel.ts', 'src/renderer/showcase-audit-contract.ts',
  'src/renderer/showcase-reel.tsx', 'src/renderer/showcase-reel-contract.ts', 'src/renderer/showcase-geometry.ts',
  'src/renderer/showcase-timing.ts', 'src/renderer/showcase-audit-dom.tsx', 'src/showcase/local-render.ts',
  'src/showcase/worker.ts', 'src/showcase/runtime.ts', 'src/speech-alignment/caption-draft.ts',
  'src/speech-alignment/contracts.ts', 'pnpm-lock.yaml',
];

type Report = ReturnType<typeof AudienceAuditReport.parse>;
const requireNew = () => fail('Audience audit destination already exists. Use a new output directory.', 'SHOWCASE_AUDIENCE_EXISTS');
const writeJson = (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const listEntry = (root: string, path: string) => {
  const suffix = relative(root, path);
  if (isAbsolute(suffix) || suffix === '..' || suffix.startsWith('..' + sep)) {
    fail('Inspection returned evidence outside the audit packet.', 'SHOWCASE_AUDIENCE_PATH');
  }
  return AudienceEvidenceEntry.shape.path.parse(suffix.split(sep).join('/'));
};

async function evaluatorFingerprint(signal: AbortSignal) {
  const [digests, ffmpeg, ffprobe] = await Promise.all([
    Promise.all(implementation.map(async name => [name, await fileHash(join(projectRoot, name))])),
    command(ffmpegPath(), ['-version'], {signal}), command(ffprobePath(), ['-version'], {signal}),
  ]);
  return {evaluatorSha256: sha256(canonical(digests)),
    ffmpegVersion: ffmpeg.split(/\r?\n/)[0]!, ffprobeVersion: ffprobe.split(/\r?\n/)[0]!};
}

async function packetEntries(root: string, signal: AbortSignal) {
  const entries: ReturnType<typeof AudienceEvidenceEntry.parse>[] = [];
  async function visit(directory: string) {
    for (const filename of (await readdir(directory)).sort()) {
      checkAbort(signal);
      const path = join(directory, filename);
      const details = await lstat(path);
      if (details.isDirectory() && !details.isSymbolicLink()) {
        await visit(path);
      } else {
        if (!details.isFile() || details.isSymbolicLink() || details.size > 80_000_000) {
          fail('Audit packet contains unexpected evidence.', 'SHOWCASE_AUDIENCE_PATH');
        }
        const bytes = await boundedFile(path, 80_000_000);
        entries.push(AudienceEvidenceEntry.parse({path: listEntry(root, path), bytes: bytes.length, sha256: sha256(bytes)}));
      }
    }
  }
  await visit(root);
  return entries;
}

function reportMarkdown(report: Report) {
  const code = (value: string | number) => '`' + String(value).replaceAll('`', '′').replace(/[\r\n\u2028\u2029]/g, ' ') + '`';
  const range = ({startFrame, endFrameExclusive}: {startFrame: number; endFrameExclusive: number}) =>
    '[' + startFrame + ', ' + endFrameExclusive + ')';
  const sampledUnboundCues = report.correspondence.unboundCues.filter(({cue: {window}}) =>
    window.startFrame < window.endFrameExclusive && (
      report.coverage.sampleFrames.some(frame => frame >= window.startFrame && frame < window.endFrameExclusive) ||
      report.coverage.extractedClips.some(clip =>
        clip.startFrame < window.endFrameExclusive && clip.endFrameExclusive > window.startFrame)));
  return [
    '# Showcase audience audit',
    '',
    'Candidate ' + code(report.hashes.candidateSha256) + ' · ' + report.association.kind,
    '',
    'Manifest ' + code(report.hashes.originalManifestSha256) + ' · Script ' + code(report.hashes.scriptSha256),
    '',
    'Request ' + code(report.hashes.requestSha256) + ' · Font ' + code(report.hashes.fontSha256),
    '',
    '[Structured report](report.json) · [Packet SHA-256 inventory](bindings.json) · [Phone contact sheet](' +
      report.inspection.contactSheet + ') · [Layout measurements](' + report.inspection.reportPath + ')',
    '',
    '## Original candidate and current layout',
    '',
    report.coverage.sampleFrames.length + ' selected frames of ' + report.coverage.totalFrames + ' at 30 fps.',
    '',
    ...report.coverage.originalFrames.map(({frame, path}, index) => {
      const current = report.coverage.currentFrames[index]!;
      return '- Frame ' + frame + ' · [original](' + path + ') · [current layout](' + current.screenshot +
        ') · [phone](' + current.phoneScreenshot + ')';
    }),
    ...report.coverage.extractedClips.map(clip => '- [Original-derived AV clip ' + range(clip) + '](' + clip.path + ')'),
    '',
    '## Phone layout findings',
    '',
    ...(report.inspection.findings.length ? report.inspection.findings.map(finding =>
      '- Frame ' + finding.frame + ' · ' + code(finding.code) + ' · ' + code(finding.elementId) +
      (finding.otherElementId ? ' and ' + code(finding.otherElementId) : '')) : ['No geometry risks detected in the selected frames.']),
    '',
    '## Caption cue and source-action correspondence',
    '',
    'Each schedule result compares a caption display interval and visible panel playback against a declared source window. Event semantics require frame review.',
    '',
    ...report.correspondence.expectations.map(row => '- ' + code(row.expectation.id) + ' · ' + code(row.expectation.cue.text) +
      ' · ' + code(row.captionClock) + ' ' + range(row.cueWindow) + ' · schedule ' + code(row.status) +
      ' · speech ' + code(row.speech.status) + (row.speech.method ? ' (' + row.speech.method + ')' : '') + '. ' + row.speech.reason),
    '',
    report.correspondence.unboundCues.length + ' caption cues, ' + report.correspondence.unboundPanels.length + ' panels and ' +
      report.correspondence.unboundActions.length + ' authored anchors lack an expectation binding. See the structured report for all locations.',
    '',
    ...(sampledUnboundCues.length ? [
      'Unassessed cues within the requested frames or clips:',
      '',
      ...sampledUnboundCues.map(({beatId, cue}) => '- ' + code(beatId) + ' cue ' + cue.index + ' · ' +
        code(cue.text) + ' ' + range(cue.window) + ' · UNASSESSED'),
    ] : []),
    '',
    '## Review scope',
    '',
    ...report.scope.map(note => '- ' + note),
    '',
  ].join('\n');
}

export async function showcaseAudienceAudit(requestPath: string, outputPath: string, signal: AbortSignal) {
  const requestFile = resolve(requestPath), output = resolve(outputPath);
  const requestBytes = await boundedFile(requestFile, MAX_JSON);
  const request = AudienceAuditRequest.parse(json(requestBytes));
  const base = dirname(requestFile);
  checkAbort(signal);
  if (request.source.kind === 'checkpoint') {
    const data = resolve(base, request.source.data);
    const relativeData = relative(output, data), relativeOutput = relative(data, output);
    const inside = (suffix: string) => suffix === '' || !isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith('..' + sep);
    if (inside(relativeData) || inside(relativeOutput)) {
      fail('Audience audit output and checkpoint state overlap.', 'SHOWCASE_AUDIENCE_PATH');
    }
  }
  await ancestors(dirname(output));
  try {
    await lstat(output);
    requireNew();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const stage = await mkdtemp(join(dirname(output), '.audience-audit-'));
  const scratch = join(stage, 'scratch'), packet = join(stage, 'packet');
  try {
    await mkdir(scratch);
    await mkdir(packet);
    const source = await loadAudienceSource(request.source, base, scratch, signal);
    const {input, manifest, assets, timeline, candidate} = source;
    const totalFrames = timeline.props.frames;
    const selected = request.sampleFrames.toSorted((a, b) => a - b);
    if (selected.some(frame => frame >= totalFrames) || request.clips.some(clip => clip.endFrameExclusive > totalFrames)) {
      fail('Audit frames or clips exceed the measured candidate timeline.', 'SHOWCASE_AUDIENCE_BINDING');
    }
    const speech = await loadAudienceSpeech(request.speechAlignment, base, manifest, assets, timeline);
    const correspondence = evaluateAudienceCorrespondence(manifest, timeline, request.expectations, speech);
    const candidatePath = join(scratch, 'candidate.mp4');
    await writeFile(candidatePath, candidate, {flag: 'wx'});
    await validateAudienceCandidate(candidatePath, totalFrames, signal);
    const {originalFrames, extractedClips} = await extractAudienceCandidate(candidatePath, selected, request.clips, packet, signal);
    const {inspectShowcaseFrames} = await import('./audience-render.js');
    const evaluator = await evaluatorFingerprint(signal);
    const inspection = await inspectShowcaseFrames({props: timeline.props,
      assets: new Map(manifest.media.map(media => [media.path, assets.get(media.path)!])),
      font: assets.get(manifest.font.path)!, frames: selected, outputDir: join(packet, 'inspection'), signal});
    if (canonical(inspection.frames.map(frame => frame.frame)) !== canonical(selected)) {
      fail('Current renderer inspection frame coverage differs from the request.', 'SHOWCASE_AUDIENCE_BINDING');
    }
    for (const measurement of inspection.frames) {
      const {frame} = measurement;
      const shot = timeline.props.shots.find(shot => frame >= shot.start && frame < shot.end)!;
      const expectedPanels = showcasePanels(shot).flatMap((panel, index) => {
        if (!showcasePanelVisible(panel, showcaseShotProgress(frame, shot))) return [];
        const media = shot.panels?.[index]?.media ?? shot;
        return [{id: 'panel-' + index, asset: media.file, type: media.type,
          sourceFrame: media.type === 'video' ? showcasePanelSourceFrame(frame, shot, panel) : null}];
      });
      const observed = measurement.elements.filter(element => element.role === 'panel').map(({id, source}) =>
        ({id, asset: source?.asset, type: source?.type, sourceFrame: source?.sourceFrame}));
      if (canonical(expectedPanels) !== canonical(observed)) {
        fail('Measured renderer panel/source selection differs at frame ' + frame + '.', 'SHOWCASE_AUDIENCE_BINDING');
      }
    }
    const speechInputs = [];
    if (speech.size) await mkdir(join(packet, 'speech'));
    for (const [index, [lineId, evidence]] of [...speech].entries()) {
      const speechRequestPath = 'speech/request-' + index + '.json', reportPath = 'speech/report-' + index + '.json';
      await writeFile(join(packet, speechRequestPath), evidence.requestBytes, {flag: 'wx'});
      await writeFile(join(packet, reportPath), evidence.reportBytes, {flag: 'wx'});
      speechInputs.push({lineId, requestSha256: sha256(evidence.requestBytes), reportSha256: sha256(evidence.reportBytes),
        requestPath: speechRequestPath, reportPath, status: evidence.method ? 'PROPOSED_UNREVIEWED' : 'AUDIO_DIAGNOSTICS_ONLY',
        adapter: evidence.draft.adapter});
    }
    const report = AudienceAuditReport.parse({
      schemaVersion: 'showcase-audience-audit-report/1.0',
      review: {status: 'REVIEW_REQUIRED', candidateVisuals: 'UNVERIFIED', currentPerceptualReadability: 'UNVERIFIED',
        embeddedMediaText: 'UNASSESSED', visualEventSemantics: 'UNVERIFIED', actualSpeechCorrespondence: 'UNVERIFIED',
        continuousAudiovisual: 'UNVERIFIED', ownerAcceptance: 'pending'},
      association: source.association,
      hashes: {
        requestSha256: sha256(requestBytes), originalManifestSha256: input.sourceManifestSha256,
        normalizedManifestSha256: sha256(canonical(manifest)), candidateSha256: sha256(candidate), fontSha256: manifest.font.sha256,
        scriptSha256: manifest.script.sha256, approvalSha256: manifest.approval.sha256, scriptReviewSha256:
          input.provenance?.reviewSha256 ?? input.standaloneReviewSha256 ?? null, pinnedSourceSha256: input.provenance?.sourceSha256 ?? null,
        timelineSha256: sha256(canonical(timeline.timeline)), rendererPropsSha256: sha256(canonical(timeline.props)),
        reconstructedPcmSha256: source.reconstructedPcmSha256,
        media: manifest.media.map(({id, type, sha256}) => ({id, type, sha256})),
        narration: manifest.narration.map(({id, sha256, transcriptSha256, receipt}) =>
          ({id, audioSha256: sha256, transcriptSha256, receiptSha256: receipt.sha256})),
      },
      provenance: {...evaluator, browserSha256: inspection.evaluator.chromiumSha256,
        rendererEvaluatorSha256: inspection.evaluator.sha256, inspectionContract: inspection.contractVersion},
      coverage: {totalFrames, fps: 30, sampleCoverage: 'selected-frames-only', sampleFrames: selected,
        sampledFrameFraction: selected.length / totalFrames, originalFrames, extractedClips,
        currentFrames: inspection.frames.map(frame => ({frame: frame.frame, screenshot: listEntry(packet, frame.screenshotPath),
          phoneScreenshot: listEntry(packet, frame.phoneScreenshotPath)}))},
      inspection: {reportPath: listEntry(packet, inspection.metadataPath), contactSheet: listEntry(packet, inspection.contactSheetPath),
        findings: inspection.frames.flatMap(({frame, findings}) => findings.map(finding => ({...finding, frame})))},
      correspondence: {...correspondence, speechInputs},
      scope: [
        'Original candidate samples use independently decoded movie frames and locally re-encoded clips with original candidate audio.',
        ...(source.association.kind === 'historical-declared' ? [
          'The request declares the historical manifest-to-movie association. The current timeline was reconstructed from bound original narration bytes.',
        ] : ['The candidate and timeline are bound to the completed read-only checkpoint.']),
        'Current inspection screenshots use the actual current renderer, bound inputs and selected absolute frames.',
        'Text size and overlap findings flag sampled geometry risks. Actual legibility, visual event semantics and text inside source media require review.',
        'Caption display and local speech timing evidence are separate clocks. Actual speech correspondence, listening and continuous audiovisual review remain unverified.',
      ],
    });
    await writeFile(join(packet, 'request.json'), requestBytes, {flag: 'wx'});
    await writeFile(join(packet, 'timeline.json'), canonical(timeline.timeline), {flag: 'wx'});
    await writeJson(join(packet, 'report.json'), report);
    await writeFile(join(packet, 'review.md'), reportMarkdown(report), {flag: 'wx'});
    const inventory = AudienceAuditBindings.parse({schemaVersion: 'showcase-audience-audit-bindings/1.0',
      files: await packetEntries(packet, signal)});
    const bindings = join(packet, 'bindings.json');
    await writeJson(bindings, inventory);
    const bindingsSha256 = await fileHash(bindings);

    checkAbort(signal);
    await ancestors(dirname(output));
    try {
      await mkdir(output);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') requireNew();
      throw error;
    }
    // A destination is exclusively reserved before publishing. The inventory is the completion marker.
    for (const name of (await readdir(packet)).filter(name => name !== 'bindings.json').sort()) {
      await rename(join(packet, name), join(output, name));
    }
    await rename(bindings, join(output, 'bindings.json'));
    return {schemaVersion: report.schemaVersion, status: report.review.status, output,
      report: join(output, 'report.json'), review: join(output, 'review.md'), bindingsSha256, sampleFrames: selected};
  } finally {
    await rm(stage, {recursive: true, force: true, maxRetries: 2, retryDelay: 100});
  }
}

