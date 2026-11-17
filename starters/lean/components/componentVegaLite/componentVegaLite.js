// Draws every Vega-Lite chart of the page from its code, once the chart comes near the window: only then does the
// browser load Vega and Vega-Lite, from the URLs of data-library-vega and data-library-vega-lite. Until the chart is
// drawn, without JavaScript and if a library cannot be loaded or cannot read the code, the code stays, in the last
// two cases below the text of data-error.
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

customElements.define("component-vega-lite", class extends HTMLElement {
  #started;

  connectedCallback() {
    if (this.#started) return; // already set up when the chart moves within the page
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
    const chart = Object.assign(document.createElement("div"), { className: "diagram" });
    try {
      await load(this.dataset.libraryVega); // Vega-Lite needs it first
      await load(this.dataset.libraryVegaLite);
      // The chart has the font of the text around it and no background of its own, unless its code sets them.
      const config = { background: "transparent", font: getComputedStyle(this).fontFamily };
      const { spec } = window.vegaLite.compile(JSON.parse(code.textContent), { config });
      code.before(chart);
      await new window.vega.View(window.vega.parse(spec), { renderer: this.dataset.renderer, container: chart, hover: true }).runAsync();
      code.remove();
    } catch (error) {
      chart.remove();
      const alert = Object.assign(document.createElement("p"), { textContent: `${this.dataset.error} ${error?.message ?? error}`.trim() });
      alert.setAttribute("role", "alert");
      code.before(alert);
    }
  }
});
