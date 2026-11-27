---
title: Installation und Einstieg
description: Eine Website sicher anlegen, erstellen und lokal ansehen.
order: 5
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

Öffnen Sie `http://localhost:3000/`. Der Server beantwortet `GET`- und `HEAD`-Anfragen:

- Er leitet `/` mit HTTP 302 zur eingestellten Standardsprache weiter.
- Er leitet ein Verzeichnis ohne abschließenden Schrägstrich, etwa `/de`, zu `/de/` weiter.

Der Server lauscht auf `127.0.0.1`, sodass nur dieser Computer ihn erreicht. Er nimmt jeweils die erste gesetzte Angabe:

| | Adresse | Port |
| --- | --- | --- |
| Befehlszeile | `--hostbind <adresse>` | `--port <zahl>` |
| Umgebungsvariable | `BLYSS_HOSTBIND` | `PORT` |
| `blyss.config.js` | `server.hostBind` | `server.fallbackPort` |
| Standard | `127.0.0.1` | `3000` |

Eine leere Umgebungsvariable gilt als nicht gesetzt. `0.0.0.0` lauscht in allen Netzen, sodass auch andere Geräte den Server erreichen.

In einem Container, etwa von Docker oder Podman, ist `127.0.0.1` der Container selbst: Anfragen des Hosts bleiben dann ohne Antwort („Empty reply from server“). Setzen Sie im Container `BLYSS_HOSTBIND=0.0.0.0` und überlassen Sie es der Portzuordnung, wer sich verbindet; `127.0.0.1:3000:3000` in `compose.yaml` lässt nur den Host zu:

```yaml
services:
  dev:
    environment:
      - BLYSS_HOSTBIND=0.0.0.0
    ports:
      - "127.0.0.1:3000:3000"
```

## Befehle

```bash
npx @blooniverse/blyss init [verzeichnis]  # den Starter kopieren
npm run build                              # blyss build: directories.public erzeugen
npm run build:drafts                       # blyss build --drafts: mit den Entwürfen erzeugen
npm start                                  # blyss serve: auf 127.0.0.1, Port 3000 ausliefern
npm run dev                                # blyss serve --watch --drafts: bei jeder Änderung neu erstellen und laden
npm run check                              # blyss check: alles prüfen, ohne zu schreiben
npx blyss new post --lang de "Ein Titel"   # einen Entwurf anlegen: Seite, Beitrag oder Dokument
```

Führen Sie diese Befehle im Wurzelverzeichnis der Website aus, in dem `blyss.config.js` liegt: Sie rufen das Blyss auf, das `npm install` in die Website gelegt hat. Schreiben Sie für `init` den vollen Namen `npx @blooniverse/blyss`: Außerhalb einer solchen Website lädt `npx blyss` ein fremdes npm-Paket namens `blyss`.

Die Befehle nehmen diese Argumente entgegen:

- `blyss new <page|post|doc> "<titel>"` legt einen [Entwurf](/de/book/verfassen/seiten-und-beitraege/#entwürfe) in der Standardsprache an, mit einem Front Matter, den der Build annimmt, und ersetzt nie eine Datei. `--lang <schlüssel>` wählt eine andere Sprache, `--slug <slug>` einen anderen Dateinamen, und `--key <translationKey>` macht ihn zur Übersetzung einer Seite in einer anderen Sprache; ohne diese Option weist er einen translationKey zurück, den schon eine andere Datei trägt. `--book <name>` legt ein Dokument in einem der anderen [Bücher](/de/book/verfassen/buch/#mehrere-bücher) an; ohne diese Option kommt es ins erste. Beiträge tragen ihr Datum im Namen, etwa `261126-ein-titel.md`.
- `blyss check` erstellt alles samt Entwürfen, ohne zu schreiben: Es meldet jede fehlerhafte Datei auf einmal, dann die Seiten ohne `translationKey` oder ohne Übersetzung. `--json` gibt den Bericht für ein Skript oder einen KI-Agenten aus. Es endet mit dem Exit-Code 1, wenn ein Build scheitern würde.
- `blyss build --drafts` erstellt auch die [Entwürfe](/de/book/verfassen/seiten-und-beitraege/#entwürfe), die jeder andere Build auslässt.
- `blyss --help` listet die Befehle auf, und `blyss --version` zeigt die Version von Blyss.
- `blyss serve --hostbind <adresse> --port <zahl>` liefert auf einer anderen Adresse oder einem anderen Port aus.
- `blyss serve --watch` erstellt die Website und danach bei jeder Änderung der Inhalte, Templates, Komponenten, statischen Dateien, von `blyss.config.js` oder eines Moduls, das sie oder die Datendatei einer Komponente importiert, neu und lädt die geöffneten Seiten neu. Ein gescheiterter Build zeigt seine Meldung auf der Seite. `--drafts` erstellt auch die Entwürfe. Eine geänderte Konfiguration gilt ab dem nächsten gelungenen Build, auch für die Verzeichnisse, die der Server überwacht und ausliefert; nur Adresse und Port verlangen einen Neustart des Servers.
- Jedes andere Argument beendet einen Befehl mit einer Meldung.

`init` legt eine Website so an:

- Ohne Verzeichnis verwendet es das aktuelle Verzeichnis.
- Ein fehlendes Verzeichnis wird angelegt, ein vorhandenes muss leer sein; ein Verzeichnis, das nur `.git` enthält, gilt als leer, sodass `git init` vorausgehen darf.
- Es überschreibt nie vorhandene Dateien und bietet kein `--force`; bei einem Kopierfehler entfernt es nur selbst angelegte Dateien und Verzeichnisse.
- Es installiert keine Pakete, initialisiert kein Git, erstellt oder startet die Website nicht und verwendet selbst kein Netzwerk. `npx` und `npm install` können hingegen Pakete herunterladen.
- Die erzeugte `package.json` trägt den Namen des Verzeichnisses, hängt von der ausgeführten Blyss-Version ab und bietet `npm run build`, `npm run build:drafts`, `npm run check`, `npm run dev` und `npm start`.

Ohne `blyss.config.js` brechen `build` und `serve` ab und empfehlen `init`. `serve` erstellt die Website nicht: Fehlt `public/`, meldet der Server das und beantwortet jede Anfrage mit „404 Not Found“.

## Aufbau

| Pfad | Zweck |
| --- | --- |
| `_content/<Sprache>/` | Markdown für `pages/`, `posts/`, `book/`, Komponententexte und Fragmente |
| `components/` | Komponenten mit Vorlagen und gegebenenfalls Skripten und Stylesheets |
| `templates/` | HTML-Vorlagen der Website |
| `static/` | Unverändert kopierte Dateien, etwa Bilder, CSS und `robots.txt` |
| `blyss.config.js` | Einstellungen der Website |
| `public/` | Generierte Ausgabe, nicht von Hand bearbeiten |

Blyss übergeht die Dateien, die Betriebssysteme selbst in die angezeigten Ordner schreiben: `.DS_Store` und `._<Name>` von macOS, `Thumbs.db` und `desktop.ini` von Windows. Es veröffentlicht sie nicht und erstellt die Website ihretwegen nicht neu.

Der mit Blyss gelieferte Starter `starters/lean/` bleibt unverändert; die erzeugte Website ist Ihre eigene Kopie. Jeder Build löscht und erzeugt das konfigurierte Ausgabeverzeichnis neu. Bearbeiten Sie stattdessen die Quelldateien. Weiter geht es mit der [Konfiguration](/de/book/konfiguration/).
