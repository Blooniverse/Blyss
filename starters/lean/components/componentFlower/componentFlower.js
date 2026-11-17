// Enhances every flower on the page: a click, a touch or the Enter or the space key plucks a petal. The petal twirls
// around its own axis, a little askew, then falls to its place on the ground within the time of --speed-falling.
// There the stylesheet takes over: the petal fades while its text appears.
customElements.define("component-flower", class extends HTMLElement {
  #petals = [];
  #texts;
  #ready;

  connectedCallback() {
    if (this.#ready) return; // already set up when the flower moves within the page
    this.#ready = true;
    this.#texts = this.querySelector(".texts");
    this.#petals = [...this.querySelectorAll(".petal")];
    const places = [...this.querySelectorAll(".ground span")];
    for (const [index, petal] of this.#petals.entries()) {
      if (!places[index]) continue;
      petal.disabled = false;
      petal.addEventListener("click", () => this.#pluck(petal, places[index], this.#texts?.children[index]), { once: true });
    }
  }

  async #pluck(petal, place, text) {
    // The keyboard goes on with the next petal that is left, or with the texts after the last one.
    if (petal === document.activeElement) {
      const left = this.#petals.filter(other => other !== petal && !other.inert);
      const next = left.find(other => petal.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) ?? left[0];
      if (!next && this.#texts) this.#texts.tabIndex = -1;
      (next ?? this.#texts)?.focus();
    }
    petal.inert = true;
    petal.classList.add("falling");

    const time = getComputedStyle(this).getPropertyValue("--speed-falling").trim();
    const duration = parseFloat(time) * (time.endsWith("ms") ? 1 : 1000) || 0;
    const angle = parseFloat(petal.style.getPropertyValue("--angle")) || 0;
    // The petal comes to lie on its side, turning the shorter way round.
    const lie = (parseFloat(place.style.getPropertyValue("--lie")) || 90) + (angle > 180 ? 360 : 0);
    // The way from the centre of the bloom, around which the petal stands, to the middle of its place on the ground.
    const flower = petal.parentElement.getBoundingClientRect();
    const ground = place.getBoundingClientRect();
    const x = ground.left + ground.width / 2 - (flower.left + flower.width / 2);
    const y = ground.top + ground.height / 2 - (flower.top + flower.width / 2);
    const sway = petal.offsetWidth;
    // Each step: its time, the parts of the way, the swing to the side, the turn towards lying, the shift from the
    // base of the petal to its middle and the turns around its own axis, which leans a little.
    const step = (offset, way, drop, swing, turn, shift, spin, easing = "ease-in-out") => ({
      offset, easing,
      transform: `translate(${x * way + sway * swing}px, ${y * drop}px) rotate(${angle + (lie - angle) * turn}deg) ` +
        `translateY(${shift}%) rotate3d(.3, 1, .15, ${spin}deg)`
    });
    const flight = petal.animate([
      step(0, 0, 0, 0, 0, -50, 0, "ease-in"),
      step(.36, 0, 0, 0, 0, -50, 540, "ease-in"),
      step(.52, .12, .16, 1, .25, -25, 720),
      step(.68, .42, .44, -1, .55, 0, 900),
      step(.84, .78, .74, .6, .85, 0, 1020),
      step(1, 1, 1, 0, 1, 0, 1080)
    ], { duration, fill: "forwards" });
    try {
      await flight.finished;
    } catch {
      return; // the flower has left the page
    }
    petal.hidden = true;
    flight.cancel();
    place.classList.add("fallen");
    text?.classList.add("fallen");
  }
});
