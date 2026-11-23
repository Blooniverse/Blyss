<!--
The components of the overlay, in the order of this file; templates/overlay.html shows them above or below the
texts of overlayTexts.md.

A fenced code block shows the component that its first line names:
- The lines between its two --- are its settings, which blyss.config.js explains. A setting that is left out, like
  the libraries of the diagrams, is that of components.<name> there. regionPosition places the component above or
  below the texts.
- Its title and its text are those of components/<name>.md beside this file. A title among the settings and a text
  below the second --- replace them; the text of a diagram is its code.
- A comment like this one hides a component: remove the line above and the line below a block to show it.
-->

```{{componentSlider}}
---
regionPosition: above
start: 1
end: 10000
steps:
  - value: 1
    description: A Start
  - value: 2500
    description: A Quarter
  - value: 5000
    description: A Half
  - value: 7500
    description: Three Quarters
  - value: 10000
    description: And Full
---
```

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
  write[Write Markdown] --> build[blyss build]
  build --> check{Valid?}
  check -- yes --> publish[Publish public/]
  check -- no --> write
```
-->

<!--
```{{componentFlowchart}}
---
regionPosition: above
lineWidth: 2
---
start=>start: Start
write=>operation: Write Markdown
check=>condition: Does it build?
fix=>operation: Read the message
publish=>end: Publish

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
  "description": "Posts per month as bars",
  "width": "container",
  "height": 160,
  "data": {
    "values": [
      { "month": "Aug", "posts": 2 },
      { "month": "Sep", "posts": 5 },
      { "month": "Oct", "posts": 3 },
      { "month": "Nov", "posts": 7 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "month", "type": "nominal", "sort": null, "title": "Month", "axis": { "labelAngle": 0 } },
    "y": { "field": "posts", "type": "quantitative", "title": "Posts" }
  }
}
```
-->
