# Changelog

## Unreleased

### Breaking changes

- **No bundled default templates**: `src/templates/` was removed because it
  duplicated the starter's templates. Each website keeps its own templates;
  `blyss init` copies them into `templates/`. Point a `directories.templates`
  value of `node_modules/@blooniverse/blyss/src/templates` at a local copy.

### New features

- **`blyss init [directory]`**: copies the bundled bilingual starter website
  into a new or empty directory (default: the current directory). Non-empty
  directories are refused without changes; a failed copy removes only what it
  created. The new `package.json` gets a name derived from the directory and
  depends on the running Blyss version. It does not install, build, serve,
  initialize Git or access the network.
- **Lean starter**: `starters/lean/` with English and German pages and posts,
  matching `translationKey` values, localized post slugs, templates and one
  small stylesheet. It is published in the npm package and builds into
  `dist/`.
- **Missing configuration**: `blyss build` and `blyss serve` report a missing
  `blyss.config.js` with its absolute path and suggest `blyss init` instead of
  printing `ERR_MODULE_NOT_FOUND`.
- **Tests**: `npm test` runs the CLI test suite in `test/` with `node:test`
  after the build.

### Changes

- **Engine-only repository**: the repository's own website (root `content/`,
  `static/` and the production deploy workflow) was removed. The root
  `blyss.config.js` now previews `starters/lean/` in place: `npm run build`
  renders it into `public/` and `npm start` serves it.
- **Starter**: adds `static/robots.txt`.
- **Tests**: recent posts are checked to be the three newest of each language,
  ordered by `datePublished`.

## 0.5.0 — 2026-10-28

### Breaking changes

- `src/build/paths.js` no longer exports path constants. It now exports
  `resolvePaths(projectDir, config)` which resolves all directories relative
  to `projectDir`.
- `src/build/build.js` no longer runs on import. Export `build(projectDir,
  configPath)` and call it explicitly (e.g. from `bin/blyss.js`).
- `src/server/server.js` no longer starts a server on import. Export
  `serve(projectDir, config)` and call it explicitly.

### New features

- **npm package**: published as `@blooniverse/blyss`.
- **CLI**: `bin/blyss.js` provides the `blyss build` and `blyss serve`
  commands; `projectDir` defaults to `process.cwd()`.
- **`package.json`**: `bin`, `files`, and `name` fields set for publishing.
- **`.gitignore`**: `node_modules/` and `public/` excluded from version
  control.
- README updated with installation instructions and site-structure examples.

## 0.4.0

Initial release.
