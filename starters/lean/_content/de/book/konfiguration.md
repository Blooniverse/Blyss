---
title: Konfiguration und Sprachen
description: Website, Sprachen, Verzeichnisse und Darstellung konfigurieren.
order: 2
translationKey: book-configuration
---

## Website einstellen

Die Kommentare in `blyss.config.js` erklären die Einstellungen des Starters und seiner Komponenten. Ersetzen Sie vor der Veröffentlichung insbesondere die mit `CHANGE BEFORE PRODUCTION` markierten Werte für Website und Publisher. `site.baseUrl` bestimmt die öffentlichen URLs für Canonical-Links, `hreflang` und JSON-LD; mit einem Pfad, wie in `https://example.com/docs`, liegt die Website [unterhalb dieses Pfads](/de/book/bereitstellung/#unterhalb-eines-pfads).

`pagination.pageSize` legt die Anzahl der Beiträge je Archiv- und Schlagwortseite fest; der Standard ist 10, erlaubt sind positive ganze Zahlen. `layout` steuert Abstände und Ausrichtung; Hero und Overlay sowie ihre Schalter beschreibt [Vorlagen](/de/book/vorlagen/). Einstellungen einzelner Komponenten stehen unter `components`; ein [Block](/de/book/komponenten/) kann sie für eine einzelne Verwendung ersetzen.

Alle Verzeichnisse werden relativ zum Website-Wurzelverzeichnis aufgelöst. Jeder Build löscht und erstellt `directories.public` neu. Es muss ein Unterverzeichnis der Website sein und darf weder `components`, das konfigurierte Inhaltsverzeichnis, `static` oder `templates` enthalten noch darin liegen. Ungültige Einstellungen werden vor dem Löschen der bisherigen Ausgabe abgelehnt.

## Sprachen

`site.languages` enthält beliebig viele Sprachen in der Reihenfolge des Sprachwechslers und der `hreflang`-Alternativen. Ein Schlüssel wie `de` oder `pt-br` darf nur kleine lateinische Buchstaben, Ziffern und Bindestriche enthalten. Er benennt das Verzeichnis unter `_content/` und beginnt die URLs. Jede Sprache braucht ein `label`, ein `locale` wie `de` oder `en-GB`, eine `description` als Ersatz für Seiten ohne eigene Beschreibung und dieselben `labels` wie die anderen Sprachen. Die Labels der von Blyss erzeugten Elemente fallen andernfalls auf Englisch zurück.

`site.defaultLanguage` bestimmt das Ziel der Weiterleitung von `/` und die Sprache von `/404.html`; ohne Angabe ist es die erste Sprache. `site.languageSwitcher: false` versteckt den Sprachwechsler, nicht aber die `hreflang`-Links. [Übersetzte Dateien](/de/book/schreiben/uebersetzungen/) erhalten denselben `translationKey`, dürfen aber unterschiedliche Pfade und Slugs haben.

### Sprache hinzufügen

1. Ergänzen Sie etwa `fr` in `site.languages`, mit `label`, `locale`, `description` und allen übersetzten `labels`.
2. Ergänzen Sie französische Beschreibungen in jedem Schritt von `components.componentSliderHero.steps` und `components.componentSliderOverlay.steps`.
3. Legen Sie `_content/fr/` nach dem Vorbild von `_content/en/` an: `pages/index.md`, `pages/about.md`, `pages/404.md`, `heroTexts.md`, `overlayTexts.md`, die benötigten Texte unter `components/`, `book/index.md`, Dokumente und Beiträge. Gleiche `translationKey`-Werte verknüpfen Übersetzungen.
4. Erstellen Sie die Website mit `npm run build` und prüfen Sie die Sprachlinks.

Zum Entfernen einer Sprache löschen Sie ihren Eintrag, ihr Inhaltsverzeichnis und ihre Slider-Beschreibungen. Ändern Sie gegebenenfalls `defaultLanguage`; bei nur einer Sprache können Sie den Sprachwechsler ausblenden. Bei einer neuen Standardsprache passen Sie auch die Weiterleitung in `static/staticwebapp.config.json` und im Deployment-Workflow an: siehe [Bereitstellung](/de/book/bereitstellung/).
