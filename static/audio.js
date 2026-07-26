// Background music, sourced from real, verified CC0/public-domain tracks —
// not synthesized:
//   home/trial : "Epic Boss Battle" / "Determined Pursuit" — Juhani Junkala
//                / Emma_MA, CC0, OpenGameArt.org
//   olympus    : "A Legend Will Rise" — CodeManu, CC0, OpenGameArt.org
//   underworld : Holst, "Mars, the Bringer of War" (1914 rec., Skidmore
//                College Orchestra) — public domain, Musopen/Wikimedia
// Plays automatically at ambient volume (~25-30%): attempts autoplay
// immediately, and only if the browser's autoplay policy blocks that does
// a full-screen "Enter the Temple" click gate appear — a real, visible
// click target instead of silently waiting for the next click anywhere.
// A small corner mute toggle is present (not prominent) so removing sound
// entirely is still possible without ever stopping the music by default.
// duck()/unduck() let spoken dialogue read clearly over the music.

(function () {
  const TRACKS = {
    home: { src: "/static/audio/home.mp3", volume: 0.28 },
    trial: { src: "/static/audio/trial.mp3", volume: 0.25 },
    olympus: { src: "/static/audio/olympus.mp3", volume: 0.28 },
    underworld: { src: "/static/audio/underworld.mp3", volume: 0.3 },
  };

  let el = null;
  let targetVolume = 0.28;
  let fadeTimer = null;
  let muted = false;

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

  function buildGate() {
    const gate = document.createElement("div");
    gate.className = "temple-gate";
    gate.innerHTML =
      '<h2>Enter the Temple</h2><p>Click anywhere to begin, with sound</p>';
    document.body.appendChild(gate);
    gate.addEventListener("click", function onEnter() {
      el.play().then(() => fadeTo(muted ? 0 : targetVolume, 600));
      gate.classList.add("leaving");
      gate.removeEventListener("click", onEnter);
      setTimeout(() => gate.remove(), 550);
    });
    return gate;
  }

  function buildMuteToggle() {
    if (document.querySelector(".mute-toggle")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mute-toggle";
    btn.setAttribute("aria-label", "Mute background music");
    btn.textContent = "\u{1F50A}"; // speaker
    btn.addEventListener("click", () => {
      muted = !muted;
      btn.classList.toggle("muted", muted);
      btn.textContent = muted ? "\u{1F507}" : "\u{1F50A}"; // muted-speaker : speaker
      btn.setAttribute("aria-label", muted ? "Unmute background music" : "Mute background music");
      fadeTo(muted ? 0 : targetVolume, 300);
    });
    document.body.appendChild(btn);
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

    buildMuteToggle();

    el.play()
      .then(() => fadeTo(targetVolume, 1800))
      .catch(() => {
        // Autoplay blocked by the browser — a hard policy no site can
        // override. Show a real, visible click target instead of a
        // silent listener on the next click anywhere.
        buildGate();
      });
  }

  function duck() {
    if (!el || muted) return;
    fadeTo(targetVolume * 0.22, 250);
  }
  function unduck() {
    if (!el || muted) return;
    fadeTo(targetVolume, 500);
  }

  window.templeAudio = { init, duck, unduck };
})();
