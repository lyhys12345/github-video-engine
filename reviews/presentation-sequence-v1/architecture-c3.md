# Independent sequence c3 locale, font/evidence and compatibility review

Candidate SHA-256: `2a4658749ff29b3302a580e13fdd572219fe5e2b6b2dcdf577a4733a35ac1c2d`.

**PASS for the affected architecture, declared locale behavior, font/license evidence, supplied card facts and exercised backward compatibility. No blocker or major found in these roles.** This is not continuous audiovisual, audience or final owner acceptance. Prior c1/c2 reports remain unchanged.

## Identity and impact

All 677 frozen files matched their hashes and byte lengths. All 552 archive source files matched Git base `369eea89f8eb50f2c65e693042b03f8b1968592d` or the declared patch set. Final verification passed after every scratch mutation was restored. Relative to c2, only sequence implementation, its contract document and its tests changed. Child presentation readers, authoring identities, source captures, module compilers and original media are unchanged.

Reviewed actual source and contract; did not read builder verifier scripts/results or other judges' reports. State was copied into this directory. Frozen source was extracted to an isolated judge copy. All test, export and synthetic-task writes were local judge scratch. No target repository execution or paid service occurred. Read-only public upstream requests for font license/metadata and official license text are described below.

## Locale and factual boundaries

Sequence 1.2 requires explicit `en` or `zh-CN`. The locale controls the case-number and independent-example lines, and constrains the caller's title syntax. English accepts the documented ASCII subset up to 21 characters. Chinese accepts up to 12 Unicode code points, requires at least one Han character and limits punctuation. New assembly/incomplete resume reject older versions; completed history remains readable.

The engine does not translate titles, infer audience language from repository content, translate child movies, or verify arbitrary titles semantically. In particular, Han membership does not prove a title is linguistically correct Simplified Chinese; the caller remains responsible for wording. The actual tested cards are correct: English “One slot”/“Two slots” identify the next queue example; Chinese “示例 2 / 2”, “独立示例”, “修订版示意” identify the next separate revision. Those editorial labels do not claim observed execution or automatic storytelling. Review fields remain pending.

The first scene title is checked and identity-bound even though no first-scene card is rendered, so reordering cannot introduce an unchecked title later. Every visible character in all three lines is checked against the pinned font before task dispatch. Titles are written to generated local UTF-8 files; drawtext expansion is disabled. Unsupported locale, disallowed/control text and absent glyphs are explicit errors, without a fallback label or silent replacement.

## Font identity, glyphs and license evidence

