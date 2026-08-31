/**
 * BANBAN TETRIS - Main Controller, Dynamic Renderer & Realistic 3D Character Bindings
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

  // 🐶 우리집 반반이 기반 실사 3D 캐릭터 상태 매핑
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
      banbanAvatar.classList.remove('bounce', 'spin');
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

  // 프리미엄 네온 블록 렌더링
  function drawBlock(ctx, x, y, color, size = BLOCK_SIZE, isGhost = false) {
    const px = x * size;
    const py = y * size;

    ctx.save();
    if (isGhost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
    } else {
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

      // 상단/좌측 하이라이트 광원
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(px + 1, py + 1, size - 2, 3);
      ctx.fillRect(px + 1, py + 1, 3, size - 2);

      // 하단/우측 음영
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(px + 1, py + size - 4, size - 2, 3);
      ctx.fillRect(px + size - 4, py + 1, 3, size - 2);

      // 중앙 큐빅 코어 포인트
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(px + size / 2 - 2, py + size / 2 - 2, 4, 4);
    }
    ctx.restore();
  }

  // 그리드 배경 렌더링
  function drawGrid(ctx, width, height, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
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

    // 1. 고정된 보드 블록
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (game.board[r][c]) {
          drawBlock(gameCtx, c, r, game.board[r][c]);
        }
      }
    }

    // 2. 고스트 피스
    const ghost = game.getGhostPosition();
    if (ghost && game.currentPiece && !game.isGameOver) {
      const { matrix, color } = game.currentPiece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            drawBlock(gameCtx, ghost.x + c, ghost.y + r, color, BLOCK_SIZE, true);
          }
        }
      }
    }

    // 3. 현재 조작 피스
    if (game.currentPiece && !game.isGameOver) {
      const { x, y, matrix, color } = game.currentPiece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            drawBlock(gameCtx, x + c, y + r, color, BLOCK_SIZE, false);
          }
        }
      }
    }

    // 4. 파티클 이펙트
    if (window.particleSystem) {
      window.particleSystem.draw(gameCtx);
    }
  }

  // 미니 피스 렌더링
  function renderMiniPiece(ctx, canvas, type, miniSize = 22) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const matrix = window.SHAPES[type];
    const color = window.COLORS[type];
    const pieceW = matrix[0].length * miniSize;
    const pieceH = matrix.length * miniSize;
    const startX = (canvas.width - pieceW) / 2;
    const startY = (canvas.height - pieceH) / 2;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const px = startX + c * miniSize;
          const py = startY + r * miniSize;

          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.fillRect(px + 1, py + 1, miniSize - 2, miniSize - 2);
          ctx.restore();
        }
      }
    }
  }

  // Next Queue 렌더링 (3개)
  function renderNextQueue() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const miniSize = 20;

    for (let i = 0; i < 3; i++) {
      const type = game.nextQueue[i];
      if (!type) continue;

      const matrix = window.SHAPES[type];
      const color = window.COLORS[type];
      const pieceW = matrix[0].length * miniSize;
      const startX = (nextCanvas.width - pieceW) / 2;
      const startY = 15 + i * 85;

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            const px = startX + c * miniSize;
            const py = startY + r * miniSize;

            nextCtx.save();
            nextCtx.shadowBlur = 8;
            nextCtx.shadowColor = color;
            nextCtx.fillStyle = color;
            nextCtx.fillRect(px + 1, py + 1, miniSize - 2, miniSize - 2);
            nextCtx.restore();
          }
        }
      }
    }
  }

  // HUD 및 피버 게이지 갱신
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
    modalTitle.style.color = 'var(--neon-cyan)';
    modalSubtitle.innerHTML = `반반이도 잠시 휴식 타임!<br>준비되면 계속하기를 눌러주세요.`;
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

  // 갤러리 모달 이벤트
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
