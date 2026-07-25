document.addEventListener("DOMContentLoaded", function () {
  if (!window.GodScene) return;
  const stage = GodScene.init("trial-scene", {
    fog: 0x140b1f, fogDensity: 0.06, bg: 0x0b0713, rim: 0x6a2fce, torch: 0xffb35c,
    particleColor: 0xffcf8a, particleCount: 300,
  });
  if (!stage) return;

  const zeus = GodScene.buildBust(stage.THREE, {
    skin: 0xdccfae, accent: 0x8a7a52, eye: 0xffcc55, eyeIntensity: 1.9,
    beard: true, weapon: "bolt", scale: 1.35,
  });
  zeus.position.set(0, -0.6, 0);
  stage.rig.add(zeus);

  const nameEl = document.querySelector(".speaker-name");
  const textEl = document.getElementById("dialogue-text");
  const riddleText = document.getElementById("riddle-data").textContent;
  const hearBtn = document.getElementById("hear-btn");

  hearBtn.addEventListener("click", function () {
    hearBtn.disabled = true;
    Dialogue.say(nameEl, textEl, zeus, "Zeus, Lord of Olympus", riddleText, { pitch: 0.55, rate: 0.82 })
      .then(function () { hearBtn.disabled = false; });
  });
});
