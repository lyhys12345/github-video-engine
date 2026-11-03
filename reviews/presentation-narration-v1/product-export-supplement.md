# Supplement: export and original retention

This supplements `report.md`; the original report is unchanged. From the same isolated state, I independently ran `presentation export --kind narrated` into four fresh output directories. All four returned exit 0, `receipt-v1`, `reused: false`, and `review: pending`:

| Project | Task | Output directory | Receipt SHA-256 | Exported preview.mp4 SHA-256 |
|---|---|---|---|---|
| Express, offset-modified | `c760291cf32922581e9c8e4b684fbd71ef618a8079c2cfeb9778d1667efd4410` | `express-new-final` | `af5c16e40caba7874030674221cef3e854ec417f92392231a3b71289c59ff36f` | `1c085090126e12c141480b94f79f4a3866f0ec006e557fbc1dbbebE894f6375a` |
| rembg, offset-modified | `a96eab44b302b77f3747abb72232d2cd3df8589d0674c6ef0b34ae72310ac940` | `rembg-new-final` | `d0d94727aead91cd299f8df57cc9613c554d153655859b945d620bd325344495` | `2d8cc3549bc820bdff83f6b6defdadd224ddc3b7b96e5b9ce586014a172e573f` |
| Express, original | `cc06313b6aba522f69c4631cf5ab7e17e4be5e5e0a61703723df2c17638b56da` | `express-old-final` | `77400421ca9ba31b6d3eea9345b48f734997b9a9a7b02ad670bae29277fc92a6` | `a085206167bcce3564826ba9dadc88f5de125f4efbeebc8898180cc5854f8b86` |
| rembg, original | `b5d578bc68f8092f25b5cd4b79d4cbff3612e97ad372c4ff2f9ffbb3b87038d9` | `rembg-old-final` | `6f07d13d83598988e7ffedcfb62c55b4bf1a94eeac231f4e7413d389c60517b1` | `a98ad137285eccdd6cc69d4361e124724fddb70c7b763c34c57d0b7827a98b7d` |

The re-exported original MP4 hashes match those in the original report, demonstrating the original videos remained exportable and byte-identical after the one-frame offset changes. Both new MP4 hashes differ from their corresponding originals; this does not independently establish audiovisual correctness or test a changed duration/text. The new media were not watched or heard. Owner-deferred continuous viewing and listening remain UNVERIFIED; product and video overall conclusions retain the other limitations in the original report.

An initial attempt in the sandbox returned EPERM creating each publication receipt hard link; retries outside the sandbox in fresh isolated output directories succeeded. No target repository was executed or candidate modified.
