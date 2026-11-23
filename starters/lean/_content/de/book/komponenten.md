---
title: Komponenten
description: Komponenten entwickeln, individuelle Blöcke verwenden sowie Diagrammbibliotheken selbst hosten.
order: 4
translationKey: book-components
---

## Aufbau und Verwendung

Eine Komponente liegt in `components/<name>/`; ihr Name beginnt mit einem lateinischen Buchstaben und enthält nur lateinische Buchstaben und Ziffern. Zu ihr gehören:

- `<name>.html`: die Vorlage, als einzige Datei benötigt.
- `<name>.data.js`: optional; sie prüft Einstellungen und bereitet Werte vor.
- Weitere Dateien wie CSS und Browser-JavaScript: Sie werden unter `/components/<name>/` veröffentlicht; die Vorlage bindet sie selbst ein.
- `_content/<Sprache>/components/<name>.md`: optional die sprachabhängigen Texte.
- `components.<name>` in `blyss.config.js`: die globalen Einstellungen.

Ein Name, der mit `.` oder `_` beginnt, bleibt außen vor: Eine solche Datei oder ein solches Verzeichnis einer Komponente wird nicht veröffentlicht, wo immer es im Verzeichnis der Komponente liegt, und ein solches Verzeichnis in `components/` ist keine Komponente. Verwenden Sie diese Namen für alles, was der Browser nicht braucht: ein Modul, das eine Datendatei importiert, etwa `_helpers.js` neben ihr oder in `components/_shared/` für mehrere Komponenten, oder Notizen wie `_README.md`.

Eine Komponente verwenden Sie so:

- Ein Absatz, der nur den Namen der Komponente in doppelten geschweiften Klammern enthält, fügt sie in eine Seite, einen Beitrag oder ein Dokument ein.
- In Vorlagen funktioniert derselbe Platzhalter; in Code bleibt er Text.
- Eine Komponente kann mehrfach vorkommen.
- Für eine einzelne Verwendung mit eigenen Texten und Einstellungen verwenden Sie einen Block.

Die Vorlage erhält diese Werte; bei gleichen Namen ersetzen spätere Werte frühere in dieser Reihenfolge:

