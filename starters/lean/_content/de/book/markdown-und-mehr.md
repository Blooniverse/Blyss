---
title: Markdown und mehr
description: Die Grundlagen von Markdown, und was Blyss ihnen hinzufügt, und woher.
order: 0
translationKey: book-markdown-and-more
---

Jede Seite, jeder Beitrag und jedes Dokument einer Blyss-Website ist eine Markdown-Datei. Dieses Dokument fasst zuerst reines Markdown zusammen, dann die Obermenge, die Blyss darüber hinaus liest.



## Markdown in Kürze

Markdown ist reiner Text, der sich so, wie er ist, gut liest und zu HTML wird. John Gruber hat es 2004 mit Hilfe von Aaron Swartz geschaffen; seine Website [daringfireball.net](https://daringfireball.net/) enthält die ursprüngliche Beschreibung der Syntax. CommonMark, auf [commonmark.org](https://commonmark.org/), legt sie eindeutig fest und bietet eine kurze Hilfe und ein Tutorial von zehn Minuten. Blyss folgt CommonMark.

| Schreiben Sie | für |
| --- | --- |
| `*kursiv*` oder `_kursiv_` | *kursiv* |
| `**fett**` oder `__fett__` | **fett** |
| `` `Code` `` | `Code` |
| `[einen Link](https://example.com/)` | [einen Link](https://example.com/) |
| `![eine Beschreibung](/assets/img/a.svg)` | ein Bild |
| `# Überschrift 1` bis `###### Überschrift 6` | Überschriften in sechs Ebenen |
| `> Ein Zitat` | ein Blockzitat |
| `- Ein Punkt` oder `* Ein Punkt` | eine Aufzählung |
| `1. Ein Punkt` oder `1) Ein Punkt` | eine nummerierte Liste |
| `---` oder `***` auf einer eigenen Zeile | eine horizontale Linie |

Einige Regeln vervollständigen das Bild:

- **Absätze**: Eine Leerzeile trennt zwei Absätze. Ein Zeilenumbruch innerhalb eines Absatzes ist ein Leerzeichen, außer die Zeile endet auf einen Backslash oder auf zwei Leerzeichen.
- **Codeblöcke**: Ein Codeblock steht zwischen zwei Zeilen aus drei Backticks oder ist um vier Leerzeichen eingerückt. Das Wort nach den öffnenden Backticks nennt seine Sprache.
- **Verschachtelung**: Ein Listenpunkt oder ein Zitat enthält weitere Blöcke, etwa eine verschachtelte Liste, wenn sie darunter eingerückt sind.
- **Verweise**: `[ein Link][1]`, mit `[1]: https://example.com/` auf einer eigenen Zeile irgendwo in der Datei, hält lange URLs aus dem Text heraus.
- **Maskierung**: Ein Backslash vor einem Satzzeichen, wie in `\*`, zeigt dieses Zeichen so, wie es ist.
- **HTML**: HTML im Markdown bleibt, wie es ist.

Überschriften in einem Dokument beginnen auf der zweiten Ebene: Der Titel im Front Matter ist die erste.



## Die Obermenge von Blyss

Blyss liest Markdown mit [marked](https://marked.js.org/) und erweitert es um Konventionen, die sich anderswo bewährt haben. Es erfindet wenig selbst: Schreibt ein anderes Werkzeug etwas bereits auf eine bestimmte Weise, schreibt Blyss es genauso, damit ein Text übertragbar bleibt und sich auf GitHub, in einem Editor und in anderen Werkzeugen gut liest. Wo es eine Konvention liest, ist es streng: Ein Fehler hält den Build mit einer Meldung an, die die Datei nennt, statt auf der Website zu erscheinen.


### Front Matter

Jede Datei beginnt mit Front Matter, wie es [Jekyll](https://jekyllrb.com/docs/front-matter/) eingeführt hat: Zeilen aus `key: value` zwischen zwei Zeilen aus `---`, etwa der `title`, die `description` und der `translationKey`, der die Sprachen eines Textes verbindet. Blyss liest eine einfache Teilmenge von YAML: jedes Feld auf einer eigenen Zeile, mit Listen und Gruppen von Feldern eingerückt unter einem Feld ohne Wert. Siehe [Seiten und Beiträge](/de/book/schreiben/seiten-und-beitraege/#front-matter-und-urls).


### GitHub Flavored Markdown

[GitHub Flavored Markdown](https://github.github.com/gfm/) ist CommonMark mit einigen Ergänzungen, die die meisten Markdown-Editoren kennen. Blyss liest sie alle:

- **Tabellen** aus Zellen zwischen senkrechten Strichen, wie oben, mit einer Zeile aus Bindestrichen unter der Kopfzeile.
- **Durchstreichen** zwischen Tilden: `~~alt~~` ergibt ~~alt~~.
- **Autolinks**: Eine bloße URL wie https://example.com/ wird zum Link.
- **Aufgabenlisten**: Ein Listenpunkt, der mit `[ ]` oder `[x]` beginnt, zeigt ein Kontrollkästchen.
- **Alerts**: Ein Zitat, das mit `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` oder `[!CAUTION]` beginnt, wird zur Hinweisbox.
- **Überschriften-IDs**: Jede Überschrift eines Dokuments erhält eine ID aus ihrem Text, wie auf GitHub, sodass Links zu ihr auf beiden gleich aussehen.

Die Fußnoten von GitHub, ein Name in eckigen Klammern nach einem Zirkumflex, gehen auf [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/) und [Pandoc](https://pandoc.org/MANUAL.html#footnotes) zurück. Blyss nummeriert sie in der Reihenfolge ihrer Verweise und listet sie unter dem Text auf.


### MyST

[MyST](https://mystmd.org/), kurz für Markedly Structured Text, bringt die Struktur wissenschaftlichen Schreibens nach Markdown. Es hat sie von reStructuredText und Sphinx übernommen, den Werkzeugen der Python-Dokumentation. Blyss liest drei seiner Ideen:

- **Direktiven**: ein umzäunter Block, der eine Direktive in einfachen geschweiften Klammern nennt, mit Optionen unter dem öffnenden Zaun. Blyss kennt die Hinweisboxen, etwa `{note}` und `{warning}`, sowie `{image}`, `{figure}` und `{math}`. Ein Zaun aus Doppelpunkten enthält Markdown, das andere Werkzeuge als Text zeigen.
- **Rollen**: ein Wort in geschweiften Klammern vor einem Code-Abschnitt, etwa `{math}`, `{ref}`, `{eq}` und `{numref}`.
- **Labels und Referenzen**: Eine Zeile `(label)=` über einem Block, oder die Option `label`, benennt ein Element. Ein Link ohne Text zu diesem Label, etwa `[](#fig-rings)`, zeigt seine Nummer oder seinen Namen.

Jeder andere Name in geschweiften Klammern bleibt, was er in Markdown ist, sodass ein MyST-Text mit Direktiven, die Blyss nicht kennt, trotzdem gebaut wird.


### Formeln

Mathematik zwischen Dollarzeichen, `$…$` innerhalb eines Textes und `$$…$$` auf eigenen Zeilen, stammt aus TeX und LaTeX, über Pandoc und Jupyter-Notebooks. [Temml](https://temml.org/) wandelt jede Formel während des Builds in MathML um, sodass der Browser sie ohne Skript zeigt. Die Regeln von Blyss für Dollarzeichen lassen Preise wie $5 und $10 Text bleiben.


### Diagramme

Wie auf GitHub zeigt ein umzäunter Codeblock in der Sprache `mermaid` ein [Mermaid](https://mermaid.js.org/)-Diagramm. Blyss ergänzt `flowchart` für [flowchart.js](https://flowchart.js.org/) und `vega-lite` für Diagramme von [Vega-Lite](https://vega.github.io/vega-lite/). Ohne JavaScript, und überall sonst, wo der Text gelesen wird, erscheint der Code eines Diagramms als Code.


### Komponenten

Die Komponenten einer Website, etwa der Slider und die Galerie, sind, was Shortcodes für [Hugo](https://gohugo.io/content-management/shortcodes/) sind: wiederverwendbare Teile, die ein Text platziert. Ein Komponentenblock ist ein umzäunter Block, der die Komponente in doppelten geschweiften Klammern nennt. Er kann eigenes Front Matter mit den Einstellungen dieses einen Vorkommens enthalten, und einen Body mit seinem Text. Die doppelten Klammern unterscheiden ihn von einer Direktive und entsprechen den Platzhaltern der Vorlagen. Siehe [Komponenten](/de/book/komponenten/#blöcke-pro-verwendung).


### Weiterlesen

[Markdown-Würze](/de/book/schreiben/markdown-wuerze/) zeigt jede dieser Erweiterungen in Aktion, und [Labels, Nummern, Referenzen](/de/book/schreiben/labels-nummern-referenzen/) erklärt die Nummerierung von Abbildungen und Formeln.
