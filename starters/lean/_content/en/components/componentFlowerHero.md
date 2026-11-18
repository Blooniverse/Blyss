---
title: Flower
petal: Petal
---

### Pluck a petal

Click or touch a petal: it twirls, falls to the ground and leaves its text behind.

### One text each

Every `###` heading of `componentFlowerHero.md` in `_content/en/components/` starts the text of the next petal.

### Count them

`petals` in `blyss.config.js` sets the number of petals, from 3 to 24.

### Three colours

`colourSystem` derives the colours of the petals, the centre and the stem from `colourBaseHue`.

### At your pace

`animationSpeedFalling` and `animationSpeedText` set the time of the fall and of the text.

### Never quite gone

A fallen petal fades within `animationSpeedFading`, but only down to `opacityFallen`.

### Small print

`fontSizeText` sets the size of these texts: 60% of the default text size.

### See-through

The flower has no background, so it fits into the hero, the overlay, a page or a post.
