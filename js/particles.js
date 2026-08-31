/**
 * 캔버스 네온 스파크 + 반반이 발바닥/뼈다귀/하트 이모지 파티클 엔진
 */
class Particle {
  constructor(x, y, color, emoji = null) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.emoji = emoji;
    this.radius = Math.random() * 3 + 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = emoji ? Math.random() * 4 + 2 : Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (emoji ? 2.5 : 1.5);
    this.alpha = 1;
    this.decay = Math.random() * 0.02 + 0.015;
    this.gravity = emoji ? 0.08 : 0.15;
    this.fontSize = Math.random() * 8 + 14;
    this.rotation = Math.random() * Math.PI;
    this.rotSpeed = (Math.random() - 0.5) * 0.1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.alpha -= this.decay;
    this.rotation += this.rotSpeed;
    if (!this.emoji) {
      this.radius = Math.max(0, this.radius - 0.05);
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.emoji) {
      // 강아지 이모지 파티클 (🐾, 🦴, 💖)
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.font = `${this.fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, 0, 0);
    } else {
      // 네온 스파크 파티클
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  createExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  // 반반이 콤보 이모지 파티클 폭발!
  createDoggyExplosion(x, y, count = 8) {
    const emojis = ['🐾', '🦴', '💖', '⭐', '🐶'];
    for (let i = 0; i < count; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      this.particles.push(new Particle(x, y, '#fff', emoji));
    }
  }

  createLineExplosion(rowY, width, blockSize, colors = ['#00f0ff', '#ff007f', '#ffe600', '#ff66b2']) {
    for (let x = 0; x < width; x += blockSize) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.createExplosion(x + blockSize / 2, rowY + blockSize / 2, color, 6);
    }
    // 중앙에서 귀여운 발바닥/뼈다귀 파티클 팝업
    this.createDoggyExplosion(width / 2, rowY + blockSize / 2, 6);
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let p of this.particles) {
      p.draw(ctx);
    }
  }

  clear() {
    this.particles = [];
  }
}

// 화면 진동 함수
function triggerScreenShake(type = 'light') {
  const frame = document.getElementById('boardFrame');
  if (!frame) return;

  frame.classList.remove('shake-light', 'shake-heavy', 'shake-fever');
  void frame.offsetWidth;
  if (type === 'fever') {
    frame.classList.add('shake-fever');
  } else if (type === 'heavy') {
    frame.classList.add('shake-heavy');
  } else {
    frame.classList.add('shake-light');
  }

  setTimeout(() => {
    frame.classList.remove('shake-light', 'shake-heavy', 'shake-fever');
  }, 450);
}

window.particleSystem = new ParticleSystem();
window.triggerScreenShake = triggerScreenShake;
