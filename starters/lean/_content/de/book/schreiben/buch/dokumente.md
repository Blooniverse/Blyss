---
title: Dokumente
description: Wie Sie der Dokumentation ein Dokument und einen Abschnitt hinzufügen.
order: 1
translationKey: book-docs
---

## Ein Dokument hinzufügen

Legen Sie eine Markdown-Datei in `_content/de/book/` an, etwa `mein-thema.md`. Blyss veröffentlicht sie unter `/de/book/mein-thema/` oder unter der URL ihres `slug` und nimmt sie in die Navigation auf.

### Front Matter

Dokumente haben das [Front Matter der Seiten](/de/book/schreiben/seiten-und-beitraege/#front-matter-und-urls) und dazu `order`:

- `title` nennt das Dokument in seiner Überschrift, in der Navigation und in den Links zum vorherigen und zum nächsten Dokument.
- `order` ordnet es unter den Dokumenten neben ihm ein: niedrigere Zahlen zuerst, Dokumente ohne `order` zuletzt; Dokumente mit derselben Zahl ordnet Blyss nach ihrem Titel.
- `translationKey` verknüpft seine Übersetzungen, wie auf jeder Seite.
- `draft: true` lässt das Dokument beim Build aus, wie eine Seite oder einen Beitrag; siehe [Entwürfe](/de/book/schreiben/seiten-und-beitraege/#entwürfe).

## Einen Abschnitt hinzufügen

Ein Verzeichnis wie `_content/de/book/schreiben/` ist ein Abschnitt der Dokumentation. Seine `index.md` ist die Startseite des Abschnitts, und ihr Titel benennt den Abschnitt in der Navigation; das Feld `order` dieser Datei ordnet den Abschnitt ein. Ein Abschnitt kann weitere Abschnitte enthalten: Dieses Dokument liegt in `_content/de/book/schreiben/buch/`. Blyss bricht mit einer Fehlermeldung ab, wenn einem Verzeichnis mit Dokumenten seine `index.md` fehlt oder wenn diese Startseite ein Entwurf ist, ein Dokument ihres Abschnitts aber nicht.

## Dokumente übersetzen

Jede Sprache hat ihre eigenen Dokumente in `_content/<Sprache>/book/`. Wie überall teilen [Übersetzungen](/de/book/schreiben/uebersetzungen/) ihren `translationKey`, während sich die Namen ihrer Dateien und Verzeichnisse unterscheiden dürfen: Dieses Dokument ist auf Englisch `/en/book/writing/book/docs/`.
