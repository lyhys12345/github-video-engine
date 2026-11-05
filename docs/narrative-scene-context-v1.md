# Authored Chinese scene context v1

`visualContext` is an optional scene field in the existing narrative plan, with its own strict version `narrative-scene-context/1.0`. No field is synthesized from repository text. The session Agent authors it from the pinned sources and scope; the user can request edits in prose. It is explanation awaiting review, never a machine-certified quote or observed execution.

```json
{
  "schemaVersion": "narrative-scene-context/1.0",
  "title": "一条请求如何找到处理函数",
  "question": "文档给出的路径是什么？",
  "explanation": "示例把GET与hello路径绑定",
  "boundary": "这是规则图解，未发送请求",
  "claimIds": ["route"]
}
```

Each field accepts at most 24 characters of Chinese/Latin letters, numbers, punctuation and spaces; controls, emoji, commands/unknown properties and unknown versions are rejected. Claim IDs must be distinct and belong to the owning scene. Supported scenes require claim references; these references are provenance rather than semantic approval. Gap scenes require an authored `nextStep`, retain the exact `needs-evidence` or `needs-adapter` disposition and remain silent/unproduced. Supported contexts cannot carry a gap next-step field. Gap wording derives only the disposition label; title/question/explanation/boundary/next step are explicit author text. Repository instructions remain untrusted data; this feature cannot authorize execution or spending.

A context scene shows five separate lines: authored title, viewer question, explanation, evidence boundary and a fixed Chinese author/pending label. The complete uncropped source frame is scaled to 432×768 at (144,336), above the reserved captions at y1120. This creates a visible explanation region; small source labels get smaller. Gap cards show Chinese not-produced status, missing-evidence/adapter category, question, reason, boundary, next step and pending author label. Both use the pinned NotoSansSC font with literal text files and no shell evaluation. The exact rendered lines, styles, complete-frame rectangle, font hash, source/child/input closure and movie hash enter the current execution fact packet; every authored context also has its own mandatory review unit. Editing context changes plan/packet/media identity and cannot inherit earlier review. Narrated assembly shares this compositor and records the per-scene source-layout override; the bottom caption region remains separate.

No-context plans retain the previous renderer path and JSON representation. A targeted compatibility assertion removes only the optional context property from the exported JSON schema and reproduces the frozen legacy schema hash; the additive field is the intentional schema change. No prior files or movies are rewritten.

Actual local verification used two different source mechanisms, offline, without executing either repository:

| Project | Short diagnostic | Final task |
| --- | --- | --- |
| PocketBase fixed GitHub snapshot | 18 seconds, 2 source slices and 2 gaps |`1540cdc8ed65f4d8dfb5758b8cc26c8263f51f3a281ee6fa8c5fab6e7da05dce` |
| rembg image/mask sources | 14 seconds, 2 source slices and 1 gap |`9b311db42432b955d2c704d224a80d1cca5fe6670bb2fd2cc445af0394b00fac` |

Evidence lives at `work/context-visual-checks/pocketbase-plain` and `rembg-plain`: new bound `plan.json`, selection, plan/result exports, verification, current execution packet and actual extracted frame PNGs. Both movies passed exact frame probing and full decode; all selected context units and renderer profile are present in current packets. Full prior voiced previews remain byte-identical. These layout diagnostics are deliberately silent and use short source slices; they do not replace the complete voiced projects or prove that viewers can read all text during the diagnostic timing. The earlier `pocketbase`/`rembg` directories preserve initial heavy-outline frames. Inspection led to ordinary font drawing without that outline; final actual frames were viewed for both sources and gap categories.

Typecheck passed. Targeted context/complete/narrative checks: 38/39 initially passed with local CAS permission; the remaining assertion was the intentionally changed exported schema hash. Its revised assertion separately verifies the exact versioned addition and unchanged frozen legacy remainder, and then passed in a single-test rerun. An earlier sandbox run failed fixture hardlinks with EPERM; this was reported and rerun with local permission. No full regression or Judge ran. Three new tests cover optional/legacy identity, review binding, layout, glyph/control/length/version/property rejection, claim scope and gap requirements.

Remaining quality limits: sparse schematic source artwork is retained; only context and gap language changed. Fixed technical banners/lead still use English. No mobile-device/readability acceptance, natural listening, word alignment, semantic fact review or continuous perceptual AV review was performed. The source thumbnail can make fine labels difficult to read; no claim of ordinary-viewer comprehension or 90% readiness follows from these checks. Short clip timings are layout diagnostics. Actual authored full-scene timing must still fit complete recordings and explicit caption partitions. This is no formal film and grants no production approval.

For actual Chinese context plus complete original speech/subtitle integration and explicit selected-scene omissions, see [selected reset narrated preview v1](selected-reset-narrated-preview-v1.md). Existing complete-profile preparation is validated separately from the short actual voiced diagnostic movies.
