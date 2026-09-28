/*
  The full-screen view behind _includes/lightbox.html.

  Every work on a section page is a link to its original photograph, so with
  no script a click opens that image on its own. This turns the click into the
  full-screen view instead, and lets the arrows, the arrow keys and a swipe
  walk through the rest of the section, wrapping at either end as the carousels
  do.

  The image shown first is the copy the page has already downloaded, so
  something appears the instant the view opens. The original loads behind it
  and replaces it when it arrives -- most are 1-4MB, which on a phone is long
  enough to stare at an empty frame. The originals either side are then
  fetched too, so stepping through the section does not wait on each one.
*/
(function () {
  var dialog = document.querySelector("[data-lightbox]");
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox-item]"));
  if (!dialog || !dialog.showModal || links.length === 0) { return; }

  var image = dialog.querySelector("[data-lightbox-image]");
  var caption = dialog.querySelector("[data-lightbox-caption]");
  var current = 0;

  if (links.length < 2) { dialog.classList.add("is-single"); }

  function preload(index) {
    var link = links[(index + links.length) % links.length];
    new Image().src = link.href;
  }

  function show(index) {
    current = (index + links.length) % links.length;
    var link = links[current];
    var thumb = link.querySelector("img");
    var original = link.href;

    // Its proportions, for the sizing in screen.css. From the front matter's
    // width and height when the work has them, else from the copy on the page.
    var w = thumb.getAttribute("width") || thumb.naturalWidth;
    var h = thumb.getAttribute("height") || thumb.naturalHeight;
    if (w && h) { image.style.setProperty("--ratio", w / h); }

    image.alt = thumb.alt;
    image.src = thumb.currentSrc || thumb.src;

    var full = new Image();
    full.onload = function () {
      // Only if this is still the work on screen: a fast run of clicks would
      // otherwise land an earlier painting on top of a later one.
      if (links[current].href === original) { image.src = original; }
      preload(current + 1);
      preload(current - 1);
    };
    full.src = original;

    // The page's own caption -- title, size and medium, and the price when
    // prices are on -- so the two can never disagree.
    var source = link.closest("figure").querySelector("figcaption");
    caption.innerHTML = source ? source.innerHTML : "";
  }

  function close() { dialog.close(); }

  links.forEach(function (link, index) {
    link.addEventListener("click", function (event) {
      // A modified click still means "open the original in a new tab".
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }
      event.preventDefault();
      show(index);
      dialog.showModal();
    });
  });

  dialog.querySelector("[data-lightbox-prev]").addEventListener("click", function () { show(current - 1); });
  dialog.querySelector("[data-lightbox-next]").addEventListener("click", function () { show(current + 1); });
  dialog.querySelector("[data-lightbox-close]").addEventListener("click", close);

  // A click on the empty space around the painting closes it, as it would on
  // any photo viewer. The painting itself and the controls do not.
  dialog.addEventListener("click", function (event) {
    if (!event.target.closest("img, button")) { close(); }
  });

  // Escape is the dialog's own. Only the arrows are added.
  dialog.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") { show(current - 1); event.preventDefault(); }
    if (event.key === "ArrowRight") { show(current + 1); event.preventDefault(); }
  });

  // Having stepped through the section, leave the page at the work that was
  // last on screen rather than wherever the view was opened from.
  dialog.addEventListener("close", function () {
    var figure = links[current].closest("figure");
    var box = figure.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) {
      figure.scrollIntoView({ block: "center" });
    }
    image.removeAttribute("src");
  });

  // Swipe, for the phone -- the same threshold as the carousels, so a scroll
  // that drifts sideways does not change the painting.
  var startX = null;
  var startY = null;
  dialog.addEventListener("touchstart", function (event) {
    startX = event.changedTouches[0].clientX;
    startY = event.changedTouches[0].clientY;
  }, { passive: true });
  dialog.addEventListener("touchend", function (event) {
    if (startX === null) { return; }
    var dx = event.changedTouches[0].clientX - startX;
    var dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      show(current + (dx < 0 ? 1 : -1));
    }
    startX = startY = null;
  }, { passive: true });
})();
