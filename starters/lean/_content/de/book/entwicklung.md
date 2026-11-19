---
title: Blyss entwickeln
description: Engine, Starter und Tests im Blyss-Repository bearbeiten.
order: 7
translationKey: book-development
---

## Repository

Das Blyss-Repository enthält:

- `bin/` und `src/`: die Engine.
- `starters/lean/`: den gebündelten Starter, den `blyss init` in neue Websites kopiert.
- `test/`: die Tests.

Die `blyss.config.js` im Repository rendert den Starter zur Vorschau; Inhalte, statische Dateien, Vorlagen und Komponenten gehören in `starters/lean/`, nicht in die Repository-Wurzel.

Mit Node.js 24 oder neuer:

```bash
npm install
npm run build
npm start
npm test
```

- `npm install` installiert die Engine-Abhängigkeiten und legt keine Website an.
- `npm run build` rendert den Starter in das Git-ignorierte `public/`.
- `npm start` bedient diese Ausgabe, standardmäßig auf Port 3000.
- `npm test` erstellt sie zunächst neu und führt dann die Tests aus.

`public/` ist generiert und wird nicht von Hand gepflegt.

## Markdown-Abhängigkeiten

`src/build/markdown.js` liest Markdown, `src/build/directives.js` die Direktiven von MyST. Die Engine hat drei Abhängigkeiten:

- `marked` für Markdown. Getestet ist die Engine mit `marked` 18; Versionen vor 16.3.0 fehlen Hooks, die Formeln vor Markdown-Hervorhebung schützen.
- `temml` für MathML. Temml ist auf eine exakte Version festgelegt, da der Starter das zugehörige Stylesheet und die Schrift mitliefert. Nach einer Versionsänderung kopieren Sie `Temml-Local.css` und `Temml.woff2` aus `node_modules/temml/dist/` nach `starters/lean/static/assets/temml/`; ein Test prüft deren Übereinstimmung.
- `highlight.js` für Syntaxhervorhebung.

Prüfen Sie Änderungen an der Engine zusammen mit dem Starter und beiden Sprachen. Hinweise zur Pflege einer erzeugten Website stehen unter [Installation](/de/book/installation/) und [Bereitstellung](/de/book/bereitstellung/).
