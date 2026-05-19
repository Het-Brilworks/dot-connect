import { Cell, Color, Grid, Position } from './types';
import { COLORS, GRID_SIZE, MIN_CHAIN, RAINBOW_THRESHOLD, INITIAL_BOMBS, INITIAL_BARS } from './constants';

let _idCounter = 0;
function nextId() { return _idCounter++; }

function randomColor(): Color {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function makeCell(type: Cell['type'], color: Color, bombCount?: number): Cell {
  return { id: nextId(), type, color, bombCount };
}

export function initGrid(): Grid {
  const grid: Grid = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );

  const occupied = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  function randomEmpty() {
    let r: number, c: number;
    do {
      r = randomInt(0, GRID_SIZE - 1);
      c = randomInt(0, GRID_SIZE - 1);
    } while (occupied.has(key(r, c)));
    occupied.add(key(r, c));
    return { r, c };
  }

  // Place bombs
  for (let i = 0; i < INITIAL_BOMBS; i++) {
    const { r, c } = randomEmpty();
    grid[r][c] = makeCell('bomb', randomColor(), randomInt(4, 6));
  }

  // Place row/col bars
  for (let i = 0; i < INITIAL_BARS; i++) {
    const { r, c } = randomEmpty();
    const type = Math.random() > 0.5 ? 'rowBar' : 'colBar';
    grid[r][c] = makeCell(type, randomColor());
  }

  // Fill rest with dots
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) {
        grid[r][c] = makeCell('dot', randomColor());
      }
    }
  }

  return grid;
}

export function isValidChainAddition(
  chain: Position[],
  candidate: Position,
  grid: Grid
): boolean {
  const { row, col } = candidate;
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;

  const cell = grid[row][col];
  if (!cell) return false;

  // Not already in chain
  if (chain.some(p => p.row === row && p.col === col)) return false;

  if (chain.length === 0) return true;

  // Must be adjacent (no diagonal)
  const last = chain[chain.length - 1];
  const dx = Math.abs(col - last.col);
  const dy = Math.abs(row - last.row);
  if (dx + dy !== 1) return false;

  // Color validation
  const rainbowIdx = chain.findIndex(p => grid[p.row][p.col]?.type === 'rainbow');

  if (cell.type === 'rainbow') {
    // Allow only one rainbow per chain
    return rainbowIdx === -1;
  }

  if (rainbowIdx === -1) {
    // No rainbow yet — must match the color of the first cell
    const firstCell = grid[chain[0].row][chain[0].col];
    return cell.color === firstCell?.color;
  }

  // Chain has a rainbow: find color of segment after rainbow
  const afterRainbow = chain.slice(rainbowIdx + 1);
  if (afterRainbow.length === 0) {
    // First cell after rainbow — any color allowed (bridges to new color)
    return true;
  }
  const afterColor = grid[afterRainbow[0].row][afterRainbow[0].col]?.color;
  return cell.color === afterColor;
}

export interface ChainResult {
  newGrid: Grid;
  score: number;
  gameOver: boolean;
  rainbowPos: Position | null;
  destroyedCount: number;
}

export function processChain(chain: Position[], grid: Grid): ChainResult {
  if (chain.length < MIN_CHAIN) {
    return { newGrid: grid, score: 0, gameOver: false, rainbowPos: null, destroyedCount: 0 };
  }

  // Deep copy the grid (shallow copy each row — cells are replaced not mutated)
  const newGrid: Grid = grid.map(row => [...row]);

  // Collect positions to clear
  const toRemove = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;
  let rowBarPositions: number[] = [];
  let colBarPositions: number[] = [];

  chain.forEach(({ row, col }) => {
    toRemove.add(key(row, col));
    const cell = newGrid[row][col];
    if (cell?.type === 'rowBar') rowBarPositions.push(row);
    if (cell?.type === 'colBar') colBarPositions.push(col);
  });

  // Expand for row bars
  rowBarPositions.forEach(r => {
    for (let c = 0; c < GRID_SIZE; c++) toRemove.add(key(r, c));
  });

  // Expand for col bars
  colBarPositions.forEach(c => {
    for (let r = 0; r < GRID_SIZE; r++) toRemove.add(key(r, c));
  });

  // Remove marked cells
  toRemove.forEach(k => {
    const [r, c] = k.split(',').map(Number);
    newGrid[r][c] = null;
  });

  const destroyedCount = toRemove.size;

  // Decrement bombs and check for explosions
  let gameOver = false;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = newGrid[r][c];
      if (cell?.type === 'bomb') {
        const newCount = (cell.bombCount ?? 1) - 1;
        if (newCount <= 0) {
          // Explode: clear bomb and orthogonal neighbors
          newGrid[r][c] = null;
          [
            [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
          ].forEach(([nr, nc]) => {
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              newGrid[nr][nc] = null;
            }
          });
          gameOver = true;
        } else {
          newGrid[r][c] = { ...cell, bombCount: newCount };
        }
      }
    }
  }

  // Score: chainLength × (chainLength - 2) × 10, min = 10 for length 3
  const n = chain.length;
  const score = n * Math.max(1, n - 2) * 10;

  // Where to place rainbow (if chain >= threshold)
  let rainbowPos: Position | null = null;
  if (chain.length >= RAINBOW_THRESHOLD) {
    // Will be placed during refill; mark the first chain cell's position
    rainbowPos = { row: chain[0].row, col: chain[0].col };
  }

  // Refill columns — gravity pulls down, new cells come from top
  for (let c = 0; c < GRID_SIZE; c++) {
    const column: (Cell | null)[] = [];
    for (let r = 0; r < GRID_SIZE; r++) column.push(newGrid[r][c]);

    const existing = column.filter(Boolean) as Cell[];
    const needed = GRID_SIZE - existing.length;
    const newCells: Cell[] = Array.from({ length: needed }, () => {
      const roll = Math.random();
      if (roll < 0.08) return makeCell('bomb', randomColor(), randomInt(4, 6));
      if (roll < 0.13) return makeCell(Math.random() > 0.5 ? 'rowBar' : 'colBar', randomColor());
      return makeCell('dot', randomColor());
    });

    const filled = [...newCells, ...existing];
    for (let r = 0; r < GRID_SIZE; r++) {
      newGrid[r][c] = filled[r];
    }
  }

  // Place rainbow star if earned
  if (rainbowPos) {
    // Find a random non-bomb cell in the new grid
    const candidates: Position[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = newGrid[r][c];
        if (cell && cell.type === 'dot') candidates.push({ row: r, col: c });
      }
    }
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      newGrid[pick.row][pick.col] = makeCell('rainbow', randomColor());
      rainbowPos = pick;
    }
  }

  return { newGrid, score, gameOver, rainbowPos, destroyedCount };
}

export function getChainColor(chain: Position[], grid: Grid): Color | null {
  if (chain.length === 0) return null;
  const rainbowIdx = chain.findIndex(p => grid[p.row][p.col]?.type === 'rainbow');
  if (rainbowIdx === -1) {
    return grid[chain[0].row][chain[0].col]?.color ?? null;
  }
  const after = chain.slice(rainbowIdx + 1);
  if (after.length === 0) return null;
  return grid[after[0].row][after[0].col]?.color ?? null;
}
