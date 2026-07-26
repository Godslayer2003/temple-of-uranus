document.addEventListener("DOMContentLoaded", function () {
  if (window.templeAudio) templeAudio.init("trial");

  if (!window.GodScene) {
    const loading = document.getElementById("scene-loading");
    if (loading) loading.textContent = "The gods are silent — your browser could not summon the 3D realm.";
    return;
  }

  const stage = GodScene.init("trial-scene", {
    fog: 0x140b1f, fogDensity: 0.04, bg: 0x0b0713, rim: 0x6a2fce, torch: 0xffb35c,
    particleColor: 0xffcf8a, particleCount: 300,
    skyPhoto: "https://images.unsplash.com/photo-1760262176353-b04199ea732c?fm=jpg&q=70&w=1920&auto=format&fit=crop",
  });
  if (!stage) return;

  const PRESENTERS = {
    zeus: {
      tint: 0xffcc33,
      model: "warrior",
      voice: { pitch: 0.55, rate: 0.82, gender: "male" },
    },
    poseidon: {
      tint: 0x2299cc,
      model: "body", gender: "male",
      voice: { pitch: 0.4, rate: 0.76, gender: "male" },
    },
    athena: {
      tint: 0x8855dd,
      model: "body", gender: "female",
      voice: { pitch: 1.05, rate: 0.94, gender: "female" },
    },
  };

  const presenterKey = document.getElementById("presenter-data").textContent.trim();
  const presenter = PRESENTERS[presenterKey] || PRESENTERS.zeus;

  const deity = presenter.model === "body"
    ? GodScene.buildRealBody(stage.THREE, { tint: presenter.tint, scale: 1.15, gender: presenter.gender })
    : GodScene.buildRealWarrior(stage.THREE, { tint: presenter.tint, scale: 1.15 });
  deity.position.set(0, -0.6, 0);
  stage.rig.add(deity);

  const nameEl = document.querySelector(".speaker-name");
  const textEl = document.getElementById("dialogue-text");
  const riddleText = document.getElementById("riddle-data").textContent;
  const introText = document.getElementById("intro-data").textContent;
  const riddleId = document.getElementById("riddle-id-data").textContent.trim();
  const introIndex = document.getElementById("intro-index-data").textContent.trim();
  const presenterName = nameEl.textContent;
  const hearBtn = document.getElementById("hear-btn");

  const introAudio = `/static/voices/intro_${presenterKey}_${introIndex}.mp3`;
  const riddleAudio = `/static/voices/riddle_${riddleId}_${presenterKey}.mp3`;

  hearBtn.addEventListener("click", function () {
    hearBtn.disabled = true;
    Dialogue.say(nameEl, textEl, deity, presenterName, introText, introAudio, presenter.voice)
      .then(function () {
        return Dialogue.say(nameEl, textEl, deity, presenterName, riddleText, riddleAudio, presenter.voice);
      })
      .then(function () { hearBtn.disabled = false; });
  });
});
