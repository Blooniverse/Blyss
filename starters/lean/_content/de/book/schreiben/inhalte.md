---
title: Seiten, Beiträge und Dokumente
description: Front Matter, URLs, Übersetzungen und generierte Inhaltsseiten.
order: 0.5
translationKey: book-content
---

## Front Matter und URLs

Eine Markdown-Datei beginnt mit Front Matter; der Text darunter beginnt unterhalb des Titels, nicht mit einer zweiten H1:

```markdown
---
title: Hallo Welt
slug: hallo-welt
description: Der erste Beitrag dieser Website.
datePublished: 2026-11-10
dateModified: 2026-11-12
translationKey: hello-world
tags: [Blyss, Markdown]
---

Ein erster Absatz.
```

Seiten in `_content/de/pages/` erscheinen unter `/de/pages/<slug>/`, Beiträge in `_content/de/posts/` unter `/de/posts/<slug>/` und Dokumente in `_content/de/book/` unter `/de/book/`. Ohne `slug` gilt der Dateiname; lokalisierte Slugs ermöglichen lokalisierte URLs. `pages/index.md` wird zur Startseite `/de/`; `pages/404.md` ist eine besondere [Fehlerseite](#fehlerseite). Die Starter-Navigation erwartet in jeder Sprache `index.md`, `about.md` ohne abweichenden Slug und `book/index.md`.

Übersetzungen teilen denselben `translationKey`. Daraus entstehen Sprachwechsler und `hreflang`-Alternativen, auch wenn Dateinamen oder Verzeichnisse verschieden sind. Die Konfiguration und das Hinzufügen von Sprachen erklärt [Konfiguration](/de/book/konfiguration/).

## Beiträge und Listen

Beiträge können Tags als `tags: [Blyss, Markdown]`, `tags: Blyss, Markdown` oder YAML-Liste erhalten. Blyss erzeugt pro Sprache das Archiv `/de/posts/`, den Index `/de/tags/` und Seiten wie `/de/tags/markdown/`. Belegen Sie diese URLs nicht mit eigenen Inhalten: Kollisionen mit anderen Dateien oder generierten Seiten stoppen den Build.

Tags erhalten ASCII-Slugs: `Über Blyss` wird `/de/tags/uber-blyss/`. Gleiche Slugs verbinden Tagseiten über Sprachen hinweg; angezeigt wird die Schreibweise des neuesten Beitrags. Archiv und Tagseiten sind nach Datum absteigend sortiert und zeigen `pagination.pageSize` Beiträge pro Seite; weitere Seiten liegen etwa unter `/de/posts/page/2/` und `/de/tags/markdown/page/2/`, mit Links zu neueren und älteren Beiträgen.

Ein Platzhalter `{{recentPosts}}` in einer Seite zeigt die drei neuesten Beiträge ihrer Sprache, geordnet nach `datePublished`. Dokumente gehören weder dazu noch ins Archiv oder zu Tags.

## Dokumentation und Fragmente

Jedes Verzeichnis mit Dokumenten benötigt eine `index.md`; deren Titel benennt den Abschnitt. `order` ordnet Dokumente und Abschnitte nebeneinander: kleinere Zahlen zuerst, fehlende zuletzt, gleiche nach Titel. Einzelheiten und ein Beispiel zum Erweitern stehen unter [Erste Schritte](/de/book/erste-schritte/) und [Navigation](/de/book/schreiben/navigation/).

Markdown-Dateien direkt in `_content/<Sprache>/`, etwa `heroTexts.md`, sind Fragmente ohne eigene Seite. `templates/document.html` kann deren Titel und Text mit `{{heroTextsTitle}}` und `{{heroTextsContent}}` einfügen. Der Dateiname muss mit einem lateinischen Buchstaben beginnen und darf nur lateinische Buchstaben und Ziffern enthalten. Fehlt die Datei, sind ihre Platzhalter leer. Hero- und Overlay-Texte haben zusätzlich die unter [Vorlagen](/de/book/vorlagen/) beschriebene Funktion.

## Fehlerseite

`_content/de/pages/404.md` wird unabhängig vom Slug als `/de/404.html` veröffentlicht. Die Fehlerseite der Standardsprache erscheint zusätzlich als `/404.html`; der lokale Server liefert sie für unbekannte URLs mit Status 404. Verwenden Sie dort absolute Links wie `/de/`, da die Fehlerseite unter beliebigen URLs erscheinen kann. Fehlerseiten fehlen in der Sitemap.

Für Formeln, Fußnoten, Code und Diagramme siehe [Formeln und Diagramme](/de/book/schreiben/formeln-und-diagramme/); für wiederverwendbare und individuell konfigurierte Elemente siehe [Komponenten](/de/book/komponenten/).
