---
title: Labels, Nummern, Referenzen
description: Wie Sie die Elemente eines Textes benennen, wie Blyss dessen Abbildungen, Formeln und Fußnoten nummeriert und wie Sie auf sie verweisen.
order: 5
translationKey: book-labels-nbrs-refs
---

Ein Label benennt ein Element einer Seite, eines Beitrags oder eines Dokuments. Blyss nummeriert die Abbildungen und die Formeln, die ein Label haben, sowie die Fußnoten: jede Art für sich, in der Reihenfolge, in der die Seite sie zeigt, und auf jeder Seite ab 1. Ein Verweis auf ein Label zeigt dann die Nummer oder den Namen seines Elements.



## Labels

Ein Label wird zur `id` seines Elements, zu der ein Link oder ein [Verweis](#verweise) führt. Ein Element erhält sein Label auf einem dieser Wege:

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



(verweise)=
## Verweise

Ein Verweis ist ein Link ohne Text zu einem Label seiner Seite. Wie in [MyST](https://mystmd.org/guide/cross-references) füllt Blyss aus, was das Label benennt, und hält es aktuell, wenn sich die Reihenfolge der Seite ändert:

- `[](#abb-ringe)` ergibt [](#abb-ringe), und `[](#abb-ansichten-b)` ergibt [](#abb-ansichten-b), das zweite Bild seiner Abbildung.
- `[](#gl-flaeche)` ergibt [](#gl-flaeche).
- `[](#verweise)` ergibt [](#verweise), denn diese Überschrift hat ein Label.

Was ein Verweis zeigt, hängt von seinem Element ab:

- **Nummerierte Abbildung**: das Label `figure` der Sprache und ihre Nummer, wie in „Abbildung 1“. Ein Bild von ihr ergänzt seinen Buchstaben, wie in „Abbildung 2b“.
- **Nummerierte Formel**: ihre Nummer in Klammern, wie in „(1)“, oder ihr `\tag{…}`.
- **Name**: der Text einer Überschrift, der Titel einer Hinweisbox und, bei einer Abbildung ohne Nummer, der erste Absatz ihrer Bildunterschrift.
- **Alles andere**, etwa ein Absatz, eine Liste oder ein `{image}`, hat weder Nummer noch Namen. Ein Link dorthin braucht einen Text: `[diese Anmerkung](#anmerkung)` ergibt [diese Anmerkung](#anmerkung).

Ein Link mit Text behält ihn. In diesem Text steht `{number}` für die Nummer seines Elements und `{name}` für dessen Namen, außer in Code:

- `[Abb. {number}](#abb-ringe)` ergibt [Abb. {number}](#abb-ringe), und `[Formel {number}](#gl-flaeche)` ergibt [Formel {number}](#gl-flaeche).
- `[der Abschnitt „{name}“](#verweise)` ergibt [der Abschnitt „{name}“](#verweise).

Auch drei Rollen von MyST schreiben einen Verweis, jeweils vor dem Label in Backticks oder vor einem Text und dem Label in spitzen Klammern:

- `` {ref}`abb-ringe` `` ergibt {ref}`abb-ringe`, und `` {eq}`gl-flaeche` `` ergibt {eq}`gl-flaeche`.
- `` {numref}`Abb. %s <abb-ringe>` `` ergibt {numref}`Abb. %s <abb-ringe>`: `%s` steht für die Nummer, wie `{number}`.

Blyss ist hier strenger als MyST:

- **Fehlendes Label**: Der Build stoppt bei einem Verweis auf ein Label, das seine Seite nicht hat. Geben Sie dem Element ein Label oder dem Link einen Text.
- **Fehlende Nummer oder fehlender Name**: Der Build stoppt bei einem Verweis, der eine Nummer oder einen Namen verlangt, die sein Element nicht hat. MyST zeigt dann „??“ oder das Label.
- **Andere Links**: Nur ein Verweis zeigt einen Text, ohne einen zu haben. Jeder andere Link ohne Text stoppt den Build, auch einer zu einem Label einer anderen Seite, wie in `[](/de/book/schreiben/labels-und-nummern/#abb-ringe)`. Schreiben Sie den Text eines solchen Links selbst, denn die Nummern beginnen auf jeder Seite neu.



## Andere Texte

Nur Seiten, Beiträge und Dokumente haben Labels, Nummern und Verweise. Jeder andere Text, etwa der einer Komponente, des Heros oder des Overlays, kann auf einer Seite mehrmals stehen, eine `id` aber nicht. In einem solchen Text gilt:

- Ein Label oder die Option `enumerated` stoppt den Build.
- Eine Zeile `(label)=` und eine Rolle wie `{ref}` bleiben Text, und ein Link ohne Text bleibt leer.
- Eine LaTeX-Umgebung zeigt keine Nummern.
