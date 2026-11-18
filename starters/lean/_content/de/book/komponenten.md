---
title: Komponenten
description: Komponenten entwickeln, Varianten und individuelle Blöcke verwenden sowie Diagrammbibliotheken selbst hosten.
order: 6
translationKey: book-components
---

## Aufbau und Verwendung

Eine Komponente liegt in `components/<name>/`; ihr Name beginnt mit einem lateinischen Buchstaben und enthält nur lateinische Buchstaben und Ziffern. Benötigt wird nur `<name>.html`. Eine optionale `<name>.data.js` prüft Einstellungen und bereitet Werte vor. Weitere Dateien wie CSS und Browser-JavaScript werden unter `/components/<name>/` veröffentlicht; die Vorlage bindet sie selbst ein. Sprachabhängige Texte liegen optional in `_content/<Sprache>/components/<name>.md`, globale Einstellungen unter `components.<name>` in `blyss.config.js`.

Ein Absatz, der nur den Namen der Komponente in doppelten geschweiften Klammern enthält, fügt sie in eine Seite, einen Beitrag oder ein Dokument ein. In Vorlagen funktioniert derselbe Platzhalter; in Code bleibt er Text. Eine Komponente kann mehrfach vorkommen. Für eine einzelne Verwendung mit eigenen Texten und Einstellungen verwenden Sie einen Block.

Die Vorlage erhält Sprachlabels als `{{<key>Label}}`, einfache Einstellungen, Front-Matter-Felder wie `{{title}}`, `{{content}}` für den gerenderten Text und Werte der Datendatei. Bei gleichen Namen ersetzen spätere Werte frühere in dieser Reihenfolge; `{{id}}` hat zuletzt Vorrang und ist pro Seite eindeutig, etwa `componentFlower-1`. Labels, Einstellungen und Front Matter werden HTML-escaped; Rückgabewerte der Datendatei werden unverändert eingesetzt und müssen bei Bedarf selbst escaped werden.

```js
export default function ({ settings, languageKey, escapeHtml, refuse }) {
  const { columns = 2 } = settings;
  if (!Number.isInteger(columns)) throw refuse("columns", columns, "a whole number");
  return { columns, language: `<p>${escapeHtml(languageKey)}</p>` };
}
```

Die Funktion erhält auch `content` als HTML, `source` als ursprünglichen Text, `frontMatter` und `texts`: Letzteres enthält die durch `###` eingeleiteten Textabschnitte. Sie wird für jede Sprache und jeden Block aufgerufen. `refuse` erzeugt eine aussagekräftige Fehlermeldung. Ungültige Einstellungen stoppen den Build.

## Varianten

Jede Komponente hat die Varianten `<name>Hero` und `<name>Overlay`. Sie teilen Vorlage, Datendatei, CSS und Skript der Komponente, aber nicht deren Texte oder Einstellungen. Legen Sie beispielsweise `componentSliderHero.md` und `componentSliderOverlay.md` in den jeweiligen Sprachverzeichnissen an und konfigurieren Sie `components.componentSliderHero` und `components.componentSliderOverlay` getrennt. Ihre IDs tragen den jeweiligen Variantennamen. Ein Komponentenverzeichnis darf nicht wie die Variante einer anderen Komponente heißen.

Der Starter enthält Slider, Galerie und Blume; ihre Einstellungen und Vorgaben stehen kommentiert in `blyss.config.js`. Texte liegen in den entsprechenden Variantendateien; Galeriebilder liegen unter `static/assets/img/gallery/`. `hero.components` und `overlay.components` können Komponenten oder Varianten einschalten. Eine Variante ohne benötigte Einstellungen schlägt erst fehl, wenn sie ohne geeigneten Block verwendet wird.

## Blöcke pro Verwendung

Ein freistehender Codeblock mit dem Komponentenplatzhalter als Sprache erzeugt eine eigene Instanz:

