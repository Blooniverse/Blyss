// Enhances every gallery on the page: its arrows and the arrow keys bring the previous or the next image to the centre
// of the strip, and the image in the centre is enlarged. Swiping and scrolling move the strip without this script.
customElements.define("hero-component-gallery", class extends HTMLElement {
  #strip;
  #images = [];
  #buttons = [];
  #current; // the image in the centre
  #target; // the index of the image that an arrow is bringing to the centre
  #frame;

  connectedCallback() {
    this.#strip = this.querySelector("ul");
    this.#images = [...this.#strip?.children ?? []];
    this.#buttons = [...this.querySelectorAll("button")];
    if (!this.#images.length || this.#buttons.length !== 2) return;
    this.#buttons.forEach((button, index) => button.addEventListener("click", () => this.#show(index ? 1 : -1)));
    this.addEventListener("keydown", event => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      // With a modifier, the arrow keys belong to the browser, as Alt and the left arrow go back a page.
      if (!step || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      this.#show(step);
    });
    this.#strip.tabIndex = 0; // the arrow keys need the focus in the gallery
    this.#strip.addEventListener("scroll", () => this.#mark());
    this.#strip.addEventListener("load", () => this.#mark(), true); // an image has loaded and changed its width
    for (const type of ["pointerdown", "wheel"]) this.#strip.addEventListener(type, () => this.#stop(), { passive: true });
    // Runs when the strip appears, as in an overlay that opens, and when its width changes.
    new ResizeObserver(() => {
      if (!this.#strip.clientWidth) return;
      if (!this.#current) this.#strip.scrollLeft = this.#offset(this.#images[0]);
      this.#mark();
    }).observe(this.#strip);
  }

  // The scroll position that centres an image.
  #offset(image) {
    return image.offsetLeft + image.offsetWidth / 2 - this.#strip.clientWidth / 2;
  }

  // Marks the image nearest to the centre, which the stylesheet enlarges, and dims the arrow at either end.
  #mark() {
    const position = this.#strip.scrollLeft;
    const distance = image => Math.abs(this.#offset(image) - position);
    const current = this.#images.reduce((nearest, image) => distance(image) < distance(nearest) ? image : nearest);
    if (current === this.#current) return;
    this.#current?.removeAttribute("aria-current");
    current.setAttribute("aria-current", "true");
    this.#current = current;
    const index = this.#images.indexOf(current);
    this.#buttons[0].setAttribute("aria-disabled", index === 0);
    this.#buttons[1].setAttribute("aria-disabled", index === this.#images.length - 1);
  }

  // Scrolls to the image before or after the current one, or after the one already on its way, within the time of
  // --speed-scrolling.
  #show(step) {
    const index = (this.#target ?? this.#images.indexOf(this.#current)) + step;
    if (!this.#images[index]) return;
    // Snapping stays off between two arrows in a row: switched on, it would pull the strip back to an image at once.
    cancelAnimationFrame(this.#frame);
    this.#strip.style.scrollSnapType = "none";
    this.#target = index;
    const time = getComputedStyle(this).getPropertyValue("--speed-scrolling").trim();
    const duration = parseFloat(time) * (time.endsWith("ms") ? 1 : 1000) || 0;
    const from = this.#strip.scrollLeft;
    const distance = this.#offset(this.#images[index]) - from;
    const started = performance.now();
    const move = now => {
      const progress = duration ? Math.min(Math.max(now - started, 0) / duration, 1) : 1;
      this.#strip.scrollLeft = from + distance * (1 - (1 - progress) ** 3); // fast at first, then slower
      if (progress < 1) this.#frame = requestAnimationFrame(move);
      else this.#stop();
    };
    this.#frame = requestAnimationFrame(move);
  }

  // Ends the scrolling of an arrow, also when a pointer or a wheel takes over.
  #stop() {
    cancelAnimationFrame(this.#frame);
    this.#target = undefined;
    this.#strip.style.scrollSnapType = "";
  }
});
