---
title: Vorlagen und Stile
slug: vorlagen
description: Wo die Vorlagen, das Stylesheet und die Komponenten dieser Website liegen.
datePublished: 2026-11-12
translationKey: templates
tags: [Blyss]
---

Das HTML rund um den Inhalt stammt aus den Vorlagen in `templates/`: `document.html` enthält den Rahmen jeder Seite mit der Navigation, dem Overlay und der Fußzeile, während `home.html`, `page.html` und `post.html` den Inhalt der Startseiten, der übrigen Seiten und der Beiträge anordnen.

Das Aussehen stammt aus einem einzigen Stylesheet, `static/assets/css/main.css`. Auf der Startseite ist das Overlay geöffnet und dient als Hero; auf allen anderen Seiten wartet es als Leiste am unteren Fensterrand.

Der Schieberegler und die Galerie im Overlay sind Komponenten. Jede hat ihre Vorlage, ihr Stylesheet und ihr Skript in einem eigenen Verzeichnis in `components/`, ihre Texte in `content/de/components/` und ihre Einstellungen in `blyss.config.js`. Ein Absatz, der nichts als den Namen einer Komponente in doppelten geschweiften Klammern enthält, zeigt sie in einer Seite oder einem Beitrag, wie hier den Schieberegler:

{{heroComponentSlider}}
