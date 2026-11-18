---
title: Installation und Einstieg
description: Eine Website sicher anlegen, erstellen und lokal ansehen.
order: 3
translationKey: book-installation
---

## Voraussetzungen und Installation

Blyss benötigt Node.js 25 oder neuer und npm. Legen Sie mit dem veröffentlichten Paket eine Website an:

```bash
npx @blooniverse/blyss init meine-website
cd meine-website
npm install
npm run build
npm start
```

Öffnen Sie `http://localhost:3000/`. Der Server leitet `/` mit HTTP 302 zur eingestellten Standardsprache weiter. `PORT` bestimmt den Port, sonst gilt `server.fallbackPort` aus `blyss.config.js`.

## Befehle

Führen Sie Befehle im Wurzelverzeichnis der Website mit `blyss.config.js` aus:

```bash
npx blyss init [verzeichnis]
npx blyss build
npx blyss serve
```

Ohne Verzeichnis verwendet `init` das aktuelle Verzeichnis. Ein fehlendes Verzeichnis wird angelegt, ein vorhandenes muss leer sein. `init` überschreibt nie vorhandene Dateien und bietet kein `--force`; bei einem Kopierfehler entfernt es nur selbst angelegte Dateien und Verzeichnisse. Es installiert keine Pakete, initialisiert kein Git, erstellt oder startet die Website nicht und verwendet selbst kein Netzwerk. `npx` und `npm install` können hingegen Pakete herunterladen.

Die erzeugte `package.json` trägt den Namen des Verzeichnisses, hängt von der ausgeführten Blyss-Version ab und bietet `npm run build` und `npm start`. Ohne `blyss.config.js` brechen `build` und `serve` ab und empfehlen `init`.

## Aufbau

| Pfad | Zweck |
| --- | --- |
| `_content/<Sprache>/` | Markdown für `pages/`, `posts/`, `book/`, Komponententexte und Fragmente |
| `components/` | Komponenten mit Vorlagen und gegebenenfalls Skripten und Stylesheets |
| `templates/` | HTML-Vorlagen der Website |
| `static/` | Unverändert kopierte Dateien, etwa Bilder, CSS und `robots.txt` |
| `blyss.config.js` | Einstellungen der Website |
| `public/` | Generierte Ausgabe, nicht von Hand bearbeiten |

Der mit Blyss gelieferte Starter `starters/lean/` bleibt unverändert; die erzeugte Website ist Ihre eigene Kopie. Jeder Build löscht und erzeugt das konfigurierte Ausgabeverzeichnis neu. Bearbeiten Sie stattdessen die Quelldateien. Weiter geht es mit [Konfiguration](/de/book/konfiguration/) und [Inhalten](/de/book/schreiben/inhalte/).
