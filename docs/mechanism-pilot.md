# Standalone mechanism presentation pilot

The pilot renders an explicitly authored scalar model over an existing, verified standalone Story task. The REA example uses captured historical source bytes. The official HTML remains a standalone web source and has no Git revision association. The Story loader rejects repository-bound tasks at this entry point.

From a checkout with the existing dependencies installed, choose fresh output paths and run:

```powershell
pnpm exec tsx scripts/prepare-rea-rule-pilot.ts ./pilot-state ./pilot-story ./pilot-sidecar.json
pnpm exec tsx scripts/mechanism-preview.ts ./pilot-state ./pilot-sidecar.json ./pilot-preview
pnpm exec tsx scripts/prepare-rea-rule-pilot.ts ./pilot-state ./fill-story ./fill-sidecar.json fill
pnpm exec tsx scripts/mechanism-preview.ts ./pilot-state ./fill-sidecar.json ./fill-preview
pnpm exec tsx --test tests/mechanism-pilot.node.ts
pnpm exec tsx --test tests/mechanism-publication.node.ts
```

The first command authors a seven-shot Story using the existing captured REA evidence. The second accepts a 1.1 sidecar over a standalone Story and writes the raw sidecar, a state trace, start/end SVGs per beat, a first-check SVG for multi-check beats, and a file/compiler hash manifest. The manifest is written last. Use a fresh directory when retrying an interrupted preview. The pilot output is silent and separately timed from the Story estimate.

State values use fixed-point decimal arithmetic with four fractional places. Each conditional event represents one or more discrete checks over authored timestamps. A check adds the increment only if the event is eligible and the current value is strictly below the threshold. The update counter includes skipped checks. Manual assignment leaves the same visual world and switches to fixed manual control. Render samples read the same trace independently of frame rate. Integrated motion sums scalar × preview time between state changes, with an explicitly illustrative scale.

References are matched to exact Story citations backed by reverified captured bytes. A cited numeric parameter must also appear as a decimal token in its quote. These checks establish byte provenance and numeric presence. The relationship between the number and its claimed meaning still needs independent review. The SVG shows an authored line window in display-normalized text. The exact quote and line range remain in the sidecar.

The 1.1 contract supports one scalar, a positive guarded additive update, manual assignment and contextual beats. It pairs an integrated-distance projection with the track glyph and an opacity/depth projection with the vessel glyph. An authored collision eligibility cue requires a track. A manual assignment must bind a declared slider and stay within its authored display range. The renderer uses these declarations and the state trace for the visible comparator, gate outcome, slider position and world glyph.

The speed example derives its settings and eligible branch from the historical official page. Its collision scene, display slider bounds and value of 4 are authored illustrations. The hypothetical fill example has a separate Story and locally authored source bytes. Its reserved example URL identifies the authored fixture. Its values 5, 3, 10 and 2, fill scale and geometry are all illustrative. The second eligible check advances 8 to 11 because the comparison precedes the addition. The next check holds at 11.

Stable global entities are declared and local mappings are validated as authored references. Transfer and mask composition, animation graph integration and mechanism-specific task/CAS status and export remain outside this pilot. Story evidence is persisted in CAS. The frozen review outputs include PNGs rasterized with a local browser. Continuous video, matching audio and final owner audiovisual acceptance remain open.

The two pilot commands publish mechanism files on Windows using the system Windows PowerShell host. The native helper opens each directory component by handle, rejects reparse points, reserves a new preview directory in the same operation that locks it, and creates files relative to that handle. The same helper exclusively creates the prepare command's sidecar. It refuses existing destinations and leaves any unknown or partial content in place. A preview manifest is created after the payloads. A failed or interrupted publish can leave an incomplete output that requires a fresh destination for retry. Other operating systems are rejected until they have a safe publisher. The existing Story task and CAS use their own unchanged publication path.

Sidecar text and exact quotations are checked against XML 1.0 character constraints before publication. SVG markup is still escaped. A malformed character is rejected instead of silently dropping or rewriting it.
