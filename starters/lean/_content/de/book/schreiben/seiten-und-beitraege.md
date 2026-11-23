---
title: Seiten und Beiträge
description: Seiten und Beiträge schreiben, mit ihrem Front Matter, ihren URLs, ihren Schlagwörtern und ihren Listen.
order: 2
translationKey: book-pages-and-posts
---

## Front Matter und URLs

Eine Markdown-Datei beginnt mit Front Matter; der Text darunter beginnt unterhalb des Titels, nicht mit einer zweiten H1:

```markdown
---
title: Hallo Welt
description: Der erste Beitrag dieser Website.
datePublished: 2026-11-10
dateModified: 2026-11-12
translationKey: 261110-init-hello-world
tags: [Blyss, Markdown]
---

Ein erster Absatz.
```

Für das Front Matter gilt:

- Jedes Feld steht als `key: value` in einer eigenen Zeile, und sein Wert in dieser Zeile: Ein Text über mehrere Zeilen, den YAML mit `>` oder `|` beginnt, stoppt den Build.
- Ein Feld ohne Wert enthält, was die Zeilen darunter enthalten: eine Liste, deren Einträge mit `- ` beginnen, oder eine Gruppe von Feldern, tiefer eingerückt als das Feld. Die [Einstellungen einer Komponente](/de/book/komponenten/#blöcke-pro-verwendung) nutzen dies, und `tags` kann eine solche Liste sein.
- Eine Zeile, die weder ein Feld noch ein Listeneintrag ist, stoppt den Build, ebenso ein Feld, das zweimal vorkommt; eine Zeile, die mit `#` beginnt, ist ein Kommentar.
- Ein Wert darf in Anführungszeichen stehen, etwa `title: "Blyss: eine Einführung"`. In einer Liste verhindern sie, dass ein Text mit Doppelpunkt als Feld gelesen wird: `- "Blyss: eine Einführung"`.
- `datePublished` und `dateModified` sind Daten wie `2026-11-10`, auch mit Uhrzeit wie `2026-11-10T09:30:00+01:00`; jeder andere Wert stoppt den Build.
- `translationKey` verknüpft eine Seite mit ihren [Übersetzungen](/de/book/schreiben/uebersetzungen/) in den anderen Sprachen.

Blyss veröffentlicht Inhalte nach ihrem Verzeichnis:

- Seiten in `_content/de/pages/` erscheinen unter `/de/pages/<slug>/`.
- Beiträge in `_content/de/posts/` erscheinen unter `/de/posts/<slug>/`.
- [Dokumente](/de/book/schreiben/buch/dokumente/) in `_content/de/book/` erscheinen unter `/de/book/`.
- `pages/index.md` wird zur Startseite `/de/`.
- `pages/404.md` ist eine besondere [Fehlerseite](#fehlerseite).

Der Slug ist der Name der Datei ohne `.md`: `posts/261110-init-hallo-welt.md` erscheint unter `/de/posts/261110-init-hallo-welt/`; benennen Sie die Dateien jeder Sprache deshalb in dieser Sprache. Das Front Matter braucht einen `slug` nur für einen anderen, etwa `slug: mein-erster-beitrag`. Ein Slug ist ein einzelner Teil der URL, ohne `/`, `\`, `?` oder `#`.

Bilder und andere Dateien einer Seite liegen in `static/`, etwa in `static/assets/img/`, und eine Seite verlinkt sie von der Wurzel der Website aus, etwa mit `![Der Hafen](/assets/img/hafen.jpg)`; eine [Abbildung](/de/book/schreiben/markdown-wuerze/#bilder-und-abbildungen) gibt einem Bild eine Bildunterschrift, eine Breite und eine Ausrichtung. Blyss veröffentlicht nur die Markdown-Dateien aus `_content/`, nicht die anderen Dateien daneben.

## Entwürfe

`draft: true` im Front Matter macht eine Seite, einen Beitrag oder ein Dokument zu einem Entwurf:

```markdown
---
title: Noch nicht
draft: true
---
```

Der Build lässt einen Entwurf aus, als gäbe es seine Datei nicht. Ein Entwurf:

- hat keine eigene Seite;
- erscheint in keiner Liste von Beiträgen, auf keiner Schlagwortseite und in keiner Navigation;
- steht nicht unter den Übersetzungen einer anderen Seite;
- steht nicht in `sitemap.xml`.

Einen Entwurf, den Blyss auslässt, prüft es auch nicht: Ein Fehler in seinem Front Matter, etwa ein Datum, das noch keines ist, zeigt sich erst, wenn der Entwurf erstellt wird.

`npm run build:drafts` erstellt die Website mit ihren Entwürfen, zum Ansehen mit `npm start`. Der Build kennzeichnet jeden Entwurf, den er erstellt, und nennt jeden, den er auslässt. Führen Sie vor dem Veröffentlichen von `public/` wieder `npm run build` aus.

Um einen Entwurf zu veröffentlichen, entfernen Sie das Feld oder setzen es auf `false`. Jeder andere Wert stoppt den Build, damit keine Seite erscheint, die ihre Autorin oder ihr Autor für einen Entwurf hält. Nur Seiten, Beiträge und Dokumente können Entwürfe sein, nicht Fragmente oder die Texte der Komponenten.

## Beiträge und Listen

Beiträge können Tags als `tags: [Blyss, Markdown]`, `tags: Blyss, Markdown` oder YAML-Liste erhalten. Blyss listet die Beiträge von selbst auf:

- Es erzeugt pro Sprache das Archiv `/de/posts/`, den Index `/de/tags/` und Seiten wie `/de/tags/markdown/`. Belegen Sie diese URLs nicht mit eigenen Inhalten: Kollisionen mit anderen Dateien oder generierten Seiten stoppen den Build.
- Tags erhalten ASCII-Slugs: `Über Blyss` wird `/de/tags/uber-blyss/`.
- Gleiche Slugs verbinden Tagseiten über Sprachen hinweg; angezeigt wird die Schreibweise des neuesten Beitrags.
- Archiv und Tagseiten sind nach Datum absteigend sortiert und zeigen `pagination.pageSize` Beiträge pro Seite; weitere Seiten liegen etwa unter `/de/posts/page/2/` und `/de/tags/markdown/page/2/`, mit Links zu neueren und älteren Beiträgen.

Ein Absatz, der nur aus `{{recentPosts}}` besteht, zeigt die drei neuesten Beiträge seiner Sprache, geordnet nach `datePublished`. In Code und im Fließtext bleibt der Platzhalter so stehen, wie er geschrieben ist. Dokumente gehören weder dazu noch ins Archiv oder zu Tags.

## Fragmente und Komponenten

Markdown-Dateien direkt in `_content/<Sprache>/`, etwa `heroCards.md`, sind Fragmente ohne eigene Seite:

- `templates/document.html` kann deren Titel und Text mit `{{heroCardsTitle}}` und `{{heroCardsContent}}` einfügen.
- Der Dateiname muss mit einem lateinischen Buchstaben beginnen und darf nur lateinische Buchstaben und Ziffern enthalten.
- Fehlt die Datei in einer Sprache, sind ihre Platzhalter dort leer.
- Die Fragmente `heroCards.md` und `overlayCards.md` enthalten zugleich die Karten von [Hero und Overlay](/de/book/vorlagen/#hero-und-overlay). `hero.md` und `overlay.md` daneben sind keine Fragmente: Sie zeigen die [Komponenten](/de/book/komponenten/#komponenten-in-hero-und-overlay) dieser Bereiche.

Ein Absatz, der nur aus dem Namen einer Komponente in doppelten geschweiften Klammern besteht, zeigt sie an; ein [Block](/de/book/komponenten/#blöcke-pro-verwendung) gibt einer einzelnen Verwendung eigene Texte und Einstellungen. Formeln, Fußnoten, hervorgehobenen Code, Aufgabenlisten, Hinweisboxen, Abbildungen und Diagramme zeigt [Markdown-Würze](/de/book/schreiben/markdown-wuerze/).

## Fehlerseite

`_content/de/pages/404.md` ist die Fehlerseite ihrer Sprache:

- Sie wird unabhängig vom Slug als `/de/404.html` veröffentlicht.
- Die Fehlerseite der Standardsprache erscheint zusätzlich als `/404.html`; der lokale Server liefert sie für unbekannte URLs mit Status 404.
- Verwenden Sie dort absolute Links wie `/de/`, da die Fehlerseite unter beliebigen URLs erscheinen kann.
- Fehlerseiten fehlen in der Sitemap, und die Startervorlage bittet Suchmaschinen, sie nicht zu indexieren.
