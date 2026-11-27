---
title: Vorlagen und Gestaltung
description: HTML-Vorlagen, Layout, Hero, Overlay und Schriften anpassen.
order: 3
translationKey: book-templates
---

## Vorlagen

Blyss liefert keine eingebauten Standardvorlagen; bearbeiten Sie die Kopien in `templates/`. Zuerst wird der Inhalt einer Seite in einer Inhaltsvorlage gerendert, anschließend das Ergebnis in `document.html`. Der Starter enthält:

- `document.html`: das Dokument um jede Seite.
- `home.html`: die Inhaltsvorlage der Startseiten.
- `page.html`: die der Seiten und jedes anderen Seitentyps ohne eigene Vorlage.
- `post.html`: die der Beiträge.
- `book.html`: die der Dokumente.
- `hero.html` und `overlay.html`: die Vorlagen der beiden Bereiche.

Ohne `home.html` beziehungsweise `book.html` dient `page.html` als Ersatz; ohne die Vorlage eines Bereichs entfällt dieser.

Die Inhaltsvorlagen kennen diese Platzhalter:

- `{{title}}` und `{{description}}`: Titel und Beschreibung der Seite.
- `{{dateBlock}}`: ihr `datePublished`, falls vorhanden.
- `{{tags}}`: die Schlagwörter eines Beitrags.
- `{{content}}`: ihr Text.
- `{{basePath}}`: der Pfad einer Website [unterhalb eines Pfads](/de/book/bereitstellung/#unterhalb-eines-pfads), sonst leer.
- Die Platzhalter der [Komponenten](/de/book/komponenten/).
- In `book.html` zusätzlich `{{bookNavigation}}`, `{{bookToc}}` und `{{bookPager}}`: Navigation, Inhaltsverzeichnis sowie vorheriges und nächstes Dokument. Außerhalb von Dokumenten sind sie leer. Mehr dazu unter [Navigation](/de/book/verfassen/buecher/navigation/).
- `{{bookMarkdownBase64}}`: der geschriebene Text eines Dokuments, mit dessen `title`, falls vorhanden, als vorangestellter Markdown-Überschrift, als UTF-8-Base64 kodiert; das Front Matter wird ausgelassen, und außerhalb von Dokumenten ist der Platzhalter leer. Der Starter verwendet ihn für den Button zum Kopieren, dessen Beschriftungen in `book.html` als `{{copyMarkdownLabel}}`, `{{markdownCopiedLabel}}`, `{{markdownCopyFailedLabel}}` und `{{markdownCopyUnavailableLabel}}` verfügbar sind.

`document.html` kennt diese Platzhalter:

- `{{content}}`: die ausgefüllte Inhaltsvorlage.
- `{{hero}}` und `{{overlay}}`: die beiden Bereiche.
- `{{pageTitle}}` und `{{description}}`: der Titel der Seite, gefolgt vom Namen der Website, und ihre Beschreibung.
- `{{robots}}`: bittet Suchmaschinen, eine Fehlerseite nicht zu indexieren, und ist auf allen anderen Seiten leer.
- `{{locale}}` und `{{languageKey}}`: Locale und Schlüssel der Sprache der Seite.
- `{{canonicalUrl}}`, `{{alternateLinks}}` und `{{jsonLd}}`: die kanonische URL der Seite, die Links zu ihren Übersetzungen und ihr JSON-LD.
- `{{languageSwitcher}}`: der Sprachwechsler, sofern `site.languageSwitcher` ihn nicht ausblendet.
- `{{mainNavigation}}`: die Links der Kopfleiste, die `mainNavigation` in `blyss.config.js` aufzählt; siehe [Hauptnavigation](/de/book/konfiguration/#hauptnavigation).
- `{{kind}}`: `home`, `page`, `post`, `book`, `list` oder `not-found`.
- `{{basePath}}`: wie in den Inhaltsvorlagen.
- Die Layout-Platzhalter unten.
- Die Sprachlabels als `{{<key>Label}}`, etwa `{{postsLabel}}`, Fragmente als `{{<name>Title}}` und `{{<name>Content}}` sowie die Platzhalter der Komponenten, also ihre Namen in doppelten geschweiften Klammern.

Vorlageneigene Platzhalter haben Vorrang vor gleichnamigen Komponenten oder Fragmenten.

Die Layout-Platzhalter enthalten die `layout`-Einstellungen aus `blyss.config.js`, deren Kommentare die möglichen Abstände und Ausrichtungen nennen:

- `{{layoutMargin}}`, `{{layoutPaddingHero}}` und `{{layoutPaddingOverlay}}`: `margin`, `paddingHero` und `paddingOverlay`.
- `{{layoutAlign}}`: `alignHome` auf den Startseiten und `alignOther` auf allen anderen Seiten.
- `{{layoutAlignHero}}` und `{{layoutAlignOverlay}}`: `alignHero` und `alignOverlay`.

Die Startervorlage übergibt sie, wie `{{kind}}`, über `data-*`-Attribute und CSS-Variablen an `static/assets/css/main.css`.

Ein Platzhalter, den seine Vorlage nicht füllen kann, etwa ein falsch geschriebener, stoppt den Build mit einer Meldung, die die Vorlage nennt. Ein Fragment, das nur manche Sprachen haben, ist in den anderen leer.

## Hero und Overlay

`{{hero}}` und `{{overlay}}` fügen `hero.html` und `overlay.html`, die Vorlagen der beiden Bereiche, in `document.html` ein:

- Der Hero begleitet die Startseiten.
- Das Overlay begleitet die in `overlay.showOn` gewählten Seitentypen. Im Starter öffnet ein Knopf das Overlay als Panel; Schließen, Escape oder ein Klick außerhalb schließen es über die Popover-API.

Ihren Inhalt bestimmen zwei Dateien je Sprache und die Schalter in `blyss.config.js`:

- `_content/<Sprache>/hero.md` und `overlay.md` zeigen die [Komponenten eines Bereichs](/de/book/komponenten/#komponenten-in-hero-und-overlay) in ihrer Reihenfolge, über oder unter seinen Karten.
- `hero.cards` und `overlay.cards` schalten die jeweiligen Karten ein oder aus.
- `overlay.showOn` gilt für Seitentypen, nicht für einzelne Seiten; ein nicht aufgeführter Seitentyp hat ein Overlay.
- Mit `synchroniseHeroOverlay: true` übernimmt das Overlay Komponenten, Einstellungen und Karten des Heros; `overlay.showOn` und das Overlay-Layout gelten weiterhin.
- Ohne Vorlage oder ohne Komponenten und Karten entfällt der jeweilige Bereich.

Die Vorlagen der Bereiche kennen diese Platzhalter:

- `{{components}}`: die Komponenten über den Karten des Bereichs.
- `{{componentsBelow}}`: die Komponenten darunter; fehlt einer Vorlage der Platzhalter einer Stelle, die eine Datei verwendet, stoppt der Build.
- `{{cardsTitle}}` und `{{cards}}`: Überschrift und Karten des Bereichs.
- Die Platzhalter von `document.html` außer `{{hero}}` und `{{overlay}}`.

Die Karten der Bereiche sind die Texte aus `_content/<Sprache>/heroCards.md` und `overlayCards.md`:

- `title` ist ihre Überschrift.
- Jede `####`-Überschrift beginnt eine Karte bis zur nächsten `####`-Überschrift. Bestehende Websites müssen dafür `###` in `####` ändern.
- Vor der ersten `####`-Überschrift sind nur Leerraum und HTML-Kommentare erlaubt.
- Der Text einer Komponente gehört nicht hierher, sondern in ihren [Block](/de/book/komponenten/#komponenten-in-hero-und-overlay) in `hero.md` oder `overlay.md`.

Frühere Websites nannten die Karten Texte. Der Build stoppt bei jedem der alten Namen und nennt den neuen: `heroTexts.md` und `overlayTexts.md`, `hero.texts` und `overlay.texts` sowie `{{textsTitle}}` und `{{texts}}` in den Vorlagen der Bereiche.

Die Titel der Bereiche sind H3-Überschriften, die Überschriften ihrer Karten H4.

Auf großen Bildschirmen gleitet der Hero beim Scrollen über die Seite. Er bleibt statisch:

- bei Tastaturfokus;
- bei reduzierter Bewegung;
- auf kleinen Bildschirmen;
- ohne passende Browserunterstützung.

Die `hero`-, `overlay`- und `close`-Labels unterstützen Beschriftung und Bedienung.

## Gestaltung und Schriften

Die Kopfleiste und die Farben des Starters passen Sie so an:

- Logo: Ersetzen Sie `static/assets/img/logo.svg` und passen Sie `alt`, `width` und `height` in `templates/document.html` an.
- Navigation: Ihre Links zählt `mainNavigation` in `blyss.config.js` auf.
- Suchfeld: Es ist in der Starter-Kopfleiste noch ohne Funktion und sendet nichts.
- Farben für hervorgehobenen Code: Sie stehen in `static/assets/css/main.css`; erhalten Sie mindestens 4,5:1 Kontrast zum Codehintergrund.

Der Starter lädt Titillium Web von Google Fonts; dabei wird die IP-Adresse der Besuchenden an Google übermittelt. Für lokales Hosting:

1. Laden Sie die Schrift von [Google Fonts](https://fonts.google.com/specimen/Titillium+Web).
2. Legen Sie die `.woff2`-Dateien unter `static/assets/fonts/` ab.
3. Deklarieren Sie sie per `@font-face` in `static/assets/css/main.css`.
4. Entfernen Sie die drei Google-Fonts-`link`-Elemente aus `document.html`.

Prüfen Sie die Datenschutzanforderungen Ihrer Website; das Landgericht München I entschied am 20. Januar 2022 (3 O 17493/20) zu einer Einbindung ohne Einwilligung.

Formeln benötigen keinen externen Abruf: `static/assets/temml/Temml-Local.css` und `Temml.woff2` gehören zur von Blyss verwendeten Temml-Version.

- Das Stylesheet bevorzugt mathematische Systemschriften; die WOFF2-Datei enthält nur bestimmte Sonderzeichen.
- Für ein einheitliches Erscheinungsbild gibt es weitere Temml-Stylesheets und Schriften; siehe die [Temml-Installationsanleitung](https://temml.org/docs/en/administration.html).
- Nach einem Blyss-Update ersetzen Sie CSS und Font aus `node_modules/temml/dist/`, falls das Changelog es verlangt.
