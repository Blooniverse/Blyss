---
title: Labels und Nummern
description: Wie Sie die Elemente eines Textes benennen und wie Blyss dessen Abbildungen, Formeln und Fußnoten nummeriert.
order: 5
translationKey: book-labels-and-numbers
---

Ein Label benennt ein Element einer Seite, eines Beitrags oder eines Dokuments, sodass ein Link zu ihm führt. Blyss nummeriert die Abbildungen und die Formeln, die ein Label haben, sowie die Fußnoten: jede Art für sich, in der Reihenfolge, in der die Seite sie zeigt, und auf jeder Seite ab 1.



## Labels

Ein Label wird zur `id` seines Elements. Ein Element erhält sein Label auf einem dieser Wege:

- **Option**: `label` oder `name` einer Hinweisbox, eines `{image}`, eines `{figure}` oder einer `{math}`-[Direktive](/de/book/schreiben/markdown-wuerze/#direktiven).
- **Zeile darüber**: eine Zeile `(label)=` über einer Überschrift oder über jedem anderen Block, etwa einem Absatz, einer Liste oder einem Diagramm.
- **Formel**: das Label in Klammern hinter einer Formel zwischen `$$` oder `\label{…}` in ihr.

````markdown
(anmerkung)=
Dieser Absatz hat das Label `anmerkung`.
````

(anmerkung)=
Dieser Absatz hat das Label `anmerkung`.

Für ein Label gelten diese Regeln:

- **Form**: Es besteht aus Buchstaben, Ziffern, Bindestrichen, Unterstrichen, Punkten und Doppelpunkten und beginnt mit einem Buchstaben oder einer Ziffer, wie in `abb-ringe` oder `gl:flaeche`.
- **Ein Element**: Es benennt ein Element seiner Seite. Der Build stoppt bei einem Label, das zweimal vorkommt, und bei einem, das die `id` eines Elements der Vorlagen oder einer Fußnote ist.
- **Überschriften**: Eine Überschrift hat ihr Label als `id`, in einem Dokument anstelle [der ID aus ihrem Text](/de/book/schreiben/buch/navigation/#überschriften).



## Abbildungen

Ein `{figure}` mit Label wird nummeriert, und seine Nummer steht am Anfang seiner Bildunterschrift:

````markdown
```{figure} /assets/img/gallery/rings.svg
:label: abb-ringe
:alt: Ringe in Orange und Blau
:width: 30%
:align: center

Ringe aus der Galerie des Starters.
```
````

```{figure} /assets/img/gallery/rings.svg
:label: abb-ringe
:alt: Ringe in Orange und Blau
:width: 30%
:align: center

Ringe aus der Galerie des Starters.
```

- **Wort**: Das Label `figure` der Sprache der Seite steht vor der Nummer, etwa `figure: "Abbildung"` in `blyss.config.js`.
- **`enumerated`**: Diese Option, oder `numbered`, nummeriert eine Abbildung ohne Label, und `:enumerated: false` lässt eine mit Label ohne Nummer.
- **`{image}`**: Ein Bild hat keine Bildunterschrift und deshalb keine Nummer, kann aber ein Label haben.
- **Gestaltung**: Die Nummer ist ein `span` mit der Klasse `caption-number`, die `static/assets/css/main.css` im Starter fett setzt.

Die Bilder einer [Abbildung ohne URL](/de/book/schreiben/markdown-wuerze/#bilder-und-abbildungen) haben Buchstaben. Hat die Abbildung ein Label, so hat jedes Bild dieses Label und seinen Buchstaben als `id`, etwa `abb-ansichten-b`:

````markdown
:::{figure}
:label: abb-ansichten

![Eine Sonne geht über blauen Hügeln auf](/assets/img/gallery/sunrise.svg)
![Blaue Berge mit einem verschneiten Gipfel](/assets/img/gallery/mountains.svg)

Zwei Ansichten aus der Galerie.
:::
````

:::{figure}
:label: abb-ansichten

![Eine Sonne geht über blauen Hügeln auf](/assets/img/gallery/sunrise.svg)
![Blaue Berge mit einem verschneiten Gipfel](/assets/img/gallery/mountains.svg)

Zwei Ansichten aus der Galerie.
:::



## Formeln

Eine Formel auf eigenen Zeilen mit Label wird nummeriert, und ihre Nummer steht am Ende ihrer Zeile:

````markdown
$$
A = \pi r^2
$$ (gl-flaeche)
````

$$
A = \pi r^2
$$ (gl-flaeche)

- **Direktive**: Eine `{math}`-Direktive hat ihr Label als Option `label` oder `name`. Ihre Option `enumerated`, oder `numbered`, nummeriert eine Formel ohne Label, und `:enumerated: false` lässt eine mit Label ohne Nummer.
- **Tags**: Eine Formel mit `\tag{…}` zeigt diesen Tag anstelle einer Nummer.
- **Im Text**: Eine Formel im Text hat keine Nummer.
- **Gestaltung**: Die Nummer hat die Klasse `tml-tag`, über die das Stylesheet des Starters sie an das Ende der Zeile setzt.

Eine LaTeX-Umgebung, die ihre Zeilen nummeriert, etwa `equation`, `align` oder `gather`, erhält deren Nummern aus derselben Zählung:

````markdown
$$
\begin{align}
(a + b)^2 &= a^2 + 2ab + b^2 \\
(a - b)^2 &= a^2 - 2ab + b^2
\end{align}
$$
````

$$
\begin{align}
(a + b)^2 &= a^2 + 2ab + b^2 \\
(a - b)^2 &= a^2 - 2ab + b^2
\end{align}
$$

`\nonumber` lässt eine Zeile ohne Nummer, ebenso eine Umgebung mit Stern, etwa `align*`.



## Fußnoten

Blyss nummeriert die Fußnoten einer Seite in der Reihenfolge ihrer ersten Verweise, unabhängig von ihren Namen; siehe [Fußnoten](/de/book/schreiben/markdown-wuerze/#fußnoten). Da die Fußnoten auf den Text folgen, wird eine Abbildung oder eine Formel in einer Fußnote nach denen des Textes nummeriert.



## Links

Ein Link zu einem Label führt zu dessen Element:

- `[Abbildung 1](#abb-ringe)` ergibt [Abbildung 1](#abb-ringe), und `[Formel (1)](#gl-flaeche)` ergibt [Formel (1)](#gl-flaeche).
- `[die Berge](#abb-ansichten-b)` ergibt [die Berge](#abb-ansichten-b), das zweite Bild seiner Abbildung.
- Von einer anderen Seite aus steht die URL der Seite vor dem Label, wie in `/de/book/schreiben/labels-und-nummern/#abb-ringe`.

Blyss füllt den Text eines solchen Links nicht aus, wie es MyST bei `[](#gl-flaeche)` tut: Schreiben Sie die Nummer selbst, und berichtigen Sie sie, wenn sich die Reihenfolge der Seite ändert. Ein Link zu einem Teil einer Seite ohne Text stoppt den Build.



## Andere Texte

Nur Seiten, Beiträge und Dokumente haben Labels und Nummern. Jeder andere Text, etwa der einer Komponente, des Heros oder des Overlays, kann auf einer Seite mehrmals stehen, eine `id` aber nicht. In einem solchen Text gilt:

- Ein Label oder die Option `enumerated` stoppt den Build.
- Eine Zeile `(label)=` bleibt Text.
- Eine LaTeX-Umgebung zeigt keine Nummern.
