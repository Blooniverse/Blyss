---
title: Live ausprobieren
examples: Beispiele
editor: Markdown
result: Ergebnis
reset: Zurücksetzen
loading: Die Vorschau wird geladen …
unavailable: Die Vorschau ist nicht verfügbar. Setzen Sie ein Beispiel zurück, um sein Ergebnis zu sehen.
failed: Die Vorschau zeigt noch die vorige Fassung: Etwas im Text ist noch nicht fertig.
diagramFailed: Die Vorschau zeigt noch die vorige Fassung: Etwas im Diagramm ist noch nicht fertig.
diagramUnavailable: Das Diagramm lässt sich gerade nicht zeichnen und bleibt deshalb Code.
---

Notiz: Limitierte Demonstration. Eingaben werden gefiltert und bleiben lokal im Browser.

### Text

```markdown
## Small source

Schreiben Sie **Markdown**, erhalten Sie eine *Website*.

- [x] Lokal kreieren
- [ ] Publizieren, wenn es passt
```

### Hinweisboxen

````markdown
> [!TIP]
> Alerts funktionieren wie auf GitHub.

```{note} Auch Direktiven
Hinweisboxen folgen **MyST**.
```
````

### Code

````markdown
Von Blyss hervorgehoben:

```js
const greet = name => `Hi, ${name}!`;
console.log(greet("Blyss"));
```
````

### Formeln

```markdown
Euler schrieb $e^{i\pi} + 1 = 0$.

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$ (eq-flaeche)

Formel [](#eq-flaeche) hat eine Nummer.
```

### Diagramm

````markdown
```mermaid
graph LR
  A[Markdown] --> B(Blyss)
  B --> C{Website}
```
````
