# RSI website review — V3

Work began 2026-11-15 23:33:37 UTC. Scope: the existing private product website; no engine changes, new narration, or regenerated demo films. This report records executed checks, not a quality certification.

## Improvements delivered

- Six complete static pages: English and Chinese overview, showcase and guide. JavaScript enhances rather than supplies all content. Language URLs, no-script navigation, direct MP4 access and a complete static workflow remain usable.
- Local licensed fonts, bilingual share images, clearer first-screen English-subtitle and Windows/Codex context, better mobile secondary type and guide contrast.
- Five unchanged real films now have 70 English translation cues, source timing and media hash provenance, three-beat story notes, an in-page enlarged player, caption toggle and shareable paused film links.
- Guide distinguishes planning, rendering and voice requirements. Editable script-first requests retain their exact state when changing language; edits/invalid URLs clear stale generated prompts.
- Corrected The World We Know's description to historical geographic knowledge. Avoided implying private demo voices or Premiere/CapCut exports are bundled.

## Executed checks

| Check | Actual result / scope |
| --- | --- |
| `node tools/build.mjs` | Six HTML routes generated from shared templates. |
| `node --test tools/*.test.mjs` | 70 passed, 0 failed, 0 skipped. Guide tests include minimal DOM fixtures; they are not browser integration tests. |
| Responsive browser matrix | 18 cases: six routes at 320, 768 and 1440 CSS px. No horizontal overflow or broken images; one H1 each. Native in-app browser, not physical phones. |
| Static fallback | Enhancement script omitted using the local test server. English/Chinese guide content, links, mobile navigation and workflow remain available. Browser-wide JavaScript was not disabled. |
| Prompt builder | Real browser: example, dirty, ready and invalid states survive language changes; invalid URL disables Copy; valid prompt copy verified. |
| Film links / playback | ArtCraft played to completion. Other four films opened paused by deep link and started using controls; tracks loaded. Real share URL copied and reopened. No continuous listening-quality acceptance claimed. |
| Player layout | Desktop and 390 px screenshots; English translation, toggle and close remain available when enlarged in-page. |
| Failure injection | Local HTTP 404 for MP4 and VTT. Found and fixed an error overwritten by a misleading Press play hint. Caption failure preserves playback and exposes a story summary. |
| Caption integrity | Hash bindings, legal/increasing cue times and source records checked. Source-cut correspondence established with frame/audio comparisons where encodes differed. Translation follows display timing, not forced word alignment. |
| Accessibility spot checks | Mobile menu keyboard focus/Escape, focus return, tab controls, reduced-motion source behavior, targeted contrast fixes. Not a complete WCAG audit or screen-reader certification. |
| External guide sources | Public engine repository and its onboarding docs fetched; official Node/Git links checked. No fresh engine installation in this website task. |

## Evaluation-driven decisions

An alternate 4.292-second ArtCraft input-to-result hero clip was actually produced and compared at mobile size. Its dense, dark opening was less legible than the existing result-first excerpt, so the original 2.5-second hero was retained. The candidate stays in ignored local QA, outside publication.

Independent review found English subtitles could disappear in video-only fullscreen, stale screenshots, and weak first-screen language/platform context. Repairs introduced supported in-page expansion, native subtitle fallback, refreshed screenshots, and clearer context. Native fullscreen/PiP still require physical-browser verification. The raw independent review is preserved in `reviews/rsi-v3-independent-review.md` rather than replacing earlier findings with a blanket PASS.

## Evidence and limits

Local `qa/rsi-v3/` contains browser screenshots, the 18-case layout record, media checks, test output, failure-injection evidence and the unmodified original independent report. QA files are intentionally excluded from the deploy archive. Caption provenance and font licenses are included with assets.

No physical iPhone/Android, Safari fullscreen/PiP, slow-network lab run, complete screen-reader audit, English re-narration, or social-crawler preview is claimed. The private site cannot yet serve as a publicly accessible promotional landing page; changing its audience requires a separate decision. Original films remain Chinese and some historical calls to action mention comments; each player provides its actual repository link.

The website source is saved to the Sites source repository and published as a private version. This does not imply a push to the separate GitHub video-engine repository. Publication result and final live browser checks are retained locally after deployment.
