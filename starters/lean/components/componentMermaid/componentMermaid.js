// Draws every Mermaid diagram of the page from its code, once the diagram comes near the window: only then does the
// browser load Mermaid, from the URL of data-library. Until the diagram is drawn, without JavaScript and if Mermaid
// cannot be loaded or cannot read the code, the code stays, in the last two cases below the text of data-error.
let drawing = Promise.resolve(); // one diagram after the other, each with its own theme

customElements.define("component-mermaid", class extends HTMLElement {
  #started;

  connectedCallback() {
    if (this.#started) return; // already set up when the diagram moves within the page
    this.#started = true;
    // The browser may report several changes at once, the oldest first.
    new IntersectionObserver((entries, observer) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      drawing = drawing.then(() => this.#draw());
    }, { rootMargin: "50%" }).observe(this);
  }

  async #draw() {
    const code = this.querySelector("pre");
    if (!code?.textContent.trim()) return;
    try {
      const { default: mermaid } = await import(this.dataset.library);
      mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true, theme: this.dataset.theme,
        fontFamily: getComputedStyle(this).fontFamily });
      const { svg, bindFunctions } = await mermaid.render(`${this.id}-diagram`, code.textContent);
      const diagram = Object.assign(document.createElement("div"), { className: "diagram", innerHTML: svg });
      code.replaceWith(diagram);
      bindFunctions?.(diagram);
    } catch (error) {
      const alert = Object.assign(document.createElement("p"), { textContent: `${this.dataset.error} ${error?.message ?? error}`.trim() });
      alert.setAttribute("role", "alert");
      code.before(alert);
    }
  }
});
