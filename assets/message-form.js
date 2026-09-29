/*
  Submits the contact form to the Apps Script behind
  script/contact.gs. Every [data-message-form] on the page is wired up.

  An Apps Script web app cannot send back Access-Control-Allow-Origin, so a
  normal cross-origin POST is blocked before the browser will let us read the
  response. `mode: "no-cors"` sends it anyway and hands back an opaque response
  we are not permitted to inspect -- the submission lands in the Sheet, but the
  page cannot be told that it did.

  That is why the success message here is optimistic. It is a real trade-off,
  not an oversight: the alternative is a Google sign-in prompt or a paid form
  service. The mitigation is that the script emails Fahimeh on every
  submission, so a failure shows up as silence on a channel she already
  watches, rather than as a lost message nobody knows about.

  URLSearchParams keeps this a "simple request" -- form-encoded, no custom
  headers -- which is what no-cors allows and what doPost's e.parameter
  expects. Sending JSON would trigger a preflight that no-cors forbids.
*/
(function () {
  var endpoint = document.documentElement.getAttribute("data-contact-endpoint") || "";

  function wire(form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector("button");

    function say(text, state) {
      status.textContent = text;
      if (state) { status.setAttribute("data-state", state); }
      else { status.removeAttribute("data-state"); }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!endpoint) {
        say("This form isn't connected yet. Please email instead.", "error");
        return;
      }

      button.disabled = true;
      say("Sending…");

      fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams(new FormData(form)),
      })
        .then(function () {
          form.reset();
          say("Thank you — your message is on its way.");
        })
        .catch(function () {
          say("Something went wrong. Please try again, or email directly.", "error");
        })
        .then(function () {
          button.disabled = false;
        });
    });
  }

  document.querySelectorAll("[data-message-form]").forEach(wire);
})();