1. `{{basePath}}`, den Pfad einer Website [unterhalb eines Pfads](/de/book/bereitstellung/#unterhalb-eines-pfads).
2. Sprachlabels als `{{<key>Label}}`.
3. Einfache Einstellungen.
4. Front-Matter-Felder wie `{{title}}` und `{{content}}` für den gerenderten Text.
5. Werte der Datendatei.
6. `{{id}}`, das zuletzt Vorrang hat und pro Seite eindeutig ist, etwa `componentFlower-1`.

Labels, Einstellungen und Front Matter werden HTML-escaped; Rückgabewerte der Datendatei werden unverändert eingesetzt und müssen bei Bedarf selbst escaped werden. Ein Platzhalter ohne Wert ist leer, etwa für ein Feld, das einem Text fehlt.

```js
export default function ({ settings, languageKey, escapeHtml, refuse }) {
  const { columns = 2 } = settings;
  if (!Number.isInteger(columns)) throw refuse("columns", columns, "a whole number");
  return { columns, language: `<p>${escapeHtml(languageKey)}</p>` };
}
```

Die Funktion wird für jede Sprache und jeden Block aufgerufen und erhält auch:

- `content`: den Text als HTML.
- `source`: den ursprünglichen Text.
- `frontMatter`: die Felder des Front Matters.
- `texts`: die durch `###` eingeleiteten Textabschnitte.
- `basePath`: den Pfad einer Website unterhalb eines Pfads, für URLs, die die Datendatei schreibt.
- `labels`: die Labels der Sprache.
- `renderDocument`: eine Funktion, die das HTML eines Markdown-Texts liefert, gelesen wie der Text einer Seite, eines Beitrags oder eines Dokuments.
- `refuse`: erzeugt eine aussagekräftige Fehlermeldung.

Ungültige Einstellungen stoppen den Build.

### Markdown im Browser

Eine Komponente, deren Skript Markdown im Browser liest, fordert den Renderer von Blyss in ihrer Datendatei an:

```js
export const renderer = true;
```

Der Build veröffentlicht dann die Module, mit denen er selbst Markdown liest, samt ihren Bibliotheken unter `/components/blyss-renderer/`. Ein Skript der Komponente importiert den Renderer von dort:

```js
const { renderDocument, withBasePath } = await import("../blyss-renderer/renderer.js");
const html = withBasePath(renderDocument(markdown, "this text", labels), basePath);
```

- `renderDocument(markdown, name, labels)` liefert dasselbe HTML wie die gleichnamige Funktion der Datendatei. `name` benennt den Text in einer Fehlermeldung, `labels` sind die einer Sprache.
- `withBasePath(html, basePath)` ergänzt URLs, die mit `/` beginnen, um den Pfad einer Website unterhalb eines Pfads.
- Ein Text, der sich nicht lesen lässt, wirft einen Fehler mit der Meldung des Builds.

Der Renderer umfasst rund 1 MB JavaScript; ein Skript sollte ihn erst laden, wenn es ihn braucht. Er wird unter der Lizenz von Blyss, der GPL-3.0, veröffentlicht, zusammen mit den Lizenzen von marked, Temml und highlight.js. Ohne eine solche Komponente veröffentlicht eine Website ihn nicht. Die Live-Demo auf den Startseiten des Starters verwendet ihn: Entfernen Sie `{{componentLiveDemo}}` aus `pages/index.md`, um auf sie zu verzichten.

## Komponenten in Hero und Overlay

`_content/<Sprache>/hero.md` und `overlay.md` zeigen die Komponenten der beiden [Bereiche](/de/book/vorlagen/#hero-und-overlay), wie eine Seite sie zeigt:

- Jede Komponente der Website kann dort stehen, auch die Diagramme und die Live-Demo.
- Ein Absatz `{{<name>}}` zeigt eine Komponente unverändert; ein [Block](#blöcke-pro-verwendung) gibt ihr eigene Einstellungen und einen eigenen Text.
- Die Komponenten erscheinen in der Reihenfolge der Datei, die nichts anderes enthält.
- `regionPosition: below` im Front Matter eines Blocks stellt ihn unter die Texte des Bereichs; die Vorgabe ist `above`.
- Eine Zeile `<!--` über einer Komponente und eine Zeile `-->` darunter blenden sie aus, was immer sie enthält: Die Pfeile eines Diagramms beenden einen solchen Kommentar nicht. Die Dateien des Starters enthalten so jede seiner Komponenten, mit den Einstellungen einer einzelnen.
- Jede Sprache hat eigene Dateien; ein Bereich kann sich also zwischen den Sprachen unterscheiden.

Zum Beispiel ein Slider unter den Texten des deutschen Overlays:

````markdown
```{{componentSlider}}
---
title: Fortschritt
regionPosition: below
start: 0
end: 10
steps:
  - value: 5
    description: Halbzeit
---

Wie weit sind Sie?
```
````

Eine Einstellung, die ein Block auslässt, stammt aus `components.componentSlider` in `blyss.config.js`; die Blöcke des Starters überlassen ihr die Bibliotheken der Diagramme. Die Beschreibung eines Schritts ist hier ein Text, weil die Datei zu einer Sprache gehört; in `blyss.config.js` ist sie ein Objekt mit einem Text für jede Sprache.

Frühere Websites schalteten die Komponenten eines Bereichs mit `hero.components` und `overlay.components` ein und aus und nannten sie `<name>Hero` und `<name>Overlay`. Der Build stoppt bei jedem dieser Namen und nennt, was stattdessen zu schreiben ist:

1. Nennen Sie jede Komponente eines Bereichs in `hero.md` oder `overlay.md`, in einem Block mit den Einstellungen und dem Text ihrer früheren Variante.
2. Benennen Sie die Einstellungen und Texte, die Seiten weiterhin zeigen, in `components.<name>` und `components/<name>.md` um, und schreiben Sie `{{<name>}}` statt `{{<name>Hero}}` und `{{<name>Overlay}}`.
3. Ergänzen Sie in eigenen Bereichsvorlagen `{{componentsBelow}}` unter `{{texts}}`.

## Blöcke pro Verwendung

Ein freistehender Codeblock mit dem Komponentenplatzhalter als Sprache erzeugt eine eigene Instanz:

````markdown
```{{componentGallery}}
---
title: Unsere Reise
heightOverall: 12rem
---

- ![Hafen im Morgenlicht](/assets/img/trip/harbour.jpg)
- ![Leuchtturm am Abend](/assets/img/trip/lighthouse.jpg)
```
````

Für einen Block gilt:

- Das optionale Front Matter ergänzt die Felder der Textdatei und ersetzt gleichnamige Felder; es überschreibt zugleich gleichnamige Einstellungen aus `blyss.config.js`.
- JSON-Werte wie `5`, `true` oder `[1, 2]` werden entsprechend gelesen, andere als Text.
- Ein Feld ohne Wert enthält die Liste oder die Gruppe von Feldern in den Zeilen darunter, wie die `steps` des Sliders oben; siehe [Front Matter](/de/book/schreiben/seiten-und-beitraege/#front-matter-und-urls).
- Der Markdown-Text ersetzt den der Textdatei; fehlt er, bleibt dieser erhalten.
- Ein leerer Block verwendet die Komponente unverändert.
- Innerhalb einer Liste, eines Zitats oder einer Direktive bleibt der Block Code.
- Für einen Block, der selbst einen Codeblock enthält, verwenden Sie außen mehr Backticks.

Doppelte geschweifte Klammern benennen eine Komponente der Website; einfache, wie in `{note}`, benennen eine [Direktive](/de/book/schreiben/markdown-wuerze/#direktiven), die Blyss selbst rendert.

## Diagramme und eigenes Hosting

Drei Starterkomponenten zeigen freistehende Codeblöcke ihrer Sprachen:

- `componentMermaid`: `mermaid`.
- `componentFlowchart`: `flowchart` oder `flow`.
- `componentVegaLite`: `vega-lite`.

Beispiele stehen unter [Markdown-Würze](/de/book/schreiben/markdown-wuerze/#diagramme). Für Diagramme gilt:

- Ein Komponentenblock kann für ein Diagramm `title` und Einstellungen im Front Matter und danach den Diagrammcode enthalten.
- Vega-Lite-Code muss gültiges JSON sein.
- Ein Komponenten-Datenskript kann solche Sprachen mit `export const languages = ["mermaid"];` anmelden; jede Sprache darf nur einer Komponente gehören.
- Für diese Komponenten sind `source` und `content` Code statt Markdown, und `texts` ist leer.

Der Browser lädt die Bibliothek erst, wenn das Diagramm nahe am Fenster ist oder sein Overlay geöffnet wird. Bis dahin, ohne JavaScript oder bei einem Fehler bleibt der Code sichtbar; die Fehlermeldung und bei Flussdiagrammen `yes` und `no` stehen in den jeweiligen Komponententexten. Die Standardbibliotheken kommen von jsDelivr und übermitteln dabei die IP-Adresse der Besuchenden. Um dies zu vermeiden, kopieren Sie die Dateien nach `static/assets/` und setzen die URLs in `blyss.config.js` auf lokale Pfade:

| Einstellung | Datei und Quelle | Beispiel-URL |
| --- | --- | --- |
| `componentMermaid.library` und `componentLiveDemo.libraryMermaid` | `dist/mermaid.esm.min.mjs` und daneben `dist/chunks/mermaid.esm.min/` aus npm `mermaid@12.3.0` | `/assets/mermaid/mermaid.esm.min.mjs` |
| `componentFlowchart.libraryRaphael` | `raphael.min.js` aus npm `raphael@2.3.0` | `/assets/flowchart/raphael.min.js` |
| `componentFlowchart.libraryFlowchart` | `release/flowchart.min.js` aus [flowchart.js v1.18.1](https://github.com/adrai/flowchart.js/tree/v1.18.1/release) | `/assets/flowchart/flowchart.min.js` |
| `componentVegaLite.libraryVega` | `build/vega.min.js` aus npm `vega@6.4.0` | `/assets/vega/vega.min.js` |
| `componentVegaLite.libraryVegaLite` | `build/vega-lite.min.js` aus npm `vega-lite@6.5.0` | `/assets/vega/vega-lite.min.js` |

`npm pack mermaid@12.3.0` lädt das Paket als Archiv, ohne es zu installieren. Entpacken Sie es und kopieren Sie auch die Mermaid-Chunks in der gleichen relativen Verzeichnisstruktur. Halten Sie beim Aktualisieren Vega und Vega-Lite beziehungsweise Raphaël und flowchart.js aufeinander abgestimmt. Bibliotheks-URLs müssen mit `https://` oder für lokale Dateien mit `/` beginnen. Bei einer Website unterhalb eines Pfads setzen die Komponenten diesen Pfad vor eine URL, die mit `/` beginnt.
