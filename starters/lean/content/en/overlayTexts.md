---
title: Good to know
---

### On the pages you choose

The overlay waits as a bar at the bottom of the window. `overlay.showOn` in `blyss.config.js` switches it on or off for each kind of page: pages, posts, docs, home pages, lists and “not found” pages.

### Its own content

These texts come from `content/en/overlayTexts.md`, and `overlay.components` switches the components above them on or off. The hero of the home pages has its own texts and switches.

### Or a copy of the hero

With `synchroniseHeroOverlay: true`, the overlay shows the components and the texts of the hero instead of its own.
