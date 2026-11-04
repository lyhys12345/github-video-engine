# Assemble verified presentation scenes

Use a sequence to place two to four completed silent presentation previews in an explicitly authored order. Each scene keeps its own source-backed plan, claims and timing. The opening card title is written by the caller. The fixed “Separate example” label identifies a fresh illustration with its own starting state.

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

The sequence plays the first child immediately. Before each subsequent child, it inserts a 36-frame (1.5-second) silent card with the case number, the separate-example label and the caller's title. Sequence 1.2 uses a local FFmpeg build with the `drawtext` filter and the bundled, unmodified Noto Sans SC font. The engine verifies the font and its included SIL Open Font License 1.1 by SHA-256. It checks the font's Unicode glyph map for each visible character before creating a task. A missing glyph or unsupported locale is an explicit error. The three text lines render from fixed local UTF-8 files, and the video carries their rasterized text. The manifest records absolute zero-based, half-open frame intervals for each complete child and for each inserted card. The children keep their original 24 fps playback and all original frames. The 7,200-frame maximum includes the cards. Assembly rejects narrated previews and the narrated mode. It caps the input closure at 160 MB and the output MP4 at 80 MB. It verifies the exact frame count and fully decodes the combined 720×1280 movie before committing.

A sequence export contains the editable sequence spec, manifest and the assembled movie. Each `scenes/scene-<sceneId>` directory contains the exact original MP4, its own caption sidecar and editable provenance. Child samples remain in the original child task. The captions keep their per-child timing and the sequence has no global captions. The locale, title, scene order, child, expected digest and toolchain contribute to sequence task identity. Successful 1.0 and 1.1 tasks remain readable and exportable with their original bytes. New assembly and incomplete-task resume require 1.2. Successful status and export validate the retained child and sequence closure offline.

Semantic, editorial, audiovisual and owner reviews remain pending in the machine manifest.
