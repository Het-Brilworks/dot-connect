import type { Color } from './types';

export const GRID_SIZE = 6;
export const COLORS: Color[] = ['red', 'blue', 'yellow', 'pink'];
export const MIN_CHAIN = 3;
export const RAINBOW_THRESHOLD = 6;

export const COLOR_HEX: Record<Color, string> = {
  red: '#E91E63',
  blue: '#2196F3',
  yellow: '#FFC107',
  pink: '#FF80AB',
};

export const COLOR_DARK: Record<Color, string> = {
  red: '#AD1457',
  blue: '#1565C0',
  yellow: '#F57F17',
  pink: '#C2185B',
};

export const INITIAL_BOMBS = 3;
export const INITIAL_BARS = 2;
