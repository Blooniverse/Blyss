---
title: Templates, styles, components
description: Where the templates, the stylesheet and the components of this website live.
datePublished: 2026-11-12
translationKey: 261112-init-templates-styles-components
tags: [Blyss]
---

The HTML around the content comes from the templates in `templates/`: `document.html` holds the frame of every page with the navigation and the footer, `hero.html` and `overlay.html` hold the hero of the home pages and the overlay, while `home.html`, `page.html` and `post.html` arrange the content of the home pages, the other pages and the posts.

The look comes from a single stylesheet, `static/assets/css/main.css`. The home pages end with the hero; on the other pages, the overlay waits as a bar at the bottom of the window.

The slider, the gallery and the flower are components. Each has its template, stylesheet and script in a directory of its own in `components/`, its texts in `_content/en/components/` and its settings in `blyss.config.js`. The hero and the overlay show the components of `_content/en/hero.md` and `overlay.md`, each with settings of its own. A paragraph that holds nothing but the name of a component in double curly braces shows it in a page or post, like the slider here:

{{componentSlider}}

A fenced code block whose language is such a name in double curly braces shows the component with a text and settings of its own. The block below sets the title of this slider, its range and its steps in its front matter, and its text below that:

````markdown
```{{componentSlider}}
---
title: A slider of its own
start: 0
end: 10
steps: []
---

It runs from 0 to 10 and has no steps.
```
````

```{{componentSlider}}
---
title: A slider of its own
start: 0
end: 10
steps: []
---

It runs from 0 to 10 and has no steps.
```
