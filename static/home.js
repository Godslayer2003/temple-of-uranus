document.addEventListener("DOMContentLoaded", function () {
  if (window.templeAudio) templeAudio.init("home");

  if (!window.GodScene) {
    const loading = document.getElementById("scene-loading");
    if (loading) loading.style.display = "none";
    return;
  }
  const stage = GodScene.init("home-scene", {
    fog: 0x0e0e1a, fogDensity: 0.045, bg: 0x0e0e1a, rim: 0x6a2fce, torch: 0xffb35c,
    particleColor: 0xa98fff, particleCount: 220,
    cameraRest: [0, 3.2, 12.5], cameraStart: [0, 7, 20], lookAt: [0, 2.2, -0.6],
  });
  if (!stage) return;
  const T = stage.THREE;

  const gods = [
    { x: -3.4, cfg: { skin: 0xdccfae, accent: 0x8a7a52, eye: 0xffcc55, eyeIntensity: 1.6, beard: true, weapon: "bolt", scale: 0.85 } },
    { x: -1.6, cfg: { skin: 0xd3e2e2, accent: 0x6fb9c4, eye: 0x9fe8ff, eyeIntensity: 1.4, beard: true, weapon: "trident", scale: 0.85 } },
    { x: 0,    cfg: { skin: 0xe8ddc8, accent: 0x7a6a48, eye: 0xff4d2e, eyeIntensity: 2, snakes: true, scale: 0.95 } },
    { x: 1.6,  cfg: { skin: 0xd9cdad, accent: 0xc9a227, eye: 0xffe9a8, eyeIntensity: 1.4, helmet: true, weapon: "spear", scale: 0.85 } },
    { x: 3.4,  cfg: { skin: 0xcbb3a8, accent: 0x6b2020, eye: 0xff2200, eyeIntensity: 1.8, beard: true, weapon: "sword", scale: 0.85 } },
  ];

  gods.forEach((g) => {
    const bust = GodScene.buildBust(T, g.cfg);
    bust.position.x = g.x;
    bust.position.z = g.x === 0 ? -1.2 : -0.4;
    stage.rig.add(bust);
  });
});
