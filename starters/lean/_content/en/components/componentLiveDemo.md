---
title: Try it live
examples: Examples
editor: Markdown
result: Result
reset: Reset
loading: Loading the preview …
unavailable: The preview is unavailable. Reset an example to see its result.
failed: The preview still shows the previous version: something in the text isn't finished yet.
diagramFailed: The preview still shows the previous version: something in the diagram isn't finished yet.
diagramUnavailable: The diagram cannot be drawn right now, so it stays code.
---

Note: Limited demonstration. Input is filtered and stays local in your browser.

### Text

```markdown
## Small source

Write **Markdown**, get a *website*.

- [x] Author locally
- [ ] Publish when ready
```

### Callouts

````markdown
> [!TIP]
> Alerts work as on GitHub.

```{note} Directives, too
Callouts follow **MyST**.
```
````

### Code

````markdown
Highlighted by Blyss:

```js
const greet = name => `Hi, ${name}!`;
console.log(greet("Blyss"));
```
````

### Maths

```markdown
Euler wrote $e^{i\pi} + 1 = 0$.

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$ (eq-area)

Formula [](#eq-area) has a number.
```

### Diagram

````markdown
```mermaid
graph LR
  A[Markdown] --> B(Blyss)
  B --> C{Website}
```
````
