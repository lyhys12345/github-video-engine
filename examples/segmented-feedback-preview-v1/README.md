# Segmented-caption feedback preview verification

This integration consumes an existing complete author with explicit caller-authored subtitle partitions. It does not select prose, infer speech alignment, call a model, execute the source repository, or approve facts. No paid API or Judge is invoked.

Reproduce with the preserved local workspace/request:

```
node --import tsx examples/segmented-feedback-preview-v1/run.ts C:/Users/luyuh/Documents/Codex/gve-seg-clsx C:/Users/luyuh/Documents/Codex/gve-seg-clsx/explicit-feedback.json C:/Users/luyuh/Documents/Codex/gve-seg-clsx/segmented-edit work/segmented-feedback-preview-v1
node --import tsx examples/segmented-feedback-preview-v1/verify.ts work/segmented-feedback-preview-v1
```

The executor keeps the version guard and candidate immutable. Repeating a completed candidate returns the existing checkpoint without rendering. Source/media CAS reuse is version-bound: the prior original movie uses a historical source code hash, so initial final-source rendering may rebuild visually unchanged scene previews; audio cache identity remains independent and reusable.

The verifier checks all seven full recordings against exported PCM byte for byte, silence elsewhere, actual MP4 frame/audio duration, caption text and every subtitle start/end frame in the burned safe area. These technical checks do not establish natural listening quality, spoken-word alignment, factual approval or final acceptance. A complete editable technical preview is not a formal finished film.
