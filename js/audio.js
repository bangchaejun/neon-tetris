/**
 * Web Audio API 기반 반반이 멍멍 Chiptune & 콤보 사운드 엔진
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15, pitchDecay = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (pitchDecay) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.1), this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playMove() {
    this.playTone(340, 'square', 0.035, 0.04);
  }

  playRotate() {
    this.playTone(520, 'triangle', 0.05, 0.07);
  }

  playHold() {
    this.playTone(650, 'sine', 0.07, 0.09);
  }

  playSoftDrop() {
    this.playTone(220, 'sine', 0.025, 0.03);
  }

  playHardDrop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  // 🐶 반반이 멍멍 칩튠 효과음!
  playBark() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // 멍! (상승했다가 살짝 꺾이는 귀여운 강아지 짖는 음향)
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(400, now);
      osc1.frequency.linearRampToValueAtTime(880, now + 0.06);
      osc1.frequency.exponentialRampToValueAtTime(250, now + 0.14);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.14);
    } catch (e) {}
  }

  // 콤보 연쇄 사운드 (콤보 수에 따라 음이 점점 높아짐!)
  playCombo(comboCount = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const baseFreq = 440 * Math.pow(1.12, Math.min(comboCount, 12));
    this.playTone(baseFreq, 'square', 0.12, 0.15);
    setTimeout(() => {
      this.playTone(baseFreq * 1.25, 'triangle', 0.14, 0.18);
    }, 60);
  }

  // 반반이 피버 모드 사운드!
  playFever() {
    const feverNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    feverNotes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.15, 0.15);
      }, idx * 50);
    });
  }

  playLineClear(lineCount = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const baseFreqs = [440, 554.37, 659.25, 880];
    const count = Math.min(lineCount, 4);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playTone(baseFreqs[i] * (lineCount === 4 ? 1.3 : 1), 'triangle', 0.14, 0.16);
      }, i * 55);
    }
  }

  playLevelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.12, 0.2);
      }, idx * 75);
    });
  }

  playGameOver() {
    const notes = [440, 415.3, 392.0, 349.23, 261.63];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.25, 0.2, true);
      }, idx * 130);
    });
  }
}

window.soundEngine = new SoundEngine();
