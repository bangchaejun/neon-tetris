/**
 * 정통 테트리스 코어 엔진 (7-Bag, SRS, Ghost, Hold, Score)
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
  T: '#9d00ff', // Purple
  Z: '#ff0055'  // Red/Magenta
};

// SRS Wall Kick 데이터 (JLSTZ용)
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

// SRS Wall Kick 데이터 (I용)
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
    this.rotation = 0; // 0, 1, 2, 3
    
    // 시작 위치 (중앙 상단)
    this.x = Math.floor((COLS - this.matrix[0].length) / 2);
    this.y = type === 'I' ? -1 : 0;
  }

  // 행렬 90도 회전
  rotateMatrix(dir = 1) {
    const N = this.matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    
    if (dir === 1) { // 시계방향
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          result[c][N - 1 - r] = this.matrix[r][c];
        }
      }
    } else { // 반시계방향
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
    this.highScore = parseInt(localStorage.getItem('neon_tetris_highscore') || '0', 10);

    this.isGameOver = false;
    this.isPaused = false;
    this.lockTimer = null;
    this.lockDelay = 500; // ms

    this.dropCounter = 0;
    this.dropInterval = 1000; // 1초부터 시작

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
    this.isGameOver = false;
    this.isPaused = false;
    this.dropInterval = 1000;
    this.initBag();
    this.spawnNextPieces();
    this.spawnPiece();
  }

  // 7-Bag 시스템
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

    // 스폰 즉시 충돌 판정 (게임오버)
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.matrix)) {
      this.isGameOver = true;
      if (window.soundEngine) window.soundEngine.playGameOver();
    }
  }

  // 충돌 판정
  checkCollision(offsetX, offsetY, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const newX = offsetX + c;
          const newY = offsetY + r;

          // 보드 경계 검사
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          // 다른 블록과 겹침 검사
          if (newY >= 0 && this.board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 이동
  move(dir) {
    if (this.isGameOver || this.isPaused || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x + dir, this.currentPiece.y, this.currentPiece.matrix)) {
      this.currentPiece.x += dir;
      if (window.soundEngine) window.soundEngine.playMove();
      return true;
    }
    return false;
  }

  // 회전 (SRS 적용)
  rotate(dir = 1) {
    if (this.isGameOver || this.isPaused || !this.currentPiece) return;
    if (this.currentPiece.type === 'O') return; // O피스는 회전 불필요

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

  // 소프트 드롭
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

  // 하드 드롭
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

  // 홀드 기능
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

  // 고스트 피스 위치 계산
  getGhostPosition() {
    if (!this.currentPiece) return null;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.matrix)) {
      ghostY++;
    }
    return { x: this.currentPiece.x, y: ghostY };
  }

  // 블록 고정 및 라인 제거
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

  // 라인 클리어 검사 및 점수 산정
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
      // 파티클 폭발 효과
      if (window.particleSystem) {
        clearedIndices.forEach(rowIdx => {
          window.particleSystem.createLineExplosion(rowIdx * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
        });
      }

      // 보드 갱신
      this.board = this.board.filter((_, idx) => !clearedIndices.includes(idx));
      while (this.board.length < ROWS) {
        this.board.unshift(Array(COLS).fill(0));
      }

      this.lines += linesCleared;
      this.combo++;

      // 점수 계산 (표준 가이드)
      const basePoints = [0, 100, 300, 500, 800];
      const point = basePoints[linesCleared] * this.level + (this.combo > 0 ? this.combo * 50 * this.level : 0);
      this.score += point;

      if (window.soundEngine) window.soundEngine.playLineClear(linesCleared);

      // 테트리스 (4줄 클리어) 특수 효과
      if (linesCleared === 4) {
        if (window.triggerScreenShake) window.triggerScreenShake('heavy');
        this.showBanner('TETRIS!!');
      } else if (this.combo > 1) {
        this.showBanner(`${this.combo} COMBO!`);
      }

      // 레벨업 판정 (10라인마다)
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 80);
        if (window.soundEngine) window.soundEngine.playLevelUp();
        this.showBanner(`LEVEL ${this.level}!`);
      }

      this.updateScore();
    } else {
      this.combo = -1;
    }
  }

  showBanner(text) {
    const banner = document.getElementById('comboBanner');
    if (!banner) return;
    banner.textContent = text;
    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
    }, 1000);
  }

  updateScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neon_tetris_highscore', this.highScore.toString());
    }
  }
}

window.TetrisGame = TetrisGame;
window.SHAPES = SHAPES;
window.COLORS = COLORS;
window.BLOCK_SIZE = BLOCK_SIZE;
