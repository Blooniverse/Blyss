---
title: Installation and commands
description: Create, build and serve a Blyss website.
order: 3
translationKey: book-installation
---

## Create a website

Blyss requires Node.js 25 or newer. To create a website from the bundled lean starter:

```bash
npx @blooniverse/blyss init my-site
cd my-site
npm install
npm run build
npm start
```

Open `http://localhost:3000`. To add Blyss to an existing website instead, run `npm install @blooniverse/blyss`.

`blyss init [directory]` copies the starter into a new or empty directory, or the current directory if omitted. It refuses a non-empty directory and never overwrites existing files. If copying fails, it removes only what it created. It names the package after the directory and depends on the running Blyss version; it does not install dependencies, initialize Git, build, serve or use the network.

## Commands

Run these from the website root, where `blyss.config.js` lives, through the starter's npm scripts or as `npx blyss <command>`:

```bash
blyss init [directory]  # copy the starter
blyss build             # generate directories.public
blyss serve             # serve it on PORT or server.fallbackPort
```

`build` and `serve` require `blyss.config.js`. The dependency-free server redirects `/` to the configured default language and returns the default-language 404 page for missing routes.

## Website structure

`_content/<language>/` holds pages, posts, book docs, fragments and component texts. `components/` holds component templates and assets, `templates/` page templates, and `static/` files copied unchanged to the output. `blyss.config.js` configures the website; see [Configuration](/en/book/configuration/).

`public/` is generated output, excluded from Git by the starter. Every build deletes and recreates it: edit the sources, not `public/`. Blyss refuses to build into the website root or a directory containing or inside a source directory. The bundled starter stays unchanged when `init` copies it; the new website is yours to edit.
