# Independent frame review — synthetic packet

Scope: Q2/Q3/Q6 visual plausibility only. Reviewed packet `D:/gve-anna-render-temp/gvsquality-M5q3oB`, baseline candidate SHA-256 `532ebd3048e1943ab4600810fe84dfefd1bbca83fe7602fb7d3bf80b21f0b295`, render task `707a024d3de8bbbb4267ba6a3bda884047c505bf20c977de80084c555173663e`. Source and output images were viewed in order before reading either quality report; the following blind observations were sent to root first.

## Blind observations

Source is a landscape four-quadrant red/yellow/green/blue image. Frame 0 shows those four colors in a tall left panel with the full color arrangement present but a much narrower composition than the landscape source; the outer horizontal source context is apparently cropped, and edges are visibly softened by enlargement. Large empty dark area occupies the right side. Frame 3 adds a small right test-pattern panel with dark space above and below the image; frame 5 grows that right panel and retains substantial dark space above/below the wide pattern. Frame 11 replaces the two-panel view with a greatly enlarged test-pattern crop filling the main area: outer red/cyan bars and portions of the timestamp and checker pattern are cut off, with obvious blocky/soft detail. The phone contact sheet confirms these layout changes at 360px presentation: the title and bottom caption remain discernible, but the small asset caption and test-pattern timestamp/details are tiny; frame 11's cropped pattern is conspicuously enlarged. These are still-image impressions, not exact geometry, readability proof, continuous AV, or production aesthetics.

## Comparison after unblinding

The baseline report's frame-0 cover crop (59.87 of 240 source pixels wide; 75.05% additional cover clipping; 7.75x output and 2.58x assumed phone scale) is qualitatively consistent with the central strip of the four-quadrant source and the visible enlargement. Four colors remain because the central strip straddles both quadrant boundaries; their presence does not imply the whole source is shown. The stated frame-5 worst enlargement (8.54x output, 2.85x phone) is plausible, but the stills do not independently establish the exact maximum or numeric crop fraction.

The second panel's first visible frame 3 and its larger frame-5 contain destination with 28.71% fill agree qualitatively with the visible reveal and substantial vertical blank space. At frame 5 the report's 1.43x output and 0.48x assumed phone factors concern source-pixel budget; the tiny pattern text observed at phone scale is not a contradiction or a proof of legibility. The never-visible third panel cannot be established from these four selected frames alone.

The second shot's 5.17x output and 1.72x assumed phone scale, and approximately 43.87% additional cover clipping reported at frame 6, are consistent in kind with the heavily enlarged, horizontally clipped pattern seen at frame 11. Frame 6 itself was not viewed; visual review cannot verify its numeric values, exact maximum, or every frame. The report distinguishes 1080x1920 output from assumed 360x640 CSS-pixel DPR1 presentation and states that scale warnings cannot establish blur or legibility. The observed softness and text impressions are limited to this fixture and display, not general claims.

The proposed report predicts a first-shot full-source contain composition with approximately 49.89% fill and 3.87x output / 1.29x phone scale; this is a proposed plan, not an observed render. The unchanged second-shot geometry remains subject to the above limitation. No proposed frames were inspected.

Verdict: no visual contradiction found in the inspected baseline examples; Q2/Q3/Q6 claims are plausible within this bounded check, not independently proven mathematically or across every frame. No dissent beyond the limitations stated. Synthetic stills do not establish continuous audio/video, natural voice, retention, or real-project aesthetics.

## SHA-256 identities

- source.png: `e0d0d2354cf466ba12d738bd4aa23cca22be3fc54b5222a566b0db44115afa94`
- output-0.png: `15b8d2eecd42aa68d71debf0c5753c7b3db640e6d21c6a75f487e7fd194a9fc5`
- output-3.png: `a3f1a32a52fbca843f89d4f5afc1cb3320acf736c64bd075d023bcf13662177c`
- output-5.png: `06900160b50c913fc86aefe33ba952835bd47ce460df26d945be26c55ebcbbc4`
- output-11.png: `fca8dbe09a83dcc2277504d3af22417624288a12162cd88cb9d71083be52ae9e`
- phone-contact.png: `c96064a0dd1813a1a93698887fa22957ab3633c6989d3ad8988770d8eabb0c2e`
- crop-quality.json: `8f1586e3abdba749c1dee4c18453ab738d591efa1d817c4783decc5d74f6f36e`
- crop-quality-proposed.json: `c12bad6cc7964e3fd814a0279ea766eccf30e69b012ee98975036f9efc07e5bf`

## Final frozen packet recheck and Q6 disposition

**Q6: PASS**, scoped to actual inspection of the source, selected output PNGs and phone-scale contact sheet, and qualitative comparison with the final report. The four selected output images, source PNG and contact sheet have the same SHA-256 hashes as the directly viewed images listed above; the final `source.mp4` hash is also identical to the initial packet according to `work/rsi-showcase-quality-v1/frame-packet-comparison.json`. I independently hashed the final files, confirming that comparison. This transfers the actual visual observations to the final packet without claiming a second viewing. Source MP4 was not played or listened to.

Final packet: `D:/gve-anna-render-temp/gvsquality-AvhG1o`; candidate SHA-256 `532ebd3048e1943ab4600810fe84dfefd1bbca83fe7602fb7d3bf80b21f0b295`; render task `af1820d673db7bcc93d04b5c30263d8b2ca59b419cede9ee94bbfc10c4091453`; pinned source SHA-256 `efd16b1ee5f4c3a6421ba8dda4ac2c445d01bb843c586733456c73d98656e102`. Final report hashes differ from the initial packet. I inspected both final reports: the relevant baseline and proposed geometry figures and 1080x1920 versus assumed 360x640 DPR1 phone basis remain as compared above. Their scope now specifies panel-local geometry before overlay occlusion and selected-crop/destination fit fractions; these qualifications are consistent with the visual review. The proposed layout remains a prediction, not a viewed render.

The final hashes for the six directly inspected image files are identical to the initial values listed above. Additional final identities:

- source.mp4: `7a652eb999afb7e22c3bb59c6fe4d43ff1ff28305b4cb6b198e79461844704d2`
- crop-quality.json: `2b0189001ca7134ea5221ca19786084ce7c37dbb16894b9b07a8436867b62c63`
- crop-quality-proposed.json: `456cb71ee554a667aa28d4c9f201e65a8f91f5be12367ba2ab291c0591d4c2f2`

This PASS does not extend to independent mathematical validation of numerical extrema, all-frame coverage, unseen proposed output, continuous AV, or real-project aesthetics and retention. The original blind observations and dissent/limits remain unchanged above.
