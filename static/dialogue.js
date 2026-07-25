// Dialogue box with real browser text-to-speech (SpeechSynthesis) and a
// mouth-flap animation on the 3D bust synced to actual speech, not a
// pre-timed fake.

(function () {
  function speak(text, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      const utter = new SpeechSynthesisUtterance(text);
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
    const typing = typewriter(textEl, text, Math.max(14, 900 / text.length));
    await Promise.all([speak(text, voiceOpts), typing]);
    stopMouth();
  }

  window.Dialogue = { speak, typewriter, say };
})();
