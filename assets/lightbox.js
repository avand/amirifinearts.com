/*
  The full-screen view behind _includes/lightbox.html.

  Every work on a section page is a link to its full-resolution image, so with
  no script a click opens that image on its own. This turns the click into the
  full-screen view instead, and lets the arrows, the arrow keys and a swipe
  walk through the rest of the section, wrapping at either end as the carousels
  do.

  Each step shows the work's 960px image first -- usually already downloaded
  -- and swaps in the full-size one (the link's href) once that has arrived.
  To keep stepping quick, the 960px images two either side are fetched as soon
  as a work is shown, and the full-size ones either side once its own is in.

  Stepping faster than any of that can keep up with, each step builds a new
  <img> rather than changing the address of the one on screen. A browser
  changing an image's address keeps painting the old picture until the new one
  has downloaded -- and since the frame takes the new work's proportions at
  once, what showed was the previous painting, stretched to the wrong shape.
  A new element starts empty: a dark tile of the right shape, which the
  painting then fills in blurred-then-sharp, since every image bin/resize makes
  is a progressive JPEG.
*/
(function () {
  var dialog = document.querySelector("[data-lightbox]");
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox-item]"));
  if (!dialog || !dialog.showModal || links.length === 0) { return; }

  var image = dialog.querySelector("[data-lightbox-image]");  // replaced on every step
  var caption = dialog.querySelector("[data-lightbox-caption]");
  var current = 0;

  if (links.length < 2) { dialog.classList.add("is-single"); }

  function at(index) { return links[(index + links.length) % links.length]; }

  // The column's image as the page wrote it: the 960px copy. Its currentSrc
  // may be the 480, when that is what the screen called for and it has
  // already arrived -- then that is the one to show, since it is instant.
  function preview(link) {
    var thumb = link.querySelector("img");
    return thumb.complete && thumb.naturalWidth ? thumb.currentSrc : thumb.getAttribute("src");
  }

  function fetch(url) { new Image().src = url; }

  function show(index) {
    current = (index + links.length) % links.length;
    var link = links[current];
    var thumb = link.querySelector("img");
    var fullSize = link.href;

    var fresh = document.createElement("img");
    fresh.setAttribute("data-lightbox-image", "");
    fresh.draggable = false;
    fresh.alt = thumb.alt;
    // Its proportions, for the sizing in screen.css: bin/resize recorded
    // every image's width and height, and the page wrote them on the <img>.
    fresh.style.setProperty("--ratio", thumb.getAttribute("width") / thumb.getAttribute("height"));
    fresh.src = preview(link);
    image.replaceWith(fresh);
    image = fresh;

    [1, -1, 2, -2].forEach(function (step) { fetch(preview(at(current + step))); });

    var full = new Image();
    full.onload = function () {
      // Only if this is still the work on screen: a fast run of clicks would
      // otherwise land an earlier painting on top of a later one.
      if (image === fresh) { fresh.src = fullSize; }
      fetch(at(current + 1).href);
      fetch(at(current - 1).href);
    };
    full.src = fullSize;

    // The page's own caption -- title, size and medium, and the price when
    // prices are on -- so the two can never disagree.
    var source = link.closest("figure").querySelector("figcaption");
    caption.innerHTML = source ? source.innerHTML : "";
  }

  function close() { dialog.close(); }

  links.forEach(function (link, index) {
    link.addEventListener("click", function (event) {
      // A modified click still means "open the full image in a new tab".
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
