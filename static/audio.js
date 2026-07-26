// Background music, sourced from real, verified CC0 (public domain) tracks
// hosted on OpenGameArt.org — not synthesized. Each track has a named
// author and an explicit CC0 license confirmed on its OpenGameArt page:
//   home/trial : "Epic Boss Battle" / "Determined Pursuit" — Juhani Junkala
//                / Emma_MA, CC0
//   olympus    : "A Legend Will Rise" — CodeManu, CC0
//   underworld : "Evil Approach" — nene, CC0
// Plays automatically (no visible toggle): attempts autoplay immediately,
// and if the browser's autoplay policy blocks that, starts on the first
// user interaction anywhere on the page instead. Also exposes duck()/
// unduck() so spoken dialogue reads clearly over the music.

(function () {
  const TRACKS = {
    home: { src: "/static/audio/home.mp3", volume: 0.5 },
    trial: { src: "/static/audio/trial.mp3", volume: 0.45 },
    olympus: { src: "/static/audio/olympus.mp3", volume: 0.5 },
    underworld: { src: "/static/audio/underworld.mp3", volume: 0.55 },
  };

  let el = null;
  let targetVolume = 0.5;
  let fadeTimer = null;

  function fadeTo(vol, ms) {
    if (!el) return;
    clearInterval(fadeTimer);
    const steps = 20;
    const start = el.volume;
    const delta = (vol - start) / steps;
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      el.volume = Math.min(1, Math.max(0, start + delta * i));
      if (i >= steps) clearInterval(fadeTimer);
    }, ms / steps);
  }

  function init(mode) {
    const cfg = TRACKS[mode] || TRACKS.home;
    targetVolume = cfg.volume;

    if (!el) {
      el = document.createElement("audio");
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
      document.body.appendChild(el);
    }
    el.src = cfg.src;
    el.volume = 0;

    const tryPlay = () => {
      el.play()
        .then(() => fadeTo(targetVolume, 1800))
        .catch(() => {
          // Autoplay blocked by the browser — this is a hard policy no
          // site can override. Fall back to starting on first interaction.
          const resume = () => {
            el.play().then(() => fadeTo(targetVolume, 600));
            document.removeEventListener("pointerdown", resume);
            document.removeEventListener("keydown", resume);
            document.removeEventListener("touchstart", resume);
          };
          document.addEventListener("pointerdown", resume, { once: true });
          document.addEventListener("keydown", resume, { once: true });
          document.addEventListener("touchstart", resume, { once: true });
        });
    };
    tryPlay();
  }

  function duck() {
    if (!el) return;
    fadeTo(targetVolume * 0.22, 250);
  }
  function unduck() {
    if (!el) return;
    fadeTo(targetVolume, 500);
  }

  window.templeAudio = { init, duck, unduck };
})();
