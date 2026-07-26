document.addEventListener("DOMContentLoaded", function () {
  const isOlympus = document.body.dataset.destiny === "olympus";
  if (window.templeAudio) templeAudio.init(isOlympus ? "olympus" : "underworld");

  const nameEl = document.querySelector(".speaker-name");
  const textEl = document.getElementById("dialogue-text");
  const line = textEl.textContent.trim();
  const messageIndex = document.getElementById("message-index-data").textContent.trim();
  const hearBtn = document.getElementById("hear-btn");
  const audioUrl = isOlympus ? `/static/voices/olympus_${messageIndex}.mp3` : `/static/voices/underworld_${messageIndex}.mp3`;

  let deity = null;

  if (window.GodScene) {
    const stage = GodScene.init("destiny-scene", isOlympus
      ? { fog: 0xfbe9c6, fogDensity: 0.025, bg: 0xf3d99a, rim: 0xffe9b0, torch: 0xfff3d0, particleColor: 0xfff6d8, particleCount: 260, columnColor: 0xf3e6c4,
          skyPhoto: "https://images.unsplash.com/photo-1759190601110-5252f322b165?fm=jpg&q=70&w=1920&auto=format&fit=crop" }
      : { fog: 0x1a0605, fogDensity: 0.055, bg: 0x0a0303, rim: 0xff2200, torch: 0xaa2200, particleColor: 0xff5522, particleCount: 340, columnColor: 0x2a1414,
          skyPhoto: "https://images.unsplash.com/photo-1631743598935-2d84f8615e4b?fm=jpg&q=70&w=1920&auto=format&fit=crop" }
    );

    if (stage) {
      deity = GodScene.buildRealWarrior(stage.THREE, isOlympus
        ? { tint: 0xffdd66, scale: 1.2 }
        : { tint: 0x3a1a1a, scale: 1.2 }
      );
      deity.position.set(0, -0.6, 0);
      stage.rig.add(deity);

      const ground = stage.scene.getObjectByName("ground");
      if (ground) {
        ground.material.color.setHex(isOlympus ? 0xe9d9a8 : 0x180404);
        ground.material.roughness = isOlympus ? 0.6 : 1;
      }
    }
  }

  hearBtn.addEventListener("click", function () {
    hearBtn.disabled = true;
    Dialogue.say(nameEl, textEl, deity, nameEl.textContent, line, audioUrl, {
      pitch: isOlympus ? 0.7 : 0.35,
      rate: isOlympus ? 0.9 : 0.75,
      gender: "male",
    }).then(function () { hearBtn.disabled = false; });
  });
});
