# Read-only source fixtures

These original text snapshots support offline provenance and contract tests. They are data, never programs to execute. Example graphs contain their source URLs, pinned versions where available, SHA-256 hashes and exact quote locations.

- `rea-dino.html`: official REA dinosaur teaching case, captured from https://rea.tools/examples/dino-lab/ . REA project source reference: `morluto/rea` at `f4cc6c85efe7f3513d587df3bd5086adb1bc6a76`; accompanying MIT notice is `rea-LICENSE.txt`. The page snapshot is identified by its own hash, not represented as a fresh live fetch.
- `rembg-README.md` and `rembg-bg.py.txt`: `danielgatis/rembg` at `c5b48b0417a0254df7d461efa14573597f369a83`. The upstream MIT notice is `rembg-LICENSE.txt`. Model weights and optional remote services have separate licensing; no weights are included or executed.

The source bytes were copied unchanged from the local research archive; only example graph paths were changed to make the checkout portable. The original local archive and historical reviewed candidates are retained outside Git.
