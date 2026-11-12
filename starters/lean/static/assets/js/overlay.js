// Opening and closing the overlay needs no script: the browser's Popover API handles buttons, Escape and focus.

// Shows the value of the overlay's slider above it and marks the last step it has reached;
// without JavaScript, the slider works all the same.
const slider = document.getElementById("overlay-slider");
const output = document.querySelector('output[for="overlay-slider"]');
const steps = [...document.querySelectorAll(".slider li")];

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

// On large screens, the page slides over the sticky hero of the home page and fades it out (see main.css).
// Keyboard focus on the hero scrolls back to the top, so that the focused element is not hidden under the page.
const hero = document.querySelector('[data-kind="home"] > .overlay');

hero?.addEventListener("focusin", event => {
  if (event.target.matches(":focus-visible") && getComputedStyle(hero).position === "sticky") window.scrollTo(0, 0);
});
