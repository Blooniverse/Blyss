---
title: Navigation und Überschriften
description: Wie Blyss die Dokumente und ihre Überschriften verlinkt.
order: 1
translationKey: techdoc-navigation
---

## Navigation

Die Navigation listet zuerst die Startseite der Dokumentation auf, dann ihre Dokumente und Abschnitte, jeden Abschnitt mit seinen Dokumenten, geordnet nach `order` und Titel. Sie hebt das aktuelle Dokument hervor. Die Links unter jedem Dokument führen zum vorherigen und zum nächsten Dokument der Navigation.

## Überschriften

Jede Überschrift eines Dokuments erhält eine ID aus ihrem Text, wie auf GitHub: Diese hier ist `#überschriften`. Das Inhaltsverzeichnis oben listet die Überschriften der zweiten Ebene auf, jede mit ihren Überschriften der dritten Ebene.

### Tipps

- Beginnen Sie den Text unter dem Titel mit einer Überschrift der zweiten Ebene: Der Titel ist die Überschrift der ersten Ebene.
- Halten Sie Überschriften kurz, denn das Inhaltsverzeichnis listet sie auf.

## Vorlagen

`templates/techdoc.html` ordnet die Dokumente an: die Navigation, den Titel, das Inhaltsverzeichnis, den Text und die Links zum vorherigen und zum nächsten Dokument. Ihre Platzhalter heißen techdocNavigation, techdocToc und techdocPager, jeweils in doppelten geschweiften Klammern. Ohne diese Vorlage verwenden Dokumente `templates/page.html`.
