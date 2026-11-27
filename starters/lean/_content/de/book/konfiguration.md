---
title: Konfiguration und Sprachen
description: Website, Sprachen, Verzeichnisse und Darstellung konfigurieren.
order: 3
translationKey: book-configuration
---

## Website einstellen

Die Kommentare in `blyss.config.js` erklären die Einstellungen des Starters und seiner Komponenten. Ersetzen Sie vor der Veröffentlichung insbesondere die mit `CHANGE BEFORE PRODUCTION` markierten Werte für Website und Publisher. `site.baseUrl` bestimmt die öffentlichen URLs für Canonical-Links, `hreflang` und JSON-LD; mit einem Pfad, wie in `https://example.com/docs`, liegt die Website [unterhalb dieses Pfads](/de/book/bereitstellung/#unterhalb-eines-pfads).

Weitere Einstellungen:

- `pagination.pageSize` legt die Anzahl der Beiträge je Archiv- und Schlagwortseite fest; der Standard ist 10, erlaubt sind positive ganze Zahlen.
- `books` nennt die [Bücher](/de/book/verfassen/buch/#mehrere-bücher) der Website; der Standard ist `["book"]`.
- `mainNavigation` zählt die Links der Kopfleiste auf; siehe [Hauptnavigation](#hauptnavigation).
- `layout` steuert Abstände und Ausrichtung; Hero und Overlay sowie ihre Schalter beschreibt [Vorlagen](/de/book/vorlagen/).
- `components` enthält die Einstellungen einzelner Komponenten; ein [Block](/de/book/komponenten/) kann sie für eine einzelne Verwendung ersetzen.

Für die Verzeichnisse unter `directories` gilt:

- Alle Verzeichnisse werden relativ zum Website-Wurzelverzeichnis aufgelöst.
- Jeder Build löscht und erstellt `directories.public` neu.
- `directories.public` muss ein Unterverzeichnis der Website sein und darf weder `components`, das konfigurierte Inhaltsverzeichnis, `static` oder `templates` enthalten noch darin liegen.

Ungültige Einstellungen werden vor dem Löschen der bisherigen Ausgabe abgelehnt.

## Hauptnavigation

`mainNavigation` zählt die Links der Kopfleiste in ihrer Reihenfolge auf, und `templates/document.html` zeigt sie mit dem Platzhalter `{{mainNavigation}}`. Jeder Link hat entweder einen `translationKey` oder eine `href`:

```js
mainNavigation: [
  { translationKey: "home", label: "home" },
  { translationKey: "blyss:posts", label: "posts" },
  { translationKey: "book", label: "book" },
  { translationKey: "about" },
  { href: "https://github.com/Blooniverse/Blyss", label: "github" }
],
```

- Ein `translationKey` verlinkt die Seite, den Beitrag oder das Dokument mit diesem [`translationKey`](/de/book/verfassen/uebersetzungen/) in der Sprache der jeweiligen Seite; `blyss:posts` und `blyss:tags` verlinken das Archiv und die Schlagwörter, `blyss:tags/` mit dem Slug eines Schlagworts, etwa `blyss:tags/markdown`, dessen Seite. Einer Sprache ohne eine solche Seite, oder nur mit einem Entwurf davon, fehlt der Link.
- Eine `href` verlinkt eine andere Website.
- `label` nennt ein Label aus `site.languages`, etwa `home`, das in jeder Sprache der Text des Links ist; ein eigenes Label wie `github` braucht einen Text in jeder Sprache. Ohne Label zeigt ein Link zu einer Seite deren Titel; ein Link zu einer anderen Website braucht eines.
- Der Link zur aktuellen Seite erhält `aria-current="page"`, ein Link zu einer Seite, die sie enthält, etwa zur Startseite ihres Buchs oder zum Archiv der Beiträge, `aria-current="true"`. Die Startseite enthält jede Seite, wird aber nur auf sich selbst markiert.
- Ein `translationKey`, den keine Seite hat, etwa ein falsch geschriebener, stoppt den Build. Ohne Links ist der Platzhalter leer.

## Sprachen

`site.languages` enthält beliebig viele Sprachen in der Reihenfolge des Sprachwechslers und der `hreflang`-Alternativen. Jede Sprache braucht:

- Einen Schlüssel wie `de` oder `pt-br`, der nur kleine lateinische Buchstaben, Ziffern und Bindestriche enthalten darf. Er benennt das Verzeichnis unter `_content/` und beginnt die URLs.
- Ein `label`.
- Ein `locale` wie `de` oder `en-GB`.
- Eine `description` als Ersatz für Seiten ohne eigene Beschreibung.
- Dieselben `labels` wie die anderen Sprachen. Die Labels der von Blyss erzeugten Elemente fallen andernfalls auf Englisch zurück, darunter die Titel der [Hinweisboxen](/de/book/verfassen/markdown-wuerze/#hinweisboxen) wie `note` und `warning`.

Zwei weitere Einstellungen betreffen die Sprachen:

- `site.defaultLanguage` bestimmt das Ziel der Weiterleitung von `/` und die Sprache von `/404.html`; ohne Angabe ist es die erste Sprache.
- `site.languageSwitcher: false` versteckt den Sprachwechsler, nicht aber die `hreflang`-Links.

[Übersetzte Dateien](/de/book/verfassen/uebersetzungen/) erhalten denselben `translationKey`, dürfen aber unterschiedliche Pfade und Slugs haben.

### Sprache hinzufügen

1. Ergänzen Sie etwa `fr` in `site.languages`, mit `label`, `locale`, `description` und allen übersetzten `labels`.
2. Ergänzen Sie französische Beschreibungen in jedem Schritt von `components.componentSlider.steps`.
3. Legen Sie `_content/fr/` nach dem Vorbild von `_content/en/` an: `pages/index.md`, `pages/about.md`, `pages/404.md`, `hero.md`, `overlay.md`, `heroCards.md`, `overlayCards.md`, die benötigten Texte unter `components/`, die `index.md` jedes Buchs wie `book/index.md`, Dokumente und Beiträge. Gleiche `translationKey`-Werte verknüpfen Übersetzungen.
4. Erstellen Sie die Website mit `npm run build` und prüfen Sie die Sprachlinks.

Zum Entfernen einer Sprache löschen Sie ihren Eintrag, ihr Inhaltsverzeichnis und ihre Slider-Beschreibungen. Ändern Sie gegebenenfalls `defaultLanguage`; bei nur einer Sprache können Sie den Sprachwechsler ausblenden. Bei einer neuen Standardsprache passen Sie auch die Weiterleitung in `static/staticwebapp.config.json` und im Deployment-Workflow an: siehe [Bereitstellung](/de/book/bereitstellung/).
