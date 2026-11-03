# Original narration alignment: proposals ready for listening

2026-11-02. The Google Drive handoff and actual code were reread. Current narration/subtitle synchronization remains the next priority; the accepted local voice pilot does not resolve it. The earlier reviewed caption-phase binding was saved in local commit `c4655f9` after typecheck and 21 related tests passed. [The local continuation record](../docs/continuation-2026-11-02.md) distinguishes newer user authority from the older handoff and preserves later-work limits.

## Actual outputs

Both hash-matched original MP3s were aligned locally, under the existing OS deny-network worker policy. No narration was regenerated, recording substituted, paid API used, or video produced. Qwen3-ForcedAligner 0.6B 8-bit is pinned to revision `0e1a68e91d815300c7c9754b2a7639378b23db15`, with ten data files totaling 1,276,474,460 bytes. Existing Python 3.12.14 / mlx-audio 0.6.4 and fixed dependency lock were reused.

| Recording | Source duration | Suggested internal cuts, source seconds | Auditions | Raw timestamp repairs |
| --- | ---: | --- | ---: | ---: |
| rembg | 31.555875 s | 2.92, 6.80, 10.60, 12.96, 19.08, 26.28 | 6 | 0 |
| REA | 50.834250 s | 5.60, 11.72, 17.72, 26.28, 31.16, 36.44, 42.96 | 7 | 1 |

Actual runs took approximately 7.27 and 6.81 seconds including preflight/worker orchestration. These times do not measure quality. Model classifier resolution is **80 ms**; decimal formatting, midpoint arithmetic and PCM sample quantization do not establish millisecond alignment accuracy.

Each audition is a verified exact three-second slice of the complete decoded original PCM. **The proposed cut is 1.5 seconds into each audition**, at sample 24000 of its 16 kHz PCM. Compare the left/right text in the pack while listening; speech, pause ownership and cut placement have not been approved.

- rembg pack: `work/local-alignment-v1/rembg-candidate-2/review.md`, with `draft.json`, original/decoded full audio and `auditions/boundary-01.wav` through `boundary-06.wav` beside it.
- REA pack: `work/local-alignment-v1/rea-candidate-2/review.md`, similarly with seven auditions.

Priority review areas: REA boundary 2 at 11.72 s includes a raw `js` start prediction repaired from 10.48 to 11.44 s (+0.96 s), resulting in a zero-duration `js` item at 11.44 s. rembg has zero-duration `域` at 9.44 s (audition 3) and `一` at 18.48 s (audition 5). These are model evidence flags, not observations that the speaker mispronounced or omitted words. All original predictions, upstream repaired vectors and explicit deltas are preserved. Exact forced-token matching is not independent speech recognition.

## Integrity and independent review

The initial real preflight correctly stopped before inference because the first validator incorrectly expected tokenizer.json. The actual pinned model uses tokenizer_config.json, vocab.json and merges.txt. Candidate 1 source/failures remain preserved. Candidate 2 fixes that layout assumption while retaining exact file/hash/data-only checks; no model change or permissive fallback was made.

Final candidate manifest SHA-256: `483a55281818d60519ff645a5e3444a2626d8330ffd02c8adf4a5a9c869c632b` (25 source files, 57 evidence files). Frozen-source **19 focused tests passed**. Both real drafts were also rejected by the existing renderer's reviewed-sidecar schema. All 13 audition payloads were checked against exact PCM source ranges, and listed source/evidence hashes were rechecked. Derived Python bytecode cache artifacts and J3's initial missing-dependency schema-import attempt are disclosed in the independent reports; no failed log was replaced. The successful schema check used the byte-identical workspace module. No renderer or existing voice source was changed.

Independent product, reliability, evidence and security Judges passed the bounded proposal checkpoint. The video-quality Judge checked technical evidence/context but remains **UNVERIFIED**, with actual listening/viewing at zero seconds. There is no all-active-role PASS, precise synchronization approval, speech-content approval or G6 acceptance. Raw independent reports and scripts are at `work/local-alignment-v1/judges/candidate-2/<role>/`; [the structured result](local-alignment-v1-candidate-2.json) binds their hashes and preserves their scopes.

The output schema is deliberately non-renderable `local-forced-alignment-draft/1.0`. It does not create reviewed schema 1.1, approved subtitle files, reviewer declarations or a renderer export shortcut. Full MP3 and decoded PCM clocks differ by one 16 kHz sample; that measured difference is recorded rather than hidden. Model timestamp repair is disclosed, not passed off as raw evidence.

The next content step is actual boundary listening/review, preferably rembg's six cuts first, followed by a newly frozen bounded short-video candidate to inspect subtitle transitions and continuous editing. Only recorded review of the exact audio/text/phase bindings can support a reviewed timing sidecar. Existing owner audiovisual deferral permits continued engineering but does not manufacture this review. Longer local narration, general research/creative automation and full-film production remain later work.
