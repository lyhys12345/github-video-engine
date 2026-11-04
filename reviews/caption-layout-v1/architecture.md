# Independent architecture / evidence / content-facts review

Candidate SHA-256: `b4e0172e8aaa7c2b90985551b04b56c4dc9c2b32fd1fa0c7991e7988d2e5ae29`.

**PASS within the documented supported-script and ASCII-token scope, with two minor layout limitations. No source-binding, historical-integrity or media blocker found.** The original Huihui example's orphaned final line is corrected in inspected real frames. This is deterministic typographic layout, not general Chinese word understanding or a guarantee against every short final line.

## Frozen identity and code

Independently verified all **1,054 manifest files**, ZIP SHA `7ab24ec77b532e98a3dbd0e137e1a41e60377c6b5eb846ddff0f8d02cad58d67`, and all **597 source files** against Git base `3b828000bd3781320970bb73ef96e8adcdbaaa5b` plus the six declared changes. Read OPERATOR, layout/font parser, style constants, composition, runtime and tests. Did not use builder audit outcomes or other judge reports as proof. Extracted source, copied-state mutations and independent outputs reside only in this judge directory. No target source code, paid service or new speech synthesis was executed.

The `noto-sc-caption-lines/1` profile is an optional historical schema field only on narrated input, without default injection. New narrated submissions explicitly set it. It therefore participates in task identity and manifest. New manifests contain line ranges, and successful reads reconstruct them from fully verified parent caption cues and the SHA-pinned font, comparing the full derived manifest. Unknown profiles, missing/mismatched layout and altered captions fail. Successful old tasks bypass new layout derivation and retain original bytes. Unfinished old narrated tasks lacking the profile refuse resume before dispatch and require a new submission. Silent layout code remains visually unchanged, although engine codeHash changes new silent task identity normally.

## Text, Unicode and font boundary

Layout ranges are half-open **UTF-16 offsets**, separate from the preexisting author-caption code-point offsets. `Intl.Segmenter('und', grapheme)` supplies offset boundaries; slices retain original text. NFC is used only to classify and measure a grapheme, not to rewrite output. Independent tests confirm exact concatenation and legal grapheme endpoints for decomposed `Cafe\u0301`, supported supplementary Han `𰻞`, ordinary English, preserved multiple spaces and mixed text. No transcript normalization, word replacement, trimming or VTT rewrite was introduced.

The supported repertoire is deliberately limited: selected Han/Latin, ASCII and listed punctuation. Missing glyphs, emoji, variation-selector/ZWJ cases, Arabic/Hebrew, line separators, unsupported combining sequences and overflow were independently rejected. The pinned font SHA is `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`; font file/license are unchanged from base. Runtime verifies its hash before deriving new-profile layout. Default font advances plus margins are used offline, then Chromium measures each full displayed line after font load at the actual weight. Width overflow cancels rendering. No font download or unverified system fallback is used as an admitted repertoire mechanism.

Rendering uses 28 px, weight 400, 34 px line height, preserved whitespace, disabled kerning/ligatures and explicit line elements. At most three lines; subtitle bottom is 40 px and narrated progress bar bottom is 170 px. This gives only an 8 px design-space gap between the three-line box and progress bar, but the inspected 360×640 three-line frame shows separation without overlap. It is not a device/user-study acceptance result.

## Independent state and integrity tests

With FFmpeg, FFprobe and browser paths disabled, verified read/status, cached successful resume, exact export and repeated export for historical, retained-Huihui, mixed-Huihui and three-line-Huihui previews. The retained case keeps the same plan and voice task; its new profile gives a distinct preview ID. **Sixteen files** are byte-identical between old and retained previews: captured evidence/proposal/plan/trace, original WAV/receipt/generation manifest, normalized and mixed PCM, voice bindings/manifest, and both VTT paths. Full list in checks.json.

**17 refusal checks** passed: 10 unsupported Unicode/overflow cases; six independently created hash-consistent tasks with a line gap, overlap, missing layout, unknown profile, missing manifest profile, or altered VTT; and one unfinished historical narrated task, refused before dispatch. Fixtures were new immutable tasks, never edits to an original succeeded row. All **43 original task JSON rows** and preexisting artifact bytes remain unchanged.

