---
title: Templates and styles
slug: templates
description: Where the templates, the stylesheet and the script of this website live.
datePublished: 2026-11-12
translationKey: templates
tags: [Blyss]
---

The HTML around the content comes from the templates in `templates/`: `document.html` holds the frame of every page with the navigation, the overlay and the footer, while `home.html`, `page.html` and `post.html` arrange the content of the home pages, the other pages and the posts.

The look comes from a single stylesheet, `static/assets/css/main.css`, and the value above the slider from a small script, `static/assets/js/overlay.js`. On the home page the overlay is open and serves as the hero; on every other page it waits as a bar at the bottom of the window.
