export function copyToClipboard(
  getText,
  message = "Copied to clipboard successfully!"
) {
  return () => {
    const text = getText();

    if (navigator.clipboard && location.protocol === "https:") {
      navigator.clipboard
        .writeText(text)
        .then(showCopyPopup)
        .catch((err) => {
          console.error("Clipboard error:", err);
          fallbackCopy(text);
          showCopyPopup();
        });
    } else {
      fallbackCopy(text);
      showCopyPopup(message);
    }
  };
}

// execCommand is deprecated, but is used as last resort in case http prohibits copying to clipboard
function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    console.log("Fallback: Copy successful");
  } catch (err) {
    console.error("Fallback: Copy failed", err);
  }

  document.body.removeChild(textarea);
}

function showCopyPopup(message) {
  const popup = document.getElementById("copyPopup");
  if (!popup) return;

  popup.innerText = message;
  popup.classList.add("visible");
  setTimeout(() => popup.classList.remove("visible"), 2000);
}
