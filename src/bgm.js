// Web Audio APIで明るいメジャーキーのアルペジオを合成してループ再生。
// 3種類のコード進行を持ち、start()ごとにランダムで1つ選ばれる。

const TRACKS = [
  // Track 1: 明るいポップ (C-G-Am-F, I-V-vi-IV)
  {
    name: 'bright-pop',
    chordSec: 2.4,
    chords: [
      { bass: 130.81, notes: [261.63, 329.63, 392.00, 523.25] }, // C
      { bass: 98.00,  notes: [392.00, 493.88, 587.33, 783.99] }, // G
      { bass: 110.00, notes: [440.00, 523.25, 659.25, 880.00] }, // Am
      { bass: 87.31,  notes: [349.23, 440.00, 523.25, 698.46] }, // F
    ],
  },
  // Track 2: しっとりカノン進行 (D-A-Bm-F#m-G-D-G-A in D major 簡略化→D-A-Bm-G)
  {
    name: 'canon',
    chordSec: 2.6,
    chords: [
      { bass: 146.83, notes: [293.66, 369.99, 440.00, 587.33] }, // D  (D F# A D5)
      { bass: 110.00, notes: [277.18, 329.63, 440.00, 554.37] }, // A  (C# E A C#5)
      { bass: 123.47, notes: [293.66, 369.99, 440.00, 587.33] }, // Bm(風) (D F# A D5)
      { bass: 98.00,  notes: [293.66, 349.23, 440.00, 587.33] }, // G  (D F A D5)
    ],
  },
  // Track 3: ジャズ系のメロウ (Fmaj7-Dm7-Gm7-C7 in F major)
  {
    name: 'mellow-jazz',
    chordSec: 2.8,
    chords: [
      { bass: 87.31,  notes: [349.23, 440.00, 523.25, 659.25] }, // Fmaj7 (F A C E)
      { bass: 73.42,  notes: [293.66, 349.23, 440.00, 523.25] }, // Dm7   (D F A C)
      { bass: 98.00,  notes: [349.23, 466.16, 523.25, 698.46] }, // Gm7   (F Bb C F)
      { bass: 130.81, notes: [329.63, 391.99, 466.16, 587.33] }, // C7    (E G Bb D)
    ],
  },
];

export class CafeBGM {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.playing = false;
    this._nextChordIdx = 0;
    this._schedulerId = null;
    this._track = null;
  }

  _ensureContext() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.2;
    this.masterGain.connect(this.ctx.destination);
  }

  start() {
    this._ensureContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    // 3種からランダムに1つ選ぶ
    this._track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.2, now + 0.6);
    this._nextChordIdx = 0;
    this._scheduleLoop();
  }

  stop() {
    if (!this.playing || !this.ctx) return;
    this.playing = false;
    if (this._schedulerId) {
      clearTimeout(this._schedulerId);
      this._schedulerId = null;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
  }

  _playNote(freq, atTime, { duration = 1.2, velocity = 0.22 } = {}) {
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.12;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, atTime);
    env.gain.linearRampToValueAtTime(velocity, atTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, atTime + duration);

    osc1.connect(env);
    osc2.connect(g2).connect(env);
    env.connect(this.masterGain);
    osc1.start(atTime);
    osc2.start(atTime);
    osc1.stop(atTime + duration + 0.05);
    osc2.stop(atTime + duration + 0.05);
  }

  _scheduleLoop() {
    if (!this.playing || !this._track) return;
    const track = this._track;
    const prog = track.chords;
    const CHORD_SEC = track.chordSec;
    const now = this.ctx.currentTime;
    const chord = prog[this._nextChordIdx % prog.length];
    this._nextChordIdx++;

    this._playNote(chord.bass, now + 0.02, { duration: CHORD_SEC - 0.1, velocity: 0.14 });

    const notes = chord.notes;
    const spacing = CHORD_SEC / (notes.length * 2);
    for (let i = 0; i < notes.length * 2; i++) {
      const idx = i % notes.length;
      const t = now + 0.08 + i * spacing;
      const v = 0.20 + (idx === 0 ? 0.04 : 0);
      this._playNote(notes[idx], t, { duration: 0.9, velocity: v });
    }

    this._schedulerId = setTimeout(() => this._scheduleLoop(), CHORD_SEC * 1000);
  }
}
