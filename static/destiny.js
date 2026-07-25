document.addEventListener("DOMContentLoaded", function () {
  if (!window.GodScene) return;
  const isOlympus = document.body.dataset.destiny === "olympus";

  const stage = GodScene.init("destiny-scene", isOlympus
    ? { fog: 0xfbe9c6, fogDensity: 0.035, bg: 0xf3d99a, rim: 0xffe9b0, torch: 0xfff3d0, particleColor: 0xfff6d8, particleCount: 260, columnColor: 0xf3e6c4 }
    : { fog: 0x1a0605, fogDensity: 0.08, bg: 0x0a0303, rim: 0xff2200, torch: 0xaa2200, particleColor: 0xff5522, particleCount: 340, columnColor: 0x2a1414 }
  );
  if (!stage) return;

  const deity = GodScene.buildBust(stage.THREE, isOlympus
    ? { skin: 0xfff3da, accent: 0xd9b968, eye: 0xfff2b0, eyeIntensity: 2.2, beard: true, weapon: "bolt", scale: 1.4 }
    : { skin: 0x8a7d86, accent: 0x241018, eye: 0xff3300, eyeIntensity: 2.4, beard: true, weapon: "spear", scale: 1.4 }
  );
  deity.position.set(0, -0.6, 0);
  stage.rig.add(deity);

  const ground = stage.scene.getObjectByName("ground");
  if (ground) {
    ground.material.color.setHex(isOlympus ? 0xe9d9a8 : 0x180404);
    ground.material.roughness = isOlympus ? 0.6 : 1;
  }

  const nameEl = document.querySelector(".speaker-name");
  const textEl = document.getElementById("dialogue-text");
  const line = textEl.textContent.trim();
  const hearBtn = document.getElementById("hear-btn");

  hearBtn.addEventListener("click", function () {
    hearBtn.disabled = true;
    Dialogue.say(nameEl, textEl, deity, nameEl.textContent, line, {
      pitch: isOlympus ? 0.7 : 0.35,
      rate: isOlympus ? 0.9 : 0.75,
    }).then(function () { hearBtn.disabled = false; });
  });
});
