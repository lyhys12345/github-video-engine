# Repository story preview

Render a locally reviewable MP4 from a repository-bound asset task. The preview supports up to 12 shots and 60 seconds at the Story's frame rate. It uses the authored animation and preserves the exact citations, source files, story, animation parameters and any supplied voice files in the editable bundle. Render and export use committed state, so the original workspace can move.

```sh
pnpm gve story preview-render --task <asset-task-id> --data work/project/state --mode silent
pnpm gve story preview-status --task <preview-task-id> --data work/project/state
pnpm gve story preview-export --task <preview-task-id> --data work/project/state --out work/project/preview
```

Use the asset task from `story asset-plan --task <story-task-id>` after `project story`. Use a local Chrome/Chromium browser, FFmpeg with libx264, and FFprobe. `preview-render` prints the prospective preview task ID on stderr and the successful result on stdout. Repeat the same command to resume after a recoverable failure or return the cached result. An environment change creates a new task. Status distinguishes an active `running` lease from an expired `interrupted` attempt and reports when the lease expired and whether the attempt budget permits a retry. Status and export check committed bytes without launching a browser or media process.

Use a new export directory for each revision. If export is interrupted after its ownership record is written, repeat the same export command with the same publication mode and destination. A replay verifies the entire closure and returns the same verified published version with `reused: true` if one exists. Otherwise it writes a fresh version and preserves failed versions and records for inspection. Ambiguous valid versions, unknown directories and ownership records from a different mode are refused. If a crash precedes a valid ownership record, use a fresh directory and inspect the old one separately.

Use an output directory you control. The exporter verifies the complete file set before and after publication and reports an error if it detects interference. In that case it preserves the files for inspection. Another local process with write access can change the destination during or after verification, so use a fresh controlled path if the files were changed.

Choose `--mode silent` for an explicitly silent animatic. Choose `--mode narrated` when the asset task has a hash-verified recording whose declared text matches each current shot. The engine places each full recording at its shot start and pads the remaining slot with silence. An overrun fails. Increase the shot's authored `visualSeconds` or supply a recording that fits, then create new Story and asset tasks as appropriate. The engine preserves playback speed. The locally accepted audio demuxers are WAV, MP3, FLAC, Ogg, AAC, MOV/M4A, Matroska, ASF and AIFF. It restricts audio probing and decoding to local files.

Open `index.html` inside the `bundle` path returned by the command. The default preview publication mode, `receipt-v1`, returns a version directory. Keep the returned `receiptSha256` and verify that digest and the receipt's file hashes at the time of use. Earlier fixed `out/bundle` exports remain readable. If a caller depends on that layout, it can explicitly select `--publication legacy-v2`. The legacy path can expose an invalid bundle if another writer tampers between verification and rename and is intended only for directories without concurrent writers. The older `asset-export` command retains its legacy default and supports `--publication receipt-v1`.

`captions.vtt` is a separate shot-level script timing file for an editor. Speech alignment and recorded transcript content remain pending review. `preview.json` records the repository and commit, asset manifest hash, renderer environment, frame count, full decode and any narration placements. The image samples show individual frames at known timeline positions. They supplement the continuous MP4.

Add `--presentation audience-v1` to request the experimental continuous illustration. It supports two authored three-shot patterns with matching documented excerpts: an HTTP request, route match and response, or a rembg local-file cutout and mask comparison. The animation must match the required object and action bindings. Unsupported plans fail explicitly. The default preview remains the diagnostic renderer for other supported asset packs. The presentation choice creates its own render task. The in-frame shot title and stage text illustrate the causal sequence. The separately exported captions retain the authored narration text.

The renderer makes authored teaching illustrations from a pinned source snapshot. Render success confirms technical playback checks. Listening, continuous audiovisual review and final owner acceptance remain pending. A local recording or prototype voice supplied for a particular Story has its own voice identity and review state.

Express and rembg examples use different story types and animation plans. The [Express walkthrough](http-story-asset-v1.md) shows how to bind the HTTP Story. The rembg example pairs `examples/url-intake-v1/rembg-story.json` with `examples/url-intake-v1/rembg-animation.json` and the matching pinned rembg evidence workspace.

Run the renderer integration fixture with `pnpm exec vitest run tests/story-preview.test.ts`. It uses a real generated tone to check audio placement and playback, with a separate transcript string as fixture data. It also checks cache reuse, editable export after the inputs move, and integrity failure after a deliberate blob change.
