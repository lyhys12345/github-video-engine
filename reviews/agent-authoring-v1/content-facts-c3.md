# C3 content-facts affected-scope recheck

- Same candidate/source identity as evidence.md, 126 hashes verified before/after. Current source/proposals read independently; no builder/peer report relied on.
- **PASS for ordinary authored drafts and CF-1 correction. Intentional negative control remains FAIL / REJECT.** This is a human/agent reviewer judgment; the engine still reports semanticReview pending.
- Scope: C2→C3 proposal/source impact, p-limit two-slot editorial consistency, preserved false-rate negative. No target execution, media or paid service. Completed 2026-11-03 12:04 UTC.

## Findings

**CF-1 fixed for the new p-limit v2 hash `88fb1f7e2f08efc6a561c7434188b5ffe4505787015d5735241b5066d911888d`.**

- queue.purpose now states two active slots occupied and third work waiting.
- queue.timingIntent now moves both A and B into two slots and leaves C waiting.
- release.purpose/timingIntent state A settles, C moves into its vacancy, B stays in place.
- mechanism.visualIntent consistently preserves A/B/C identities, A+B active and C waiting, then C replaces A.
- Existing narration/visual description agree with those edits. The hypothetical assumption that A finishes first is still explicit. The README concurrency1 example remains a separately identified documented example; the concurrency2 scenario is an inference/illustration.

The old p-limit v2 hash `8a3c0f6f...` remains immutable historical state; correction applies only to the new hash, not a rewrite of prior evidence. Five other ordinary proposal hashes are unchanged from C2. All current ordinary source claims retain C2's supported classification: REA documented static ASAR/extracted-directory inspection and runtime boundary; rembg local two-path CLI and -om mask variant; p-limit concurrent capacity, settlement and promise-result mechanics with explicit illustration/inference limits.

**Negative control rejected again:** hash `4f27402c2e7916cbf7d33f700fa34911ba801727ed0e3f1ee0e685b7e701f3b3` is unchanged. Its not-rate claim and results narration assert a guarantee of one new job per second. p-limit at commit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb` readme90–96 describes running/waiting counts; index.js19–30 and39–48 replenish capacity on settlement, without a one-second timer/quota. Rapidly completed tasks can allow multiple starts within a second. Exact quoted lines cannot support the rate guarantee. This deliberately failed case is not approved content.

## Evidence and retained scope

Current `proposal-chain-results.json`: 7 proposal hashes and bindings, all46 exact citations, all semanticReview pending/renderable=false. `offline-replay-results.json` verifies current stored drafts can be replayed/exported offline. Current source files retain the five SHA256 digests independently recaptured at exact public commits during C2; no new web recapture is claimed. REA pin f4cc6c85efe7f3513d587df3bd5086adb1bc6a76; rembg pin e2c2e3f72701357b9bb3f2be32a4330d74ce8f47; p-limit pin a8a6fbec4e0e866d6d779b10889bb4f5567e70eb.

C2 raw content report remains at `C:/Users/luyuh/Documents/Codex/gve-agent-authoring-freeze-v2/judge-facts/content-facts.md`; use its full claim/source table as version-specific historical evidence, not a new test count. No implementation runtime claim, benchmark, actual cutout pixels or media fidelity is certified. New export repairs do not change the distinction between provenance and entailment. Legacy export and exact-directory-membership boundaries are separately recorded in security.md.
