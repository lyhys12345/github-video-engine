# Independent website review — RSI v3

Reviewed 2026-11-15. Scope: website only. Read-only product review; this report is the only file written by this reviewer. No browser, deployment, sharing changes, paid APIs, engine execution, or target-repository execution. No applicable AGENTS.md was found in the website or ancestor paths checked.

## Verdict

The supplied desktop homepage is visually coherent and substantially polished: a disciplined type scale, restrained palette, clear primary action, real media, and consistent spacing. The guide is materially more honest than a generic one-click AI-video pitch. Its first deliverable is an approved script, prerequisites are separated by phase, and private demo voices and platform limitations are disclosed.

I found no P0/P1 blocker in this review. I would repair the P2 player issue below and refresh the affected final-state screenshots before describing the English-first experience as fully checked. Passing offline tests does not establish fullscreen subtitle behavior, continuous subtitle synchronization, mobile media controls, or playback error recovery.

## Actionable defect

### P2 — English translation disappears in native video-only fullscreen / picture-in-picture

Evidence type: source-level conclusion; not browser-executed in this review.

Locations: `dist/assets/player.js:16–22,36,65–68`; `dist/assets/content.js:56`.

The translation is rendered into a sibling `.film-caption-bar`. The only text track has `kind="metadata"` and mode `hidden`; it is not a native subtitle track. Meanwhile the video retains unrestricted native `controls`. Native fullscreen and picture-in-picture display the video element, not its sibling translation bar. English viewers who enlarge a vertically detailed demo therefore lose the translation, and the metadata track cannot replace it through native caption controls. The visible inline screenshot does not test this branch.

Smallest repair compatible with keeping translations outside the image: provide fullscreen for the whole player shell, and suppress video-only fullscreen/PiP affordances where supported. If a reliable whole-shell mode cannot be provided on a platform, explicitly retain inline viewing there. A native subtitle fallback is another option, but it changes the outside-the-image design and should be an intentional decision. Verify actual native controls on supported mobile and desktop browsers rather than relying solely on attributes such as `controlsList`, whose enforcement is browser-dependent.

Focused acceptance: English translation stays visible after entering/exiting the supported enlarged mode; subtitle checkbox remains reachable; close/back still releases media; unavailable modes do not misleadingly appear as supported.

## Concrete visual and first-user improvements

These are prioritization suggestions, not additional release blockers.

1. **Expose English support at the primary Watch action.** In `desktop-home.jpg`, the first-screen cinema note says “Chinese audio.” The fact that all demos have English translations appears below the three-card film section. An English visitor scanning the hero can reasonably conclude the examples are Chinese-only before clicking. Add a compact “Chinese audio · English subtitles” label near the main Watch button or cinema caption; do not add another explanatory section.
2. **Expose the verified platform before the setup click.** The hero says “Start in Codex,” while Windows support appears on the guide and in the later FAQ. A short “Windows + Codex” qualifier beside the setup action gives a first-time GitHub author the relevant decision earlier. Preserve the existing guide’s distinction between verified Windows and unverified native macOS/Linux execution.
3. **Make the hero motion prove the transformation.** The desktop screenshot shows an attractive robot result, but a paused first impression explains ArtCraft image generation more directly than the engine’s repository-to-story value. The existing short input-to-result candidate is a sensible refinement: show the posed input briefly and hold the result long enough to read it. This is a change to the current demonstration, not a request for more sections or decorative motion. I did not play either candidate and cannot choose timing from still screenshots alone.
4. **Avoid making essential mobile proof 9 px.** `refinement.css` sets mobile `.cinema-source` and `.cinema-caption > span` to 9 px. The motion-study screenshot confirms that these are tiny beside a legible headline. Promote the language note to a readable 11–12 px line and let the source link wrap if necessary; decorative provenance can remain secondary. This matters more than changing the page’s palette or adding effects.

## State and interaction review

