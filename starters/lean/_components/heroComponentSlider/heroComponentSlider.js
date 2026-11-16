// Shows the slider's value above it and marks the last step it has reached, for every slider on the page;
// without JavaScript, the slider works all the same.
customElements.define("hero-component-slider", class extends HTMLElement {
  connectedCallback() {
    const slider = this.querySelector("input");
    const output = this.querySelector("output");
    const steps = [...this.querySelectorAll(".steps li")];
    if (!slider || !output) return;
    const show = () => {
      output.value = slider.value;
      const reached = steps.findLast(step => Number(step.querySelector("data").value) <= slider.valueAsNumber);
      for (const step of steps) {
        if (step === reached) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      }
    };
    slider.addEventListener("input", show);
    show();
  }
});
