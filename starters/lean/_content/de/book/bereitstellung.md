---
title: Veröffentlichung
description: SEO, Datenschutz und statisches Hosting einschließlich Azure vorbereiten.
order: 6
translationKey: book-deployment
---

## Vor der Veröffentlichung

Vor der Veröffentlichung:

- Setzen Sie `site.baseUrl`, Publisher-Daten und Sprachbeschreibungen in `blyss.config.js` auf die tatsächlichen Werte; ersetzen Sie auch die `Sitemap:`-URL in `static/robots.txt`.
- Tauschen Sie das Platzhalterlogo und die Galeriebilder samt Beschreibungen in den sprachabhängigen Galerietexten aus.
- Prüfen Sie, ob externe Abrufe von Google Fonts und jsDelivr für Ihre Website zulässig sind, oder hosten Sie [Schriften](/de/book/vorlagen/) und [Diagrammbibliotheken](/de/book/komponenten/) selbst.

Für Suchmaschinen enthält die Website:

- Canonical- und `hreflang`-Links in den Vorlagen. Die Alternative `x-default` einer Seite ist ihre Übersetzung in der Standardsprache.
- Schema.org-JSON-LD mit einem `@graph` in den Vorlagen. Beiträge haben darin den Typ `BlogPosting` und Dokumente den Typ `TechArticle`, jeweils mit ihrer Überschrift, ihren Daten und dem Publisher der Website als Autor. Ein Dokument ist Teil (`isPartOf`) der Startseite seines Abschnitts, die Teil der Startseite darüber ist, bis hin zur Startseite seines Buchs, die Teil der Website ist. Eine `BreadcrumbList` führt wie die Navigation des Buchs von seiner Startseite zu einem Dokument, vom Archiv zu einem Beitrag und von den Schlagwörtern zur Seite eines Schlagworts; eine weitere Seite einer Liste folgt auf ihre erste Seite.
- `sitemap.xml` mit den erzeugten Seiten, ihren Übersetzungslinks und `lastmod` aus `dateModified` oder `datePublished`, aber ohne 404-Seiten.

Kontrollieren Sie URLs und strukturierte Daten nach dem Build.

## Statisches Hosting

`npm run build` erstellt `public/` neu. Veröffentlichen Sie dessen Inhalt, ändern Sie dort aber nichts dauerhaft: Quelldateien liegen in `_content/`, `components/`, `templates/`, `static/` und `blyss.config.js`. Blyss erzeugt kein `public/index.html`. Konfigurieren Sie den Host deshalb wie den lokalen Server:

- `/` leitet mit HTTP 302 zur Standardsprache weiter.
- Unbekannte URLs geben `/404.html` mit Status 404 aus.

Komponenten liegen unter `/components/`.

## Unterhalb eines Pfads

Eine Website kann unterhalb eines Pfads ihrer Domain liegen, wie eine GitHub-Pages-Projektseite unter `https://user.github.io/repository/`. Setzen Sie `site.baseUrl` auf diese URL samt Pfad:

```js
baseUrl: "https://user.github.io/repository",
```

Inhalte, Vorlagen und Komponenten bleiben, wie sie sind: Schreiben Sie Links und Dateien von der Wurzel der Website aus, etwa `/de/posts/` und `/assets/css/main.css`.

- Der Build setzt den Pfad vor jedes `href`, `src`, `poster` und `action`, das mit einem einzelnen `/` beginnt.
- `blyss serve` liefert die Website unterhalb des Pfads aus, unter `http://localhost:3000/repository/`.
- Steht eine URL an anderer Stelle, etwa in einem Inline-Skript oder einem `data-`-Attribut, schreiben Sie in einer Vorlage oder in der Vorlage einer Komponente `{{basePath}}` davor: Das ist der Pfad, hier `/repository`, und leer bei einer Website an der Wurzel ihrer Domain.
- Ein Stylesheet verweist mit relativen URLs auf seine Dateien, etwa `url(../img/logo.svg)`.
- Die Diagramme des Starters ergänzen den Pfad ihrer Bibliotheken in `static/` selbst.

## GitHub Pages

GitHub Pages zeigt `404.html` für unbekannte URLs, kann `/` aber nicht weiterleiten. Erstellen Sie die Website in GitHub Actions und ergänzen Sie eine Seite, die Besuchende zur Standardsprache schickt. Setzen Sie für eine Projektseite `site.baseUrl` wie für eine Website [unterhalb eines Pfads](#unterhalb-eines-pfads), und wählen Sie in den Einstellungen des Repositorys „GitHub Actions“ als Quelle von Pages:

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
          node-version: lts/* # Node.js 24 oder neuer erforderlich
      - run: npm ci
      - run: npm run build
      # GitHub Pages kann / nicht zur Standardsprache weiterleiten: Diese Seite tut es, auch unterhalb eines Pfads.
      - run: echo '<!doctype html><title>Redirecting</title><meta http-equiv="refresh" content="0; url=en/">' > public/index.html
      - uses: actions/upload-pages-artifact@v5
        with:
          path: public
      - id: deployment
        uses: actions/deploy-pages@v5
```

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
