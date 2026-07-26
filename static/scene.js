// Shared 3D deity scene, built with Three.js (loaded from CDN in each
// template). One procedural bust builder is reused everywhere (home
// pantheon, the Trial, Olympus, the Underworld): real geometry, a
// canvas-generated marble texture (no external image assets), real 3D
// weapons held in-hand, real sculpted temple columns and vases (CC0 glTF
// models, loaded progressively — primitives show immediately, swapped for
// the real models once they load), a particle atmosphere, optional bloom
// post-processing (feature-detected, falls back cleanly if the addon
// scripts didn't load), a cinematic camera dolly-in, and "alive" behavior
// on every figure: blinking, idle breathing, and heads that turn to track
// the cursor.

(function () {
  // Real photographed marble (Poly Haven, CC0) is loaded once and shared
  // across every bust. Canvas-noise is only the immediate placeholder for
  // the instant before the photo finishes loading — every material that
  // used it gets retroactively swapped once the real texture is ready.
  let realMarbleTex = null;
  let realMarbleLoading = null;
  const pendingSkinMaterials = [];

  function proceduralMarbleTexture(THREE) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d9cdae";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 42; i++) {
      ctx.strokeStyle = `rgba(55,45,30,${0.08 + Math.random() * 0.14})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.8;
      ctx.beginPath();
      let x = Math.random() * size, y = Math.random() * size;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 90;
        y += (Math.random() - 0.5) * 90;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function loadRealMarble(THREE) {
    if (realMarbleLoading) return realMarbleLoading;
    realMarbleLoading = new Promise((resolve) => {
      new THREE.TextureLoader().load(
        "/static/textures/marble.jpg",
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(1.6, 1.6);
          realMarbleTex = tex;
          pendingSkinMaterials.forEach((m) => { m.map = tex; m.needsUpdate = true; });
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
    return realMarbleLoading;
  }

  function loadBackgroundPhoto(THREE, scene, url) {
    new THREE.TextureLoader().load(url, (tex) => {
      scene.background = tex;
    });
  }

  // Real PBR gold texture (ambientCG "Metal007", CC0) — color + normal +
  // roughness maps, used unconditionally on every pedestal regardless of
  // the figure's own tint, so every god/skeleton/Medusa stands on the same
  // real gold-textured plinth rather than a flat color matching its own
  // tint (which would otherwise multiply the texture into a muddy version
  // of whatever color the statue is).
  let goldMaps = null;
  let goldLoading = null;
  const pendingGoldMaterials = [];

  function loadGoldTexture(THREE) {
    if (goldLoading) return goldLoading;
    const loader = new THREE.TextureLoader();
    const load = (url) =>
      new Promise((resolve) => {
        loader.load(url, (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(1.4, 1);
          resolve(tex);
        }, undefined, () => resolve(null));
      });
    goldLoading = Promise.all([
      load("/static/textures/gold/color.jpg"),
      load("/static/textures/gold/normal.jpg"),
      load("/static/textures/gold/roughness.jpg"),
    ]).then(([map, normalMap, roughnessMap]) => {
      if (!map) return null;
      goldMaps = { map, normalMap, roughnessMap };
      pendingGoldMaterials.forEach((m) => {
        m.map = goldMaps.map;
        m.normalMap = goldMaps.normalMap;
        m.roughnessMap = goldMaps.roughnessMap;
        m.needsUpdate = true;
      });
      pendingGoldMaterials.length = 0;
      return goldMaps;
    });
    return goldLoading;
  }

  function goldPedestalMaterial(THREE) {
    const opts = { color: 0xd7c07a, roughness: 0.55, metalness: 0.7 };
    if (goldMaps) Object.assign(opts, { map: goldMaps.map, normalMap: goldMaps.normalMap, roughnessMap: goldMaps.roughnessMap });
    const mat = new THREE.MeshStandardMaterial(opts);
    if (!goldMaps) pendingGoldMaterials.push(mat);
    return mat;
  }

  // Real sculpted Greek-warrior model (CC0, "Achilles Spartan Greek
  // Warrior" by gamekorp on OpenGameArt) — a genuine detailed 3D character,
  // not procedural primitives. One shared mesh, re-tinted per god the same
  // way the marble is re-tinted: material.color multiplies the photo
  // texture, so Zeus/Poseidon/Ares/Hades/Athena each read distinctly from
  // one real asset. No built-in rig, so blink/talk facial animation (which
  // needs separate mouth/eye sub-meshes) isn't available on this model —
  // idle sway and camera-facing tracking still apply to the whole figure.
  let warriorModel = null;
  let warriorTex = null;
  let warriorLoading = null;
  const pendingWarriors = [];

  function loadWarriorModel(THREE) {
    if (warriorLoading) return warriorLoading;
    warriorLoading = new Promise((resolve) => {
      if (!THREE.OBJLoader) { resolve(null); return; }
      new THREE.TextureLoader().load(
        "/static/models/achilles/texture.jpg",
        (tex) => {
          new THREE.OBJLoader().load(
            "/static/models/achilles/mesh.obj",
            (obj) => {
              warriorModel = obj;
              warriorTex = tex;
              pendingWarriors.forEach(({ group, tint }) => fillWarrior(THREE, group, tint));
              pendingWarriors.length = 0;
              resolve(obj);
            },
            undefined,
            () => resolve(null)
          );
        },
        undefined,
        () => resolve(null)
      );
    });
    return warriorLoading;
  }

  function fillWarrior(THREE, group, tint) {
    const model = warriorModel.clone(true);
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({ map: warriorTex, color: tint, roughness: 0.65, metalness: 0.12 });
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 3.2 / (size.y || 1);
    model.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(model);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);
    model.position.set(-center2.x, -box2.min.y + 0.5, -center2.z);

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.2), goldPedestalMaterial(THREE));
    pedestal.position.y = 0.25;

    group.add(model, pedestal);
  }

  // Returns a group positioned/scaled like buildBust()'s output. Renders
  // empty for the brief moment before the model finishes loading (the
  // scene-loading overlay covers most of that window already), then
  // populates in place once ready.
  function buildRealWarrior(THREE, cfg) {
    cfg = Object.assign({ tint: 0xd9cdad, scale: 1 }, cfg);
    const group = new THREE.Group();
    group.userData.isRealModel = true;
    group.scale.setScalar(cfg.scale);
    if (warriorModel) fillWarrior(THREE, group, cfg.tint);
    else pendingWarriors.push({ group, tint: cfg.tint });
    return group;
  }

  // Real CC0 low-poly skeleton ("LowPoly Animated Monsters" by Quaternius,
  // itch.io) — a second, genuinely different sourced model, used only for
  // the Underworld/Hades figure. Untextured (flat vertex-color material in
  // the source file), so unlike the warrior it's tinted with a plain
  // MeshStandardMaterial color rather than a photo texture. Loaded lazily
  // (only when buildRealSkeleton is actually called) since it's only used
  // on one page, not preloaded on every scene like the warrior model.
  let skeletonModel = null;
  let skeletonLoading = null;
  const pendingSkeletons = [];

  function loadSkeletonModel(THREE) {
    if (skeletonLoading) return skeletonLoading;
    skeletonLoading = new Promise((resolve) => {
      if (!THREE.OBJLoader) { resolve(null); return; }
      new THREE.OBJLoader().load(
        "/static/models/skeleton/Skeleton.obj",
        (obj) => {
          skeletonModel = obj;
          pendingSkeletons.forEach(({ group, tint }) => fillSkeleton(THREE, group, tint));
          pendingSkeletons.length = 0;
          resolve(obj);
        },
        undefined,
        () => resolve(null)
      );
    });
    return skeletonLoading;
  }

  function fillSkeleton(THREE, group, tint) {
    const model = skeletonModel.clone(true);
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.75, metalness: 0.05 });
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 3.0 / (size.y || 1);
    model.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(model);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);
    model.position.set(-center2.x, -box2.min.y + 0.5, -center2.z);

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.2), goldPedestalMaterial(THREE));
    pedestal.position.y = 0.25;

    group.add(model, pedestal);
  }

  function buildRealSkeleton(THREE, cfg) {
    cfg = Object.assign({ tint: 0xd8cba8, scale: 1 }, cfg);
    const group = new THREE.Group();
    group.userData.isRealModel = true;
    group.scale.setScalar(cfg.scale);
    loadSkeletonModel(THREE);
    if (skeletonModel) fillSkeleton(THREE, group, cfg.tint);
    else pendingSkeletons.push({ group, tint: cfg.tint });
    return group;
  }

  // Real CC0 "Universal Base Characters" (Quaternius, itch.io) — genuinely
  // distinct sculpted male and female bodies (not a recolor of the
  // Achilles warrior mesh), loaded via glTF. Tinted the same way as the
  // warrior/skeleton: a shared map+normal+roughness set multiplied by a
  // per-god color, so the god-color-coding used elsewhere on the site
  // (auras, UI accents) still applies to these too.
  const bodyModels = {};
  const bodyTextures = {};
  const bodyLoading = {};
  const pendingBodies = [];

  function loadBodyModel(THREE, gender) {
    if (bodyLoading[gender]) return bodyLoading[gender];
    const base = `/static/models/ubc_${gender}/`;
    const file = gender === "male" ? "Superhero_Male_FullBody.gltf" : "Superhero_Female_FullBody.gltf";
    bodyLoading[gender] = new Promise((resolve) => {
      if (!THREE.GLTFLoader) { resolve(null); return; }
      const texLoader = new THREE.TextureLoader();
      const loadTex = (name) => new Promise((res) => texLoader.load(`${base}${gender}_${name}.jpg`, res, undefined, () => res(null)));
      Promise.all([loadTex("color"), loadTex("normal"), loadTex("roughness")]).then(([map, normalMap, roughnessMap]) => {
        bodyTextures[gender] = { map, normalMap, roughnessMap };
        new THREE.GLTFLoader().load(`${base}${file}`, (gltf) => {
          bodyModels[gender] = gltf.scene;
          pendingBodies
            .filter((p) => p.gender === gender)
            .forEach((p) => fillBody(THREE, p.group, p.tint, gender));
          for (let i = pendingBodies.length - 1; i >= 0; i--) {
            if (pendingBodies[i].gender === gender) pendingBodies.splice(i, 1);
          }
          resolve(gltf.scene);
        }, undefined, () => resolve(null));
      });
    });
    return bodyLoading[gender];
  }

  function fillBody(THREE, group, tint, gender) {
    const model = bodyModels[gender].clone(true);
    const tex = bodyTextures[gender];
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({
          map: tex.map, normalMap: tex.normalMap, roughnessMap: tex.roughnessMap,
          color: tint, roughness: 0.85, metalness: 0.05,
        });
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 3.2 / (size.y || 1);
    model.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(model);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);
    model.position.set(-center2.x, -box2.min.y + 0.5, -center2.z);

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.2), goldPedestalMaterial(THREE));
    pedestal.position.y = 0.25;

    group.add(model, pedestal);
  }

  function buildRealBody(THREE, cfg) {
    cfg = Object.assign({ tint: 0xd9cdad, scale: 1, gender: "male" }, cfg);
    const group = new THREE.Group();
    group.userData.isRealModel = true;
    group.scale.setScalar(cfg.scale);
    loadBodyModel(THREE, cfg.gender);
    if (bodyModels[cfg.gender]) fillBody(THREE, group, cfg.tint, cfg.gender);
    else pendingBodies.push({ group, tint: cfg.tint, gender: cfg.gender });
    return group;
  }

  function weaponMesh(THREE, kind, mat, glowMat) {
    const g = new THREE.Group();
    if (kind === "bolt") {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.7); shape.lineTo(-0.18, 0.15); shape.lineTo(0.03, 0.1);
      shape.lineTo(-0.15, -0.6); shape.lineTo(0.22, -0.05); shape.lineTo(0.02, -0.02);
      shape.lineTo(0, 0.7);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
      const bolt = new THREE.Mesh(geo, glowMat);
      g.add(bolt);
    } else if (kind === "trident") {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 8), mat);
      g.add(shaft);
      [-0.16, 0, 0.16].forEach((x) => {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 6), glowMat);
        tip.position.set(x, 0.9, 0);
        g.add(tip);
      });
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), mat);
      cross.rotation.z = Math.PI / 2;
      cross.position.y = 0.72;
      g.add(cross);
    } else if (kind === "sword") {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.1, 0.02), glowMat);
      blade.position.y = 0.75;
      g.add(blade);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), mat);
      guard.position.y = 0.18;
      g.add(guard);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6), mat);
      hilt.position.y = 0.02;
      g.add(hilt);
    } else if (kind === "spear") {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8), mat);
      g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), glowMat);
      tip.position.y = 1.0;
      g.add(tip);
    }
    return g;
  }

  function buildBust(THREE, cfg) {
    cfg = Object.assign({
      skin: 0xd9cdad, accent: 0x8a7a52, eye: 0xff4422, eyeIntensity: 1.6,
      beard: false, helmet: false, snakes: false, weapon: null, scale: 1,
    }, cfg);

    const group = new THREE.Group();
    const tex = realMarbleTex || proceduralMarbleTexture(THREE);
    const skinMat = new THREE.MeshStandardMaterial({ map: tex, color: cfg.skin, roughness: 0.55, metalness: 0.06 });
    if (!realMarbleTex) pendingSkinMaterials.push(skinMat);
    const accentMat = new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.6, metalness: 0.25 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: cfg.eye, emissive: cfg.eye, emissiveIntensity: cfg.eyeIntensity, roughness: 0.3 });
    const glowMat = new THREE.MeshStandardMaterial({ color: cfg.accent, emissive: cfg.accent, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.4 });

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.2), goldPedestalMaterial(THREE));
    pedestal.position.y = 0.25;
    group.add(pedestal);

    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.86, 1.75, 20), skinMat);
    robe.position.y = 1.37;
    group.add(robe);

    // shoulders for silhouette bulk, and the anchor for idle-breathing motion
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), skinMat);
    shoulders.position.y = 2.18;
    group.add(shoulders);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.35, 14), skinMat);
    neck.position.y = 2.3;
    group.add(neck);

    const headPivot = new THREE.Group();
    headPivot.position.y = 2.78;
    group.add(headPivot);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), skinMat);
    head.scale.set(1, 1.14, 0.94);
    headPivot.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.065, 10, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.19, 0.02, 0.49);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.19;
    headPivot.add(eyeL, eyeR);
    const eyeGlowL = new THREE.PointLight(cfg.eye, 0.12, 1.2);
    eyeGlowL.position.copy(eyeL.position);
    const eyeGlowR = eyeGlowL.clone();
    eyeGlowR.position.copy(eyeR.position);
    headPivot.add(eyeGlowL, eyeGlowR);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.06), accentMat);
    mouth.position.set(0, -0.26, 0.53);
    headPivot.add(mouth);

    if (cfg.beard) {
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.62, 12), accentMat);
      beard.position.set(0, -0.46, 0.18);
      beard.rotation.x = Math.PI;
      headPivot.add(beard);
    }

    if (cfg.helmet) {
      const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.63, 0.72, 12), accentMat);
      helmet.position.y = 0.4;
      headPivot.add(helmet);
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.72), glowMat);
      crest.position.y = 0.76;
      headPivot.add(crest);
    } else if (!cfg.snakes) {
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.12 + (i / 10) * 0.76);
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.36, 6), accentMat);
        strand.position.set(Math.cos(a) * 0.5, 0.3 + Math.sin(a) * 0.26, Math.sin(a) * 0.16 - 0.1);
        strand.rotation.z = a - Math.PI / 2;
        headPivot.add(strand);
      }
    }

    if (cfg.snakes) {
      const snakeGroup = new THREE.Group();
      for (let i = 0; i < 11; i++) {
        const a = (Math.PI * 0.95 * i) / 10 + Math.PI * 0.52;
        const snake = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.58, 8), skinMat);
        snake.position.set(Math.cos(a) * 0.56, 0.3 + Math.sin(a) * 0.42, Math.sin(a) * 0.2 - 0.1);
        snake.rotation.z = a - Math.PI / 2;
        snake.userData.baseRotZ = snake.rotation.z;
        snake.userData.phase = Math.random() * Math.PI * 2;
        snakeGroup.add(snake);
      }
      headPivot.add(snakeGroup);
      group.userData.snakes = snakeGroup;
    }

    if (cfg.weapon) {
      const weapon = weaponMesh(THREE, cfg.weapon, accentMat, glowMat);
      weapon.position.set(0.82, 1.3, 0.1);
      weapon.rotation.z = -0.18;
      group.add(weapon);
      group.userData.weapon = weapon;
    }

    group.userData.head = headPivot;
    group.userData.mouth = mouth;
    group.userData.eyes = [eyeL, eyeR];
    group.userData.chest = shoulders;
    group.userData.nextBlink = 1 + Math.random() * 3;
    group.scale.setScalar(cfg.scale);
    group.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return group;
  }

  function buildColumns(THREE, mat, count, radius) {
    const g = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * i) / (count - 1) + Math.PI;
      const col = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 5.5, 16), mat);
      shaft.position.y = 2.75;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 0.3, 16), mat);
      cap.position.y = 5.6;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16), mat);
      base.position.y = 0.1;
      col.add(shaft, cap, base);
      col.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius - 2);
      col.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      g.add(col);
    }
    return g;
  }

  // Loads the real CC0 glTF props (sculpted columns/vases) in the background
  // and swaps them in once ready. Primitive geometry renders immediately so
  // the scene is never empty while this resolves.
  function loadRealProps(THREE) {
    if (!THREE.GLTFLoader) return Promise.resolve({});
    const loader = new THREE.GLTFLoader();
    const load = (url) =>
      new Promise((resolve) => {
        loader.load(url, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
      });
    return Promise.all([
      load("/static/models/greek_column_01/greek_column_01.glb"),
      load("/static/models/greek_vase_01/greek_vase_01.glb"),
    ]).then(([column, vase]) => ({ column, vase }));
  }

  function buildParticles(THREE, count, color, spread, size) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = Math.random() * spread * 0.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData.speed = 0.15 + Math.random() * 0.1;
    return pts;
  }

  function tryBuildComposer(THREE, renderer, scene, camera) {
    if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass) return null;
    try {
      const composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.4, 0.86);
      composer.addPass(bloom);
      return composer;
    } catch (e) {
      return null;
    }
  }

  function hideLoading() {
    const el = document.getElementById("scene-loading");
    if (el) el.style.display = "none";
  }

  function init(containerId, opts) {
    const THREE = window.THREE;
    const container = document.getElementById(containerId);
    if (!THREE || !container) return null;

    opts = Object.assign({
      fog: 0x0e0e1a, fogDensity: 0.05, bg: 0x0e0e1a, torch: 0xffb35c,
      rim: 0x6a2fce, groundColor: 0x141420, particleColor: 0xffcf8a,
      particleCount: 260, columnColor: 0xbfb59a, skyPhoto: null,
      cameraRest: [0, 2.6, 8.5], cameraStart: [0, 6.5, 16], lookAt: [0, 2.2, 0],
    }, opts);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(opts.bg);
    scene.fog = new THREE.FogExp2(opts.fog, opts.fogDensity);
    loadRealMarble(THREE);
    loadWarriorModel(THREE);
    loadGoldTexture(THREE);
    if (opts.skyPhoto) loadBackgroundPhoto(THREE, scene, opts.skyPhoto);

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 80);
    const restPos = new THREE.Vector3().fromArray(opts.cameraRest);
    const startPos = new THREE.Vector3().fromArray(opts.cameraStart);
    const lookAtPos = new THREE.Vector3().fromArray(opts.lookAt);
    camera.position.copy(startPos);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding || renderer.outputEncoding;
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.78;
    }
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x6a6a99, 0x0a0a12, 0.55));
    const key = new THREE.PointLight(opts.torch, 1.0, 22);
    key.position.set(-3, 4, 4);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight(opts.rim, 0.7, 22);
    rim.position.set(4, 2.2, -3);
    scene.add(rim);
    const sun = new THREE.DirectionalLight(0xffffff, 0.3);
    sun.position.set(2, 8, 5);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: opts.groundColor, roughness: 0.85 })
    );
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    ground.name = "ground";
    scene.add(ground);

    const columnTex = realMarbleTex || proceduralMarbleTexture(THREE);
    const columnMat = new THREE.MeshStandardMaterial({ map: columnTex, color: opts.columnColor, roughness: 0.75 });
    if (!realMarbleTex) pendingSkinMaterials.push(columnMat);
    const columnRadius = 7.5;
    const columnCount = 5;
    const columnsGroup = buildColumns(THREE, columnMat, columnCount, columnRadius);
    scene.add(columnsGroup);

    loadRealProps(THREE).then(({ column, vase }) => {
      if (column) {
        const positions = columnsGroup.children.map((c) => c.position.clone());
        columnsGroup.clear();
        positions.forEach((pos) => {
          const real = column.clone(true);
          real.scale.setScalar(1.8);
          real.position.copy(pos);
          real.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          scene.add(real);
        });
      }
      if (vase) {
        [[-3.2, -2.8], [3.2, -2.8]].forEach(([x, z]) => {
          const v = vase.clone(true);
          v.scale.setScalar(1.3);
          v.position.set(x, 0, z);
          v.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          scene.add(v);
        });
      }
    });

    const particles = buildParticles(THREE, opts.particleCount, opts.particleColor, 16, opts.particleSize || 0.06);
    scene.add(particles);

    const rig = new THREE.Group();
    scene.add(rig);

    const composer = tryBuildComposer(THREE, renderer, scene, camera);

    function onResize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) composer.setSize(w, h);
    }
    new ResizeObserver(onResize).observe(container);

    const clock = new THREE.Clock();
    let mouseX = 0;
    container.addEventListener("pointermove", (e) => {
      const r = container.getBoundingClientRect();
      mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    });

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      const introT = Math.min(t / 2.6, 1);
      const eased = 1 - Math.pow(1 - introT, 3);
      camera.position.lerpVectors(startPos, restPos, eased);
      camera.lookAt(lookAtPos);

      key.intensity = 0.95 + Math.sin(t * 9) * 0.1 + Math.sin(t * 3.3) * 0.08;
      rig.rotation.y += (mouseX * 0.35 - rig.rotation.y) * 0.02;

      const p = particles.geometry.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] += particles.userData.speed * 0.01;
        if (p[i + 1] > 9) p[i + 1] = -1;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      rig.children.forEach((bust, i) => {
        bust.position.y = Math.sin(t * 0.8 + i) * 0.05;

        if (bust.userData.snakes) {
          bust.userData.snakes.children.forEach((s) => {
            s.rotation.z = s.userData.baseRotZ + Math.sin(t * 3 + s.userData.phase) * 0.25;
          });
        }
        if (bust.userData.weapon) {
          bust.userData.weapon.rotation.z = -0.18 + Math.sin(t * 1.4 + i) * 0.05;
        }

        // idle breathing
        if (bust.userData.chest) {
          const breathe = 1 + Math.sin(t * 1.1 + i) * 0.015;
          bust.userData.chest.scale.set(breathe, 1, breathe);
        }

        // head turns to track the cursor, independent of the whole-rig parallax
        if (bust.userData.head) {
          const targetY = mouseX * 0.18;
          bust.userData.head.rotation.y += (targetY - bust.userData.head.rotation.y) * 0.03;
        }

        // blinking
        if (bust.userData.eyes) {
          if (t > bust.userData.nextBlink && !bust.userData.blinking) {
            bust.userData.blinking = true;
            bust.userData.blinkStart = t;
          }
          if (bust.userData.blinking) {
            const dt = t - bust.userData.blinkStart;
            const closeAmt = dt < 0.06 ? dt / 0.06 : dt < 0.12 ? 1 - (dt - 0.06) / 0.06 : 0;
            bust.userData.eyes.forEach((e) => { e.scale.y = 1 - closeAmt * 0.92; });
            if (dt > 0.12) {
              bust.userData.blinking = false;
              bust.userData.nextBlink = t + 2 + Math.random() * 4;
            }
          }
        }
      });

      if (composer) composer.render();
      else renderer.render(scene, camera);
    }
    animate();
    hideLoading();

    return { THREE, scene, camera, renderer, rig, container };
  }

  window.GodScene = { init, buildBust, buildRealWarrior, buildRealSkeleton, buildRealBody, hideLoading };
})();
