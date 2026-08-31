/**
 * 캔버스 네온 파티클 및 비주얼 이펙트 엔진
 */
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5; // 살짝 위로 튀어오름
    this.alpha = 1;
    this.decay = Math.random() * 0.02 + 0.015;
    this.gravity = 0.15;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.alpha -= this.decay;
    this.radius = Math.max(0, this.radius - 0.05);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  createExplosion(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  createLineExplosion(rowY, width, blockSize, colors = ['#00f0ff', '#ff007f', '#ffe600']) {
    for (let x = 0; x < width; x += blockSize) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.createExplosion(x + blockSize / 2, rowY + blockSize / 2, color, 8);
    }
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

// 화면 흔들림 효과 유틸리티
function triggerScreenShake(type = 'light') {
  const frame = document.getElementById('boardFrame');
  if (!frame) return;

  frame.classList.remove('shake-light', 'shake-heavy');
  void frame.offsetWidth; // Trigger reflow
  frame.classList.add(type === 'heavy' ? 'shake-heavy' : 'shake-light');

  setTimeout(() => {
    frame.classList.remove('shake-light', 'shake-heavy');
  }, 400);
}

window.particleSystem = new ParticleSystem();
window.triggerScreenShake = triggerScreenShake;
