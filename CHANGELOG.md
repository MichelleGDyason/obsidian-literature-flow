# Literature Flow

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
