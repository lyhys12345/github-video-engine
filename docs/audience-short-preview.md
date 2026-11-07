# Audience short previews

Start with a documented outcome and a question a new viewer can understand. Choose an object, value, or request that the viewer can follow across the example. Keep the exact source claim and any required assumptions in the editable plan. See the [dotenv story](dotenv-story-redesign.md) and the [feedback baseline](short-preview-quality-baseline.md).

A complete narrative run can opt into this rendering and timing policy in `run.json`:

```json
{
  "portraitStyle": "audience-portrait/1.0",
  "rhythm": { "leadFrames": 0, "maxUnnarratedTailFrames": 18 }
}
```

The portrait option gives supported contextual scenes more space, uses larger measured captions, and keeps Latin identifiers together. Production status is available in the editable review data. Required illustration disclosures stay visible, and unresolved scenes remain visibly incomplete. The `leadFrames` option controls the opening card. The tail cap is measured at 30 fps, so 18 frames equals 0.6 seconds.

1. Run the normal `explanation run` command with `--through speech`. The timing report gives the measured recording length, frame allocation, samples after each recording, and separately declared opening or unresolved intervals.
2. If preflight asks for a revision, preserve the old author files. Make an explicit timing change to `story.json`, `narrative.json`, and `run.json` as appropriate. Keep every complete original-speed recording and exact source shot coverage.
3. Run the revised author directory with `--through preview`. Review the exported cues, editable source and task records. Measure the finished MP4 separately. A recording may contain internal silence, and an authored cue does not establish word alignment.

The existing evidence-bound causal animation profile can give a document transformation a `valueTrace` label. Its left rail animates a copy of the labeled value and keeps the source value visible. Authors should use this only for transformations where the source survives the read. The compiler checks the operation family and claim binding. A fact review must check that the copy-and-retain explanation fits the source. `valueTraceFocus: "result"` can show a supported output at the start or end of a story. Other causal animation inputs keep their existing rendering.
