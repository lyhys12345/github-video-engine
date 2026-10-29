# Contract version 1.0

All seven contracts are strict Zod objects. Unknown properties and unsupported versions are rejected; there is no implicit downgrade or migration. The JSON Schema draft is 2020-12. Run `pnpm run schemas` to regenerate checked-in files.

| Contract | Essential content |
| --- | --- |
| Project | Version, stable project ID/name, GitHub URL, revision, explicit synthetic evidence marker |
| VideoSpec | Project, dimensions/fps, ordered scenes, style, local assets, audio policy, evidence references |
| SceneSpec | Version/ID, integer duration, semantic layout, text elements, animation, asset IDs |
| Artifact | Content identity/hash, bytes/media type, hash-derived storage path, stage/input fingerprint, timestamp, verified-at-commit status |
| Job | Input/spec/environment snapshot, status/stage, owner/lease/cancel flag, timestamps/error |
| JobStep | Stage, attempts, dependency fingerprint, output artifacts, timestamps, owner/error |
| EvaluationResult | Evaluator version, referenced media hash, named checks/severity/explanation and overall result |

M0 permits 10–15 seconds, 24/25/30 fps, even dimensions from 320–1920 and 1–6 scenes. The shipped fixture is 12 seconds at 720×1280 / 30 fps. Semantic layouts are `title`, `architecture`, `closing`; animation is a parameterized fade/slide entrance. Text elements have one of four roles. The renderer controls safe layout rather than accepting CSS or code from a spec.

Asset references are local PNG only, maximum 5 MB each and at most 4096×4096 in the header. Each has an ID, relative path, declared hash and media type. Duplicate IDs, missing references, duplicate element roles, invalid scene timing and invalid total duration are rejected. Full image decoding happens in the renderer; corrupt PNG payloads still fail explicitly. Audio has an explicit `silent` mode and an empty reserved reference list. Evidence references are structured metadata and are never fetched.

JSON Schema captures structure, scalar ranges, enums and strict property sets. Zod additionally checks cross-field timing, scene/asset identity uniqueness, reference resolution and text-role limits. Consumers **must call the Zod parser**, not treat JSON Schema alone as equivalent validation. `ArtifactStore` additionally checks that storage paths are hash-derived, file sizes/hashes match and paths cannot escape the store.

Judge review tightened previously under-specified M0 layout boundaries: titles allow at most four explicit lines; body/eyebrow/label are single paragraphs with automatic wrapping. Eyebrows have a 24-character limit, labels 40, body 150, title 60. Unsupported hard-line layouts fail before job creation. The renderer measures actual glyph widths, wraps long words and reduces title size to a 32px minimum and body size to a 20px minimum in the 720px reference layout. Dense input may break inside words to retain all content within its allocated box. This is an explicit pre-production v1 validation tightening; source/environment fingerprints invalidate old executable plans. It is a fixed M0 layout contract, not a promise of production styling across all scripts/aspect ratios.

Compatibility policy: v1.0 only. Adding an audio mode, layout or meaning-changing field requires an explicit contract change and compatibility decision. The SQLite schema version and media evaluator version are independent of VideoSpec version. No v0 migration or production schema compatibility is promised by M0.
