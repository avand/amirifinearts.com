/*
  The slideshow behind _includes/carousel.html.

  Every slide is already in the DOM; this only moves the `is-current` class
  around, and keeps the thumbnail strip and the ARIA state in step with it.
  Nothing here builds markup, so a page that loads without this script still
  shows its first image and all of its thumbnails.

  Any number of carousels can share a page -- Classes has one -- so everything
  is scoped to a single [data-carousel] root.
*/
(function () {
  function setup(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll("[data-carousel-slide]"));
    var thumbs = Array.prototype.slice.call(root.querySelectorAll("[data-carousel-thumb]"));
    if (slides.length < 2) {
      // One image is not a slideshow. Leave the arrows off rather than
      // offering controls that cannot go anywhere.
      root.classList.add("is-single");
      return;
    }

    var current = 0;

    function show(next) {
      // Wrap in both directions, so the arrows never dead-end.
      next = (next + slides.length) % slides.length;

      slides[current].classList.remove("is-current");
      slides[next].classList.add("is-current");

      if (thumbs[current]) {
        thumbs[current].classList.remove("is-current");
        thumbs[current].setAttribute("aria-selected", "false");
      }
      if (thumbs[next]) {
        thumbs[next].classList.add("is-current");
        thumbs[next].setAttribute("aria-selected", "true");
        // Keep the active thumbnail in view when the strip scrolls. `nearest`
        // so a thumbnail already on screen does not make the strip jump.
        if (thumbs[next].scrollIntoView) {
          thumbs[next].scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }

      current = next;
    }

    root.querySelector("[data-carousel-prev]").addEventListener("click", function () {
      show(current - 1);
    });
    root.querySelector("[data-carousel-next]").addEventListener("click", function () {
      show(current + 1);
    });

    thumbs.forEach(function (thumb, index) {
      thumb.addEventListener("click", function () { show(index); });
    });

    /*
      Arrow keys, but only once the carousel has focus. Binding them to the
      document would hijack the arrow keys for scrolling the page, which on the
      Classes page -- a long column of prose next to the carousel -- is the
      wrong trade every time.
    */
    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { show(current - 1); event.preventDefault(); }
      if (event.key === "ArrowRight") { show(current + 1); event.preventDefault(); }
    });

    // Swipe, for the phone. Horizontal only, and only past a threshold, so a
    // vertical scroll that wanders a few pixels sideways does not change slide.
    var startX = null;
    var startY = null;
    root.addEventListener("touchstart", function (event) {
      startX = event.changedTouches[0].clientX;
      startY = event.changedTouches[0].clientY;
    }, { passive: true });
    root.addEventListener("touchend", function (event) {
      if (startX === null) { return; }
      var dx = event.changedTouches[0].clientX - startX;
      var dy = event.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        show(current + (dx < 0 ? 1 : -1));
      }
      startX = startY = null;
    }, { passive: true });
  }

  document.querySelectorAll("[data-carousel]").forEach(setup);
})();
