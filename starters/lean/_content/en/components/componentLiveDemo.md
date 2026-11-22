---
title: Try it live
examples: Examples
editor: Markdown
result: Result
reset: Reset
loading: Loading the renderer …
unavailable: The live preview cannot be loaded. The examples still show their results.
failed: This text cannot be shown. Blyss says, as its build would:
diagramFailed: This diagram cannot be shown. Mermaid says:
diagramUnavailable: Mermaid cannot be loaded, so the diagram stays code.
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
