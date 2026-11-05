# Hidden Huihui c2 / ARCH-FACT-01 recheck

- Role: independent architecture/content-facts finding owner; judges-v2 common rules.
- Candidate SHA-256 independently matched: d5c048b908da3a2183f713b7dd516cd55ce492ce159a962e72ffed28e6a9049d.
- Source commit: b6bdb17b00c3b042722a44beb6c9a2b5cdb96ff4. Prior candidate a2377c4008888730898ec611b6d114660a5f8047f26e744cb5ea6c7d9b7c8390 remains intact.
- Date: 2026-11-04; independent output C:/Users/luyuh/Documents/Codex/gve-hidden-huihui-architecture-review/c2.
- Verdict: PASS for assigned recheck. ARCH-FACT-01 major resolved on this exact c2. This is not a full product/AV/runtime gate.
- Independence: no peer reports read. Original c1 report preserved. Executed only own verification Python scripts; no target code, TTS, network, paid service or deployment. Source/evidence read-only.

## Exact selected rule evidence

For fd normal and dense, BOTH rules now select citationIndex 2, source-2 / src/cli.rs lines 32-37 at pinned cc4e40fa4e32d61733cd72926e233a3fb6c8d56d. The selected text explicitly documents default hidden file/directory exclusion, dot-name convention, inclusion option, and independent ignore rules. This directly supports the selected policies rather than merely showing a boolean inversion.

For ripgrep, BOTH rules now select citationIndex 1, source-2 / GUIDE.md at pinned af60c2de9d85e7f3d81c78601669468cf02dabab. Default selects lines 177-191, explicitly listing hidden files/directories among default exclusions. Include-hidden selects lines 196-198, explicitly giving --hidden and separating --no-ignore. These selections support the policy claims. The concrete POSIX synthetic tree and unvisited-descendant conclusion remain modeled scope, not observed output.

Independently checked all six compiled trace event rule.citation objects equal the exact selected proposal citations. Each referenced repository path is in request.sourcePaths. Every citation hash and quote/line range matched exported raw source bytes. No citationIndex 0 fallback is being used to justify defaults in c2.

## Parent closure and preservation

Own rules.py exited 0. All three cases have changed proposal hashes and changed completed session IDs relative to c1. Verified exact exported proposal hash equals plan/voice/session proposalHash; plan-manifest hash equals voice/session references; voice-preparation manifest hash and its task ID equal session and plan hiddenVoicePreparationTaskId; voice and preview manifest hashes equal session references. Repository commit, snapshotHash and evidence fingerprint match the parent evidence and proposal. All captured source files remain byte-identical to c1.

Own check.py exited 0. c2 source archive, evidence index and all indexed files match declared size/hash. Rechecked all 26 quotes across three exports; complete PCM reconstruction, clip sample counts, beat bounds and root/voice VTT byte equality all pass. Frame totals remain fd 396, ripgrep 405, dense 396. No new audio generation claim is inferred from reuse of exact audio.

Independently rehashed every c1 indexed artifact and its candidate: all original c1 bytes remain unchanged, including failing rule indices. Recompared five historical original freeze bundles against their retained c1 re-exports: fd silent 27 files, ripgrep silent 26, fd unsupported 12, Fastify Huihui 53, p-queue Huihui 63, all identical. This proves preservation; it does not claim a fresh c2 CLI historical export run.

## Limits and remaining gates

This recheck covers the reported rule-binding major, parent-evidence integrity, affected audio/timeline artifacts and preservation. c2 also changes layout/runtime code relative to c1; those changes require their own affected specialist regression. No independent full decode, continuous viewing, listening, semantic speech alignment, real-device accessibility or complete runtime test suite executed here. Owner AV/G6 remain pending; historical UNVERIFIED and original FAIL are retained.

Evidence: check.py, checks.json, rules.py, rule-parent-checks.json in this report directory. Both scripts exited 0 using C:/Users/luyuh/AppData/Local/Python/bin/python.exe.
