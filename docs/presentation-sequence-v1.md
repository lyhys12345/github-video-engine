# Assemble verified presentation scenes

Use a sequence to place two to four completed presentation previews of the same mode in an explicitly authored order. Each scene keeps its own source-backed plan, claims and timing. The opening card title is written by the caller. The localized “Separate example” label identifies a fresh illustration with its own starting state.

```json
{
  "schemaVersion": "presentation-sequence/1.2",
  "locale": "en",
  "authorship": {"kind": "caller-authored"},
  "mode": "silent",
  "scenes": [
    {"sceneId": "two-slots", "previewTaskId": "<preview task hash>", "expectedPreviewManifestSha256": "<manifest SHA-256>", "openingCard": {"title": "Two slots"}},
    {"sceneId": "one-slot", "previewTaskId": "<preview task hash>", "expectedPreviewManifestSha256": "<manifest SHA-256>", "openingCard": {"title": "One slot"}}
  ]
}
```

Get the exact `preview-manifest.json` digest from each child export. The scenes must have distinct IDs and preview task IDs. All children must share the exact project, repository, commit, snapshot and evidence fingerprint. New assembly checks that the project snapshot is still current.

Set locale to `en` for English or `zh-CN` for Simplified Chinese. The locale selects the case numbering and independent-example label. Write the scene titles directly in the selected language. English titles have 1–21 characters and accept ASCII letters, digits, spaces, periods, commas, parentheses and hyphens. Chinese titles have 1–12 code points, include at least one Han character, and accept those same characters plus `，。！？、（）·《》`. Titles begin with a letter, a digit or, for Chinese, a Han character. Provide a short single-line title for every scene so any scene can appear later after a reorder.

```text
pnpm gve presentation assemble --spec sequence.json --data state
pnpm gve presentation sequence-status --task TASK --data state
pnpm gve presentation sequence-resume --task TASK --data state
pnpm gve presentation sequence-export --task TASK --data state --out output
```

The sequence plays the first child immediately. Before each subsequent child, it inserts a 36-frame (1.5-second) silent card with the case number, the separate-example label and the caller's title. Both modes use a local FFmpeg build with the `drawtext` filter and the bundled, unmodified Noto Sans SC font. The engine verifies the font and its included SIL Open Font License 1.1 by SHA-256. It checks the font's Unicode glyph map for each visible character before creating a task. A missing glyph or unsupported locale is an explicit error. The three text lines render from fixed local UTF-8 files, and the video carries their rasterized text. The manifest records absolute zero-based, half-open frame intervals for each complete child and for each inserted card. The children keep their original 24 fps playback and all original frames. The 7,200-frame maximum includes the cards. Assembly caps the input closure at 160 MB and the output MP4 at 80 MB. It verifies the exact frame count and fully decodes the combined 720×1280 movie before committing.

For a narrated sequence, change the version to `presentation-sequence/1.3` and mode to `narrated`. Use completed narrated previews for every scene. Silent creation continues with 1.2. Mixed modes are rejected. Each child supplies its verified 48 kHz, mono signed 16-bit PCM from the retained voice binding, with its complete local placement and padding. A video frame is exactly 2,000 samples. Assembly inserts 72,000 zero samples for each card and encodes AAC once over the combined track. The MP4 audio and video streams start at zero on the same 48 kHz clock and have the same exact declared duration. A raw AAC decoder can expose packet padding past that declared duration.

A sequence export contains the editable sequence spec, manifest and assembled movie. Each `scenes/scene-<sceneId>` directory contains the exact original MP4, its local caption sidecar and editable provenance. Child samples remain in the original child task. Narrated exports additionally contain `sequence-narration.pcm`, `sequence-captions.vtt` and `sequence-caption-ledger.json`. The ledger gives each cue its scene, source beat and cue index, local and absolute sample and frame intervals, and timing provenance. Global VTT times are rounded once to the nearest millisecond after adding the exact scene sample offset. A cue that cannot be represented within its child range is rejected. There are no cues during a card. The assembled picture retains the child's burned captions. The combined VTT is an editable sidecar. Legacy voice cues preserve measured clip placement, and 1.1 voice cues preserve caller-declared timing. Both use caller-declared transcripts. Speech alignment and owner listening remain unverified.

The locale, title, scene order, child, expected digest and toolchain contribute to sequence task identity. Successful 1.0–1.2 tasks remain readable and exportable with their original bytes. New assembly and incomplete-task resume use 1.2 for silent or 1.3 for narrated, with the current task identity. Successful status and export validate the retained child and sequence closure offline.

Semantic, editorial, audiovisual and owner reviews remain pending in the machine manifest.
