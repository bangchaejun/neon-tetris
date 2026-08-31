/**
 * BANBAN WORLD TETRIS - Dynamic Banban Photo Block Renderer & Game Loop
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const gameCanvas = document.getElementById('gameCanvas');
  const gameCtx = gameCanvas.getContext('2d');

  const holdCanvas = document.getElementById('holdCanvas');
  const holdCtx = holdCanvas.getContext('2d');

  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');

  const scoreDisplay = document.getElementById('scoreDisplay');
  const comboDisplay = document.getElementById('comboDisplay');
  const levelDisplay = document.getElementById('levelDisplay');
  const linesDisplay = document.getElementById('linesDisplay');
  const highScoreDisplay = document.getElementById('highScoreDisplay');

  const feverBar = document.getElementById('feverBar');
  const feverPercent = document.getElementById('feverPercent');

  const banbanAvatar = document.getElementById('banbanAvatar');
  const banbanSpeech = document.getElementById('banbanSpeech');
  const mascotBadge = document.getElementById('mascotBadge');

  const btnGallery = document.getElementById('btn-gallery');
  const btnCloseGallery = document.getElementById('btnCloseGallery');
  const galleryModal = document.getElementById('galleryModal');

  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');
  const btnRestart = document.getElementById('btn-restart');

  const overlayModal = document.getElementById('overlayModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalBanbanPhoto = document.getElementById('modalBanbanPhoto');
  const modalActionBtn = document.getElementById('modalActionBtn');

  // Game Instance
  const game = new window.TetrisGame();

  let lastTime = 0;
  let animationId = null;

  // 🐶 7종 테트로미노 전용 반반이 실사 텍스처 이미지 로드
  const BANBAN_BLOCK_TEXTURES = {
    I: 'assets/banban/char_happy.jpg',
    O: 'assets/banban/char_idle.jpg',
    T: 'assets/banban/banban2.jpg',
    S: 'assets/banban/banban1.jpg',
    Z: 'assets/banban/banban3.jpg',
    J: 'assets/banban/banban4.jpg',
    L: 'assets/banban/char_panic.jpg'
  };

  const loadedTextures = {};
  for (let key in BANBAN_BLOCK_TEXTURES) {
    const img = new Image();
    img.src = BANBAN_BLOCK_TEXTURES[key];
    loadedTextures[key] = img;
  }

  // 반반이 마스코트 감정 상태
  const BANBAN_CHARACTERS = {
    idle: 'assets/banban/char_idle.jpg',
    happy: 'assets/banban/char_happy.jpg',
    panic: 'assets/banban/char_panic.jpg',
    fever: 'assets/banban/char_happy.jpg',
    sad: 'assets/banban/char_panic.jpg'
  };

  game.onMascotReact = (state, message) => {
    if (banbanSpeech) banbanSpeech.textContent = message;
    if (banbanAvatar) {
      banbanAvatar.src = BANBAN_CHARACTERS[state] || BANBAN_CHARACTERS.idle;
      banbanAvatar.classList.remove('bounce');
      void banbanAvatar.offsetWidth;

      if (state === 'fever' || state === 'happy') {
        banbanAvatar.classList.add('bounce');
        if (mascotBadge) mascotBadge.textContent = state === 'fever' ? '피버 파워!' : '신남 모드';
      } else if (state === 'panic') {
        if (mascotBadge) mascotBadge.textContent = '위험 경보!';
      } else {
        if (mascotBadge) mascotBadge.textContent = '집중 모드';
      }
    }
  };

  // 🎨 반반이 실사 포토 블록 렌더러 (Block with Banban Face Texture)
  function drawBanbanBlock(ctx, x, y, typeOrColor, size = BLOCK_SIZE, isGhost = false) {
    const px = x * size;
    const py = y * size;

    // 타입 역추적 (문자열 또는 색상 코드 처리)
    let pieceType = 'O';
    let blockColor = '#ffd700';

    if (window.SHAPES[typeOrColor]) {
      pieceType = typeOrColor;
      blockColor = window.COLORS[typeOrColor] || '#ffd700';
    } else {
      // 색상으로 역매핑
      for (let t in window.COLORS) {
        if (window.COLORS[t] === typeOrColor) {
          pieceType = t;
          blockColor = typeOrColor;
          break;
        }
      }
    }

    ctx.save();
    if (isGhost) {
      // 반투명 고스트 피스
      ctx.strokeStyle = blockColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = blockColor;
      ctx.globalAlpha = 0.2;
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
    } else {
      // 1. 네온 글로우 테두리 프레임
      ctx.shadowBlur = 10;
      ctx.shadowColor = blockColor;
      ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

      // 2. 반반이 실사 텍스처 렌더링
      const texImg = loadedTextures[pieceType];
      if (texImg && texImg.complete && texImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        // 모서리가 살짝 둥근 사각형 클리핑
        const pad = 2;
        ctx.rect(px + pad, py + pad, size - pad * 2, size - pad * 2);
        ctx.clip();
        ctx.drawImage(texImg, px + pad, py + pad, size - pad * 2, size - pad * 2);
        ctx.restore();
      }

      // 3. 반투명 컬러 오버레이 틴트 & 입체감 테두리
      ctx.strokeStyle = blockColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);

      // 상/좌측 광원 하이라이트
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(px + 1, py + 1, size - 2, 2.5);
      ctx.fillRect(px + 1, py + 1, 2.5, size - 2);
    }
    ctx.restore();
  }

  // 그리드 배경 렌더링
  function drawGrid(ctx, width, height, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 메인 보드 렌더링
  function renderMainBoard() {
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    drawGrid(gameCtx, gameCanvas.width, gameCanvas.height, BLOCK_SIZE);

    // 1. 고정된 보드 블록들 (반반이 얼굴 블록)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (game.board[r][c]) {
          drawBanbanBlock(gameCtx, c, r, game.board[r][c], BLOCK_SIZE, false);
        }
      }
    }

    // 2. 고스트 피스
    const ghost = game.getGhostPosition();
    if (ghost && game.currentPiece && !game.isGameOver) {
      const { matrix, type } = game.currentPiece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            drawBanbanBlock(gameCtx, ghost.x + c, ghost.y + r, type, BLOCK_SIZE, true);
          }
        }
      }
    }

    // 3. 현재 낙하 중인 반반이 피스
    if (game.currentPiece && !game.isGameOver) {
      const { x, y, matrix, type } = game.currentPiece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            drawBanbanBlock(gameCtx, x + c, y + r, type, BLOCK_SIZE, false);
          }
        }
      }
    }

    // 4. 파티클 이펙트
    if (window.particleSystem) {
      window.particleSystem.draw(gameCtx);
    }
  }

  // 미니 홀드 캔버스 렌더링
  function renderMiniPiece(ctx, canvas, type, miniSize = 22) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const matrix = window.SHAPES[type];
    const pieceW = matrix[0].length * miniSize;
    const pieceH = matrix.length * miniSize;
    const startX = (canvas.width - pieceW) / 2;
    const startY = (canvas.height - pieceH) / 2;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const gridX = (startX + c * miniSize) / miniSize;
          const gridY = (startY + r * miniSize) / miniSize;
          drawBanbanBlock(ctx, gridX, gridY, type, miniSize, false);
        }
      }
    }
  }

  // Next Queue 렌더링
  function renderNextQueue() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const miniSize = 20;

    for (let i = 0; i < 3; i++) {
      const type = game.nextQueue[i];
      if (!type) continue;

      const matrix = window.SHAPES[type];
      const pieceW = matrix[0].length * miniSize;
      const startX = (nextCanvas.width - pieceW) / 2;
      const startY = 15 + i * 85;

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            const gridX = (startX + c * miniSize) / miniSize;
            const gridY = (startY + r * miniSize) / miniSize;
            drawBanbanBlock(nextCtx, gridX, gridY, type, miniSize, false);
          }
        }
      }
    }
  }

  // HUD 갱신
  function updateHUD() {
    scoreDisplay.textContent = game.score.toLocaleString();
    levelDisplay.textContent = game.level;
    linesDisplay.textContent = game.lines;
    highScoreDisplay.textContent = game.highScore.toLocaleString();

    if (game.combo > 0) {
      comboDisplay.textContent = `${game.combo} COMBO 🔥`;
    } else {
      comboDisplay.textContent = `0 COMBO`;
    }

    if (feverBar && feverPercent) {
      feverBar.style.width = `${game.feverGauge}%`;
      feverPercent.textContent = `${Math.floor(game.feverGauge)}%`;
    }
  }

  // 메인 게임 루프
  function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (!game.isPaused && !game.isGameOver) {
      game.dropCounter += deltaTime;
      if (game.dropCounter > game.dropInterval) {
        if (!game.checkCollision(game.currentPiece.x, game.currentPiece.y + 1, game.currentPiece.matrix)) {
          game.currentPiece.y++;
        } else {
          game.lockPiece();
        }
        game.dropCounter = 0;
      }
    }

    if (window.particleSystem) {
      window.particleSystem.update();
    }

    renderMainBoard();
    renderMiniPiece(holdCtx, holdCanvas, game.holdPiece);
    renderNextQueue();
    updateHUD();

    if (game.isGameOver) {
      showGameOverModal();
    } else {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  // 모달 제어
  function showGameOverModal() {
    if (modalBanbanPhoto) modalBanbanPhoto.src = BANBAN_CHARACTERS.sad;
    modalTitle.textContent = 'GAME OVER';
    modalTitle.style.color = 'var(--neon-pink)';
    modalSubtitle.innerHTML = `최종 점수: <span class="neon-cyan">${game.score.toLocaleString()}</span><br><small style="color:var(--neon-gold)">최고 콤보: ${game.maxCombo}연속!</small>`;
    modalActionBtn.textContent = '반반이랑 다시하기';
    overlayModal.classList.remove('hidden');
  }

  function showPauseModal() {
    if (modalBanbanPhoto) modalBanbanPhoto.src = BANBAN_CHARACTERS.idle;
    modalTitle.textContent = 'PAUSED';
    modalTitle.style.color = 'var(--neon-gold)';
    modalSubtitle.innerHTML = `반반이도 잠시 힐링 타임!<br>준비되면 계속하기를 눌러주세요.`;
    modalActionBtn.textContent = '계속하기';
    overlayModal.classList.remove('hidden');
  }

  function hideModal() {
    overlayModal.classList.add('hidden');
  }

  function togglePause() {
    if (game.isGameOver) return;
    game.isPaused = !game.isPaused;
    if (game.isPaused) {
      showPauseModal();
    } else {
      hideModal();
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
  }

  function restartGame() {
    hideModal();
    game.reset();
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    requestAnimationFrame(gameLoop);
  }

  // 키보드 이벤트
  window.addEventListener('keydown', (e) => {
    if (window.soundEngine) window.soundEngine.init();

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      restartGame();
      return;
    }

    if (e.key === 'm' || e.key === 'M') {
      const isMuted = window.soundEngine.toggleMute();
      btnSound.innerHTML = isMuted ? '<span class="icon">🔇</span>' : '<span class="icon">🔊</span>';
      return;
    }

    if (game.isGameOver || game.isPaused) return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        game.move(-1);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        game.move(1);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        game.softDrop();
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyX':
        game.rotate(1);
        e.preventDefault();
        break;
      case 'KeyZ':
        game.rotate(-1);
        e.preventDefault();
        break;
      case 'Space':
        game.hardDrop();
        e.preventDefault();
        break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        game.hold();
        e.preventDefault();
        break;
    }
  });

  // 버튼 이벤트
  btnSound.addEventListener('click', () => {
    const isMuted = window.soundEngine.toggleMute();
    btnSound.innerHTML = isMuted ? '<span class="icon">🔇</span>' : '<span class="icon">🔊</span>';
  });

  btnPause.addEventListener('click', togglePause);
  btnRestart.addEventListener('click', restartGame);
  modalActionBtn.addEventListener('click', () => {
    if (game.isGameOver) {
      restartGame();
    } else if (game.isPaused) {
      togglePause();
    }
  });

  // 갤러리 모달
  btnGallery.addEventListener('click', () => {
    galleryModal.classList.remove('hidden');
  });

  btnCloseGallery.addEventListener('click', () => {
    galleryModal.classList.add('hidden');
  });

  // 터치 컨트롤
  const tBtnLeft = document.getElementById('tBtnLeft');
  const tBtnRight = document.getElementById('tBtnRight');
  const tBtnDown = document.getElementById('tBtnDown');
  const tBtnHold = document.getElementById('tBtnHold');
  const tBtnRotL = document.getElementById('tBtnRotL');
  const tBtnRotR = document.getElementById('tBtnRotR');
  const tBtnHard = document.getElementById('tBtnHard');

  const addTouch = (btn, action) => {
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (window.soundEngine) window.soundEngine.init();
      action();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.soundEngine) window.soundEngine.init();
      action();
    });
  };

  addTouch(tBtnLeft, () => game.move(-1));
  addTouch(tBtnRight, () => game.move(1));
  addTouch(tBtnDown, () => game.softDrop());
  addTouch(tBtnHold, () => game.hold());
  addTouch(tBtnRotL, () => game.rotate(-1));
  addTouch(tBtnRotR, () => game.rotate(1));
  addTouch(tBtnHard, () => game.hardDrop());

  // 게임 시작
  game.spawnPiece();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
});
