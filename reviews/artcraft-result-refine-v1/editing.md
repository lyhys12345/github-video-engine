# ArtCraft approved result edit

Editing input: `manifest-v2.json`; six exact approved script lines are bound to production/script.json and its owner approval. The approved Markdown SHA-256 is `ff54b9567dba47a3d36ecef4d8d6038815f19ee78c109a808226613dcb61ed7a`. Original WAVs sum to 24.40 seconds; per-line frame rounding yields 735 frames / 24.50 seconds. No audio clipping, tempo changes or artificial 30-second target.

The source clip is read-only and all assets, including assets used in independent panels, are SHA-256 bound. Motion source ranges advance at 30fps. Only the 24-frame opening preview is deliberately seen again during the body; other advancing ranges do not loop. Explicit held source frames support input reading, labeled extraction/connection animation, full-body comparison and the editor/model condition distinction. This is edited explanation, not a claimed live generation run. Provider cost language is conditional; no README pricing claim.

Caption display times remain estimates. Line2 uses authored frame cues inferred from energy gaps and text order; these are neither forced alignment nor a listening check. Full source audio remains intact.

Reproduce to a NEW output directory from engine root:

```powershell
node --import tsx scripts/render-showcase-reel.ts --spec work/artcraft-result-refine-v1/render-plan/manifest-v2.json --out work/artcraft-result-refine-v1/render-plan/NEW-candidate --skip-stills
```

The local renderer requires Chrome DevTools loopback access. Sandboxed first attempt is preserved in preflight-v1; its EACCES was resolved through the normal escalation mechanism. V1b and V2 preflights are preserved. V2 fixes the first true result frame (source112), horizontal action crops and continuous semantic arrows. Do not overwrite an existing candidate. `candidate-v2-freeze.json` binds engine sources and manifest. `narrow-tests.log` records 16 passing focused tests; `typecheck.log` records type checking. Full regression was not requested/run.

Final candidate review and owner audiovisual acceptance are separate from technical decoding and sampled PNG inspection. No publication/comment has been made; the closing comments-link CTA is for a later authorized post.
