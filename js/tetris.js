/**
 * BANBAN TETRIS - Core Engine with Advanced Combo & Fever System
 */

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// 테트로미노 정의
const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ]
};

const COLORS = {
  I: '#00f0ff', // Cyan
  J: '#0080ff', // Blue
  L: '#ff7700', // Orange
  O: '#ffe600', // Yellow
  S: '#00ff66', // Green
  T: '#a855f7', // Purple
  Z: '#ff007f'  // Pink/Magenta
};

// SRS Wall Kick 데이터
const WALLKICKS_JLSTZ = {
  '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};

const WALLKICKS_I = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};

class Piece {
  constructor(type) {
    this.type = type;
    this.matrix = SHAPES[type].map(row => [...row]);
    this.color = COLORS[type];
    this.rotation = 0;
    this.x = Math.floor((COLS - this.matrix[0].length) / 2);
    this.y = type === 'I' ? -1 : 0;
  }

  rotateMatrix(dir = 1) {
    const N = this.matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    if (dir === 1) {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          result[c][N - 1 - r] = this.matrix[r][c];
        }
      }
    } else {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          result[N - 1 - c][r] = this.matrix[r][c];
        }
      }
    }
    return result;
  }
}

class TetrisGame {
  constructor() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.bag = [];
    this.currentPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.nextQueue = [];
    
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = -1;
    this.maxCombo = 0;
    this.feverGauge = 0; // 0 ~ 100
    this.highScore = parseInt(localStorage.getItem('banban_tetris_highscore') || '0', 10);

    this.isGameOver = false;
    this.isPaused = false;
    this.isDanger = false;

    this.dropCounter = 0;
    this.dropInterval = 1000;

    this.onMascotReact = null; // UI 콜백

