const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbx2TjexPexwR-wDZxF5XXexhYIgTmZb9PUPBdWy5ZMO7jFeZ-NjIozVuXnwmPeCZZaS/exec";
const form = document.querySelector("#enrollment-form");
const message = document.querySelector("#form-message");
const submitButton = form.querySelector('button[type="submit"]');
const submissionFrame = document.querySelector('iframe[name="submission-frame"]');
let activeToken = "";
let timeoutId;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  if (!FORM_ENDPOINT.startsWith("https://script.google.com/macros/s/") || !FORM_ENDPOINT.endsWith("/exec")) {
    showMessage("Form setup is not complete yet. Add the Google Apps Script web app URL to script.js.", false);
    return;
  }

  activeToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const previousToken = form.querySelector('[name="submissionToken"]');
  if (previousToken) previousToken.remove();
  const tokenInput = document.createElement("input");
  tokenInput.type = "hidden";
  tokenInput.name = "submissionToken";
  tokenInput.value = activeToken;
  form.append(tokenInput);

  form.action = FORM_ENDPOINT;
  submitButton.disabled = true;
  message.classList.remove("visible");
  form.submit();

  timeoutId = window.setTimeout(() => {
    activeToken = "";
    submitButton.disabled = false;
    showMessage("We could not confirm the submission. Please check your connection and try again.", false);
  }, 30000);
});

window.addEventListener("message", (event) => {
  if (event.source !== submissionFrame.contentWindow || !event.data || event.data.type !== "bright-path-submission" ||
      event.data.token !== activeToken) return;

  window.clearTimeout(timeoutId);
  activeToken = "";
  submitButton.disabled = false;

  if (event.data.success) {
    form.reset();
    showMessage(event.data.message, true);
  } else {
    showMessage(event.data.message || "We could not save your enquiry. Please try again.", false);
  }
});

function showMessage(text, success) {
  message.textContent = text;
  message.classList.add("visible");
  message.setAttribute("role", success ? "status" : "alert");
}
