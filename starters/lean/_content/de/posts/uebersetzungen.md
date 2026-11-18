---
title: Übersetzungen
description: Wie Blyss die deutsche und die englische Fassung einer Seite verbindet.
datePublished: 2026-11-11
translationKey: translations
tags: [Blyss]
---

Jede Seite und jeder Beitrag kann auf Deutsch und auf Englisch vorliegen. Blyss verbindet beide Fassungen über denselben `translationKey` im Front Matter, wobei jede Fassung ihren eigenen lokalisierten Dateinamen und damit ihre eigene URL behält: Dieser Beitrag, `uebersetzungen.md`, liegt unter `/de/posts/uebersetzungen/`, sein englisches Gegenstück, `translations.md`, unter `/en/posts/translations/`.

Der Sprachumschalter oben auf jeder Seite nennt die Sprachen, in denen die aktuelle Seite vorliegt; fehlt eine Übersetzung, erscheint nur die vorhandene Sprache. Suchmaschinen erfahren von den Übersetzungen durch die `hreflang`-Links im Kopf jeder Seite, und der JSON-LD-Graph nennt die Sprache jeder Seite mit `inLanguage`.
