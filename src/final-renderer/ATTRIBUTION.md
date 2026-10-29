# Reviewed execution closure

`upstream/Polish.tsx` is an unchanged copy of video-shotcraft commit `43bd349a136651865ecfa6ea1cf012f6e957d304`, Apache-2.0; the license is `upstream/LICENSE`. The progressive graph in `composition.tsx` and `motion.ts` adapts the reviewed `DiagramCascadeBuild` / isolated `PortraitCascade` edge-before-node, spring materialization and camera settle choreography. It replaces fixed purple/system-font/30fps assumptions with the approved palette, exact local font and measured scene timing. This is a small replaceable derivative, not the full Skill/SDK or Workbench.

No upstream Skill instruction, installer, Workbench, stock audio or remote-font loader is executed. Own source implements the full generic scene composition and worker. `text-layout.ts` is copied from this engine's deterministic glyph-fit helper. The renderer returns silent full-resolution video for root's separately validated audio/finishing pipeline and cannot grant production authority by itself.

Font bytes are unmodified Noto Sans SC from Google Fonts commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`, SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`. Distribute the root-acquired copyright/OFL text with any editable package containing the font. M3 explicitly overrides the legacy Microsoft YaHei package hint with this declared locked font, never silently falling back. Actual font-ready proofs are collected from render browser pages.

This prototype currently imports root contracts/core helpers for validation/errors/process-tree cleanup. Those dependencies must be copied/rewired into the standalone editable export and really tested; their presence here does not prove a standalone export works.
