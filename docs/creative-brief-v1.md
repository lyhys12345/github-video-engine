# Creative requirements v1

The session Agent asks one compact question covering missing duration, style, voice, audience/platform and language. Users can say “you decide”; supplied information is not asked again. Show inherited choices and permit changes. Save choices as `author/creative-brief.json`; users never write JSON. This intake is not script approval.

```json
{
  "schemaVersion": "creative-brief/1.0",
  "duration": {"mode": "auto", "maxSeconds": 90},
  "style": "Result-first real product demonstration; explain one mechanism",
  "audience": "Curious nontechnical viewers",
  "platforms": ["TikTok", "小红书"],
  "language": "zh-CN",
  "voice": {"mode": "local", "profile": "chen-local"},
  "decision": "proposed",
  "notes": []
}
```

This example's voice is the existing owner's local preference, not a bundled sound available to everyone. Verify local availability separately and offer a short audition to new users. Reference/model files are not distributed by this schema.

`duration.mode` is `auto`, `max`, or `range`. Max is always a hard cap at or below 300 seconds. Range min/max are hard bounds; if a user only prefers “around a minute”, use auto/max and a soft note, not a forced minimum. No padding or trimming to satisfy a target. Style, audience, platforms and notes guide authoring and independent review; they are not machine-verified aesthetic guarantees.

`decision: proposed` stays pending until choices are confirmed. `user-specified` means the user supplied or confirmed the complete choices; do not label unconfirmed defaults this way. `delegated` requires actual permission to choose. Mixed supplied/default choices remain proposed until remaining choices are confirmed or delegated. Brief confirmation never substitutes for exact script/storyboard approval.

Voice modes: local (`chen-local` or explicitly requested `windows-huihui`), reference (`reference`, `rightsConfirmed`), none, byo-api (`provider`, `paidAuthorized`), undecided. Store no secrets. Reference permission and paid authorization are user declarations, not independently authenticated receipts. Merely selecting an API or providing a key does not authorize spending.

## Commands and enforcement

```powershell
node --import tsx src/cli.ts explanation brief-check --spec brief-draft.json --out WORKSPACE/author/creative-brief.json
node --import tsx src/cli.ts explanation run --repo URL --workspace WORKSPACE --author WORKSPACE/author --through planning
```

The optional output is create-only, never overwrites a saved choice. CLI status is `needs-clarification` or `ready-for-planning`; neither claims voice availability, independent review or approval. The brief is part of exact author hashing, immutable candidate snapshots, workspace status and portable author allowlist. Modify a new author candidate to preserve history; a changed brief invalidates the old script receipt.

Complete-profile runs enforce authored total timeline duration including lead/gaps. Before media, unresolved requirements or mismatched runtime voice return `awaiting-creative-requirements`. Brief-bound runs require the script review gate, including internal feedback calls. Once revised scripts are approved, resume using `explanation run ... --review RECEIPT`; feedback-apply itself has no receipt flag.

Current narrated-run capabilities remain zh-CN plus configured local voices. Reference, silent and API modes can be recorded for planning but stop before media with an adapter requirement. This module does not implement these adapters, authorize paid access, set environment variables or silently change voices. The local adapter checks actual installation when invoked. Legacy projects without a brief retain existing behavior; new Skill runs must create one.

## Validation scope

Directed tests cover schema/limits, clarification and capability decisions, real CLI persistence/overwrite refusal, approval invalidation from brief changes, and portable manifest acceptance. Existing narrative run/source/review tests cover compatibility. No new full video, listening test or end-to-end creative quality improvement is claimed by this intake module.
