---
title: Vorlagen und Gestaltung
description: HTML-Vorlagen, Layout, Hero, Overlay und Schriften anpassen.
order: 5
translationKey: book-templates
---

## Vorlagen

Blyss liefert keine eingebauten Standardvorlagen; bearbeiten Sie die Kopien in `templates/`. Zuerst wird der Inhalt in `home.html`, `page.html`, `post.html` oder `book.html` gerendert, anschließend das Ergebnis in `document.html`. Ohne `home.html` beziehungsweise `book.html` dient `page.html` als Ersatz.

Die Inhaltsvorlagen verwenden unter anderem `{{title}}`, `{{description}}`, `{{dateBlock}}`, `{{tags}}` und `{{content}}`. `book.html` ergänzt `{{bookNavigation}}`, `{{bookToc}}` und `{{bookPager}}`: Navigation, Inhaltsverzeichnis sowie vorheriges und nächstes Dokument. Mehr dazu unter [Navigation](/de/book/schreiben/navigation/).

`document.html` enthält unter anderem `{{content}}`, `{{hero}}`, `{{overlay}}`, `{{pageTitle}}`, `{{description}}`, `{{locale}}`, `{{languageKey}}`, `{{canonicalUrl}}`, `{{alternateLinks}}`, `{{jsonLd}}` und `{{languageSwitcher}}`. Sprachlabels stehen als `{{<key>Label}}` bereit, etwa `{{postsLabel}}`; Fragmente als `{{<name>Title}}` und `{{<name>Content}}`. Komponenten lassen sich ebenfalls über ihren Namen in doppelten geschweiften Klammern einfügen. Vorlageneigene Platzhalter haben Vorrang vor gleichnamigen Komponenten oder Fragmenten.

`{{kind}}` unterscheidet `home`, `page`, `post`, `book`, `list` und `not-found`. Die Startervorlage übergibt diesen Wert und die Layout-Einstellungen über `data-*`-Attribute und CSS-Variablen an `static/assets/css/main.css`. Die Kommentare zu `layout` in `blyss.config.js` nennen die möglichen Abstände und Ausrichtungen.

## Hero und Overlay

Der Hero begleitet die Startseiten, das Overlay die in `overlay.showOn` gewählten Seitentypen. `hero.html` und `overlay.html` werden über `{{hero}}` und `{{overlay}}` in `document.html` eingefügt. Die Vorlagen der Bereiche erhalten zusätzlich `{{components}}`, `{{textsTitle}}` und `{{texts}}`. `hero.components` und `overlay.components` wählen Komponenten in ihrer Reihenfolge; `texts` schaltet die jeweiligen Texte ein oder aus. Ein nicht aufgeführter Seitentyp hat ein Overlay. Die Schalter gelten für Typen, nicht für einzelne Seiten.

Die Texte stehen in `_content/<Sprache>/heroTexts.md` und `overlayTexts.md`: `title` ist ihre Überschrift, jede `###`-Überschrift beginnt einen Text bis zur nächsten. Vor der ersten `###`-Überschrift sind nur Leerraum und HTML-Kommentare erlaubt. Ohne Vorlage oder eingeschalteten Inhalt entfällt der jeweilige Bereich. Mit `synchroniseHeroOverlay: true` übernimmt das Overlay Komponenten, Einstellungen und Texte des Heros; `overlay.showOn` und das Overlay-Layout gelten weiterhin.

Im Starter öffnet ein Knopf das Overlay als Panel; Schließen, Escape oder ein Klick außerhalb schließen es über die Popover-API. Auf großen Bildschirmen gleitet der Hero beim Scrollen über die Seite; bei Tastaturfokus, reduzierter Bewegung, kleinen Bildschirmen oder ohne passende Browserunterstützung bleibt er statisch. Die `hero`-, `overlay`- und `close`-Labels unterstützen Beschriftung und Bedienung.

## Gestaltung und Schriften

Ersetzen Sie `static/assets/img/logo.svg` und passen Sie `alt`, `width` und `height` in `templates/document.html` an. Das Suchfeld in der Starter-Kopfleiste ist noch ohne Funktion und sendet nichts. Farben für hervorgehobenen Code stehen in `static/assets/css/main.css`; erhalten Sie mindestens 4,5:1 Kontrast zum Codehintergrund.

Der Starter lädt Titillium Web von Google Fonts; dabei wird die IP-Adresse der Besuchenden an Google übermittelt. Für lokales Hosting laden Sie die Schrift von [Google Fonts](https://fonts.google.com/specimen/Titillium+Web), legen die `.woff2`-Dateien unter `static/assets/fonts/` ab, deklarieren sie per `@font-face` in `static/assets/css/main.css` und entfernen die drei Google-Fonts-`link`-Elemente aus `document.html`. Prüfen Sie die Datenschutzanforderungen Ihrer Website; das Landgericht München I entschied am 20. Januar 2022 (3 O 17493/20) zu einer Einbindung ohne Einwilligung.

Formeln benötigen keinen externen Abruf: `static/assets/temml/Temml-Local.css` und `Temml.woff2` gehören zur von Blyss verwendeten Temml-Version. Das Stylesheet bevorzugt mathematische Systemschriften; die WOFF2-Datei enthält nur bestimmte Sonderzeichen. Für ein einheitliches Erscheinungsbild gibt es weitere Temml-Stylesheets und Schriften; siehe die [Temml-Installationsanleitung](https://temml.org/docs/en/administration.html). Nach einem Blyss-Update ersetzen Sie CSS und Font aus `node_modules/temml/dist/`, falls das Changelog es verlangt.
