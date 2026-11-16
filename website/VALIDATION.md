# Website validation — 2026-11-15

## Implemented

- Home, showcase and setup guide as separate static routes.
- English default, Chinese toggle, explicit URL language selection and remembered choice.
- Five existing MP4 examples with source links and footage provenance.
- Accessible native video dialog, no video download until playback is requested, cleanup on close.
- Gallery filters, mobile navigation, keyboard-operable workflow/agent tabs and copy buttons.
- Mobile/tablet/desktop layout and reduced-motion support.

## Executed checks

- `node --check dist/assets/site.js`: passed after final source edits.
- Local HTTP server returned HTTP 200 for the homepage.
- Real browser: 18 combinations (320, 768, 1440 px widths × 3 routes × 2 languages). All rendered a heading, no horizontal overflow, no observed broken images. Additional visual screenshots at 390×844 and 1440×1000.
- Real playback initialized for all five MP4s. Browser reported duration/video width and `paused: false`: flagship 57.367 s/1080; ArtCraft 24.533 s/720; VoiceStudio 41.131 s/720; OpenMAIC 45.833333 s/1080; Worldknow 43.435 s/720.
- Flagship playback advanced to 3.98 s; close stopped playback and removed its source.
- Creative-tools filter showed exactly ArtCraft and VoiceStudio (2 films).
- English/Chinese switch and mobile menu navigation to showcase/guide worked.
- Installation copy button produced the exact command text in the browser clipboard. An initial immediate clipboard read was too early; a subsequent read confirmed the text and Copied state.
- Claude/Codex tab switching worked; ArrowLeft returned to the selected Codex tab.
- Browser error/warning log returned an empty list after the gallery playback checks.
- All ten demo media copies were hash-matched to the existing engine files. FFprobe confirmed portrait H.264/AAC media, 30 fps.

## Independent review and fixes

The independent guide/content agent found two material issues, both fixed:

1. Silent-preview copy mentioned visible captions beyond the supported renderer guarantee. Reworded to structure and supported visual explanation.
2. Export guide linked historical manual copying documentation. Updated to `portable-long-project-v1.md`.

Mobile visual QA also caught words joined when line breaks were hidden. Explicit spacing was added. Mobile filter and copy targets were enlarged.

## Verification boundaries

- Browser playback checks are not a new continuous audiovisual review of the existing films.
- Responsive browser emulation is not physical iPhone/Android or Safari testing.
- Existing demos are Chinese; switching website language does not translate them.
- The site presents the local engine, not a hosted video-generation service.
- Public voice presets differ from the private voices in some demos; no voice recordings, models, credentials or local profiles were copied.
- English display fonts load from Google Fonts, with local system fallbacks.
- Source repository and documentation links use the actual project addresses; visitor access depends on their GitHub permissions.
- Screenshots and per-viewport observations are local under ignored `qa/`.
