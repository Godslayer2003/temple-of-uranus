// Dialogue box driven by real pre-rendered voice audio (see
// scripts/generate_voices.py — gTTS speech pitch-shifted per character),
// not the browser's local SpeechSynthesis. Falls back to SpeechSynthesis
// only if a voice file fails to load, so dialogue never goes silent.
// Mouth-flap animation on the 3D bust is synced to actual audio playback.

(function () {
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

  function animateMouth(bust, isSpeaking) {
    if (!bust || !bust.userData.mouth) return () => {};
    let raf;
    const mouth = bust.userData.mouth;
    const head = bust.userData.head;
    const baseY = mouth.scale.y;
    const baseHeadX = head ? head.rotation.x : 0;
    function tick() {
      const speaking = isSpeaking();
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

  function playFile(url) {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(null); } };
      audio.addEventListener("loadedmetadata", () => {
        if (!settled) resolve(audio);
      });
      audio.addEventListener("error", finish);
      setTimeout(finish, 4000);
    });
  }

  function speakBrowserFallback(text, opts) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = (opts && opts.pitch) || 0.6;
      utter.rate = (opts && opts.rate) || 0.85;
      utter.onend = resolve;
      utter.onerror = resolve;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    });
  }

  // audioUrl: pre-rendered voice file for this exact line.
  // fallbackVoiceOpts: browser TTS pitch/rate used only if the file 404s.
  async function say(nameEl, textEl, bust, name, text, audioUrl, fallbackVoiceOpts) {
    nameEl.textContent = name;
    if (window.templeAudio) templeAudio.duck();

    const audio = audioUrl ? await playFile(audioUrl) : null;

    if (audio) {
      let playing = true;
      const stopMouth = animateMouth(bust, () => playing);
      const played = new Promise((resolve) => {
        audio.addEventListener("ended", () => { playing = false; resolve(); });
        audio.addEventListener("error", () => { playing = false; resolve(); });
      });
      const typing = typewriter(textEl, text, Math.max(14, (audio.duration * 1000) / text.length));
      audio.play().catch(() => {});
      await Promise.all([played, typing]);
      stopMouth();
    } else {
      // voice file missing/failed to load — fall back to browser TTS
      let speaking = true;
      const stopMouth = animateMouth(bust, () => speaking);
      const typing = typewriter(textEl, text, Math.max(14, 900 / text.length));
      await Promise.all([
        speakBrowserFallback(text, fallbackVoiceOpts).then(() => { speaking = false; }),
        typing,
      ]);
      stopMouth();
    }

    if (window.templeAudio) templeAudio.unduck();
  }

  window.Dialogue = { say, typewriter };
})();
