# First-time author review and refinement — 2026-11-15

## Findings and implemented changes

1. The initial hero resembled a creative agency: product category was too small. New copy explicitly names GitHub input, short-video output, Codex, script review and editable delivery.
2. Posters were nested inside tilted cards, making the product hard to see. Replaced this with a large, real ArtCraft result excerpt. Full films remain available; no target repository was executed and no new narrated film was produced.
3. Mobile pushed the real output below the fold. The main play button and real result are now visible within the inspected 390×844 first screen. Gallery cards use one large column on phones.
4. The guide mixed setup, media and voice choices before a clear first success. It now recommends Windows + Codex and first obtaining a reviewed script. Voice and media setup are progressive disclosures.
5. Language continuity had a real bug: an explicit English URL could navigate to a page using a previously remembered Chinese preference. All internal route links now carry the current language.

The refined design uses quieter typography, consistent rounded surfaces, fewer decorative labels, stronger real-media emphasis and larger body/control text. Apple’s public product presentation was a reference for hierarchy and restraint; no Apple assets, testimonials or performance claims were copied.

## Actual verification

- `node --check` passed for site.js, guide.js and motion.js.
- Browser layout checks: 320, 768 and 1440 px × home/showcase/guide × EN/ZH, 18 cases. No horizontal overflow, missing H1 or observed broken image.
- Additional visual inspection at 390×844 and 1180×900. The host screenshot surface cropped the 1440-wide capture, so the saved laptop screenshot uses the fully inspectable 1180 viewport; layout metrics were still checked at 1440.
- Hero excerpt advanced while visible; pause button stopped it; opening the full ArtCraft film paused the hero and started the 24.533-second original.
- Invalid non-GitHub URL rejected. Valid ArtCraft URL + Xiaohongshu + 30-second choice produced a local script-only brief with an explicit approval gate.
- A 60-second draft survived English→Chinese→English switching, including URL, selected duration and translated generated prompt.
- Internal navigation preserved English after a previous Chinese preference.
- Browser warning/error log was empty after the 18-case layout checks.
- Mobile creative-tools filtering still shows exactly ArtCraft and VoiceStudio.
- Static Open Graph/Twitter summary-card metadata and a real website preview image were added for all three routes. Public crawler rendering is not verified while access remains private.
- FFprobe and full FFmpeg decode passed for the final 2.5-second muted H.264 excerpt. Source/hash/timestamps are recorded in the asset provenance JSON.

## Reviews

- Initial first-author reviewer identified the five issues above and participated in implementing guide.js. Their integration review found the issues materially improved but is not an independent audit of that guide.
- A separate final reviewer, who authored no website code, examined site.js, guide.js, motion.js, refinement.css and screenshots. No release-blocking regressions found. They checked local-only prompt handling, source-safe text output, approval gates, language continuity, motion cleanup and qualified product claims.
- This is expert review, not a real user study or a measured conversion experiment.

## Remaining limits

- Private Site access is retained; public promotion requires a deliberate sharing decision.
- Physical iPhone/Android and Safari were not tested. No Apple-equivalent quality certification is claimed.
- The small inline hero is an attraction preview, not the place to read the target product UI. The full-film player provides the larger view.
- Existing demo voices and content are unchanged; this was not a new continuous audiovisual acceptance pass.
- Reduced-motion/save-data and offscreen cleanup have source-level independent review; no OS preference was changed during browser QA.
