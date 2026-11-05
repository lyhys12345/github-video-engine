# Independent architecture / factual-binding review — C1

Candidate: review-binding-c1, commit 3236062258f2c02cdc6f702d799de0a9a16a8eba.
Reviewer: /root/pipeline_gap. Scope: architecture, exact review binding, source/parameter consistency, historical no-review behavior. No listening or rendered-pixel review performed.

Decision: UNVERIFIED for the frozen candidate as a whole because the advertised exact source archive does not match its manifest. Bounded functional/architectural checks PASS; no code blocker or major found.

## Finding F1 — major evidence packaging mismatch

source-files.json and evidence-files.json match candidate.json hashes. Independently hashed all 689 source archive members and all 755 evidence files. All evidence and 687 source members match. Two archive members differ:

- docs/fact-review-binding-v1.md: manifest 9fc037e6cefb964ea59d5bdcbff078230b44090b6b9c3ba8af1c6a4fbf0b1998; archive 0d8d471c8212456a940a5206d78234d0def88a0566da2904ec9d11fb7282bcc7.
- docs/fact-review-v1.md: manifest bcf9cd0556199ea24b98b14128f0fd8b8fcd5d6a910662f3f51dd90078f2de14; archive b2e8272a11961882243196f7d8c51fd24d2def126afb476e5e294fc8049a556d.

Both are one-byte CRLF normalization differences, not semantic document changes. Builder working bytes match manifest; archive normalized text matches builder. Preserve C1 and provide a new exact archive/manifest candidate. No source-code repair or repeat media rendering is implied.

## Independent execution

Extracted archive into isolated gve-review-binding-architecture-judge/source. Sandbox junction/PNPM access failed; approved local execution then used existing dependencies via a junction in the judge copy. Ran Vitest fact-review.test.ts (17), explanation.test.ts (17), url-intake.test.ts (10): 44 tests PASS. No target repository code executed. Full 440-test claim is not my rerun.

## Architecture findings

factReviewReceipt is optional with no default; historical profile and input shapes remain unchanged when omitted. Receipt contents are durable task inputs, not external-path references. The task fingerprint includes them. presentationReview recomputes exact proposal/source/presentation packet before child rendering and during completed status/export, refusing unresolved/stale receipts. Export preserves packet, receipt and result. Narrated presentation reconstruction includes voicePreparationManifestSha256, offsets and captions; hidden plan 1.4 maps to narrated spec 1.1. Voice preparation and actual bindings are independently reverified through existing chain. Revisions include the new receipt only when explicitly supplied; original review is not inherited. No approval grant is introduced.

## Independent source and output inspection

For Fastify and fd, independently rehashed frozen source blobs and checked every cited line range/quote. Fastify 23 required/receipt items and fd 17 match. Export packet candidate hashes match independent receipts. Deep comparison confirms authored-presentation matches the complete supplied presentation object, including narrated fields. Read actual quoted Fastify GET /, reply.send({hello:'world'}) and port 3000; read fd hidden option documentation, inverse opts.hidden and walker hidden setting. These support the bounded documented/illustrative claims. fd remains synthetic, ignores unchecked, and hidden descendants are a teaching-model inference, not execution evidence.

Inspected independent-lifecycle records for both projects, final session results and fd unreviewed revision. Attributed-review-complete coexists with semanticTruth:not-machine-verified, identityAuthentication:not-provided and approval:none. Session semantic/editorial/audiovisual/ownerListening/ownerAcceptance remain pending. Unreviewed fd revision has no factReview field. Lifecycle and FFmpeg decoding here are builder-recorded evidence, not this judge's independent media run.

## Limits

No continuous viewing, listening, naturalness, phone usability or G6 conclusion. Receipt identity is caller-declared. The whole authored presentation is one required review item; that is full data coverage but not an automatic per-field semantic assessment. fact-review --presentation can prepare a packet before actual voice validation; render closes that binding and this must not be described as prior audio review. No claim of arbitrary URL automatic story generation or 90% completion.
