// Draws every flowchart of the page from its code, once the flowchart comes near the window: only then does the
// browser load Raphaël and flowchart.js, from the URLs of data-library-raphael and data-library-flowchart. Until the
// flowchart is drawn, without JavaScript and if a library cannot be loaded or cannot read the code, the code stays,
// in the last two cases below the text of data-error.
const libraries = new Map(); // each library is loaded once

function load(src) {
  if (!libraries.has(src)) {
    libraries.set(src, new Promise((resolve, reject) => {
      const script = Object.assign(document.createElement("script"), { src, onload: resolve, onerror: () => reject(new Error(src)) });
      document.head.append(script);
    }));
  }
  return libraries.get(src);
}

customElements.define("component-flowchart", class extends HTMLElement {
  #started;

  connectedCallback() {
    if (this.#started) return; // already set up when the flowchart moves within the page
    this.#started = true;
    new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      this.#draw();
    }, { rootMargin: "50%" }).observe(this);
  }

  async #draw() {
    const code = this.querySelector("pre");
    if (!code?.textContent.trim()) return;
    const diagram = Object.assign(document.createElement("div"), { className: "diagram" });
    try {
      await load(this.dataset.libraryRaphael); // flowchart.js needs it first
      await load(this.dataset.libraryFlowchart);
      code.before(diagram);
      const { color, fontFamily } = getComputedStyle(this);
      window.flowchart.parse(code.textContent).drawSVG(diagram, {
        "line-width": Number(this.dataset.lineWidth) || 2, "line-color": color, "element-color": color, "font-color": color,
        "font-family": fontFamily, fill: "none", "yes-text": this.dataset.yes || "yes", "no-text": this.dataset.no || "no"
      });
      code.remove();
    } catch (error) {
      diagram.remove();
      const alert = Object.assign(document.createElement("p"), { textContent: `${this.dataset.error} ${error?.message ?? error}`.trim() });
      alert.setAttribute("role", "alert");
      code.before(alert);
    }
  }
});