The first judge inventory assertion included SQLite reader-created `tasks.sqlite-wal/-shm` sidecars and failed. The assertion was corrected to verify original artifact bytes and exact task rows instead of treating new reader sidecars as mutated history. Both logs are retained. This was a harness issue, not a candidate failure.

TypeScript checking and independently run focused presentation/concurrency-queue/TTS suites pass **58/58**. No real remote provider was used by the mocked TTS tests. Full default suite, live renderer cancellation and a fresh rendering by this judge were not run.

## Actual media, source and timing

Independently full-decoded four MP4 files: old Huihui 216 frames/9 s, retained 216/9 s, mixed 216/9 s, and three-line 315/13.125 s. Independently decoded their original recordings, reconstructed every normalized clip and complete PCM mix, checked original receipt/text/audio hashes against the proposal, and independently AAC-encoded each mix. Every AAC ADTS stream matches its actual MP4 exactly.

Old versus retained audio is exactly unchanged:

- PCM `d43331cc2115b0cace79b9f2465b6702532fa3c289657b514ef46f1196361a6d`.
- VTT `95afc31515990db504aea9dccbc44d29ce69fa0c46fe3336e328b5e5a7f9ad9d`.
- Complete AAC ADTS `b408337dc35f83c4f97f519ac13e612790333db814e7e15a8f01bf5f928692c4`.

The retained cue still occupies samples [14000,358400), frames [7,180), with the same exact transcript. The actual new movie is `e18bb5a9fe30637862a8c3421989dbc5aacf09b2b241036f62dc13d19971824f`; old movie remains `a1a6dd73a3effccd1140a50dc3bdbb5469cbe65e9156ddebd54f063e01b2887e`.

Extracted actual 360×640 retained frames 6/7/48/179/180 and frame 48 for other cases. Visually inspected retained/mixed/three-line active frames. Retained text now reads `示例监听三千端口。` / `请求根路径时，处理器返回问候。`, without isolating `候。`. Mixed `Express`, `GET /`, and `Hello World!` are visible intact in the displayed example. Three lines fit inside the box. The illustration/no-observed-execution label persists. This is selected-frame inspection, not continuous video or phone playback approval.

Exact captured source quotations were independently checked against local source bytes for all four cases. The retained case's source/fact interpretation is byte-identical to the earlier reviewed Express/Huihui example. The two new sample texts describe the same documented root-request/handler/response mechanism and explicitly illustrated flow. The layout code does not infer facts or modify claims. Retained Huihui metadata still has the previously recorded stale English-fixture wording; this patch appropriately preserves that historical source artifact rather than silently rewriting it. No fresh GitHub fetch, target execution, ASR, word-level alignment or listening was performed. Owner and semantic review remain pending.

## Two reproducible limitations

1. **Minor: short final lines remain possible.** `"W".repeat(21) + "中文"` is admitted and yields a 21-W first line plus `中文` on line two. The only available legal break preserves the long ASCII token, and the scorer has no hard orphan threshold. The original case is fixed, but do not claim universal orphan elimination. A future version can explicitly reject unavoidably short final lines or expose a diagnostic rather than silently changing text.
2. **Minor: token protection is ASCII-only.** `demonstrationdemonstrationcafe\u0301demonstration` yields `demonstrationdemonstrationcaf` / `e\u0301demonstration`. The combining grapheme stays intact, but the larger Latin word is split. This is consistent with OPERATOR's specific ASCII-token guarantee, not a guarantee to preserve every Latin word. If broader Latin-token protection is required, extend the token classifier in a new version, with long unsplittable-token rejection tests.

Both are saved in layout-limitations.json. Neither alters text/audio/time or breaks the tested real retained example; they bound the PASS. Avoid describing the profile as universal multilingual typesetting, Chinese word segmentation, or all-case last-line balancing.

Raw independent evidence: identity.mjs/json/log, checks.mts/json/log/checks-rerun.log, media.mjs/json/log and extracted PNGs, layout-limitations.json, typecheck.log and focused.log. Frozen candidate rechecked after review.
