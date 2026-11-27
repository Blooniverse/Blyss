---
title: Agentisches Co-Authoring
description: Wie ein Mensch und ein KI-Agent einen Text gemeinsam schreiben, in Wechseln, die die Seite zuschreibt und datiert.
order: 5
translationKey: book-agentic-co-authoring
---

Ein Text, den ein Mensch und ein KI-Agent gemeinsam schreiben, zeigt, wer was geschrieben hat: Jeder Wechsel ist ein `{contribution}`, seinem Autor zugeschrieben und datiert.



## Wechsel von Mensch und Agent

`{contribution}` ist eine eigene Direktive von Blyss, in der Form der [Direktiven](/de/book/verfassen/markdown-wuerze/#direktiven) von MyST:

````markdown
:::{contribution}
:by: human
:author: Ada
:date: 2026-11-26
Welcher Static Site Generator passt zu einer kleinen mehrsprachigen Website?
:::

:::{contribution}
:by: agent
:author: Claude
:date: 2026-11-27
Einer, der jede Sprache in eigenen Markdown-Dateien hält.
:::
````

:::{contribution}
:by: human
:author: Ada
:date: 2026-11-26
Welcher Static Site Generator passt zu einer kleinen mehrsprachigen Website?
:::

:::{contribution}
:by: agent
:author: Claude
:date: 2026-11-27
Einer, der jede Sprache in eigenen Markdown-Dateien hält.
:::

- `:by:` ist Pflicht: `human` oder `agent`. Die Bezeichnungen `contributionHuman` und `contributionAgent` der Sprache benennen die Art.
- `:author:` nennt den Autor, und `:date:` datiert den Wechsel, etwa `2026-11-26`.
- Ein Label, `(name)=` in der Zeile darüber, lässt einen anderen Wechsel darauf verlinken; siehe [Labels und Nummern](/de/book/verfassen/labels-nummern-referenzen/#labels).
- Das JSON-LD der Seite nennt die Autoren als ihre `contributor`: einen Menschen als `Person`, einen Agenten als `SoftwareApplication`. Ein Mensch ohne Namen ist der Herausgeber der Website.



## Der Ablauf in Wechseln

Der Starter bereitet eine Website auf das Schreiben mit Agenten vor, mit Dateien, die Blyss weder liest noch veröffentlicht:

- `AGENTS.md` sagt einem Agenten, wie er an der Website arbeitet: seine Wechsel unter dem letzten anzufügen und nie einen anderen zu ändern, eine neue Seite als [Entwurf](/de/book/verfassen/seiten-und-beitraege/#entwürfe) zu belassen und erst fertig zu sein, wenn [`npx blyss check --json`](/de/book/installation/#befehle) `"ok": true` meldet.
- `_authoring/` enthält das Material hinter den Seiten: den Styleguide `style-guide.md`, das Glossar `glossary.md` mit den Begriffen in jeder Sprache und in `briefs/` ein Briefing pro Inhalt, die Aufgabe, die ein Mensch einem Agenten gibt.
- `.github/workflows/ci-dev-check-content.yml` führt `blyss check` für jeden Pull Request aus, sodass ein Wechsel, der den Build brechen würde, dort auffällt.

Ein Text wächst dann in Wechseln:

1. Ein Mensch schreibt ein Briefing oder beginnt einen Beitrag mit `npx blyss new post --lang de "Ein Titel"` und schreibt den ersten Wechsel, mit `:by: human`.
2. Ein Agent fügt in einem eigenen Git-Branch einen Wechsel mit `:by: agent` an, führt `npx blyss check --json` aus und öffnet einen Pull Request.
3. Der Mensch prüft die Änderungen und die Vorschau von `npm run dev`, die die Entwürfe zeigt, und antwortet dann in einem eigenen Wechsel oder bittet um Änderungen.
4. Ist der Text fertig, entfernt der Mensch `draft: true` und führt den Pull Request zusammen: Die Seite zeigt jeden Wechsel, seinem Autor zugeschrieben.

Git hält fest, wer was wann geändert hat, und jeder Pull Request bewahrt die Diskussion eines Wechsels.
