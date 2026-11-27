---
title: Bücher
description: Die Dokumente der Bücher einer Website und ihre Gliederung.
order: 2
translationKey: book-authoring-books
---

Ein Buch ist die Dokumentation einer Website, wie diese hier. Seine Dokumente sind die Markdown-Dateien in `_content/<Sprache>/book/`, veröffentlicht unterhalb von `/<Sprache>/book/`. Anders als Seiten und Beiträge sind Dokumente in Abschnitte gegliedert, und Blyss verknüpft sie: durch eine Navigation, durch ein Inhaltsverzeichnis in jedem Dokument und durch Links zum vorherigen und zum nächsten Dokument. Eine Website kann [mehrere Bücher](#mehrere-bücher) haben.

- [Dokumente](/de/book/verfassen/buecher/dokumente/): ein Dokument oder einen Abschnitt hinzufügen und unter den anderen einordnen.
- [Navigation](/de/book/verfassen/buecher/navigation/): wie Blyss die Dokumente und ihre Überschriften verlinkt.

Dieser Abschnitt liegt in `_content/de/book/verfassen/buecher/`: ein Abschnitt innerhalb des Abschnitts [Verfassen](/de/book/verfassen/).

## Mehrere Bücher

Eine Website kann mehr als ein Buch haben, etwa ein Benutzerhandbuch neben ihrer Entwicklerdokumentation. `books` in `blyss.config.js` nennt sie; ohne diese Einstellung hat die Website das eine Buch `book`:

```js
books: ["book", "guide"],
```

Jeder Name ist ein Verzeichnis in `_content/<Sprache>/` und der Anfang der URLs des Buchs: Die Dokumente in `_content/de/guide/` erscheinen unterhalb von `/de/guide/`. Ein Name besteht aus kleinen lateinischen Buchstaben, Ziffern und Bindestrichen und ist keiner von `pages`, `posts`, `tags` und `components`.

Jedes Buch braucht eine eigene Startseite, `index.md`, und hat eine eigene Navigation und eigene Links zum vorherigen und zum nächsten Dokument, die nie in ein anderes Buch führen. Im JSON-LD sind seine Dokumente Teil seiner Startseite, und ihre Breadcrumbs beginnen dort. Ansonsten gleichen sich alle Bücher: Ihre Dokumente verwenden `templates/book.html`, folgen `overlay.showOn.book` und erscheinen im JSON-LD als TechArticle.

So fügen Sie ein Buch hinzu:

1. Ergänzen Sie seinen Namen in `books`.
2. Legen Sie seine Startseite in jeder Sprache an, etwa `_content/de/guide/index.md`, mit einem eigenen `translationKey` wie `guide`.
3. Legen Sie seine Dokumente an, etwa mit `npx blyss new doc --book guide --lang de "Ein Titel"`; ohne `--book` legt `blyss new doc` ein Dokument im ersten Buch an.
4. Ergänzen Sie den `translationKey` seiner Startseite in [`mainNavigation`](/de/book/konfiguration/#hauptnavigation), so wie der Starter `book` ergänzt. Ein Label jeder Sprache in `site.languages`, etwa `guide`, kann den Link benennen; ohne Label zeigt er den Titel der Startseite.