The archived font is Noto Sans SC, 17,772,300 bytes, SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`; its font Git blob identity matches the original captured manifest. OFL SHA-256 is `1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9`. Font, license and metadata SHA-256 and Git blob identities were all independently computed. Both font/license digests are included in new task identity and checked before dispatch. The font bytes themselves are unchanged from the reviewed source baseline; I did not download the 17 MB font again this round.

I independently fetched [the pinned Google Fonts OFL file](https://github.com/google/fonts/blob/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/notosanssc/OFL.txt) and [its pinned metadata](https://github.com/google/fonts/blob/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/notosanssc/METADATA.pb). Both returned text and Git blob IDs match the archived files exactly. The metadata names this font file and OFL license; the included copyright and license are retained beside the unmodified font in the source archive. Raw connector results are `upstream-0.json` and `upstream-1.json`.

The [official OFL 1.1 text](https://openfontlicense.org/open-font-license-official-text/) permits font use and software bundling subject to its conditions, including retaining the copyright/license with distributed font copies; it distinguishes documents produced with the font from distribution of the font software itself. Here, the source archive retains the font and license together, while the MP4 contains rasterized video text. No font is sold separately or represented as modified by this change. This is a review of the supplied package and use evidence, not certification of unrelated downstream distribution practices.

An independent font parser checked sfnt table bounds, selected the Unicode cmap and performed a separate binary-search glyph lookup. The font has 31,036 glyphs. All 34 distinct characters in the tested English/Chinese card strings and selected allowed punctuation map to nonzero glyph IDs within range. U+31350 maps to zero. The application rejected that syntactically admitted Han character before dispatch when used in either the first or second scene title. Font-map presence is not a general proof of shaping correctness or visual readability.

## Actual encoded observations

All three new MP4s independently passed full FFmpeg `-xerror` decode. They retain 720×1280, one video stream, zero audio and exact totals of 1,019 / 1,164 / 1,019 frames. All 3,202 PTS match frame index / 24. Every actual frame was classified for card background: each card occupies exactly the same 36-frame interval as c2, and no extra card frames appear elsewhere. Child boundary samples align at their expected new positions.

Independently extracted card/scene stills from the actual MP4s. I viewed the English transition contact sheet and the Chinese card at 360×640. The inspected Chinese card shows the intended three lines, with no visible missing-glyph boxes, clipping or overlap. This observation is specific to that actual card and display size; maximum-length titles passed preflight but were not newly rendered or visually accepted here.

Compared 60 retained child files against c2 exports: all byte-identical, including source evidence, proposals, plans, traces and original MP4s. Existing p-limit and rembg factual/source conclusions are reused by this exact identity and the unchanged relevant code. Quotes/hashes were also rechecked when loading each new parent closure. There was no fresh remote repository-facts fetch. The rembg pair remains an original/revision compatibility example, not two newly authored cutout-only/mask-only scenes. No repository execution or image-quality demonstration is implied.

## Independent negative and compatibility checks

Fourteen locale/font probes rejected as expected: missing/unsupported locale; English-only title declared zh-CN; Chinese title declared en; overlong English/Chinese title; newline, bidi control, drawtext expansion and path-like punctuation; U+31350 in either scene; tampered local font bytes; tampered license bytes. The last two mutations affected only the judge source copy, were restored exactly, and the original task identity was reproducible afterward. Additional positive probes accepted the actual en/zh-CN specs, a 21-character English title, a 12-code-point Chinese title and allowed Chinese punctuation before dispatch. These probes produced no new media.

Repeated the 17 source/identity regressions from c2: schema/mode/authorship/duplicates, wrong manifest, genuinely different project/source binding, stale new assembly with preserved historical read, six CAS tamper/restore checks and successful-task immutability. All passed.

The new reader handled six historical tasks: three sequence 1.0 and three 1.1. With both media tools disabled, status, completed resume, fresh judge-directory export and repeat export succeeded. All 138 exported files compared byte-for-byte with the prior verified specs/manifests/movies and child closures. No locale or license field was retroactively injected into historical inputs or manifests. Fresh assembly of all six old specs rejected with VERSION. Separately created synthetic incomplete 1.0 and 1.1 tasks using the trusted TaskRunner, without media execution; both new-version resume attempts rejected with VERSION.

Changing only either existing English scene title produced a different sequence identity at the pre-dispatch callback. The locale is retained in the strict spec and therefore task fingerprint. No language detection or semantic approval is inferred from that binding.

## Execution and retained evidence

Frozen-source TypeScript no-emit: PASS. Affected presentation and queue tests: 32/32 PASS. The previous c2 frame-budget probes are reused only for unchanged 36-frame accounting logic; this round did not rerun mocked 7,200/7,201-frame tests or render four scenes/five minutes.

Raw evidence: `identity.json`, `source-delta.json`, `font-results.json`, `upstream-0.json`, `upstream-1.json`, `locale-results.json`, `probe-results.json`, `card-delta-results.json`, `negative-results.json`, `compatibility-results.json`, `migration-results.json`, `focused-tests.log`, `typecheck.log`, independent scripts and extracted `run` images.

Not rerun: fresh whole-movie rendering, original cancellation/recovery, full continuous viewing, real mobile-device playback, arbitrary maximum-length title rendering or owner acceptance. The sequence remains silent with per-child VTT only. The report does not certify a global-caption/narrated sequence, universal language coverage, or overall product/visual acceptance.
