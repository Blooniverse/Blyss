<!--
Die Komponenten des Heros der Startseiten, in der Reihenfolge dieser Datei; templates/hero.html zeigt sie über
oder unter den Karten aus heroCards.md.

Ein Codeblock zeigt die Komponente, die seine erste Zeile nennt:
- Ihre Einstellungen sind die Zeilen zwischen seinen beiden ---, die blyss.config.js erklärt. Fehlt eine
  Einstellung, wie die Bibliotheken der Diagramme, gilt die von components.<name> dort. regionPosition stellt die
  Komponente über die Karten (above) oder unter sie (below).
- Ihr Text gehört nur zum Hero: title unter den Einstellungen und der Text unter dem zweiten ---, wie beim
  Schieberegler und bei der Blume. Ein Block ohne beides, wie der der Galerie, zeigt Titel und Text aus
  components/<name>.md neben dieser Datei. Der Text eines Diagramms ist sein Code.
- Ein Kommentar wie dieser blendet eine Komponente aus: Entfernen Sie die Zeile über und die Zeile unter einem
  Block, um ihn zu zeigen.
-->

<!--
```{{componentSlider}}
---
title: Schieberegler im Hero
regionPosition: above
start: 1
end: 10000
steps:
  - value: 1
    description: Ein Anfang
  - value: 2500
    description: Ein Viertel
  - value: 5000
    description: Die Hälfte
  - value: 7500
    description: Drei Viertel
  - value: 10000
    description: Und Voll
---

Dieser Titel und dieser Text gehören nur zum Hero: Sie stehen im Block des Schiebereglers in `_content/de/hero.md`.
```
-->

<!--
```{{componentGallery}}
---
regionPosition: above
heightOverall: 8rem
heightCenter: 140%
heightExpanded: 70%
animationSpeedScrolling: 400ms
animationSpeedImgEnlargement: 300ms
fontSizeText: 80%
---
```
-->

<!--
```{{componentFlower}}
---
title: Blume im Hero
regionPosition: above
petals: 4
colourSystem: triadic
colourBaseHue: 202
animationSpeedFalling: 3s
animationSpeedText: 3s
animationSpeedFading: 4s
opacityFallen: 20%
fontSizeText: 60%
---

### Eigens für den Hero

Diese Texte stehen im Block der Blume in `_content/de/hero.md`: Nur die Blume des Heros zeigt sie.

### Je ein Text

Jede `###`-Überschrift des Blocks beginnt den Text des nächsten Blütenblatts: vier Blütenblätter, vier Texte.

### Einstellungen darüber

`petals` und die übrigen Einstellungen dieser Blume stehen zwischen den beiden `---` des Blocks.

### Oder gar keiner

Ein Block ohne Text zeigt den Text aus `_content/de/components/componentFlower.md`.
```
-->

<!--
```{{componentLiveDemo}}
---
regionPosition: above
rows: 7
themeMermaid: dark
---
```
-->

<!--
```{{componentMermaid}}
---
regionPosition: above
theme: neutral
---
flowchart LR
  write[Markdown schreiben] --> build[blyss build]
  build --> check{Gültig?}
  check -- ja --> publish[public/ veröffentlichen]
  check -- nein --> write
```
-->

<!--
```{{componentFlowchart}}
---
regionPosition: above
lineWidth: 2
---
start=>start: Start
write=>operation: Markdown schreiben
check=>condition: Lässt es sich erstellen?
fix=>operation: Meldung lesen
publish=>end: Veröffentlichen

start->write->check
check(yes)->publish
check(no)->fix->write
```
-->

<!--
```{{componentVegaLite}}
---
regionPosition: above
renderer: svg
---
{
  "description": "Beiträge pro Monat als Balken",
  "width": "container",
  "height": 160,
  "data": {
    "values": [
      { "month": "Aug", "posts": 2 },
      { "month": "Sep", "posts": 5 },
      { "month": "Okt", "posts": 3 },
      { "month": "Nov", "posts": 7 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "month", "type": "nominal", "sort": null, "title": "Monat", "axis": { "labelAngle": 0 } },
    "y": { "field": "posts", "type": "quantitative", "title": "Beiträge" }
  }
}
```
-->
