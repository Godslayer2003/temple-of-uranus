document.addEventListener("DOMContentLoaded", function () {
  if (window.templeAudio) templeAudio.init("home");

  if (!window.GodScene) {
    const loading = document.getElementById("scene-loading");
    if (loading) loading.style.display = "none";
    return;
  }
  const stage = GodScene.init("home-scene", {
    fog: 0x0e0e1a, fogDensity: 0.03, bg: 0x0e0e1a, rim: 0x6a2fce, torch: 0xffb35c,
    particleColor: 0xa98fff, particleCount: 220,
    cameraRest: [0, 3.2, 12.5], cameraStart: [0, 7, 20], lookAt: [0, 2.2, -0.6],
    skyPhoto: "https://images.unsplash.com/photo-1760262176353-b04199ea732c?fm=jpg&q=70&w=1920&auto=format&fit=crop",
    wideEnsemble: true,
  });
  if (!stage) return;
  const T = stage.THREE;

  // Three distinct real sourced meshes now, not one mesh recolored five
  // ways: Zeus/Ares keep the Achilles warrior model, Poseidon and Athena
  // use the Universal Base Characters male/female bodies (a second real
  // source), Medusa stays procedural (no free snake-anatomy model exists).
  const gods = [
    { x: -4.6, model: "warrior", cfg: { tint: 0xffcc33, scale: 0.68 } },
    { x: -2.3, model: "body", cfg: { tint: 0x2299cc, scale: 0.68, gender: "male" } },
    { x: 0,    model: "procedural", cfg: { skin: 0xe8ddc8, accent: 0x7a6a48, eye: 0xff4d2e, eyeIntensity: 2, snakes: true, scale: 0.95 } },
    { x: 2.3,  model: "body", cfg: { tint: 0x8855dd, scale: 0.68, gender: "female" } },
    { x: 4.6,  model: "warrior", cfg: { tint: 0xcc2222, scale: 0.68 } },
  ];

  gods.forEach((g) => {
    let bust;
    if (g.model === "warrior") bust = GodScene.buildRealWarrior(T, g.cfg);
    else if (g.model === "body") bust = GodScene.buildRealBody(T, g.cfg);
    else bust = GodScene.buildBust(T, g.cfg);
    bust.position.x = g.x;
    bust.position.z = g.x === 0 ? -1.2 : -0.4;
    stage.rig.add(bust);
  });
});
