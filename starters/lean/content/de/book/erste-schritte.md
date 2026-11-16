---
title: Erste Schritte
description: Wie Sie der Dokumentation ein Dokument und einen Abschnitt hinzufügen.
order: 1
translationKey: book-getting-started
---

## Ein Dokument hinzufügen

Legen Sie eine Markdown-Datei in `content/de/book/` an, etwa `installation.md`. Blyss veröffentlicht sie unter `/de/book/installation/` oder unter der URL ihres `slug` und nimmt sie in die Navigation auf.

### Front Matter

Dokumente haben das Front Matter der Seiten und dazu `order`:

- `title` nennt das Dokument in seiner Überschrift, in der Navigation und in den Links zum vorherigen und zum nächsten Dokument.
- `order` ordnet es unter den Dokumenten neben ihm ein: niedrigere Zahlen zuerst, Dokumente ohne `order` zuletzt; Dokumente mit derselben Zahl ordnet Blyss nach ihrem Titel.
- `translationKey` verknüpft seine Übersetzungen, wie auf jeder Seite.

## Einen Abschnitt hinzufügen

Ein Verzeichnis wie `content/de/book/schreiben/` ist ein Abschnitt der Dokumentation. Seine `index.md` ist die Startseite des Abschnitts, und ihr Titel benennt den Abschnitt in der Navigation; das Feld `order` dieser Datei ordnet den Abschnitt ein. Blyss bricht mit einer Fehlermeldung ab, wenn einem Verzeichnis mit Dokumenten seine `index.md` fehlt.

## Dokumente übersetzen

Jede Sprache hat ihre eigenen Dokumente in `content/<Sprache>/book/`. Wie überall teilen Übersetzungen ihren `translationKey`, während sich die Namen ihrer Dateien und Verzeichnisse unterscheiden dürfen: Dieses Dokument ist auf Englisch `/en/book/getting-started/`.
