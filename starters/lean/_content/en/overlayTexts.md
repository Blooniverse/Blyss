---
title: Good to know
---

#### On the pages you choose

The overlay waits as a bar at the bottom of the window. `overlay.showOn` in `blyss.config.js` switches it on or off for each kind of page: pages, posts, docs, home pages, lists and “not found” pages.

#### Its own content

These texts come from `_content/en/overlayTexts.md`, and the components above them from `_content/en/overlay.md`, which gives each its settings and can place it below the texts as well. The hero of the home pages has files of its own.

#### Or a copy of the hero

With `synchroniseHeroOverlay: true`, the overlay shows the components and the texts of the hero instead of its own.
