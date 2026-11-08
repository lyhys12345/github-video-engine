# Pre-render script source review

`explanation script-facts --spec INPUT.json --out NEW_PACKET` prepares a reviewable complete script before renderer-specific authoring. The Agent supplies JSON; users do not. It reuses existing `fact-review-packet/1.0`, `prepareFactReviewWorksheet`, exact quote/source validation and `fact-review-receipt/1.0`; no new semantic voting system or model dispatcher.

Input `script-fact-input/1.0` contains:
- `script: {path, sha256}` for exact UTF-8 script/storyboard bytes;
- `brief`: validated `creative-brief/1.0`;
- `sources: [{id, path, url, sha256}]` for bounded local, pinned source captures;
- `claims: [{id, statement, kind, citations: [{document, startLine, endLine, quote}]}]`; kind is documented, inference or observed, and optional reasoning describes inference.

Paths resolve relative to the input. Text/source files are read as data, never executed. Each exact citation is checked against the supplied hash and source lines. Source origins/author labels are not machine-authenticated truth. URLs are metadata, not automatically fetched by this command. The packet binds source bytes/citations, complete script and brief; changed requirements, script, evidence or sources invalidate old receipts. Every complete script is a required review unit even if its claims were not linked. Empty/default review drafts remain unverified.

The output includes source bytes, numbered copies, all review items, `candidate.txt`, `packet.json`, `worksheet.json`, and incompatible unassigned `receipt-draft.json`. It is a script packet, not a generated preview. Existing outputs are refused; a partial directory after interrupted publication is not a complete packet. Source packet references do not by themselves approve new footage or narration.

After an independent Agent reads every required item, validate its separately authored receipt:

```powershell
node --import tsx src/cli.ts explanation script-facts --spec INPUT.json --review FACT_RECEIPT.json
```

The result is attributed source support or unresolved items. Reviewer identity is self-attributed, no external authentication. Owner approval still precedes video generation; actual frames/listening require their own review.

## RSI execution, 2026-11-08

Fixed-source VoiceStudio and The World We Know scripts were reviewed and repaired against actual README/source data. VoiceStudio's example was narrowed from an unproved original/clone relation and engine attribution to exact repository sample filenames; default OmniVoice and the model input path are supported separately. World replaced a fictional “gift list” UI with the documented Aden stop description and preserved imagined-illustration disclosure plus approximate-history limits.

Raw review history and exact revised scripts/packets are in `reviews/rsi-source-facts-v1`. Final source receipts: `world-review-v2.json`, `voice-review-v3.json`; earlier dissent remains intact. Upstream complete raw sources remain in local work packets; the committed fact packets retain source URLs/hashes, exact bounded quotations/context and script bytes. Another machine must fetch the pinned sources and match those hashes to repeat source inspection. These files are not a bundled offline source checkout.

Held-out `gtanner/qrcode-terminal` was captured using the ordinary `explanation run` and `source-expand` entrypoints at `90f66cf5c6b10bcb4358df96a9580f9eb383307b`, then the session Agent authored a fresh 42-second estimated script/brief and used this generic fact CLI. README and lib/main.js support input-to-terminal output and the two-row small-mode mechanism. `heldout-qr-review-v1.json` supports source/editorial script scope. The target was never executed or installed; no successful scan, actual timing, rendering or listening is claimed. This proves a new project reaches reviewable source-backed script, not a new project reaching a complete movie or the older renderer plan adapter.

Validation: 26 tests passed across `script-facts.test.ts` and `fact-review.test.ts`; TypeScript passed. Initial sandbox CLI publication test hit directory-rename EPERM; a permitted local rerun passed without changing the publication rule. Real CLI tested exact source/script changes, stale brief receipts, omitted whole-script coverage, pending draft, hostile source text as data, and existing-output refusal. No full regression, paid provider or new video run.
