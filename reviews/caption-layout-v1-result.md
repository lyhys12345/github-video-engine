# Caption layout verification

Frozen candidate `b4e0172e8aaa7c2b90985551b04b56c4dc9c2b32fd1fa0c7991e7988d2e5ae29` introduces the versioned `noto-sc-caption-lines/1` profile for new narrated previews. It lays out original text using a fixed font, measured widths, grapheme-safe ranges and punctuation/ASCII-token rules, up to three lines. It does not rewrite the transcript, audio, VTT or cue times and does not claim Chinese word segmentation. Unsupported or unrenderable inputs are rejected rather than silently altered. Historical successful artifacts remain unchanged.

Three actual Chinese, mixed Chinese/English and three-line previews fully decoded. The original Huihui sentence no longer splits “问候” into a lone final character in the independently viewed 360x640 frames. Reviewers checked source text, historical exports, fonts, negative inputs, real cancellation/resume and independently reconstructed PCM/AAC. The original audio and VTT remained byte-identical. Raw independent reports are alongside this summary; frozen media and evidence remain at `C:/Users/luyuh/Documents/Codex/gve-caption-layout-freeze-v1/` outside Git.

Limits remain: a long ASCII token can force a short final Chinese line, and accented Latin words are only protected at grapheme boundaries. Three-line captions are close to the progress bar; real device/platform overlays, broad language coverage, continuous listening and owner acceptance are unverified. Across independent imports receipt timestamps may change task identities even where media bytes match.

Main-workspace `pnpm typecheck` and `pnpm test` passed: 47 Vitest files / 414 tests; mechanism tests 2 passed and 1 real-media test skipped. Some tests use mocks as labelled by the tests.
