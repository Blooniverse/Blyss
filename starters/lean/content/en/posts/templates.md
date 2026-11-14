---
title: Templates and styles
slug: templates
description: Where the templates, the stylesheet and the components of this website live.
datePublished: 2026-11-12
translationKey: templates
tags: [Blyss]
---

The HTML around the content comes from the templates in `templates/`: `document.html` holds the frame of every page with the navigation, the overlay and the footer, while `home.html`, `page.html` and `post.html` arrange the content of the home pages, the other pages and the posts.

The look comes from a single stylesheet, `static/assets/css/main.css`. On the home page the overlay is open and serves as the hero; on every other page it waits as a bar at the bottom of the window.

The slider and the gallery in the overlay are components. Each has its template, stylesheet and script in a directory of its own in `components/`, its texts in `content/en/components/` and its settings in `blyss.config.js`. A paragraph that holds nothing but the name of a component in double curly braces shows it in a page or post, like the slider here:

{{heroComponentSlider}}
