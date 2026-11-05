# Narrative audio C1 — independent architecture and source-facts review

Verdict: PASS within the bounded architecture/source-facts scope. This is not approval of natural listening, perceptual audiovisual quality, unobstructed playback in arbitrary subtitle players, or a formal full film. Current facts, speech content, media approval and owner acceptance remain pending/unverified.

Candidate: C:/Users/luyuh/Documents/Codex/gve-narrative-audio-freeze-v1/candidate.json
Candidate SHA256: 7419ad5cd233376fc1c6d32915d38efd48086d118bf14cdae7ea0c1e2a6aa112
Commit: 9ec1c6b83b6c7ebbbd41c39764a1db62df41cf7f
Frozen execution codeHash: 2f5645f58048b77d9db2cabd962931b29fdc72ee59d25d7db4310ae4a54040bc

## Procedure and independent evidence

Read AGENTS/common and candidate contract, docs/narrative-audio.md and OPERATOR.md. Extracted the frozen source into this judge directory; candidate files were not modified. Reused installed dependencies for isolated engine tests. No target repository code was executed, no paid provider was used and no formal full film was produced.

Independently checked candidate/archive/source/material manifest digests and every declared file: 739 source files and 1232 materials, zero mismatches. Recomputed execution codeHash matches. Raw result: freeze-check.json.

Ran tests/narrative.test.ts and tests/fact-review.test.ts against the isolated frozen source: 45 tests PASS (28 + 17). These are the judge's independent tests, not the builder's claimed full suite. Candidate recorded the full suite as RUNNING at freeze; this report does not upgrade that frozen field using an unexamined later claim.

Ran source/judge-audio.ts, using independent FFmpeg decoding and copied task databases. Results are saved in audio-bindings.json. Both Express and rembg passed:

- Actual 14-second PCM is exactly 420 frames * 1600 samples/frame at 48 kHz mono s16le.
- Decoded each complete raw recording independently, verified raw/receipt hashes, exact current narration text and PCM sample counts, then reconstructed the entire mix byte-for-byte. All remaining samples, including lead, gaps and padding, are zero. No clip was truncated, stretched or spilled into another scene.
- Express recordings: 2.625 and 2.740 seconds. rembg recordings: 2.645 and 2.640 seconds.
- Caption partitions concatenate to the complete narration; sample intervals stay within recordings; frame start/end use floor/ceil at 1600 samples/frame. VTT/ledger hashes match. Actual MP4 has expected video/audio/mov_text streams; independently extracted embedded text contains every caption.
- Packet binds the exact exported audio ledger and actual movie SHA. Original historical receipt is rejected against the current packet. Baseline versus edited task identity and packet differ.
- All exported parent source hashes and claim quote line ranges match exact bytes. Six source/baseline/edit task inputs across the two projects record the frozen codeHash and succeeded.

## Architecture and trust boundaries

The new task uses an independent 30 fps placement contract, avoiding the existing presentation module's 24 fps sample budget. decodeClipSamples has an explicit integer sample limit; the old decodeClip delegates using its existing 24 fps convention. Final placement enforces the complete decoded recording fits the selected scene.

Each selected supported scene requires one local cached recording matching the exact current parent narration. The zero-filled mix has no recording or captions for lead/unsupported gaps. Caller-authored caption partitions are full-text partitions, not certified word alignment. Muxing uses the owned runtime callback, fixed media formats and exact allowed streams; old default validation remains unchanged.

Status/export rechecks CAS outputs and reconstructs the audio commitments rather than trusting output metadata alone. Audio ledger, placement, captions, raw audio/receipt hashes and movie bytes are part of current execution review. Historical narrative receipt is retained separately and does not authorize the current edited narration, visual execution or speech content.

## Two-project source-facts scope

Express short narration describes request delivery and path matching. Its pinned claims retain port 3000, GET root and Hello World provenance. rembg narration explicitly says the preserved subject is illustrative; file-to-file and mask flag claims retain their quoted source provenance. Neither preview establishes actual target execution or measured image-edge quality. The omitted third supported scenes and unsupported gaps remain explicit coverage limitations.

The shorter Chinese plans are new legal Story/narrative revisions rather than an undetected replacement beneath the old English receipt. Local Huihui recordings are not represented as Chen recordings or externally authenticated speech. Hash/text matching verifies declared provenance and integrity, not what a listener hears.

## Limitations and follow-up

C1 subtitles are selectable mov_text plus external VTT; they are not burned into a reserved visual area. Playback position depends on the player, so this report does not certify that enabled subtitles never cover source content. An explicitly versioned caption-safe burned layout requires a new candidate, new packet/media identity and actual frame checks; it cannot inherit C1 visual approval.

No natural listening, full continuous audiovisual inspection or owner G6 acceptance was performed. Current review remains pending, speechContent unverified and approval none. Builder cancellation/resume, relocation and full-suite reports were not independently rerun here and are not counted as independent PASS evidence. No blocking architecture or source-binding defect was found within the examined scope.
