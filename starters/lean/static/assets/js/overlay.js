// Opening and closing the overlay needs no script: the browser's Popover API handles buttons, Escape and focus.

// Shows the value of the hero component's slider above it and marks the last step it has reached;
// without JavaScript, the slider works all the same.
const slider = document.getElementById("hero-component-slider-input");
const output = document.querySelector('output[for="hero-component-slider-input"]');
const steps = [...document.querySelectorAll(".hero-component-slider li")];

if (slider && output) {
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
