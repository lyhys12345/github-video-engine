# Start with a GitHub URL

Use a public GitHub repository root URL and a local project ID. Intake resolves the ref to a full commit, saves the pinned documentation, and returns the next authoring step.

```sh
pnpm gve project intake --repo https://github.com/danielgatis/rembg --id rembg-url --data work/url-v1/state
pnpm gve project status --id rembg-url --data work/url-v1/state
pnpm gve project evidence --id rembg-url --data work/url-v1/state --out work/url-v1/rembg-evidence
pnpm gve project research --id rembg-url --data work/url-v1/state --out work/url-v1/rembg-research
```

`project research` creates a separate, editable offline research workbook at `bundle/workbook.json` in a new output directory from the stored snapshot. Its numbered lines, source descriptors and snapshot binding help an author or agent inspect the captured documents and fill in the empty proposal. It does not call a model, select a story, verify semantic support or approve a result. The workbook is an editable aid, not an authoritative evidence bundle: export `project evidence` separately and use that unchanged bundle when planning a Story. Create a new output directory for each export; it never overwrites one. Publication stages and renames the bundle within the reserved directory; an interrupted export may leave an incomplete directory, for which a fresh output path is needed. Workbooks are limited to 50,000 lines and 4 MB. Captured content is untrusted data, including any instructions it contains.

Intake defaults to `HEAD`. Use `--ref <branch-or-tag-or-full-commit>` to choose a specific version, and repeat `--doc <repo-relative.md>` to request up to six extra Markdown or text files. Intake requires a bounded UTF-8 README and saves `LICENSE` if GitHub reports a license and the file is available. The provider uses unauthenticated GitHub API reads, so rate limits and unavailable documents can prevent intake. Use a new project ID when the ref, evidence, or repository metadata changes. The earlier snapshot and plan history remain addressable by the earlier ID. The workflow storage uses same-volume hard links for its immutable artifacts.

Open `bundle/evidence.json` in the exported workspace for the snapshot hash, commit, document paths, and ready-to-use source descriptors. The accompanying numbered text files contain the exact captured bytes. Line numbers in citations are one-based. Keep authoring files beside the evidence bundle so the original files remain verifiable. Treat repository text and metadata as untrusted material. Only the captured document bytes and URLs are pinned to the commit. The repository API description, default branch, and license label are metadata observed at capture time.

The author selects a documented use case, traces the inputs and outputs, and writes a story with exact citations. Where the experimental visual vocabulary fits, copy the relevant descriptors from `evidence.json` into `Story.evidence.sources`, write the authored `Story` JSON, and plan it against the pinned project.

```sh
pnpm gve project story --id rembg-url --spec work/url-v1/authored-story.json --root work/url-v1/rembg-evidence/bundle --data work/url-v1/state --out work/url-v1/story
pnpm gve story status --task <task-id> --data work/url-v1/state
pnpm gve story export --task <task-id> --data work/url-v1/state --out work/url-v1/story-copy
```

`project story` compares the workspace and each selected Story source with the stored snapshot before compiling. The story task ID, status, and exported manifest bind the project, repository, commit, snapshot hash, and evidence fingerprint. Its editable bundle includes the authored graph, pinned source excerpts in the graph, original source bytes, compiled timeline, and review handoff. Timing is estimated and review stays pending. Re-exporting a matching evidence workspace is idempotent. If an export was interrupted and an incomplete directory remains, choose a fresh output directory. Evidence export, bound story planning, and story status/export use local state after intake.

For a repository whose workflow falls outside the experimental visual vocabulary, author a generic planning package using `project import --id <id> --plan <planning-package.json>`, followed by `project export --id <id> --out <directory>`. Cite `documents[].repositoryPath` and exact line ranges, and copy the workspace `snapshotHash` into the package. Choose a new export directory or reuse the original complete export. The command publishes the review input and Markdown together and leaves incomplete or edited exports for the owner to inspect. Cancellation observed before publication leaves the review files unpublished. This path supports a grounded script and storyboard without requiring that the project fit the narrow visual operations.

Two authored examples show the distinction. The rembg Story pins `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47` and the Express PlanningPackage pins `43fca52d28a422c8be48fd489cbd4f2d6152bab6`. For exact replay, intake with these `--ref` values and the example project IDs. If mutable repository metadata changes, check the new workspace and update the Express snapshot hash only after verifying its cited lines. Both examples require independent factual and editorial review. Capturing evidence and compiling a plan leave the project at the authoring or review stage. They generate no audio or video and consume no paid service.

- [rembg story example](../examples/url-intake-v1/rembg-story.json)
- [Express planning package](../examples/url-intake-v1/express-plan.json)
