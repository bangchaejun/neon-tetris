/**
 * NEON TETRIS - Controller, Renderer & UI Binding
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
  const levelDisplay = document.getElementById('levelDisplay');
  const linesDisplay = document.getElementById('linesDisplay');
  const highScoreDisplay = document.getElementById('highScoreDisplay');

  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');
  const btnRestart = document.getElementById('btn-restart');

  const overlayModal = document.getElementById('overlayModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const finalScoreSpan = document.getElementById('finalScore');
  const modalActionBtn = document.getElementById('modalActionBtn');

  // Game Instance
  const game = new window.TetrisGame();

  let lastTime = 0;
  let animationId = null;

  // 블록 그리기 (네온 스타일 & 베벨)
  function drawBlock(ctx, x, y, color, size = BLOCK_SIZE, isGhost = false) {
    const px = x * size;
    const py = y * size;

    ctx.save();
    if (isGhost) {
      // 반투명 고스트 스타일
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
    } else {
      // 본체 채우기
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

      // 입체적인 네온 하이라이트 (상/좌측 광원)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(px + 1, py + 1, size - 2, 3);
      ctx.fillRect(px + 1, py + 1, 3, size - 2);

      // 내부 어두운 테두리 (하/우측 음영)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(px + 1, py + size - 4, size - 2, 3);
      ctx.fillRect(px + size - 4, py + 1, 3, size - 2);
    }
    ctx.restore();
  }

  // 그리드 배경 렌더링
  function drawGrid(ctx, width, height, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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

    // 1. 고정된 보드 블록 렌더링
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (game.board[r][c]) {
          drawBlock(gameCtx, c, r, game.board[r][c]);
        }
      }
    }

    // 2. 고스트 피스 렌더링
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

    // 3. 현재 조작 중인 피스 렌더링
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

    // 4. 파티클 이펙트 렌더링
    if (window.particleSystem) {
      window.particleSystem.draw(gameCtx);
    }
  }

  // 미니 피스 캔버스 렌더링 (Hold & Next)
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

  // Next Queue 렌더링 (3개 미리보기)
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
      const startY = 20 + i * 90;

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

  // HUD 갱신
  function updateHUD() {
    scoreDisplay.textContent = game.score.toLocaleString();
    levelDisplay.textContent = game.level;
    linesDisplay.textContent = game.lines;
    highScoreDisplay.textContent = game.highScore.toLocaleString();
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
    modalTitle.textContent = 'GAME OVER';
    modalTitle.style.color = 'var(--neon-magenta)';
    modalSubtitle.innerHTML = `최종 점수: <span class="neon-cyan">${game.score.toLocaleString()}</span>`;
    modalActionBtn.textContent = '다시 도전';
    overlayModal.classList.remove('hidden');
  }

  function showPauseModal() {
    modalTitle.textContent = 'PAUSED';
    modalTitle.style.color = 'var(--neon-cyan)';
    modalSubtitle.innerHTML = `잠시 휴식 중입니다.<br>준비되면 계속하기를 눌러주세요.`;
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

  // 키보드 이벤트 핸들러
  window.addEventListener('keydown', (e) => {
    // 사운드 활성화를 위한 인터랙션
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
        game.rotate(1); // 시계방향
        e.preventDefault();
        break;
      case 'KeyZ':
        game.rotate(-1); // 반시계방향
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

  // 버튼 이벤트 바인딩
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

  // 모바일 터치 컨트롤 바인딩
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
