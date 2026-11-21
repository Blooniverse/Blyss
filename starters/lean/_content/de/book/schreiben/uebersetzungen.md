---
title: Übersetzungen
description: Wie Blyss die Fassungen einer Seite in mehreren Sprachen verknüpft.
order: 3
translationKey: book-translations
---

## Übersetzungen verknüpfen

Jede Sprache hat ihre eigenen Inhalte in `_content/<Sprache>/`. Eine Seite, ein Beitrag oder ein Dokument teilt seinen `translationKey` mit seinen Übersetzungen in den anderen Sprachen:

```markdown
---
title: Hallo Welt
translationKey: 261110-init-hello-world
---
```

Blyss verknüpft solche Seiten im Sprachwechsler und nennt sie Suchmaschinen als `hreflang`-Alternativen, im Kopf jeder Seite und in `sitemap.xml`. Die Übersetzung in der Standardsprache ist zugleich die Alternative `x-default`, für Besuchende aller anderen Sprachen.

Die Namen der Dateien und ihrer Verzeichnisse dürfen sich von Sprache zu Sprache unterscheiden und mit ihnen die URLs: `/de/posts/261110-init-hallo-welt/` ist auf Englisch `/en/posts/261110-hello-world/`.

Innerhalb einer Sprache hat jede Seite ihren eigenen Schlüssel: Zwei Seiten einer Sprache mit demselben Schlüssel stoppen den Build. Eine Seite ohne Übersetzung zeigt im Sprachwechsler nur ihre eigene Sprache.

## Was jede Sprache braucht

Jede Sprache braucht:

- `pages/index.md`, `pages/about.md` und `book/index.md`, ohne abweichenden Slug, denn die Navigation des Starters verlinkt die Startseite, die Seite „Über uns“ und die Startseite der Dokumentation;
- ihre eigene Fehlerseite, `pages/404.md`;
- ihre eigenen Texte für [Hero und Overlay](/de/book/vorlagen/#hero-und-overlay) und für die [Komponenten](/de/book/komponenten/);
- ihre eigenen Labels in `blyss.config.js`.

## Erzeugte Seiten

Blyss erzeugt das Archiv der Beiträge, den Index der Schlagwörter und die Schlagwortseiten für jede Sprache und verknüpft sie von selbst über die Sprachen hinweg; die Seiten eines Schlagworts dort, wo ihre URLs gleich enden, wie bei `/de/tags/blyss/` und `/en/tags/blyss/`.

## Weitere Sprachen

[Konfiguration und Sprachen](/de/book/konfiguration/#sprachen) beschreibt `site.languages`, die Standardsprache und das Hinzufügen und Entfernen einer Sprache.
