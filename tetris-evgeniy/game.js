// ============ КОНСТАНТЫ ============
const COLS = 10;
const ROWS = 20;
const CELL = 30;

// ============ БАЗОВЫЙ КЛАСС ФИГУРЫ ============
class Tetromino {
  #shape;
  #color;
  #x;
  #y;

  constructor(shape, color) {
    this.#shape = shape;
    this.#color = color;
    this.#x = 3;
    this.#y = 0;
  }

  get shape() { return this.#shape; }
  set shape(value) { this.#shape = value; }   // ИСПРАВЛЕНО: добавлен сеттер
  get color() { return this.#color; }
  get x() { return this.#x; }
  get y() { return this.#y; }
  set x(value) { this.#x = value; }
  set y(value) { this.#y = value; }

  get cells() {
    const result = [];
    for (let row = 0; row < this.#shape.length; row++) {
      for (let col = 0; col < this.#shape[row].length; col++) {
        if (this.#shape[row][col]) {
          result.push([this.#x + col, this.#y + row]);
        }
      }
    }
    return result;
  }

  rotate() {
    this.#shape = this.#shape[0].map((_, i) =>
      this.#shape.map(row => row[i]).reverse()
    );
  }
}

// ============ 7 НАСЛЕДНИКОВ ============
class IShape extends Tetromino { constructor() { super([[1, 1, 1, 1]], '#00e5e5'); } }
class OShape extends Tetromino { constructor() { super([[1, 1], [1, 1]], '#f5e000'); } }
class TShape extends Tetromino { constructor() { super([[0, 1, 0], [1, 1, 1]], '#a855f7'); } }
class SShape extends Tetromino { constructor() { super([[0, 1, 1], [1, 1, 0]], '#22c55e'); } }
class ZShape extends Tetromino { constructor() { super([[1, 1, 0], [0, 1, 1]], '#ef4444'); } }
class JShape extends Tetromino { constructor() { super([[1, 0, 0], [1, 1, 1]], '#3b82f6'); } }
class LShape extends Tetromino { constructor() { super([[0, 0, 1], [1, 1, 1]], '#f97316'); } }

// ============ КЛАСС ПОЛЯ ============
class Board {
  #grid;

  constructor() {
    this.reset();
  }

  reset() {
    this.#grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  get grid() {
    return this.#grid;
  }

  isValidPosition(piece) {
    for (const [x, y] of piece.cells) {
      // ИСПРАВЛЕНО: сначала проверяем границы и выходим, потом обращаемся к сетке
      if (x < 0 || x >= COLS || y >= ROWS) return false;
      if (y >= 0 && this.#grid[y][x] !== null) return false;
    }
    return true;
  }

  lock(piece) {
    for (const [x, y] of piece.cells) {
      if (y >= 0 && y < ROWS) {
        this.#grid[y][x] = piece.color;
      }
    }
  }

  clearLines() {
    let linesCleared = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (this.#grid[row].every(cell => cell !== null)) {
        this.#grid.splice(row, 1);
        this.#grid.unshift(Array(COLS).fill(null));
        linesCleared++;
        row++;
      }
    }
    return linesCleared;
  }
}

// ============ ГЛАВНЫЙ КЛАСС ИГРЫ ============
class Game {
  #board;
  #activePiece;
  #nextPiece;

  #score = 0;
  #level = 1;
  #lines = 0;

  #dropCounter = 0;
  #dropInterval = 800;
  #lastTime = 0;
  #isGameOver = false;
  #isPaused = false;

  constructor() {
    this.#board = new Board();
    this.#nextPiece = this.#getRandomPiece();
    this.spawnPiece();
    this.#bindControls();
    this.#updateUI();
    requestAnimationFrame(this.#loop);
  }

  restart() {
    this.#board.reset();
    this.#score = 0;
    this.#level = 1;
    this.#lines = 0;
    this.#dropInterval = 800;
    this.#dropCounter = 0;
    this.#isGameOver = false;
    this.#isPaused = false;
    this.#nextPiece = this.#getRandomPiece();
    this.spawnPiece();
    this.#updateUI();
  }

  #getRandomPiece() {
    const shapes = [IShape, OShape, TShape, SShape, ZShape, JShape, LShape];
    const RandomPiece = shapes[Math.floor(Math.random() * shapes.length)];
    return new RandomPiece();
  }

  spawnPiece() {
    this.#activePiece = this.#nextPiece;
    this.#nextPiece = this.#getRandomPiece();
    this.#drawNextPiece();

    if (!this.#board.isValidPosition(this.#activePiece)) {
      this.#isGameOver = true;
      this.#updateUI();
    }
  }

  move(dx, dy) {
    if (this.#isGameOver || this.#isPaused) return;

    const piece = this.#activePiece;
    const oldX = piece.x;
    const oldY = piece.y;

    piece.x += dx;
    piece.y += dy;

    if (!this.#board.isValidPosition(piece)) {
      piece.x = oldX;
      piece.y = oldY;
      if (dy > 0) this.lockPiece();
    }
  }

  rotate() {
    if (this.#isGameOver || this.#isPaused) return;

    const piece = this.#activePiece;
    const oldShape = piece.shape;
    piece.rotate();

    if (!this.#board.isValidPosition(piece)) {
      piece.shape = oldShape;
    }
  }

  lockPiece() {
    this.#board.lock(this.#activePiece);
    this.#dropCounter = 0;

    const cleared = this.#board.clearLines();
    if (cleared > 0) {
      this.#lines += cleared;

      const isTetris = cleared === 4;
      const isHighLevel = this.#level >= 3;
      let points = 0;

      if (isTetris && isHighLevel) {
        points = 1200;
      } else if (isTetris) {
        points = 800;
      } else if (cleared === 3) {
        points = 500;
      } else if (cleared === 2) {
        points = 300;
      } else {
        points = 100;
      }

      this.#score += points;

      const newLevel = Math.floor(this.#lines / 10) + 1;
      if (newLevel > this.#level) {
        this.#level = newLevel;
        this.#dropInterval = Math.max(100, 800 - (this.#level - 1) * 70);
      }
    }

    this.#updateUI();
    this.spawnPiece();
  }

  togglePause() {
    if (this.#isGameOver) return;
    this.#isPaused = !this.#isPaused;
  }

  #bindControls() {
    document.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (this.#isGameOver) {
        if (e.key === 'Enter') this.restart();
        return;
      }

      if (e.key === ' ') {
        this.togglePause();
        return;
      }

      if (this.#isPaused) return;

      // ИСПРАВЛЕНО: игнорируем автоповтор для ↓
      if (e.repeat && e.key === 'ArrowDown') return;

      switch (e.key) {
        case 'ArrowLeft': this.move(-1, 0); break;
        case 'ArrowRight': this.move(1, 0); break;
        case 'ArrowDown': this.move(0, 1); break;
        case 'ArrowUp': this.rotate(); break;
      }
    });
  }

  #updateUI() {
    document.getElementById('score').textContent = this.#score;
    document.getElementById('level').textContent = this.#level;
    document.getElementById('lines').textContent = this.#lines;

    const avatar = document.getElementById('avatar');
    if (this.#isGameOver) {
      avatar.textContent = '💀';
    } else if ((this.#score > 2000 && this.#level >= 3) || this.#score > 5000) {
      avatar.textContent = '🤩';
    } else if (this.#score > 1000) {
      avatar.textContent = '😎';
    } else if (this.#score > 300) {
      avatar.textContent = '🙂';
    } else {
      avatar.textContent = '😐';
    }
  }

  #drawNextPiece() {
    const nextCanvas = document.getElementById('next');
    const nCtx = nextCanvas.getContext('2d');

    nCtx.fillStyle = '#08080c';
    nCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!this.#nextPiece) return;

    const shape = this.#nextPiece.shape;
    const cells = [];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) cells.push([col, row]);
      }
    }

    const xs = cells.map(c => c[0]);
    const ys = cells.map(c => c[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const pieceWidth = (maxX - minX + 1) * CELL;
    const pieceHeight = (maxY - minY + 1) * CELL;
    const offsetX = (nextCanvas.width - pieceWidth) / 2;
    const offsetY = (nextCanvas.height - pieceHeight) / 2;

    for (const [x, y] of cells) {
      const drawX = offsetX + (x - minX) * CELL;
      const drawY = offsetY + (y - minY) * CELL;

      nCtx.fillStyle = this.#nextPiece.color;
      nCtx.fillRect(drawX, drawY, CELL, CELL);
      nCtx.strokeStyle = '#0d0d12';
      nCtx.lineWidth = 2;
      nCtx.strokeRect(drawX + 1, drawY + 1, CELL - 2, CELL - 2);
    }
  }

  #loop = (time = 0) => {
    const deltaTime = time - this.#lastTime;
    this.#lastTime = time;

    if (!this.#isGameOver && !this.#isPaused) {
      this.#dropCounter += deltaTime;
      if (this.#dropCounter > this.#dropInterval) {
        this.move(0, 1);
        this.#dropCounter = 0;
      }
    }

    render(this);
    requestAnimationFrame(this.#loop);
  };

  get board() { return this.#board; }
  get activePiece() { return this.#activePiece; }
  get isGameOver() { return this.#isGameOver; }
  get isPaused() { return this.#isPaused; }
}

// ============ ОТРИСОВКА ============
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const drawCell = (col, row, color) => {
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = '#0d0d12';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(x + 3, y + 3, CELL - 6, 4);
};

const drawGrid = () => {
  ctx.strokeStyle = '#1a1a28';
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, ROWS * CELL); ctx.stroke();
  }
  for (let j = 1; j < ROWS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(COLS * CELL, j * CELL); ctx.stroke();
  }
};

const render = (game) => {
  ctx.fillStyle = '#08080c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  const grid = game.board.grid;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (grid[row][col]) drawCell(col, row, grid[row][col]);
    }
  }

  if (game.activePiece && !game.isGameOver && !game.isPaused) {
    for (const [col, row] of game.activePiece.cells) {
      // ИСПРАВЛЕНО: не рисуем то, что вне поля
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        drawCell(col, row, game.activePiece.color);
      }
    }
  }

  if (game.isPaused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9b9bff';
    ctx.font = 'bold 26px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
    ctx.font = '14px "Courier New"';
    ctx.fillText('Пробел — продолжить', canvas.width / 2, canvas.height / 2 + 30);
  }

  if (game.isGameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 30px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#e8e8f0';
    ctx.font = '14px "Courier New"';
    ctx.fillText('Enter — новая игра', canvas.width / 2, canvas.height / 2 + 30);
  }
};

// ============ ЗАПУСК ============
const game = new Game();