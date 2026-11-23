// Enhances every gallery on the page: its arrows and the arrow keys bring the previous or the next image to the centre
// of the strip, and the image in the centre is enlarged. A click or a touch on that image, or the Enter or the space
// key, expands it further, and another one shrinks it again. The text of the image in the centre stands below the
// strip and below the expanded image. Swiping and scrolling move the strip without this script.
customElements.define("component-gallery", class extends HTMLElement {
  #strip;
  #images = [];
  #buttons = [];
  #text; // shows the text of the image in the centre below the strip
  #current; // the image in the centre
  #target; // the index of the image that an arrow is bringing to the centre
  #frame;
  #dialog; // shows the image in the centre expanded
  #shrinking;
  #placed; // whether the strip has got its first position

  connectedCallback() {
    this.#strip = this.querySelector("ul");
    this.#images = [...this.#strip?.children ?? []];
    this.#buttons = [...this.querySelectorAll("button")];
    this.#text = this.querySelector(".text");
    if (!this.#images.length || this.#buttons.length !== 2) return;
    this.#buttons.forEach((button, index) => button.addEventListener("click", () => this.#show(index ? 1 : -1)));
    this.addEventListener("keydown", event => {
      // With a modifier, the keys belong to the browser, as Alt and the left arrow go back a page.
      if (this.#dialog?.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      const expands = [" ", "Enter"].includes(event.key) && event.target === this.#strip;
      if (!step && !expands) return;
      event.preventDefault();
      if (step) this.#show(step);
      else this.#expand();
    });
    this.#strip.tabIndex = 0; // the arrow keys need the focus in the gallery
    this.#strip.addEventListener("scroll", () => this.#mark());
    this.#strip.addEventListener("load", () => this.#mark(), true); // an image has loaded and changed its width
    this.#strip.addEventListener("click", event => {
      if (event.target.closest("li") === this.#current) this.#expand();
    });
    for (const type of ["pointerdown", "wheel"]) this.#strip.addEventListener(type, () => this.#stop(), { passive: true });
    // Runs when the strip appears, as in an overlay that opens, and when its width changes. The gallery starts with
    // its middle image in the centre, so that the images before and after it fill the strip.
    new ResizeObserver(() => {
      if (!this.#strip.clientWidth) return;
      if (!this.#placed) this.#strip.scrollLeft = this.#offset(this.#images[Math.floor((this.#images.length - 1) / 2)]);
      this.#placed = true;
      this.#mark();
    }).observe(this.#strip);
  }

  // A time of the stylesheet, such as --speed-scrolling, in milliseconds.
  #time(property) {
    const time = getComputedStyle(this).getPropertyValue(property).trim();
    return parseFloat(time) * (time.endsWith("ms") ? 1 : 1000) || 0;
  }

  // The scroll position that centres an image.
  #offset(image) {
    return image.offsetLeft + image.offsetWidth / 2 - this.#strip.clientWidth / 2;
  }

  // Gives an element the text of the image in the centre, or none if that image has no text.
  #caption(element) {
    element.replaceChildren(...this.#current.querySelector("figcaption")?.cloneNode(true).childNodes ?? []);
  }

  // Marks the image nearest to the centre, which the stylesheet enlarges, shows its text and dims the arrow at either
  // end. A screen reader announces the texts that follow the first one.
  #mark() {
    const position = this.#strip.scrollLeft;
    const distance = image => Math.abs(this.#offset(image) - position);
    const current = this.#images.reduce((nearest, image) => distance(image) < distance(nearest) ? image : nearest);
    if (current === this.#current) return;
    this.#current?.removeAttribute("aria-current");
    current.setAttribute("aria-current", "true");
    this.#current = current;
    this.#caption(this.#text);
    this.#text.setAttribute("aria-live", "polite");
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
    const duration = this.#time("--speed-scrolling");
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

  // Shows the image in the centre above the page, as high as --height-expanded percent of the screen and never wider
  // than the screen, with its text below it, until a click, a touch or a key shrinks it again.
  #expand() {
    const image = this.#current?.querySelector("img");
    if (!image) return;
    if (!this.#dialog) {
      this.#dialog = document.createElement("dialog");
      this.#dialog.innerHTML = '<img><p class="text"></p>';
      this.#dialog.addEventListener("click", () => this.#shrink());
      this.#dialog.addEventListener("keydown", event => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        this.#shrink();
      });
      this.append(this.#dialog);
    }
    const expanded = this.#dialog.firstChild;
    expanded.src = image.currentSrc || image.src;
    expanded.alt = image.alt;
    expanded.style.setProperty("--ratio", image.naturalWidth / image.naturalHeight || image.offsetWidth / image.offsetHeight || 1.5);
    this.#caption(this.#dialog.lastChild);
    this.#dialog.showModal();
    this.#grow("normal");
  }

  async #shrink() {
    if (this.#shrinking) return;
    this.#shrinking = true;
    await this.#grow("reverse").finished.catch(() => {});
    this.#dialog.close();
    this.#shrinking = false;
  }

  // Lets the expanded image grow out of the image in the centre, or shrink back into it in reverse, within the time
  // of --speed-enlargement.
  #grow(direction) {
    const expanded = this.#dialog.firstChild;
    for (const animation of expanded.getAnimations()) animation.cancel(); // a click while the image still grows
    const from = this.#current.querySelector("img").getBoundingClientRect();
    const to = expanded.getBoundingClientRect();
    const start = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    return expanded.animate({ transformOrigin: ["0 0", "0 0"], transform: [start, "none"] },
      { duration: this.#time("--speed-enlargement"), easing: "ease", direction });
  }
});
