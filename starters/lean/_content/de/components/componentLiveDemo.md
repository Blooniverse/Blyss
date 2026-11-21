---
title: Live ausprobieren
examples: Beispiele
editor: Markdown
result: Ergebnis
reset: Zurücksetzen
loading: Der Renderer wird geladen …
unavailable: Die Live-Vorschau lässt sich nicht laden. Die Beispiele zeigen weiterhin ihre Ergebnisse.
failed: Dieser Text lässt sich nicht darstellen. Blyss meldet, wie beim Build:
diagramFailed: Dieses Diagramm lässt sich nicht darstellen. Mermaid meldet:
diagramUnavailable: Mermaid lässt sich nicht laden, das Diagramm bleibt deshalb Code.
---

Ihr Text bleibt in Ihrem Browser. **Unterstützt:** Markdown, hervorgehobener Code, Formeln, Hinweisboxen, Abbildungen, Fußnoten, Referenzen und Mermaid-Diagramme. **Nicht unterstützt:** andere Komponenten und Front Matter.

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
const greet = name => `Hallo, ${name}!`;
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
