// Dialogue box with real browser text-to-speech (SpeechSynthesis) and a
// mouth-flap animation on the 3D bust synced to actual speech, not a
// pre-timed fake. Picks the best-quality voice the browser/OS actually
// offers (voice engines vary wildly; this can't change the underlying
// synthesis quality, only choose the best of what's available) and ducks
// the background score while a god is speaking so the voice reads clearly.

(function () {
  let voicesPromise = null;
  function loadVoices() {
    if (voicesPromise) return voicesPromise;
    voicesPromise = new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve([]); return; }
      const existing = window.speechSynthesis.getVoices();
      if (existing.length) { resolve(existing); return; }
      window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
    });
    return voicesPromise;
  }

  function pickVoice(voices, genderHint) {
    if (!voices.length) return null;
    const inEnglish = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
    const pool = inEnglish.length ? inEnglish : voices;
    const scored = pool.map((v) => {
      const n = v.name.toLowerCase();
      let score = 0;
      if (/natural|neural|online|premium|enhanced|wavenet/.test(n)) score += 4;
      if (/google/.test(n)) score += 2;
      if (/microsoft/.test(n)) score += 1;
      if (v.localService === false) score += 1;
      if (/compact|espeak|robot/.test(n)) score -= 4;
      if (genderHint === "male" && /female|woman|zira|susan|samantha/.test(n)) score -= 2;
      if (genderHint === "male" && /male|man|david|guy|daniel|mark/.test(n)) score += 1;
      if (genderHint === "female" && /male|man\b|david|guy|daniel|mark/.test(n)) score -= 2;
      if (genderHint === "female" && /female|woman|zira|susan|samantha/.test(n)) score += 1;
      return { v, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].v;
  }

  async function speak(text, opts) {
    opts = opts || {};
    if (!("speechSynthesis" in window)) return;
    const voices = await loadVoices();
    const voice = pickVoice(voices, opts.gender);
    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      if (voice) utter.voice = voice;
      utter.pitch = opts.pitch != null ? opts.pitch : 0.6;
      utter.rate = opts.rate != null ? opts.rate : 0.85;
      utter.volume = 1;
      utter.onend = resolve;
      utter.onerror = resolve;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    });
  }

  function typewriter(el, text, ms) {
    return new Promise((resolve) => {
      el.textContent = "";
      let i = 0;
      const id = setInterval(() => {
        el.textContent += text[i];
        i++;
        if (i >= text.length) { clearInterval(id); resolve(); }
      }, ms || 22);
    });
  }

  function animateMouth(bust) {
    if (!bust || !bust.userData.mouth) return () => {};
    let raf;
    const mouth = bust.userData.mouth;
    const head = bust.userData.head;
    const baseY = mouth.scale.y;
    const baseHeadX = head ? head.rotation.x : 0;
    function tick() {
      const speaking = window.speechSynthesis && window.speechSynthesis.speaking;
      mouth.scale.y = speaking ? baseY * (0.6 + Math.random() * 2.2) : baseY;
      if (head) {
        head.rotation.x = speaking ? baseHeadX + Math.sin(Date.now() * 0.006) * 0.03 : baseHeadX;
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      cancelAnimationFrame(raf);
      if (head) head.rotation.x = baseHeadX;
    };
  }

  async function say(nameEl, textEl, bust, name, text, voiceOpts) {
    nameEl.textContent = name;
    const stopMouth = animateMouth(bust);
    if (window.templeAudio) templeAudio.duck();
    const typing = typewriter(textEl, text, Math.max(14, 900 / text.length));
    await Promise.all([speak(text, voiceOpts), typing]);
    stopMouth();
    if (window.templeAudio) templeAudio.unduck();
  }

  window.Dialogue = { speak, typewriter, say };
})();
