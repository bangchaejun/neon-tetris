/**
 * Web Audio API 기반 Chiptune/Synthwave 사운드 합성기
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmInterval = null;
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
    if (this.muted && this.bgmPlaying) {
      this.stopBGM();
    }
    return this.muted;
  }

  // 기본 톤 제너레이터
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
    } catch (e) {
      console.warn('Audio playTone error:', e);
    }
  }

  playMove() {
    this.playTone(320, 'square', 0.04, 0.05);
  }

  playRotate() {
    this.playTone(480, 'triangle', 0.06, 0.08);
  }

  playHold() {
    this.playTone(600, 'sine', 0.08, 0.1);
  }

  playSoftDrop() {
    this.playTone(200, 'sine', 0.03, 0.04);
  }

  playHardDrop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // 펀치감 있는 저음 타격음
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  playLineClear(lineCount = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const baseFreqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    const count = Math.min(lineCount, 4);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playTone(baseFreqs[i] * (lineCount === 4 ? 1.25 : 1), 'triangle', 0.15, 0.15);
      }, i * 60);
    }
  }

  playLevelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.12, 0.2);
      }, idx * 80);
    });
  }

  playGameOver() {
    const notes = [440, 415.3, 392.0, 349.23, 261.63];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.25, 0.2, true);
      }, idx * 140);
    });
  }
}

window.soundEngine = new SoundEngine();
