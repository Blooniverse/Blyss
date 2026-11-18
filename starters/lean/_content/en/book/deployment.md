---
title: Deployment and SEO
description: Prepare and deploy the generated website.
order: 7
translationKey: book-deployment
---

## Before production

Replace the values marked `CHANGE BEFORE PRODUCTION` in `blyss.config.js` and the `Sitemap:` URL in `static/robots.txt`. Replace the placeholder logo and gallery images and their localized descriptions. Decide whether to [host fonts](/en/book/templates/#top-bar-and-fonts) and [diagram libraries](/en/book/components/#host-diagram-libraries-yourself) locally instead of exposing visitors' IP addresses to external providers.

Blyss generates canonical and `hreflang` links, Schema.org JSON-LD using `@graph`, and `sitemap.xml`, which lists generated pages and their translations except 404 pages. Set `site.baseUrl` to the public URL.

## Hosting

Deploy `public/`, not the source directories. Blyss does not generate `public/index.html`: configure the host to redirect `/` to the configured default language with HTTP 302 and serve `/404.html` with HTTP 404 for missing routes. `blyss serve` already does this. Component files are published below `/components/`; GitHub Pages requires `public/.nojekyll` to include paths starting with an underscore.

The starter's `static/staticwebapp.config.json` configures the redirect to `/en/` and the 404 response for Azure Static Web Apps. If the default language changes, update that redirect and any deployment workflow.

### Azure Static Web Apps

Azure's build service may not provide Node.js 25 or newer. Build in GitHub Actions and upload `public/` with `skip_app_build: true`:

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
          node-version: lts/* # Blyss requires Node.js 25 or newer
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
