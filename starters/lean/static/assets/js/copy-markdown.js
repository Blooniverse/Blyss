const copyMarkdown = document.querySelector(".copy-markdown");

if (copyMarkdown) {
  const button = copyMarkdown.querySelector("button");
  const status = copyMarkdown.querySelector('[role="status"]');
  copyMarkdown.hidden = false;

  if (!navigator.clipboard?.writeText || !window.isSecureContext) {
    button.disabled = true;
    status.textContent = copyMarkdown.dataset.unavailable;
  } else {
    button.addEventListener("click", async () => {
      try {
        const bytes = Uint8Array.from(atob(copyMarkdown.dataset.markdown), character => character.charCodeAt(0));
        await navigator.clipboard.writeText(new TextDecoder().decode(bytes));
        status.textContent = copyMarkdown.dataset.copied;
      } catch {
        status.textContent = copyMarkdown.dataset.failed;
      }
    });
  }
}
