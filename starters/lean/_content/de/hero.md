<!--
Die Komponenten des Heros der Startseiten, in der Reihenfolge dieser Datei; templates/hero.html zeigt sie über
oder unter den Texten aus heroTexts.md.

Ein Codeblock zeigt die Komponente, die seine erste Zeile nennt:
- Die Zeilen zwischen seinen beiden --- sind ihre Einstellungen, die blyss.config.js erklärt. Fehlt eine
  Einstellung, wie die Bibliotheken der Diagramme, gilt die von components.<name> dort. regionPosition stellt die
  Komponente über die Texte (above) oder unter sie (below).
- Ihr Titel und ihr Text stammen aus components/<name>.md neben dieser Datei. Ein title unter den Einstellungen und
  ein Text unter dem zweiten --- ersetzen sie; der Text eines Diagramms ist sein Code.
- Ein Kommentar wie dieser blendet eine Komponente aus: Entfernen Sie die Zeile über und die Zeile unter einem
  Block, um ihn zu zeigen.
-->

<!--
```{{componentSlider}}
---
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
---
```
-->

<!--
```{{componentFlower}}
---
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
