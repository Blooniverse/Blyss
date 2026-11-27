---
title: Dokumente
description: Wie Sie der Dokumentation ein Dokument und einen Abschnitt hinzufügen.
order: 1
translationKey: book-docs
---

## Ein Dokument hinzufügen

Legen Sie eine Markdown-Datei in `_content/de/book/` an, etwa `mein-thema.md`. Blyss veröffentlicht sie unter `/de/book/mein-thema/` oder unter der URL ihres `slug` und nimmt sie in die Navigation auf. Ein Dokument eines [anderen Buchs](/de/book/verfassen/buecher/#mehrere-bücher), etwa `guide`, liegt in dessen Verzeichnis, `_content/de/guide/`.

### Front Matter

Dokumente haben das [Front Matter der Seiten](/de/book/verfassen/seiten-und-beitraege/#front-matter-und-urls) und dazu `order`:

- `title` nennt das Dokument in seiner Überschrift, in der Navigation und in den Links zum vorherigen und zum nächsten Dokument.
- `order` ordnet es unter den Dokumenten neben ihm ein: niedrigere Zahlen zuerst, Dokumente ohne `order` zuletzt; Dokumente mit derselben Zahl ordnet Blyss nach ihrem Titel.
- `translationKey` verknüpft seine Übersetzungen, wie auf jeder Seite.
- `draft: true` lässt das Dokument beim Build aus, wie eine Seite oder einen Beitrag; siehe [Entwürfe](/de/book/verfassen/seiten-und-beitraege/#entwürfe).

Der Button **Markdown kopieren** des Starters kopiert den geschriebenen Text eines Dokuments und stellt dessen `title`, falls vorhanden, als Markdown-Überschrift voran. Front Matter und Navigation lässt er aus. Platzhalter für Komponenten bleiben wie geschrieben erhalten und werden nicht durch ihren dargestellten Inhalt ersetzt. Der kopierte Text ist Teil der veröffentlichten Seite und für ihre Besucher zugänglich. Das Kopieren benötigt HTTPS oder localhost und die Erlaubnis für die Zwischenablage.

## Einen Abschnitt hinzufügen

Ein Verzeichnis wie `_content/de/book/verfassen/` ist ein Abschnitt der Dokumentation. Seine `index.md` ist die Startseite des Abschnitts, und ihr Titel benennt den Abschnitt in der Navigation; das Feld `order` dieser Datei ordnet den Abschnitt ein. Ein Abschnitt kann weitere Abschnitte enthalten: Dieses Dokument liegt in `_content/de/book/verfassen/buecher/`. Blyss bricht mit einer Fehlermeldung ab, wenn einem Verzeichnis mit Dokumenten seine `index.md` fehlt oder wenn diese Startseite ein Entwurf ist, ein Dokument ihres Abschnitts aber nicht.

## Dokumente übersetzen

Jede Sprache hat ihre eigenen Dokumente in `_content/<Sprache>/book/` und im Verzeichnis jedes weiteren Buchs. Wie überall teilen [Übersetzungen](/de/book/verfassen/uebersetzungen/) ihren `translationKey`, während sich die Namen ihrer Dateien und Verzeichnisse unterscheiden dürfen: Dieses Dokument ist auf Englisch `/en/book/authoring/books/docs/`.
