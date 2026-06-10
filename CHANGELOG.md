# Literature Flow

## 1.10.0 - 2026-06-10

### Added

- Add OpenAlex, Semantic Scholar, and combined literature-source choices for search, sidebar references and citations, and the literature graph.
- Add an open-access-only policy that is enabled by default across the plugin.
- Add an optional institutional-access link template for affiliated researchers who deliberately include restricted works.

### Changed

- Make OpenAlex the default literature source for new installations.
- Send open-access title clicks directly to a usable open location instead of routing them through Semantic Scholar.
- Prefer OpenAlex metadata when combined-provider results describe the same DOI.
- Update OpenAlex API-key guidance for the current credit-based API.

## 1.9.3 - 2026-06-10

### Fixed

- Replace the Better BibTeX pull-export request, which fails when Zotero has no active pane, with a filtered JSON-RPC bibliography query.
- Exclude annotation, attachment, and note records that Better BibTeX cannot convert into bibliography entries.
- Validate Zotero responses before writing cache files so plain-text errors cannot corrupt the bibliography cache.
- Fall back to the last valid cache and show one actionable Obsidian notice when a live Zotero refresh fails.

## 1.9.2 - 2026-06-06

### Changed

- Regenerate the lockfile for pnpm 11.5.1 and align GitHub Actions with the same version.
- Upgrade the TypeScript, ESLint, Obsidian, Node type, and esbuild development toolchain.
- Replace deprecated helper dependencies and the custom input suggester with native APIs.
- Add official Obsidian plugin linting to local scripts and continuous integration.

### Fixed

- Resolve the source-code errors and cascading type warnings reported by the Obsidian plugin checker.
- Remove unsafe DOM assignments, direct style mutations, forbidden lint directives, and unload-time leaf detachment.
- Type Semantic Scholar responses, graph nodes, Canvas data, citeproc, Zotero responses, and asynchronous callbacks.
- Update the esbuild watch configuration for current esbuild releases.

## 1.9.1 - 2026-06-06

### Changed

- Replace direct Node.js filesystem access with Obsidian's vault adapter.
- Store generated CSL and Zotero cache files inside the plugin directory.
- Restrict bibliography file loading to vault-relative paths.
- Remove the CSS `!important` override and punctuate the plugin description.

## 1.9.0 - 2026-06-06

### Added

- Optional OpenAlex search restricted to open access works.
- Search-source selector and OpenAlex API-key setting.

### Changed

- Rename the plugin from Reference Map to Literature Flow with the plugin ID `literature-flow`.
- Isolate view, command, cache, event, icon, and CSS identifiers from the upstream plugin.
- Correct package license metadata to match the repository's GPL-3.0 license.
- Pin the Obsidian SDK and D3 dispatch types to the versions recorded in the upstream lockfile so the TypeScript 4.7 build remains reproducible.

## 1.8.1

### Patch Changes

- Refactor modal to a separate class
- Add warning text to increaing the retrive limit

## 1.8.0

### Minor Changes

- Convert selected citekey to a link to open item in zotero

## 1.7.3

### Patch Changes

- Fix basename change bug

## 1.7.2

### Patch Changes

- Fix fetchData bug and update dependencies

## 1.7.1

### Patch Changes

- Move option to Misc section with a warning
- Clear cache after setting limits

## 1.7.0

### Minor Changes

- Option to change the cited/citing retrieve limit for each index card

### Patch Changes

- Remove redundant duplicate option
- Make indexing faster for CSL generation

## 1.6.5

### Patch Changes

- 69eaf47: Use pnpm for releases
