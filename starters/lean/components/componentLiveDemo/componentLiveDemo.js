// Shows the Markdown of an example beside what Blyss makes of it and lets a visitor edit it, for every live demo of
// the page. The result of an example is that of the build, which the page holds. What a visitor writes is read by
// the renderer of Blyss, which the browser loads from the website once the visitor turns to the editor: nothing
// that is written leaves the browser or is stored. The result stands in a frame without scripts, with the
// stylesheets of the page. A Mermaid diagram is drawn by Mermaid, which the browser loads from the URL of
// data-library-mermaid once a text holds such a diagram. Without JavaScript, the examples stay code.
// A text that cannot be shown leaves the last result as it is, and a message below the demo says so in plain words:
// what the renderer or Mermaid has to say about it is of no use to a visitor.
const stylesheet = new URL("./componentLiveDemoPreview.css", import.meta.url).href;
const pause = 120; // the time without a keystroke after which the result follows the text, in ms
const patience = 600; // the time after which a message tells of an error or of a slow load, in ms

const escapeHtml = text => text.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
// The id that the fragment of a link names, which may be encoded.
function decoded(fragment) {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

customElements.define("component-live-demo", class extends HTMLElement {
  #started;
  #examples; // each with its name, its Markdown, its result and its button
  #texts; // the Markdown of each example as the visitor left it
  #selected = 0;
  #editor;
  #frame;
  #article; // holds the result within the frame
  #status;
  #renderer; // the promise of the renderer of Blyss
  #mermaid; // the promise of Mermaid
  #drawer; // Mermaid, once it is loaded
  #turn = 0; // counts the texts and their results, so that a slow result never replaces a newer one
  #diagrams = 0; // counts the diagrams, for their ids
  #waiting; // the timer of the result
  #telling; // the timer of the message
  #warned = new Set(); // what the console has been told that it cannot be loaded

  connectedCallback() {
    if (this.#started) return; // already set up when the demo moves within the page
    this.#started = true;
    const live = this.querySelector(".live");
    const list = this.querySelector(".examples");
    const choice = this.querySelector(".choice");
    this.#editor = this.querySelector("textarea");
    this.#frame = this.querySelector("iframe");
    this.#status = this.querySelector(".status");
    if (!live || !list || !choice || !this.#editor || !this.#frame || !this.#status) return;

    this.#examples = [...list.children].map((item, index) => {
      const name = item.querySelector("h4")?.textContent ?? "";
      const button = Object.assign(document.createElement("button"), { type: "button", textContent: name });
      button.addEventListener("click", () => this.#select(index));
      choice.append(button);
      return { name, button, markdown: item.querySelector("code")?.textContent ?? "", result: item.querySelector("template")?.innerHTML ?? "" };
    });
    this.#texts = this.#examples.map(example => example.markdown);
    choice.hidden = this.#examples.length < 2; // a single example leaves no choice

    this.querySelector(".reset")?.addEventListener("click", () => {
      this.#texts[this.#selected] = this.#examples[this.#selected]?.markdown ?? "";
      this.#select(this.#selected);
    });
    // The renderer is on its way before the first keystroke.
    this.#editor.addEventListener("focus", () => this.#load().catch(() => {}), { once: true });
    // A keystroke leaves behind what the text before it was about to show or to tell.
    this.#editor.addEventListener("input", () => {
      this.#texts[this.#selected] = this.#editor.value;
      this.#turn++;
      clearTimeout(this.#waiting);
      clearTimeout(this.#telling);
      this.#waiting = setTimeout(() => this.#update(), pause);
    });
    this.#frame.addEventListener("load", () => this.#prepare(), { once: true });
    this.#frame.srcdoc = this.#document();
    list.hidden = true;
    live.hidden = false;
  }

  // The document of the frame: one of its own, with the stylesheets of the page but without its scripts. Whatever a
  // text holds, it runs nothing, sends no form and leads nowhere.
  #document() {
    const sheets = [...[...document.head.querySelectorAll('link[rel~="stylesheet"]')].map(link => link.href), stylesheet]
      .map(href => `<link rel="stylesheet" href="${escapeHtml(href)}">`).join("");
    return `<!doctype html><html lang="${escapeHtml(document.documentElement.lang)}"><head><meta charset="utf-8">` +
      `<base target="_blank">${sheets}</head><body><article></article></body></html>`;
  }

  #prepare() {
    const preview = this.#frame.contentDocument;
    this.#article = preview.querySelector("article");
    // The frame is as tall as its content, which changes with its width, with an image that arrives and with a
    // callout that opens.
    new ResizeObserver(() => this.#fit()).observe(this.#frame);
    preview.addEventListener("load", () => this.#fit(), true);
    preview.addEventListener("toggle", () => this.#fit(), true);
    // A link within the text, such as that of a footnote, leads to its target; any other link leads nowhere.
    preview.addEventListener("click", event => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      event.preventDefault();
      const href = link.getAttribute("href");
      if (href.startsWith("#")) preview.getElementById(decoded(href.slice(1)))?.scrollIntoView({ block: "nearest" });
    });
    this.#select(this.#selected);
  }

  #fit() {
    const preview = this.#frame.contentDocument;
    if (!preview) return;
    // The text of the result is as large as that of the demo, whatever the size of the frame.
    preview.documentElement.style.fontSize = getComputedStyle(this).fontSize;
    const borders = this.#frame.offsetHeight - this.#frame.clientHeight;
    this.#frame.style.height = `${Math.ceil(preview.documentElement.getBoundingClientRect().height) + borders}px`;
  }

  // Shows an example with its Markdown as the visitor left it.
  #select(index) {
    this.#selected = index;
    for (const [at, { button }] of this.#examples.entries()) button.setAttribute("aria-pressed", String(at === index));
    this.#editor.value = this.#texts[index] ?? "";
    clearTimeout(this.#waiting);
    this.#update();
  }

  // Shows a message below the demo, or none: at once, or only after a while, unless another one comes first. Its
  // kind is "invalid" for a text that cannot be shown, "problem" for anything else that fails, or none.
  #tell(message = "", kind = "", later = false) {
    clearTimeout(this.#telling);
    const tell = () => {
      this.#status.textContent = message;
      this.#status.dataset.kind = kind;
      if (kind === "invalid") this.#editor.setAttribute("aria-invalid", "true");
      else this.#editor.removeAttribute("aria-invalid");
    };
    if (later) this.#telling = setTimeout(tell, patience);
    else tell();
  }

  // Tells the console, once, of what cannot be loaded: the author of the website finds the reason there.
  #warn(what, error) {
    if (this.#warned.has(what)) return;
    this.#warned.add(what);
    console.warn(`Blyss live demo: ${what} cannot be loaded.`, error);
  }

  // The renderer of Blyss, which the browser loads once, from the website itself.
  #load() {
    this.#renderer ??= import("../blyss-renderer/renderer.js").catch(error => {
      this.#renderer = undefined; // the next keystroke tries again
      throw error;
    });
    return this.#renderer;
  }

  // Shows the result of the Markdown in the editor: that of the build for an example as it is, and what the renderer
  // makes of any other text.
  async #update() {
    const turn = ++this.#turn;
    const text = this.#editor.value;
    const example = this.#examples[this.#selected];
    let html = example?.result;
    if (text !== example?.markdown) {
      let renderer;
      try {
        if (!this.#status.textContent) this.#tell(this.dataset.loading, "", true); // only if loading takes a while
        renderer = await this.#load();
      } catch (error) {
        this.#warn("the renderer of Blyss", error);
        if (turn === this.#turn) this.#tell(this.dataset.unavailable, "problem");
        return;
      }
      if (turn !== this.#turn) return;
      try {
        html = renderer.withBasePath(renderer.renderDocument(text, "this text", JSON.parse(this.dataset.labels)), this.dataset.basePath);
      } catch {
        // The last result stays, and the message waits for a pause: a text is often invalid while it is written.
        this.#tell(this.dataset.failed, "invalid", true);
        return;
      }
    }
    await this.#show(html, turn);
  }

  // Puts a result into the frame, with its Mermaid diagrams drawn. Until Mermaid is there, and if it cannot be
  // loaded, a diagram stays code. A diagram that cannot be drawn leaves the last result as it is, like any other
  // text that cannot be shown.
  async #show(html, turn) {
    if (!this.#article) return; // the frame is not ready yet; it shows the text of the editor once it is
    const holder = this.#frame.contentDocument.createElement("template");
    holder.innerHTML = html;
    const codes = [...holder.content.querySelectorAll("pre > code.language-mermaid")];
    const mermaid = codes.length ? this.#drawer : undefined;
    if (mermaid) {
      try {
        for (const code of codes) code.parentElement.replaceWith(await this.#draw(mermaid, code.textContent));
      } catch {
        if (turn === this.#turn) this.#tell(this.dataset.diagramFailed, "invalid", true);
        return;
      }
    }
    if (turn !== this.#turn) return;
    this.#article.replaceChildren(holder.content);
    this.#fit();
    this.#tell();
    if (!codes.length || mermaid) return;
    // Once Mermaid has arrived, the diagrams of this result are drawn, unless a newer result has come.
    try {
      this.#drawer = await (this.#mermaid ??= this.#loadMermaid());
    } catch (error) {
      this.#mermaid = undefined; // the next result tries again
      this.#warn("Mermaid", error);
      if (turn === this.#turn) this.#tell(this.dataset.diagramUnavailable, "problem");
      return;
    }
    if (turn === this.#turn) await this.#show(html, turn);
  }

  // Mermaid, which the browser loads once a text holds a diagram, from the URL in the settings of the component.
  async #loadMermaid() {
    const { default: mermaid } = await import(this.dataset.libraryMermaid);
    return mermaid;
  }

  // The drawing of a diagram. Mermaid draws it within the page, in the font of the demo, for the frame to show.
  async #draw(mermaid, code) {
    mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true, securityLevel: "strict", theme: this.dataset.themeMermaid,
      fontFamily: getComputedStyle(this).fontFamily });
    const { svg } = await mermaid.render(`${this.id}-diagram-${++this.#diagrams}`, code);
    return Object.assign(this.#frame.contentDocument.createElement("div"), { className: "diagram", innerHTML: svg });
  }
});