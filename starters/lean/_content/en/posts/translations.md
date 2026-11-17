---
title: Translations
slug: translations
description: How Blyss links the English and the German version of a page.
datePublished: 2026-11-11
translationKey: translations
tags: [Blyss]
---

Every page and post can exist in English and in German. Blyss links both versions through the same `translationKey` in their front matter, while each version keeps its own localized slug: this post lives at `/en/posts/translations/`, its German twin at `/de/posts/uebersetzungen/`.

The language switcher at the top of every page lists the languages in which the current page exists; without a translation, it shows only the existing language. Search engines learn about the translations from the `hreflang` links in the head of each page, and the JSON-LD graph states the language of every page with `inLanguage`.
