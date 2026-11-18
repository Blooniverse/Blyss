---
title: Installation und Einstieg
description: Eine Website sicher anlegen, erstellen und lokal ansehen.
order: 1
translationKey: book-installation
---

## Voraussetzungen und Installation

Blyss benötigt Node.js 24 oder neuer und npm. Legen Sie mit dem veröffentlichten Paket eine Website an:

```bash
npx @blooniverse/blyss init meine-website
cd meine-website
npm install
npm run build
npm start
```

Öffnen Sie `http://localhost:3000/`. Der Server beantwortet `GET`- und `HEAD`-Anfragen: Er leitet `/` mit HTTP 302 zur eingestellten Standardsprache weiter und ein Verzeichnis ohne abschließenden Schrägstrich, etwa `/de`, zu `/de/`. `PORT` bestimmt den Port, sonst gilt `server.fallbackPort` aus `blyss.config.js`.

## Befehle

```bash
npx @blooniverse/blyss init [verzeichnis]  # den Starter kopieren
npm run build                              # blyss build: directories.public erzeugen
npm run build:drafts                       # blyss build --drafts: mit den Entwürfen erzeugen
npm start                                  # blyss serve: auf PORT oder server.fallbackPort ausliefern
```

Führen Sie `npm run build`, `npm run build:drafts` und `npm start` im Wurzelverzeichnis der Website aus, in dem `blyss.config.js` liegt: Sie rufen `blyss build` und `blyss serve` des Blyss auf, das `npm install` in die Website gelegt hat. Schreiben Sie für `init` den vollen Namen `npx @blooniverse/blyss`: Außerhalb einer solchen Website lädt `npx blyss` ein fremdes npm-Paket namens `blyss`.

`blyss build --drafts` erstellt auch die [Entwürfe](/de/book/schreiben/seiten-und-beitraege/#entwürfe), die jeder andere Build auslässt. `blyss --help` listet die Befehle auf, und `blyss --version` zeigt die Version von Blyss. `build` nimmt nur `--drafts` entgegen, `init` nur sein Verzeichnis und `serve` kein Argument: Jedes andere Argument beendet den Befehl mit einer Meldung.

Ohne Verzeichnis verwendet `init` das aktuelle Verzeichnis. Ein fehlendes Verzeichnis wird angelegt, ein vorhandenes muss leer sein; ein Verzeichnis, das nur `.git` enthält, gilt als leer, sodass `git init` vorausgehen darf. `init` überschreibt nie vorhandene Dateien und bietet kein `--force`; bei einem Kopierfehler entfernt es nur selbst angelegte Dateien und Verzeichnisse. Es installiert keine Pakete, initialisiert kein Git, erstellt oder startet die Website nicht und verwendet selbst kein Netzwerk. `npx` und `npm install` können hingegen Pakete herunterladen.

Die erzeugte `package.json` trägt den Namen des Verzeichnisses, hängt von der ausgeführten Blyss-Version ab und bietet `npm run build`, `npm run build:drafts` und `npm start`. Ohne `blyss.config.js` brechen `build` und `serve` ab und empfehlen `init`. `serve` erstellt die Website nicht: Fehlt `public/`, meldet der Server das und beantwortet jede Anfrage mit „404 Not Found“.

## Aufbau

| Pfad | Zweck |
| --- | --- |
| `_content/<Sprache>/` | Markdown für `pages/`, `posts/`, `book/`, Komponententexte und Fragmente |
| `components/` | Komponenten mit Vorlagen und gegebenenfalls Skripten und Stylesheets |
| `templates/` | HTML-Vorlagen der Website |
| `static/` | Unverändert kopierte Dateien, etwa Bilder, CSS und `robots.txt` |
| `blyss.config.js` | Einstellungen der Website |
| `public/` | Generierte Ausgabe, nicht von Hand bearbeiten |

Der mit Blyss gelieferte Starter `starters/lean/` bleibt unverändert; die erzeugte Website ist Ihre eigene Kopie. Jeder Build löscht und erzeugt das konfigurierte Ausgabeverzeichnis neu. Bearbeiten Sie stattdessen die Quelldateien. Weiter geht es mit der [Konfiguration](/de/book/konfiguration/).
