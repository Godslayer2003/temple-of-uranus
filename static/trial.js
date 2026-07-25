document.addEventListener("DOMContentLoaded", function () {
  if (window.templeAudio) templeAudio.init("trial");

  if (!window.GodScene) {
    const loading = document.getElementById("scene-loading");
    if (loading) loading.textContent = "The gods are silent — your browser could not summon the 3D realm.";
    return;
  }

  const stage = GodScene.init("trial-scene", {
    fog: 0x140b1f, fogDensity: 0.06, bg: 0x0b0713, rim: 0x6a2fce, torch: 0xffb35c,
    particleColor: 0xffcf8a, particleCount: 300,
  });
  if (!stage) return;

  const PRESENTERS = {
    zeus: {
      cfg: { skin: 0xdccfae, accent: 0x8a7a52, eye: 0xffcc55, eyeIntensity: 1.9, beard: true, weapon: "bolt", scale: 1.35 },
      voice: { pitch: 0.55, rate: 0.82, gender: "male" },
    },
    poseidon: {
      cfg: { skin: 0xd3e2e2, accent: 0x6fb9c4, eye: 0x9fe8ff, eyeIntensity: 1.6, beard: true, weapon: "trident", scale: 1.35 },
      voice: { pitch: 0.4, rate: 0.76, gender: "male" },
    },
    athena: {
      cfg: { skin: 0xd9cdad, accent: 0xc9a227, eye: 0xffe9a8, eyeIntensity: 1.5, helmet: true, weapon: "spear", scale: 1.3 },
      voice: { pitch: 1.05, rate: 0.94, gender: "female" },
    },
  };

  const presenterKey = document.getElementById("presenter-data").textContent.trim();
  const presenter = PRESENTERS[presenterKey] || PRESENTERS.zeus;

  const deity = GodScene.buildBust(stage.THREE, presenter.cfg);
  deity.position.set(0, -0.6, 0);
  stage.rig.add(deity);

  const nameEl = document.querySelector(".speaker-name");
  const textEl = document.getElementById("dialogue-text");
  const riddleText = document.getElementById("riddle-data").textContent;
  const introText = document.getElementById("intro-data").textContent;
  const presenterName = nameEl.textContent;
  const hearBtn = document.getElementById("hear-btn");

  hearBtn.addEventListener("click", function () {
    hearBtn.disabled = true;
    Dialogue.say(nameEl, textEl, deity, presenterName, introText, presenter.voice)
      .then(function () {
        return Dialogue.say(nameEl, textEl, deity, presenterName, riddleText, presenter.voice);
      })
      .then(function () { hearBtn.disabled = false; });
  });
});
