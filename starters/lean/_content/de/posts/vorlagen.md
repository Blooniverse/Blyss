---
title: Vorlagen und Stile
slug: vorlagen
description: Wo die Vorlagen, das Stylesheet und die Komponenten dieser Website liegen.
datePublished: 2026-11-12
translationKey: templates
tags: [Blyss]
---

Das HTML rund um den Inhalt stammt aus den Vorlagen in `templates/`: `document.html` enthält den Rahmen jeder Seite mit der Navigation und der Fußzeile, `hero.html` und `overlay.html` enthalten den Hero der Startseiten und das Overlay, während `home.html`, `page.html` und `post.html` den Inhalt der Startseiten, der übrigen Seiten und der Beiträge anordnen.

Das Aussehen stammt aus einem einzigen Stylesheet, `static/assets/css/main.css`. Die Startseiten enden mit dem Hero; auf den anderen Seiten wartet das Overlay als Leiste am unteren Fensterrand.

Der Schieberegler, die Galerie und die Blume sind Komponenten. Jede hat ihre Vorlage, ihr Stylesheet und ihr Skript in einem eigenen Verzeichnis in `components/` sowie eine Variante für den Hero und eine für das Overlay, etwa `componentSliderHero` und `componentSliderOverlay`. Jede Variante hat ihre Texte in `content/de/components/` und ihre Einstellungen in `blyss.config.js`, wo sie sich auch in ihrem Bereich ein- oder ausschalten lässt. Ein Absatz, der nichts als den Namen einer Komponente oder einer Variante in doppelten geschweiften Klammern enthält, zeigt sie in einer Seite oder einem Beitrag, wie hier den Schieberegler des Heros:

{{componentSliderHero}}

Ein mit drei Backticks eingefasster Codeblock, dessen Sprache ein solcher Name in doppelten geschweiften Klammern ist, zeigt die Komponente mit eigenem Text und eigenen Einstellungen. Der folgende Block legt in seinem Front Matter den Titel, den Bereich und die Schritte dieses Schiebereglers fest und darunter seinen Text:

```{{componentSlider}}
---
title: Ein eigener Schieberegler
start: 0
end: 10
steps: []
---

Er reicht von 0 bis 10 und hat keine Schritte.
```
