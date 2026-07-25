// Original synthesized "epic war-god" score, built entirely from
// oscillators/noise in-browser — inspired by the mood of early-2010s
// orchestral war-god game scores, not a reproduction of any copyrighted
// recording. Plays automatically as ambient background music (no visible
// toggle) with a per-page mood, a real melodic brass motif instead of
// static chord stabs, layered percussion, a full choir, a dynamic
// loud/pulled-back arrangement instead of a flat loop, a generated
// convolution reverb, and a compressor for punch. Also exposes duck()/
// unduck() so spoken dialogue can be heard clearly over the music.

(function () {
  let ctx = null;
  let master = null;
  let masterTarget = 0.55;
  let reverbSend = null;
  let playing = false;
  let nextStepTime = 0;
  let stepIndex = 0;
  let schedulerId = null;
  let currentMode = null;

  // 32-step cycle (4 bars of 8): bars 1-2 are the full "drop", bars 3-4 pull
  // back to choir + sparse percussion before crashing back in — a real
  // dynamic arc instead of one flat repeating pattern.
  const STEPS_PER_CYCLE = 32;

  const MODES = {
    home: {
      bpm: 88, root: 73.42, third: 87.31, fifth: 110.0, // D minor
      pad: [73.42, 110.0, 146.83, 174.61, 220.0],
      intensity: 0.55, torch: "warm",
    },
    trial: {
      bpm: 80, root: 69.3, third: 82.41, fifth: 103.83, // C#/Db minor, tenser
      pad: [69.3, 103.83, 138.59, 164.81, 207.65],
      intensity: 0.5, torch: "warm",
    },
    olympus: {
      bpm: 96, root: 87.31, third: 110.0, fifth: 130.81, // F major-ish, brighter
      pad: [87.31, 130.81, 174.61, 220.0, 261.63],
      intensity: 0.5, torch: "bright",
    },
    underworld: {
      bpm: 70, root: 61.74, third: 73.42, fifth: 92.5, // B minor, heavy
      pad: [61.74, 92.5, 123.47, 146.83, 184.99],
      intensity: 0.6, torch: "dark",
    },
  };

  // Melodic brass motif as semitone offsets from the root, one register up.
  // Played only in the "drop" bars for a recognizable repeating phrase
  // instead of static chord stabs.
  const MOTIF = [0, 3, 5, 3, 7, 10, 7, 3];

  function noiseBuffer(seconds) {
    const size = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function makeReverbImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  function makeDistortionCurve(amount) {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  function semitoneToFreq(root, semitones) {
    return root * Math.pow(2, semitones / 12);
  }

  function playDrum(time, strength) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.5);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = strength === "fill" ? 220 : 105;
    band.Q.value = 0.9;
    const gain = ctx.createGain();
    const peak = strength === "strong" ? 1.0 : strength === "fill" ? 0.55 : 0.68;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (strength === "fill" ? 0.18 : 0.45));
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    src.connect(band).connect(gain);
    gain.connect(master);
    gain.connect(wet).connect(reverbSend);
    src.start(time);
    src.stop(time + 0.6);

    // sub thump under every hit for weight
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(95, time);
    sub.frequency.exponentialRampToValueAtTime(38, time + 0.25);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(peak * 0.85, time);
    subGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    sub.connect(subGain).connect(master);
    sub.start(time);
    sub.stop(time + 0.35);

    if (strength === "fill") {
      const crash = ctx.createBufferSource();
      crash.buffer = noiseBuffer(0.8);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 4000;
      const crashGain = ctx.createGain();
      crashGain.gain.setValueAtTime(0.0001, time);
      crashGain.gain.exponentialRampToValueAtTime(0.35, time + 0.01);
      crashGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
      crash.connect(hp).connect(crashGain).connect(master);
      crashGain.connect(reverbSend);
      crash.start(time);
      crash.stop(time + 1);
    }
  }

  // A short metallic "blade" accent — higher resonant bandpass noise burst,
  // distinct from the low taiko hits, for a chain-blade-like clang.
  function playMetal(time) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.3);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1500 + Math.random() * 600;
    band.Q.value = 6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    src.connect(band).connect(gain);
    gain.connect(master);
    gain.connect(reverbSend);
    src.start(time);
    src.stop(time + 0.35);
  }

  function playBrassNote(time, freq, dur) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(14);
    shaper.oversample = "2x";
    [0, 1].forEach((i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq * (i === 0 ? 1 : 2.005); // slight detune 2nd voice = width
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(2400, time);
      filt.frequency.exponentialRampToValueAtTime(600, time + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.2 - i * 0.06, time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(filt).connect(shaper).connect(gain);
      gain.connect(master);
      gain.connect(reverbSend);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    });
  }

  // Short choir "HA" swell accent, layered on top of the sustained pad for
  // war-chant punctuation on the big downbeats.
  function playChoirAccent(time, freqs) {
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = freq * 2.2;
      filt.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.1 - i * 0.012, time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
      osc.connect(filt).connect(gain);
      gain.connect(master);
      gain.connect(reverbSend);
      osc.start(time);
      osc.stop(time + 1);
    });
  }

  let droneNodes = [];
  function startDrone(padChord) {
    padChord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.065 - i * 0.008;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1 + i * 0.035;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.1 + i * 0.35;
      lfo.connect(lfoGain).connect(osc.frequency);

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1;
      osc.connect(gain).connect(voiceGain);
      voiceGain.connect(master);
      voiceGain.connect(reverbSend);
      osc.start();
      lfo.start();
      droneNodes.push(osc, lfo);
    });
  }

  function stopDrone() {
    droneNodes.forEach((n) => {
      try { n.stop(); } catch (e) {}
    });
    droneNodes = [];
  }

  function scheduler(cfg, stepSec) {
    while (nextStepTime < ctx.currentTime + 0.12) {
      const step = stepIndex % STEPS_PER_CYCLE;
      const bar = Math.floor(step / 8); // 0,1 = drop bars; 2,3 = pulled-back bars
      const beat = step % 8;
      const inDrop = bar < 2;

      if (inDrop) {
        const pattern = ["strong", null, "medium", "metal", "strong", null, "medium", "fill"];
        const hit = pattern[beat];
        if (hit === "metal") playMetal(nextStepTime);
        else if (hit) playDrum(nextStepTime, hit);
        playBrassNote(nextStepTime, semitoneToFreq(cfg.root * 4, MOTIF[beat]), stepSec * 1.05);
      } else {
        // pulled-back bars: sparse, lets the choir breathe before the crash back in
        if (beat === 0) playDrum(nextStepTime, "medium");
        if (beat === 6) playMetal(nextStepTime);
      }

      if (step === 0) playChoirAccent(nextStepTime, [cfg.root * 2, cfg.third * 2, cfg.fifth * 2]);

      nextStepTime += stepSec;
      stepIndex++;
    }
    schedulerId = setTimeout(() => scheduler(cfg, stepSec), 25);
  }

  function buildAudioGraph() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(compressor);

    const convolver = ctx.createConvolver();
    convolver.buffer = makeReverbImpulse(2.8, 2.1);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.9;
    convolver.connect(reverbOut).connect(compressor);

    reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(convolver);
  }

  function start(mode) {
    const cfg = MODES[mode] || MODES.home;
    currentMode = mode;
    masterTarget = cfg.intensity;
    if (playing) return;
    if (!ctx) buildAudioGraph();
    if (ctx.state === "suspended") ctx.resume();
    playing = true;
    stepIndex = 0;
    nextStepTime = ctx.currentTime + 0.05;

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(masterTarget, ctx.currentTime + 2.6);

    startDrone(cfg.pad);
    scheduler(cfg, 60 / cfg.bpm);
  }

  // Ambient background music: no toggle UI. Try to start immediately; if the
  // browser's autoplay policy blocks it (AudioContext stays suspended until
  // a user gesture), fall back to starting on the very first interaction
  // anywhere on the page.
  function init(mode) {
    start(mode);
    const resume = () => {
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      if (!playing) start(mode);
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
      document.removeEventListener("touchstart", resume);
    };
    document.addEventListener("pointerdown", resume, { once: true });
    document.addEventListener("keydown", resume, { once: true });
    document.addEventListener("touchstart", resume, { once: true });
  }

  // Temporarily lower the music so spoken dialogue reads clearly, then
  // restore it — a soft sidechain-style duck rather than a hard mute.
  function duck() {
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(masterTarget * 0.28, ctx.currentTime, 0.15);
  }
  function unduck() {
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(masterTarget, ctx.currentTime, 0.4);
  }

  window.templeAudio = { init, duck, unduck };
})();
