---
title: Installation and commands
description: Create, build and serve a Blyss website.
order: 1
translationKey: book-installation
---

## Create a website

Blyss requires Node.js 24 or newer. To create a website from the bundled lean starter:

```bash
npx @blooniverse/blyss init my-site
cd my-site
npm install
npm run build
npm start
```

Open `http://localhost:3000`. To add Blyss to an existing website instead, run `npm install @blooniverse/blyss`.

`blyss init [directory]` copies the starter into a new or empty directory, or the current directory if omitted. A directory that holds nothing but `.git` counts as empty, so `git init` may come first. It refuses any other non-empty directory and never overwrites existing files. If copying fails, it removes only what it created. It names the package after the directory and depends on the running Blyss version; it does not install dependencies, initialize Git, build, serve or use the network.

## Commands

```bash
npx @blooniverse/blyss init [directory]  # copy the starter
npm run build                            # blyss build: generate directories.public
npm run build:drafts                     # blyss build --drafts: generate it with the drafts
npm start                                # blyss serve: serve it on PORT or server.fallbackPort
```

Run `npm run build`, `npm run build:drafts` and `npm start` from the website root, where `blyss.config.js` lives: they call `blyss build` and `blyss serve` of the Blyss that `npm install` put into the website. For `init`, write the full name `npx @blooniverse/blyss`: outside such a website, `npx blyss` fetches an unrelated npm package named `blyss`.

`blyss build --drafts` builds the [drafts](/en/book/writing/pages-and-posts/#drafts) as well, which every other build leaves out. `blyss --help` lists the commands and `blyss --version` shows the version of Blyss. `build` takes no argument but `--drafts`, `init` none but its directory and `serve` none at all: any other argument ends the command with a message.

`build` and `serve` require `blyss.config.js`. `serve` does not build: for a website without `public/`, it says so and answers every request with "404 Not Found". The dependency-free server answers `GET` and `HEAD` requests: it redirects `/` to the configured default language, leads a directory that is requested without its final slash, such as `/en`, to `/en/`, and returns the default-language 404 page for missing routes.

## Website structure

`_content/<language>/` holds pages, posts, book docs, fragments and component texts. `components/` holds component templates and assets, `templates/` page templates, and `static/` files copied unchanged to the output; a website without `components/` or `static/` has no components or no such files. `blyss.config.js` configures the website; see [Configuration](/en/book/configuration/).

`public/` is generated output, excluded from Git by the starter. Every build deletes and recreates it: edit the sources, not `public/`. Blyss refuses to build into the website root or a directory containing or inside a source directory. The bundled starter stays unchanged when `init` copies it; the new website is yours to edit.
