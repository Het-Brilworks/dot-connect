export type Color = 'red' | 'blue' | 'yellow' | 'pink';
export type CellType = 'dot' | 'bomb' | 'rowBar' | 'colBar' | 'rainbow';

export interface Cell {
  id: number;
  type: CellType;
  color: Color;
  bombCount?: number;
}

export type Grid = (Cell | null)[][];

export interface Position {
  row: number;
  col: number;
}
