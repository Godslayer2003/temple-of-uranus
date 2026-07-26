// Background music, sourced from real, verified CC0/public-domain tracks —
// not synthesized:
//   home/trial : "Epic Boss Battle" / "Determined Pursuit" — Juhani Junkala
//                / Emma_MA, CC0, OpenGameArt.org
//   olympus    : "A Legend Will Rise" — CodeManu, CC0, OpenGameArt.org
//   underworld : Holst, "Mars, the Bringer of War" (1914 rec., Skidmore
//                College Orchestra) — public domain, Musopen/Wikimedia
// Plus two quiet secondary layers mixed underneath the main track (see
// static/audio/License.txt for full sourcing):
//   wind  — "Space Winds" by aquinn, OpenGameArt.org, CC0 — every page
//   choir — "Timeless Choir - Ambient" by migfus20, OpenGameArt.org,
//           CC BY 4.0 (credited on-page) — Olympus only
// Plays automatically at ambient volume (~25-30% main, ~7-10% layers):
// attempts autoplay immediately, and only if the browser's autoplay
// policy blocks that does a full-screen "Enter the Temple" click gate
// appear — a real, visible click target instead of silently waiting for
// the next click anywhere. A small corner mute toggle is present (not
// prominent) so removing sound entirely is still possible without ever
// stopping the music by default. duck()/unduck() let spoken dialogue read
// clearly over the whole mix, main track and ambient layers alike.

(function () {
  const TRACKS = {
    home: { src: "/static/audio/home.mp3", volume: 0.28 },
    trial: { src: "/static/audio/trial.mp3", volume: 0.25 },
    olympus: { src: "/static/audio/olympus.mp3", volume: 0.28 },
    underworld: { src: "/static/audio/underworld.mp3", volume: 0.3 },
  };

  const AMBIENT_TRACKS = {
    wind: { src: "/static/audio/ambient-wind.mp3", volume: 0.1 },
    choir: { src: "/static/audio/ambient-choir.mp3", volume: 0.07 },
  };
  const AMBIENT_LAYERS = {
    home: ["wind"],
    trial: ["wind"],
    olympus: ["wind", "choir"],
    underworld: ["wind"],
  };

  let el = null;
  let targetVolume = 0.28;
  let layers = []; // [{ el, targetVolume }]
  let muted = false;

  function fadeElTo(target, vol, ms) {
    clearInterval(target._fadeTimer);
    const steps = 20;
    const start = target.volume;
    const delta = (vol - start) / steps;
    let i = 0;
    target._fadeTimer = setInterval(() => {
      i++;
      target.volume = Math.min(1, Math.max(0, start + delta * i));
      if (i >= steps) clearInterval(target._fadeTimer);
    }, ms / steps);
  }

  function fadeTo(vol, ms) {
    if (el) fadeElTo(el, vol, ms);
  }

  function fadeLayersTo(factor, ms) {
    layers.forEach((layer) => fadeElTo(layer.el, layer.targetVolume * factor, ms));
  }

  function playAll(ms) {
    el.play().then(() => fadeTo(muted ? 0 : targetVolume, ms));
    layers.forEach((layer) => {
      layer.el.play().then(() => fadeElTo(layer.el, muted ? 0 : layer.targetVolume, ms)).catch(() => {});
    });
  }

  function buildGate() {
    const gate = document.createElement("div");
    gate.className = "temple-gate";
    gate.setAttribute("role", "button");
    gate.setAttribute("tabindex", "0");
    gate.setAttribute("aria-label", "Enter the Temple — click or press Enter to begin, with sound");
    gate.innerHTML =
      '<h2>Enter the Temple</h2><p>Click anywhere to begin, with sound</p>';
    document.body.appendChild(gate);
    gate.focus();
    function onEnter(e) {
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      if (e.type === "keydown") e.preventDefault();
      playAll(600);
      gate.classList.add("leaving");
      gate.removeEventListener("click", onEnter);
      gate.removeEventListener("keydown", onEnter);
      setTimeout(() => gate.remove(), 550);
    }
    gate.addEventListener("click", onEnter);
    gate.addEventListener("keydown", onEnter);
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
      fadeLayersTo(muted ? 0 : 1, 300);
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

    layers.forEach((layer) => layer.el.remove());
    layers = (AMBIENT_LAYERS[mode] || []).map((key) => {
      const layerCfg = AMBIENT_TRACKS[key];
      const layerEl = document.createElement("audio");
      layerEl.loop = true;
      layerEl.preload = "auto";
      layerEl.volume = 0;
      layerEl.src = layerCfg.src;
      document.body.appendChild(layerEl);
      return { el: layerEl, targetVolume: layerCfg.volume };
    });

    buildMuteToggle();

    el.play()
      .then(() => {
        fadeTo(targetVolume, 1800);
        layers.forEach((layer) => layer.el.play().then(() => fadeElTo(layer.el, layer.targetVolume, 1800)).catch(() => {}));
      })
      .catch(() => {
        // Autoplay blocked by the browser — a hard policy no site can
        // override. Show a real, visible click target instead of a
        // silent listener on the next click anywhere.
        buildGate();
      });
  }

  function duck() {
    if (muted) return;
    fadeTo(targetVolume * 0.22, 250);
    fadeLayersTo(0.22, 250);
  }
  function unduck() {
    if (muted) return;
    fadeTo(targetVolume, 500);
    fadeLayersTo(1, 500);
  }

  window.templeAudio = { init, duck, unduck };
})();