- The prompt builder clears old output and disables copying after any change, and invalid submission cannot leave a prior valid prompt copyable. The source validates a canonical HTTPS GitHub repository and does not submit it. The existing tests meaningfully exercise this boundary.
- Language changes capture field values and the example/dirty/invalid/ready state, then restore using the real helper functions. Agent selection, showcase filter, and workflow step are also retained in source. I did not find a reproducible stale-prompt state-loss bug from inspection.
- Deep-link IDs are allowlisted. Shared URLs use the canonical showcase route, exclude query/draft information, and open without audible autoplay. A failed clipboard operation has a selectable manual fallback. Closing clears media and the shared-film hash.
- Player listeners use abortable lifetimes; async clipboard/play callbacks check their request lifetime. No obvious stale callback regression was found.
- Hero motion respects reduced motion and save-data at initialization, pauses while hidden or a dialog is open, and releases the previous media instance on rerender. This is source evidence, not an executed motion-accessibility check.
- Original narration/text remain Chinese, and the external translation is explicitly described as original display timing, not word alignment. That wording is appropriately restrained. The website does not promise to redistribute private voices, export Premiere/CapCut projects, or automatically reproduce showcase quality.
- Some translated endings faithfully say “repository link in the comments.” The manifest explicitly notes this historical wording. The nearby actual repository link and notes are sufficient context; do not rewrite the translation into a new claim merely to match the website.

## Executed evidence

1. Ran the existing website command `node --test tools/*.test.mjs`: **70 passed, 0 failed**, including parameterized subtests. No engine or target repository was run.
2. Compared the static app-body markup of all six routes against current `createContent(page, lang).body()`: **all six match**. This checks generated-content freshness without rebuilding or changing product files.
3. Inspected the required screenshots using the image viewer: `desktop-home.jpg`, `desktop-guide.jpg`, `mobile-player.jpg`, `static-mobile-guide.jpg`, `mobile-guide-invalid.jpg`; additionally inspected `motion-ab-mobile.jpg`.
4. Read `layout-checks.json`: supplied checks report no horizontal overflow, no broken images, one H1, and enhanced content for all six routes at 320×740, 768×1024, and 1440×1000. These are prior producer checks; I did not independently rerun them.

## Evidence limits and final QA gaps

- **The player screenshot is stale for the new caption control.** `mobile-player.jpg` was last modified at 15:47:10, while `player.js` and `quality.css` were modified at 16:05:15. The screenshot shows the external English line followed immediately by the info panel, so it cannot prove the newly added checkbox’s position, visibility, or interaction. Refresh this screenshot after final player changes.
- The desktop and mobile screenshots show only selected viewport states, not full-page coverage. The guide screenshots support readable type, useful spacing, intact no-JS navigation, and clear invalid-input messaging. They do not establish every lower section’s layout.
- Existing tests check caption hashes, file existence, increasing/legal cue bounds, and manifest consistency. They do **not** establish faithful listening-level timing. The provenance file correctly says no continuous listening or word-level synchronization review is claimed.
- Existing tests exercise DOM-like fixtures for guide behavior, not browser focus, scrolling, native validation, or text-track lifecycle. No automated player integration tests were present. The tested helper behavior is useful but narrower than the full browser flow.
- No live external documentation-link check, prerequisite installation, native mobile media test, screen-reader check, or browser fullscreen/PiP check was performed by this reviewer. Those actions were outside the assigned review authority.

Recommended bounded final check: current desktop and 320 px mobile player screenshots with translations on and off; one enlarged-player check; one failed-media/caption-load check; language switch from a ready and invalid brief; return focus after closing a filtered/shared demo. The existing offline suite need not be broadened merely to increase its count.

## Repair recheck — 2026-11-15

The initial findings above are retained as the raw review history. The following describes the later implementation actually inspected, rather than treating a proposed fix as completed.

### Rechecked player

