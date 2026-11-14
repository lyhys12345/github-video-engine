# Local speech alignment and quality report

The optional alignment report works on an approved UTF-8 transcript and its original WAV. It measures silence by fully decoding the WAV with FFmpeg. The optional Windows recognizer or imported local timing evidence adds phrase/word timing proposals and confidence. The report preserves the original audio and labels speech content, timing, and naturalness as **UNVERIFIED** pending listening.

## Run a report

```sh
pnpm gve alignment report --request alignment-request.json --audio speech.wav \
  --approval transcript-approval.json --windows-speech --out alignment-report.json
```

Use `--windows-speech` with an installed matching Windows desktop SAPI recognizer. It recognizes the pre-recorded WAV using the local Windows installation and uses a temporary PCM copy for format compatibility. It does not generate audio or use a paid service. If the recognizer is unavailable, the command returns measured audio diagnostics, the reason, and no speech timings. Use `--timings local-evidence.json` with the output of another local recognizer or forced aligner. Omit both flags for FFmpeg diagnostics alone. FFmpeg must be on PATH or configured through `GVE_FFMPEG`.

The request uses schema `speech-alignment-request/1.0` with these fields.

| Required field | Value |
| --- | --- |
| `locale` | Track language, such as `zh-CN` or `en-US` |
| `transcript`, `transcriptSha256` | Exact text and SHA-256 of its UTF-8 bytes |
| `audio` | Object with `sha256` and `bytes` of the complete original WAV |
| `approval` | Approval kind and receipt SHA-256, using one of the bindings below |
| `phrases` | Ordered `{id, text}` rows that concatenate to the approved transcript including spacing and punctuation, with boundaries between complete words |

Intentional pauses are optional `{id,startSeconds,endSeconds,reason}` rows. A detected interval fully covered by a declared pause stays in the report without an unexplained long-pause finding. Action anchors are optional `{id,target,expectedSeconds,edge?,toleranceSeconds?}` rows. Use `{kind:"phrase",phraseId:"..."}` or `{kind:"word",wordIndex:0}` as the target. Word indices are zero-based in report order. Anchors and pauses use seconds from the start of the source WAV. For an action on a reel's video clock, subtract the narration's start time before supplying the expected time. The default anchor compares the start edge with a tolerance of 0.25 seconds. The signed offset is the proposed speech time minus the authored action time.

The optional `settings` object accepts `silenceThresholdDbfs` (default −45), `minimumSilenceSeconds` (0.20), `longPauseSeconds` (0.60), and `minimumConfidence` (0.65). These are review thresholds.

### Approval binding

- For a standalone track, use `approval: {kind:"transcript-approval",sha256:"..."}`. The approval receipt uses schema `speech-transcript-approval/1.0` and contains `status:"approved"`, exact `transcript`, `transcriptSha256`, and the recorded `authority`. Use an actual transcript approval. The checker verifies submitted bytes and claimed scope. Identity and authority authentication remain with the calling review workflow.
- For an existing showcase, use `approval: {kind:"showcase-script-approval",sha256:"...",scriptSha256:"...",lineId:"..."}`. Pass its existing owner receipt to `--approval` and the exact approved script to `--script`. Use the WAV SHA-256 and transcript SHA-256 from the corresponding narration entry, with its matching approved line and authored caption phrases when supplied.

### Import local timing evidence

Import a JSON file with `schemaVersion:"speech-timing-evidence/1.0"`, exact `transcriptSha256`, `audioSha256`, `locale`, `provider`, `providerVersion`, `model`, `method` (`recognition` or `forced-alignment`), `confidenceMeaning`, and `phrases`. Each backend phrase includes `text`, `startSeconds`, `endSeconds`, `confidence`, optional `rejected`, and `words`. Each word includes `text`, `startSeconds`, `endSeconds` and `confidence`. Use two null endpoints for an untimed word, and `confidence:null` when the tool lacks a bounded 0–1 confidence signal. Timestamps are on the original WAV's clock. The report marks imported provider/model provenance as caller-declared and retains the input SHA-256.

The exact approved text remains the caption source. For comparison only, the report case-folds, normalizes Unicode to NFC, and uses lexical runs and individual Han characters to compare ordered content. It maps only complete backend ranges. If several approved words share an indivisible backend range, their individual timing stays null. An ASR omission raises `possible-missing-word` for review. Forced alignment uses the supplied text as input, so an unmatched result raises `unmatched-alignment-word` and has no independent speech-content authority. Scores stay on the provider's scale.

## Create a caption timing draft

```sh
pnpm gve alignment cues --spec cue-input.json --request alignment-request.json \
  --out caption-timing-draft.json
```

Use `speech-caption-draft-input/1.0` for `cue-input.json` with `reportPath` relative to that file (or absolute), its exact byte SHA-256 as `reportSha256`, and `clock: {audioSha256, audioStartFrame, fps}`. The resulting `speech-caption-timing-draft/1.0` keeps the source report digest, approval binding, scoring provenance and exact phrases. Null or low-confidence ranges explicitly require review. The draft is `PROPOSED_UNREVIEWED` and `renderable:false`.

For the showcase's clip-local timeline, use 30 fps and an `audioStartFrame` of 0. The showcase expects its authored `captionCues` to form a contiguous partition covering the full narration segment. This draft supplies observed speech intervals, including the gaps between phrases. Use those intervals and the pause findings to author and review contiguous cues before changing the manifest. The report and draft never replace a manifest, adjust action keyframes, or alter audio.

## Verification

Integration tests decode a synthetic WAV with leading, internal, trailing and full-length silence using real FFmpeg, exercise both exact approval bindings, import fixed timing evidence, and check action offsets, partial matches, nulls and caption drafts. The Windows adapter was separately exercised on the existing approved ArtCraft `line1.wav` with the installed zh-CN recognizer. It measured 3.12 seconds and flagged a low-confidence match and possible missing words. Actual speech content and naturalness remain **UNVERIFIED**.
