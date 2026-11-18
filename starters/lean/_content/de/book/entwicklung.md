---
title: Blyss entwickeln
description: Engine, Starter und Tests im Blyss-Repository bearbeiten.
order: 8
translationKey: book-development
---

## Repository

Das Blyss-Repository enthält die Engine in `bin/` und `src/`, den gebündelten Starter in `starters/lean/` und Tests in `test/`. Die `blyss.config.js` im Repository rendert den Starter zur Vorschau; Inhalte, statische Dateien, Vorlagen und Komponenten gehören in `starters/lean/`, nicht in die Repository-Wurzel. `blyss init` kopiert diesen Starter in neue Websites.

Mit Node.js 25 oder neuer:

```bash
npm install
npm run build
npm start
npm test
```

`npm install` installiert die Engine-Abhängigkeiten und legt keine Website an. Der Build rendert den Starter in das Git-ignorierte `public/`; `npm start` bedient diese Ausgabe, standardmäßig auf Port 3000. `npm test` erstellt sie zunächst neu und führt dann die Tests aus. `public/` ist generiert und wird nicht von Hand gepflegt.

## Markdown-Abhängigkeiten

`src/build/markdown.js` verwendet `marked` für Markdown, `temml` für MathML und `highlight.js` für Syntaxhervorhebung. `marked` benötigt mindestens Version 16.4.2; Versionen vor 16.3.0 fehlen Hooks, die Formeln vor Markdown-Hervorhebung schützen. Temml ist auf eine exakte Version festgelegt, da der Starter das zugehörige Stylesheet und die Schrift mitliefert. Nach einer Versionsänderung kopieren Sie `Temml-Local.css` und `Temml.woff2` aus `node_modules/temml/dist/` nach `starters/lean/static/assets/temml/`; ein Test prüft deren Übereinstimmung.

Prüfen Sie Änderungen an der Engine zusammen mit dem Starter und beiden Sprachen. Hinweise zur Pflege einer erzeugten Website stehen unter [Installation](/de/book/installation/) und [Bereitstellung](/de/book/bereitstellung/).
