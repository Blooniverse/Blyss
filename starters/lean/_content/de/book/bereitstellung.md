---
title: Veröffentlichung
description: SEO, Datenschutz und statisches Hosting einschließlich Azure vorbereiten.
order: 7
translationKey: book-deployment
---

## Vor der Veröffentlichung

Setzen Sie `site.baseUrl`, Publisher-Daten und Sprachbeschreibungen in `blyss.config.js` auf die tatsächlichen Werte; ersetzen Sie auch die `Sitemap:`-URL in `static/robots.txt`. Tauschen Sie das Platzhalterlogo und die Galeriebilder samt Beschreibungen in den sprachabhängigen Galerietexten aus. Prüfen Sie, ob externe Abrufe von Google Fonts und jsDelivr für Ihre Website zulässig sind, oder hosten Sie [Schriften](/de/book/vorlagen/) und [Diagrammbibliotheken](/de/book/komponenten/) selbst.

Die Vorlagen enthalten Canonical- und `hreflang`-Links sowie Schema.org-JSON-LD mit einem `@graph`; Dokumente haben darin den Typ `TechArticle`. `sitemap.xml` enthält die erzeugten Seiten mit Übersetzungslinks und `lastmod` aus `dateModified` oder `datePublished`, aber keine 404-Seiten. Kontrollieren Sie URLs und strukturierte Daten nach dem Build.

## Statisches Hosting

`npm run build` erstellt `public/` neu. Veröffentlichen Sie dessen Inhalt, ändern Sie dort aber nichts dauerhaft: Quelldateien liegen in `_content/`, `components/`, `templates/`, `static/` und `blyss.config.js`. Blyss erzeugt kein `public/index.html`. Konfigurieren Sie den Host so, dass `/` mit HTTP 302 zur Standardsprache weiterleitet und unbekannte URLs `/404.html` mit Status 404 ausgeben, wie beim lokalen Server. Komponenten liegen unter `/components/`.

Betreiben Sie die Website an der Wurzel ihrer Domain. Ihre Links und Dateien beginnen mit `/`; eine Website unterhalb eines Pfads, etwa eine GitHub-Pages-Projektseite unter `https://user.github.io/repository/`, findet sie deshalb nicht.

## Azure Static Web Apps

`static/staticwebapp.config.json` richtet die Weiterleitung nach `/en/` und die 404-Antwort für [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/configuration) ein. Ändern Sie das Ziel, wenn Sie `site.defaultLanguage` ändern, ebenso im folgenden Workflow.

Der Azure-Builddienst stellt möglicherweise kein Node.js 24 oder neuer bereit. Erstellen Sie die Website stattdessen in GitHub Actions und laden Sie `public/` mit `skip_app_build: true` hoch. Azure verlangt beim Upload eine `index.html`; der Workflow ergänzt dafür eine Datei, die die Weiterleitung auf `/` vor Besuchenden verbirgt:

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
          node-version: lts/* # Node.js 24 oder neuer erforderlich
      - run: npm ci
      - run: npm run build
      - run: echo '<!doctype html><title>Redirecting</title><meta http-equiv="refresh" content="0; url=/en/">' > public/index.html
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: upload
          app_location: public
          output_location: ""
          skip_app_build: true
```

Verwenden Sie den Namen des von Azure für Ihre App angelegten Token-Secrets. `npm ci` benötigt die durch `npm install` erzeugte und eingecheckte `package-lock.json`.
