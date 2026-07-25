// Original synthesized "epic ancient war" score — inspired by the mood of
// early-2010s orchestral war-god game music, not a reproduction of any
// copyrighted recording. Built entirely from oscillators/noise in-browser,
// with a generated convolution reverb for cinematic space and a compressor
// on the master bus for punch.

(function () {
  let ctx = null;
  let master = null;
  let reverbSend = null;
  let playing = false;
  let nextStepTime = 0;
  let stepIndex = 0;
  let schedulerId = null;

  const BPM = 84;
  const STEP_SEC = 60 / BPM; // one beat per step
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD_SEC = 0.12;

  // strong / medium / rest / fill pattern over 8 beats, repeating
  const DRUM_PATTERN = ["strong", null, "medium", null, "strong", null, "medium", "fill"];
  const BRASS_STEPS = new Set([0, 4]);
  const CHORD = [73.42, 87.31, 110.0]; // D2, F2, A2 — D minor, menacing
  const PAD_CHORD = [73.42, 110.0, 146.83, 174.61]; // D2, A2, D3, F3 — wider choir spread

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

  function playDrum(time, strength) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.5);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = strength === "fill" ? 220 : 110;
    band.Q.value = 0.9;
    const gain = ctx.createGain();
    const peak = strength === "strong" ? 1.0 : strength === "fill" ? 0.55 : 0.68;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (strength === "fill" ? 0.18 : 0.45));
    const dry = ctx.createGain();
    dry.gain.value = 1;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    src.connect(band).connect(gain);
    gain.connect(dry).connect(master);
    gain.connect(wet).connect(reverbSend);
    src.start(time);
    src.stop(time + 0.6);

    // sub thump under every drum hit for weight
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
      // bright crash accent on the fill beat
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

  function playBrassStab(time) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(14);
    shaper.oversample = "2x";

    CHORD.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq * 2; // an octave up for brass register
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(2200, time);
      filt.frequency.exponentialRampToValueAtTime(500, time + STEP_SEC * 1.6);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.24 - i * 0.03, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + STEP_SEC * 1.8);
      osc.connect(filt).connect(shaper).connect(gain);
      gain.connect(master);
      gain.connect(reverbSend);
      osc.start(time);
      osc.stop(time + STEP_SEC * 2);
    });
  }

  let droneNodes = [];
  function startDrone() {
    PAD_CHORD.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.075 - i * 0.01;

      // slow choir-like vibrato per voice
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1 + i * 0.04;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.2 + i * 0.4;
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

  function scheduler() {
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      const step = stepIndex % DRUM_PATTERN.length;
      const hit = DRUM_PATTERN[step];
      if (hit) playDrum(nextStepTime, hit);
      if (BRASS_STEPS.has(step)) playBrassStab(nextStepTime);
      nextStepTime += STEP_SEC;
      stepIndex++;
    }
    schedulerId = setTimeout(scheduler, LOOKAHEAD_MS);
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
    convolver.buffer = makeReverbImpulse(2.6, 2.2);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.9;
    convolver.connect(reverbOut).connect(compressor);

    reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(convolver);
  }

  function start() {
    if (playing) return;
    if (!ctx) buildAudioGraph();
    if (ctx.state === "suspended") ctx.resume();
    playing = true;
    stepIndex = 0;
    nextStepTime = ctx.currentTime + 0.05;

    // cinematic swell-in rather than an abrupt start
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 2.2);

    startDrone();
    scheduler();
  }

  function stop() {
    playing = false;
    if (schedulerId) clearTimeout(schedulerId);
    if (master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    }
    setTimeout(stopDrone, 650);
  }

  function toggle(btn) {
    if (playing) {
      stop();
      btn.textContent = "🎵 Awaken the Score";
      btn.classList.remove("playing");
    } else {
      start();
      btn.textContent = "🔇 Silence the Gods";
      btn.classList.add("playing");
    }
  }

  window.templeAudio = { toggle };
})();