````markdown
```{{componentGalleryHero}}
---
title: Unsere Reise
heightOverall: 12rem
---

- ![Hafen im Morgenlicht](/assets/img/trip/harbour.jpg)
- ![Leuchtturm am Abend](/assets/img/trip/lighthouse.jpg)
```
````

Das optionale Front Matter ergänzt die Felder der Textdatei und ersetzt gleichnamige Felder; es überschreibt zugleich gleichnamige Einstellungen aus `blyss.config.js`. JSON-Werte wie `5`, `true` oder `[1, 2]` werden entsprechend gelesen, andere als Text. Der Markdown-Text ersetzt den der Textdatei; fehlt er, bleibt dieser erhalten. Ein leerer Block verwendet die Komponente unverändert. Innerhalb einer Liste oder eines Zitats bleibt der Block Code. Für einen Block, der selbst einen Codeblock enthält, verwenden Sie außen mehr Backticks.

## Diagramme und eigenes Hosting

Die Starterkomponenten `componentMermaid`, `componentFlowchart` und `componentVegaLite` zeigen freistehende Codeblöcke der Sprachen `mermaid`, `flowchart` oder `flow` und `vega-lite`. Beispiele stehen unter [Formeln und Diagramme](/de/book/schreiben/formeln-und-diagramme/). Ein Komponentenblock kann für ein Diagramm `title` und Einstellungen im Front Matter und danach den Diagrammcode enthalten. Vega-Lite-Code muss gültiges JSON sein. Ein Komponenten-Datenskript kann solche Sprachen mit `export const languages = ["mermaid"];` anmelden; jede Sprache darf nur einer Komponente gehören. Für diese Komponenten sind `source` und `content` Code statt Markdown, und `texts` ist leer.

Der Browser lädt die Bibliothek erst, wenn das Diagramm nahe am Fenster ist oder sein Overlay geöffnet wird. Bis dahin, ohne JavaScript oder bei einem Fehler bleibt der Code sichtbar; die Fehlermeldung und bei Flussdiagrammen `yes` und `no` stehen in den jeweiligen Komponententexten. Die Standardbibliotheken kommen von jsDelivr und übermitteln dabei die IP-Adresse der Besuchenden. Um dies zu vermeiden, kopieren Sie die Dateien nach `static/assets/` und setzen die URLs in `blyss.config.js` auf lokale Pfade:

| Einstellung | Datei und Quelle | Beispiel-URL |
| --- | --- | --- |
| `componentMermaid.library` | `dist/mermaid.esm.min.mjs` und daneben `dist/chunks/mermaid.esm.min/` aus npm `mermaid@12.3.0` | `/assets/mermaid/mermaid.esm.min.mjs` |
| `componentFlowchart.libraryRaphael` | `raphael.min.js` aus npm `raphael@2.3.0` | `/assets/flowchart/raphael.min.js` |
| `componentFlowchart.libraryFlowchart` | `release/flowchart.min.js` aus [flowchart.js v1.18.1](https://github.com/adrai/flowchart.js/tree/v1.18.1/release) | `/assets/flowchart/flowchart.min.js` |
| `componentVegaLite.libraryVega` | `build/vega.min.js` aus npm `vega@6.4.0` | `/assets/vega/vega.min.js` |
| `componentVegaLite.libraryVegaLite` | `build/vega-lite.min.js` aus npm `vega-lite@6.5.0` | `/assets/vega/vega-lite.min.js` |

`npm pack mermaid@12.3.0` lädt das Paket als Archiv, ohne es zu installieren. Entpacken Sie es und kopieren Sie auch die Mermaid-Chunks in der gleichen relativen Verzeichnisstruktur. Halten Sie beim Aktualisieren Vega und Vega-Lite beziehungsweise Raphaël und flowchart.js aufeinander abgestimmt. Bibliotheks-URLs müssen mit `https://` oder für lokale Dateien mit `/` beginnen.
