// Motion/atmosphere layer, kept deliberately cheap: everything here only
// ever touches `transform` and `opacity`, so the compositor handles it
// without triggering layout or paint on every frame — the two CSS
// properties that stay off the main thread. No animation library, no
// per-frame JS work beyond a rAF-throttled scroll listener.
(function () {
  function initParallax() {
    const bg = document.getElementById("banner-bg");
    if (!bg) return; // only the home page has a banner
    let ticking = false;
    function update() {
      bg.style.transform = "translateY(" + window.scrollY * 0.3 + "px)";
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  function initDust() {
    const field = document.createElement("div");
    field.className = "dust-field";
    field.setAttribute("aria-hidden", "true");
    const count = 18;
    for (let i = 0; i < count; i++) {
      const mote = document.createElement("span");
      mote.className = "dust-mote";
      mote.style.left = Math.random() * 100 + "%";
      mote.style.animationDelay = -(Math.random() * 20) + "s";
      mote.style.animationDuration = 14 + Math.random() * 10 + "s";
      field.appendChild(mote);
    }
    document.body.appendChild(field);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initParallax();
    initDust();
  });
})();