    this.initBag();
    this.spawnNextPieces();
  }

  reset() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.bag = [];
    this.currentPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.nextQueue = [];
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = -1;
    this.feverGauge = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.isDanger = false;
    this.dropInterval = 1000;
    this.initBag();
    this.spawnNextPieces();
    this.spawnPiece();
    if (this.onMascotReact) this.onMascotReact('idle', '새 게임 시작! 반반이랑 가보자고! 🐾');
  }

  initBag() {
    const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    this.bag.push(...pieces);
  }

  getNextFromBag() {
    if (this.bag.length <= 7) {
      this.initBag();
    }
    return this.bag.shift();
  }

  spawnNextPieces() {
    while (this.nextQueue.length < 4) {
      this.nextQueue.push(this.getNextFromBag());
    }
  }

  spawnPiece() {
    this.currentPiece = new Piece(this.nextQueue.shift());
    this.spawnNextPieces();
    this.canHold = true;

    // 위험 상태 감지 (상단 5줄 이내에 블록 존재)
    this.checkDangerState();

    // 스폰 즉시 충돌 판정 (게임오버)
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.matrix)) {
      this.isGameOver = true;
      if (window.soundEngine) window.soundEngine.playGameOver();
      if (this.onMascotReact) this.onMascotReact('sad', '으앙 게임오버! 반반이가 위로해줄게... 🐶💦');
    }
  }

  checkDangerState() {
    let topBlockRow = ROWS;
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].some(cell => cell !== 0)) {
        topBlockRow = r;
        break;
      }
    }
    this.isDanger = topBlockRow <= 5;
    const vignette = document.getElementById('dangerVignette');
    if (vignette) {
      vignette.classList.toggle('active', this.isDanger);
    }
    if (this.isDanger && !this.isGameOver && this.onMascotReact) {
      this.onMascotReact('panic', '위험해 위험해! 천장 뚫리겠어! 💦');
    }
  }

  checkCollision(offsetX, offsetY, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const newX = offsetX + c;
          const newY = offsetY + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && this.board[newY][newX]) return true;
        }
      }
    }
    return false;
  }

  move(dir) {
    if (this.isGameOver || this.isPaused || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x + dir, this.currentPiece.y, this.currentPiece.matrix)) {
      this.currentPiece.x += dir;
      if (window.soundEngine) window.soundEngine.playMove();
      return true;
    }
    return false;
  }

  rotate(dir = 1) {
    if (this.isGameOver || this.isPaused || !this.currentPiece) return;
    if (this.currentPiece.type === 'O') return;

    const oldRot = this.currentPiece.rotation;
    const newRot = (oldRot + (dir === 1 ? 1 : 3)) % 4;
    const newMatrix = this.currentPiece.rotateMatrix(dir);
    const kickKey = `${oldRot}->${newRot}`;
    const kicks = (this.currentPiece.type === 'I' ? WALLKICKS_I : WALLKICKS_JLSTZ)[kickKey] || [[0, 0]];

    for (let [kx, ky] of kicks) {
      if (!this.checkCollision(this.currentPiece.x + kx, this.currentPiece.y - ky, newMatrix)) {
        this.currentPiece.x += kx;
        this.currentPiece.y -= ky;
        this.currentPiece.matrix = newMatrix;
        this.currentPiece.rotation = newRot;
        if (window.soundEngine) window.soundEngine.playRotate();
        return;
      }
    }
  }

  softDrop() {
    if (this.isGameOver || this.isPaused || !this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
      this.currentPiece.y++;
      this.score += 1;
      if (window.soundEngine) window.soundEngine.playSoftDrop();
      this.updateScore();
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (this.isGameOver || this.isPaused || !this.currentPiece) return;
    let dropDistance = 0;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
      this.currentPiece.y++;
      dropDistance++;
    }
    this.score += dropDistance * 2;
    this.updateScore();
    if (window.soundEngine) window.soundEngine.playHardDrop();
    if (window.triggerScreenShake) window.triggerScreenShake('light');
    this.lockPiece();
  }

  hold() {
    if (this.isGameOver || this.isPaused || !this.canHold || !this.currentPiece) return;

    if (window.soundEngine) window.soundEngine.playHold();
    const currentType = this.currentPiece.type;

    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = currentType;
      this.currentPiece = new Piece(temp);
    }
    this.canHold = false;
  }

  getGhostPosition() {
    if (!this.currentPiece) return null;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.matrix)) {
      ghostY++;
    }
    return { x: this.currentPiece.x, y: ghostY };
  }

  lockPiece() {
    const { x, y, matrix, color } = this.currentPiece;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const bx = x + c;
          const by = y + r;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            this.board[by][bx] = color;
          }
        }
      }
    }

    this.clearLines();
    this.spawnPiece();
  }

  // 🚀 고도화된 콤보 및 피버 연쇄 점수 시스템!
  clearLines() {
    let linesCleared = 0;
    const clearedIndices = [];

    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== 0)) {
        linesCleared++;
        clearedIndices.push(r);
      }
    }

    if (linesCleared > 0) {
      // 1. 파티클 폭발
      if (window.particleSystem) {
        clearedIndices.forEach(rowIdx => {
          window.particleSystem.createLineExplosion(rowIdx * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
        });
      }

      // 2. 보드 갱신
      this.board = this.board.filter((_, idx) => !clearedIndices.includes(idx));
      while (this.board.length < ROWS) {
        this.board.unshift(Array(COLS).fill(0));
      }

      this.lines += linesCleared;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // 3. 피버 게이지 충전 (콤보에 따라 폭풍 상승)
      this.feverGauge = Math.min(100, this.feverGauge + (linesCleared * 15) + (this.combo * 10));

      // 4. 점수 계산 공식 (표준 + 콤보 지수 보너스 + 피버 배수)
      const isFeverActive = this.feverGauge >= 100;
      const feverMultiplier = isFeverActive ? 2 : 1;
      const basePoints = [0, 100, 300, 600, 1200];
      const comboBonus = this.combo > 0 ? (this.combo * 100 * this.level * (this.combo >= 3 ? 2 : 1)) : 0;
      const earnedScore = (basePoints[linesCleared] * this.level + comboBonus) * feverMultiplier;
      this.score += earnedScore;

      // 5. 음향 & 시각 연출 & 반반이 리액션
      if (window.soundEngine) {
        if (this.combo >= 2) {
          window.soundEngine.playCombo(this.combo);
          window.soundEngine.playBark(); // 멍멍!
        } else {
          window.soundEngine.playLineClear(linesCleared);
        }
      }

      // 배너 및 마스코트 리액션
      if (linesCleared === 4) {
        if (window.triggerScreenShake) window.triggerScreenShake('heavy');
        this.showBanner('BANBAN TETRIS!!', '🦴 뼈다귀 대폭발! 멍멍!!');
        if (this.onMascotReact) this.onMascotReact('fever', '와아 테트리스!! 간식 10개 각이다! 🦴✨');
      } else if (this.combo >= 3) {
        if (window.triggerScreenShake) window.triggerScreenShake(isFeverActive ? 'fever' : 'heavy');
        this.showBanner(`${this.combo} COMBO FEVER!!`, `🔥 ${this.combo}연속 콤보 작렬!`);
        if (this.onMascotReact) this.onMascotReact('fever', `대박대박 ${this.combo}콤보!! 신난다 멍멍! 🐾🔥`);
      } else if (this.combo >= 1) {
        if (window.triggerScreenShake) window.triggerScreenShake('light');
        this.showBanner(`${this.combo} COMBO!`, '🐾 나이스 콤보!');
        if (this.onMascotReact) this.onMascotReact('happy', '좋았어! 계속 이어서 콤보 가자! 💖');
      }

      // 레벨업 체크
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 80);
        if (window.soundEngine) window.soundEngine.playLevelUp();
        this.showBanner(`LEVEL ${this.level}!`, '🚀 속도 증가!');
      }

      this.updateScore();
    } else {
      // 콤보 끊김 시 피버 게이지 서서히 감소
      this.combo = -1;
      this.feverGauge = Math.max(0, this.feverGauge - 10);
    }
  }

  showBanner(mainText, subText) {
    const banner = document.getElementById('comboBanner');
    const comboText = document.getElementById('comboText');
    const comboSub = document.getElementById('comboSub');
    if (!banner || !comboText || !comboSub) return;

    comboText.textContent = mainText;
    comboSub.textContent = subText;
    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
    }, 1100);
  }

  updateScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('banban_tetris_highscore', this.highScore.toString());
    }
  }
}

window.TetrisGame = TetrisGame;
window.SHAPES = SHAPES;
window.COLORS = COLORS;
window.BLOCK_SIZE = BLOCK_SIZE;
