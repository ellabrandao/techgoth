/* ==========================================================================
   ÁUDIO  -  bips 8-bit gerados com WebAudio (nenhum arquivo de som)
   ========================================================================== */

(function (global) {
  'use strict';

  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  // toca uma sequência de notas [{f: freq, d: duração(s)}]
  function beep(notes, type, vol) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    let t = ac.currentTime;
    notes.forEach(n => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(n.f, t);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t + n.d);
      g.gain.setValueAtTime(vol || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
      osc.connect(g).connect(ac.destination);
      osc.start(t);
      osc.stop(t + n.d);
      t += n.d;
    });
  }

  global.SFX = {
    unlock: ensure,
    jump()      { beep([{ f: 330, to: 660, d: 0.12 }], 'square', 0.04); },
    milestone() { beep([{ f: 880, d: 0.07 }, { f: 1175, d: 0.07 }, { f: 1760, d: 0.1 }], 'square', 0.04); },
    die()       { beep([{ f: 300, to: 80, d: 0.35 }], 'sawtooth', 0.07); },
    toggleMute() { muted = !muted; return muted; },
    isMuted()    { return muted; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
