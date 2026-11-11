// Opening and closing the overlay needs no script: the browser's Popover API handles buttons, Escape and focus.

// Shows the value of the overlay's slider next to it; without JavaScript, the slider works all the same.
const slider = document.getElementById("overlay-slider");
const output = document.querySelector('output[for="overlay-slider"]');

if (slider && output) {
  const show = () => { output.value = slider.value; };
  slider.addEventListener("input", show);
  show();
}

// On large screens, the page slides over the sticky hero of the home page and fades it out (see main.css).
// Keyboard focus on the hero scrolls back to the top, so that the focused element is not hidden under the page.
const hero = document.querySelector('[data-kind="home"] > .overlay');

hero?.addEventListener("focusin", event => {
  if (event.target.matches(":focus-visible") && getComputedStyle(hero).position === "sticky") window.scrollTo(0, 0);
});
