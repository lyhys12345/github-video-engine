# Independent final real-frame recheck

Scope: engineering audit correctness against sampled visual evidence, not wholesale approval of either historical film. This is additive to the preserved blind initial and pre-freeze comparison reviews. I read final review.md and relevant report.json fields, checked final original candidate PNG hashes against the blind PNGs, and visually inspected both final current-renderer phone contact sheets. No audio or continuous video was reviewed. Current renderer images are reconstructed inspection evidence, not authenticated original layout proof.

## Evidence identity

All 12 final original candidate PNGs are byte-identical by SHA-256 to their corresponding blind originals: ArtCraft 127, 136, 150, 158, 170, 178, 197; OpenMAIC 270, 300, 313, 350, 390. Thus the blind visual findings apply to those final original samples. The final packet inventory files themselves hash as follows (SHA-256):

- ArtCraft `artcraft-audit-final/bindings.json`: `b3b1f87ba3b7828e748fcd2fab7cc03510c9b5073d2d61fc2553f47295e04ed0`; final report.json `09b081945e8408d6d4eca581252539aef3cb0c37895b327273ddf660c204e8e8`; current phone contact `0ba9f71d07c2120417a001867aff724872a15e08cf138ce6341a7bf9b8ed0f0b`.
- OpenMAIC `openmaic-audit-final/bindings.json`: `735c5907d257185a087bada0a99478d538e48ec2cd0c6380bc1847e11a87b2ef`; final report.json `01f89769ec19bbfd0d719456626c07d4749c55c6d61be90dc40004ae8df1faa7`; current phone contact `9be548428b8ea9a19543fec3bad194bbfffd9d868472c7dba8374062a96d4595`.

These hashes identify the examined artifacts; this check is not an independent validation of every entry in the inventory.

## Resolved reporting findings

- Both final human reviews explicitly name sampled unbound cues: ArtCraft `把动作调好。` [178,224) and OpenMAIC `你也可以加入。` [381,424), each `UNASSESSED`; report.json agrees. The initial omission in the human-facing summary is resolved.
- Both reviews explain schedule `OVERLAP` as caption interval versus declared source-window playback, and state that semantics require frame review. Speech remains `UNVERIFIED` with recognition provenance. The final structured reports retain `REVIEW_REQUIRED`, visual semantics and actual speech `UNVERIFIED`, and embedded media text `UNASSESSED`.
- ArtCraft overlay-0 `text-overflow` findings at 136, 150, 158 and 170 retain `geometric-risk` classification in report.json. In the final current inspection contact I see no obvious clipped glyphs in these labels; 158 is dim. This visual observation does not disprove the measured risk, and no claim of confirmed glyph clipping is warranted.

## Remaining visual observations and suggestions

- The final current contact sheets show no obvious clipping or overlap of the sampled large bottom captions. Tiny source labels, counters and embedded UI remain hard to read. In OpenMAIC the top full-interface question is too small for reliable phone reading; the enlarged discussion excerpt is more legible. If comprehension of the question itself matters, consider a larger crop or designed callout in a future approved revision.
- ArtCraft 158 shows a leg extended with joint control and is not by itself clear evidence of bending; 170 shows a visibly bent leg with a knee control. The 178 and 197 stills are consistent with pose adjustment, but do not prove an adjustment throughout the cue. An editor could inspect more of the sequence if continuous demonstration is desired.
- OpenMAIC 313 shows Maya's message; 350 also shows Dr. Aris with typing dots. At 390 the image does not demonstrate a viewer joining. Consider evidence of the join interaction or a wording adjustment in a future approved revision. The sampled stills cannot establish AI identity or continuous dialogue.

These are sample-limited content suggestions, not audit-tool blockers or production changes. Actual spoken timing, listening, and continuous audiovisual correspondence remain unverified; no physical phone viewing was performed. No further engineering-audit correctness blocker was found in this limited recheck.
