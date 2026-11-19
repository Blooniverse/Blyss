---
title: Deployment and SEO
description: Prepare and deploy the generated website.
order: 6
translationKey: book-deployment
---

## Before production

Before you publish a website:

- Replace the values marked `CHANGE BEFORE PRODUCTION` in `blyss.config.js` and the `Sitemap:` URL in `static/robots.txt`. Set `site.baseUrl` to the public URL.
- Replace the placeholder logo and gallery images and their localized descriptions.
- Decide whether to [host fonts](/en/book/templates/#top-bar-and-fonts) and [diagram libraries](/en/book/components/#host-diagram-libraries-yourself) locally instead of exposing visitors' IP addresses to external providers.

For search engines, Blyss generates:

- Canonical and `hreflang` links. The `x-default` alternate of a page is its translation in the default language.
- Schema.org JSON-LD using `@graph`. In it, a post is a `BlogPosting` and a doc a `TechArticle`, each with its headline, its dates and the publisher of the website as its author.
- `sitemap.xml`, which lists generated pages and their translations except 404 pages.

## Hosting

Deploy `public/`, not the source directories. Blyss does not generate `public/index.html`, so configure the host as `blyss serve` already does:

- Redirect `/` to the configured default language with HTTP 302.
- Serve `/404.html` with HTTP 404 for missing routes.

Component files are published below `/components/`.

### Below a path

A website can lie below a path of its domain, as a GitHub Pages project site does at `https://user.github.io/repository/`. Set `site.baseUrl` to that URL, path included:

```js
baseUrl: "https://user.github.io/repository",
```

The content, the templates and the components stay as they are: write links and files from the root of the website, as in `/en/posts/` and `/assets/css/main.css`.

- The build puts the path before every `href`, `src`, `poster` and `action` that starts with a single `/`.
- `blyss serve` serves the website below the path, at `http://localhost:3000/repository/`.
- Where a URL stands elsewhere, as in an inline script or a `data-` attribute, write `{{basePath}}` before it, in a template or in the template of a component: it is the path, here `/repository`, and empty for a website at the root of its domain.
- A stylesheet refers to its files with relative URLs, such as `url(../img/logo.svg)`.
- The starter's diagrams add the path to their libraries in `static/` themselves.

### GitHub Pages

GitHub Pages shows `404.html` for missing URLs, but cannot redirect `/`. Build in GitHub Actions and add a page that sends visitors to the default language. For a project site, set `site.baseUrl` as for a website [below a path](#below-a-path), and choose "GitHub Actions" as the source of Pages in the settings of the repository:

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/* # Blyss requires Node.js 24 or newer
      - run: npm ci
      - run: npm run build
      # GitHub Pages cannot redirect / to the default language: this page does, also below a path.
      - run: echo '<!doctype html><title>Redirecting</title><meta http-equiv="refresh" content="0; url=en/">' > public/index.html
      - uses: actions/upload-pages-artifact@v5
        with:
          path: public
      - id: deployment
        uses: actions/deploy-pages@v5
```

### Azure Static Web Apps

The starter's `static/staticwebapp.config.json` configures the redirect to `/en/` and the 404 response for Azure Static Web Apps. If the default language changes, update that redirect and any deployment workflow.

Azure's build service may not provide Node.js 24 or newer. Build in GitHub Actions and upload `public/` with `skip_app_build: true`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/* # Blyss requires Node.js 24 or newer
      - run: npm ci
      - run: npm run build
      # Azure requires this stub; the configured / redirect hides it.
      - run: echo '<!doctype html><title>Redirecting</title><meta http-equiv="refresh" content="0; url=/en/">' > public/index.html
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: upload
          app_location: public
          output_location: ""
          skip_app_build: true
```

Use the deployment token secret created for your app. Commit the `package-lock.json` produced by `npm install` for `npm ci`.
