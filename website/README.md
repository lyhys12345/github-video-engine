# GitHub Video Engine website

A dependency-free, bilingual product site. English routes: `/`, `/showcase/`, `/guide/`. Chinese routes: `/zh/`, `/zh/showcase/`, `/zh/guide/`.

Use Node 24 or later. No package install is needed:

```sh
cd website
node tools/build.mjs
node --test tools/*.test.mjs
node tools/serve.mjs
```

Open `http://127.0.0.1:4173/`. Rebuild after editing content. `content.js` provides pure page templates, `guide.js` provides onboarding and the local prompt builder, and `site.js` progressively enhances the generated HTML. `player.js` handles real demo playback, subtitles and sharing; `motion.js` manages the muted homepage preview. Styling lives in `site.css`, `refinement.css` and `quality.css`.

The build verifies and copies the five approved films and posters from this repository's `docs/media/` using `tools/media-sources.json`. It does not download them or need private local files. These duplicate build copies stay ignored; the original media remains versioned once. Clone the complete repository rather than only this subdirectory.

English is the default. Language is explicit in URLs, including normal navigation and copied film links. Form choices and their example/dirty/invalid/ready state survive in-page language changes; drafts are not stored or sent to a server. Static HTML includes the real page content, language links, complete workflow and direct MP4 links even when the enhancement script cannot run.

The five original demo MP4 files remain unchanged. Their Chinese audio and burned-in text are preserved. All five now include English subtitle translations, using the original display timings rather than word alignment. Provenance, SHA256 bindings and source timings live in `dist/assets/captions/`. Translations display below the picture to keep product details visible. An in-page expanded view retains captions and controls. A native subtitle fallback exists for video-only fullscreen, but physical Safari/mobile fullscreen and PiP behavior are unverified.

Each player can copy a link such as `/showcase/#film=artcraft-demo`. A shared link opens the selected film paused. Unknown IDs are ignored, and no query parameters or draft state are copied. Link access still follows the Site's sharing settings. This is a product presentation, not a hosted generation service.

The homepage features the approved 57-second GitHub Video Engine product film and its poster. The primary action opens that film with audio and available English subtitles; the inline preview stays muted. ArtCraft remains available in the showcase. Preview motion respects reduced-motion/save-data preferences and pauses offscreen or behind a full-film dialog. The guide's prompt builder assembles a script-first request locally; it never starts video generation. Changing a field or submitting an invalid URL clears the stale prompt and disables its copy button.

Fonts are bundled locally with their SIL OFL licenses and source hashes in `dist/assets/fonts/`. Normal reading makes no external font request. `tools/vendor-fonts.mjs` is an optional maintenance downloader, not a runtime dependency. The two social preview JPEGs were captured from `tools/prepare-social.mjs` design canvases using a real approved film frame.

For local review only, `node tools/serve.mjs --without-js --port 4174` omits the enhancement script; `--qa --port 4175` exposes this checkout's ignored `qa/` directory under `/__qa/`. Both bind to loopback only. Never include QA files in the deployment. The normal deployment directory is only `dist/`.

Executed checks and independent review findings are recorded in `REVIEW-RSI-V3.md`; older reports are retained. The checks are scoped to the website and do not rerun the video engine.

Site publication metadata is in `.openai/hosting.json`. It identifies the maintainer's existing public Site; it does not authorize other users to deploy there. Hosting elsewhere requires their own configuration. The owner explicitly authorized public viewing; deployment and editing remain restricted.

This directory was imported from Sites V3 (`00af11df85603274ca9198de0f49831178b9af9d`), with repository-local media preparation added for reproducibility. The homepage now features GitHub Video Engine, matching published V4 (`c02614dfae8811dbbd11925b5c8f0c4dfda1029b`). Raw review reports are retained; historical QA screenshot paths refer to the original ignored local evidence, not files promised in this checkout. Do not publish credentials, local voice reference recordings, private machine configuration, or model weights.