- **Expanded in-page viewing is now supported by source and screenshot evidence.** `player.js` toggles `.player-expanded` and changes the action to “Show details,” with no fullscreen API request required. `mobile-player-expanded-final.jpg` (390×844) visibly retains the English translation, checked subtitle control, Show details action, and close button. The video uses the larger available area while the translation remains outside the image. This addresses the primary English-viewing concern for that supported enlarged mode. I inspected the screenshot; the main agent performed the actual browser interaction.
- **The desktop player layout is now evidenced.** `desktop-player-final.jpg` shows a balanced media/details layout, external English translation, caption checkbox, and Expand player action. The still contains the old “Press play to start the film” hint; the current source subsequently adds a `playing` listener that clears it. Clearing behavior is source-confirmed here, not proved by that earlier screenshot.
- **Native caption controls now reconcile with the custom checkbox.** The track is `kind="subtitles"`; native `showing` sets the checkbox on, native `disabled` sets it off, and `hidden` supports the external bar. This repairs the stale checked-but-empty-bar edge identified during the intermediate repair review. The source also adds native fullscreen event handling and requests suppression of native fullscreen/PiP controls.
- **Native fullscreen/PiP is still platform-specific and unverified by this reviewer.** `controlsList` and `disablePictureInPicture` are browser-dependent requests, and the vendor fullscreen fallback has not been exercised here. The root agent reports that fullscreen could not be used in its embedded browser, motivating the in-page design. This is not a native fullscreen PASS, nor a cross-browser guarantee. The original finding is addressed for the supported in-page expansion and mitigated in source for other modes.
- Expansion resets on close, and the existing media cleanup, hash cleanup, and focus-return code remains intact. I found no new release blocker in the repair source.

### Rechecked first-screen changes

The current generated homepages contain “English subtitles available · Verified workflow: Windows + Codex” in English and the corresponding Chinese wording directly below the actions. The mobile source link is raised to 11 px and cinema caption to 10 px. These changes are source-confirmed; the pending refreshed homepage screenshot will provide the visual check. The 10 px secondary cinema caption remains modest in size, but the essential language/platform information now has its own 12 px hero line.

The main agent reports an actual A/B check of the longer input-to-result candidate, finding its phone-scale opening too dense and mostly black. Keeping the result-first excerpt is a reasonable evidence-backed design choice. My earlier input-to-result suggestion was tentative, and I do not regard retaining the existing excerpt as an outstanding defect.

### Recheck execution

Reran `node --test tools/*.test.mjs`: **70 passed, 0 failed**. Repeated the source/generated-body comparison: **all six routes match**. Viewed `mobile-player-expanded-final.jpg` and `desktop-player-final.jpg`. No product files were edited and no browser or engine was operated by this reviewer. Other agents’ caption-verification or browser-interaction work should be attributed to their own evidence; it is not additional execution claimed by this review.

## Final visual check — 2026-11-15

Inspected `mobile-home-final.jpg`, `desktop-home-final.jpg`, and `mobile-player-current.jpg` using the image viewer. These are fresh supplied browser captures, not browser sessions executed by this reviewer.

- Both final homepages visibly place English subtitle availability and the verified Windows + Codex environment beneath the primary actions. The added line fits the established hierarchy without cluttering the hero. On the mobile capture, both actions, the language/platform note, result-first media, and script-approval footnote are visible; no clipping or overlapping controls is apparent. The earlier first-screen clarity suggestions are now addressed by visual evidence.
- The current inline mobile player visibly includes the native playback controls, external English caption, checked “English subtitles” control, Expand player action, close button, and beginning of the film details. Its shorter control label improves the narrow layout. Together with the earlier expanded screenshot, this resolves the stale player-control screenshot gap for the captured states.
- Read the final error-handling changes: the playback rejection path now reserves “Press play” for `NotAllowedError`, ignores aborted requests, and reports other failures as a loading error. Playback status and caption-load failure text now sit beside the video. The main agent reports an actual HTTP 404 test; this reviewer confirms the repair in source but does not claim to have executed that failure test.

No new visual release blocker was found in these final captures. The original native fullscreen/PiP limits and the distinction between source, screenshot, and executed evidence remain in force. No additional product changes are requested by this review.
