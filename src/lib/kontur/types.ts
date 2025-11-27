export type Severity = "ok" | "warning" | "error";

export interface Point {
  x: number;
  y: number;
  rawLine: string;
}

export interface Kontur {
  index: number;
  rawHeader: string;
  kodId: string | null;
  ofu: string | null;
  klasa: string | null;
  extraLabel: string | null;
  points: Point[];
  errors: string[];
  warnings: string[];
}

export interface Block {
  index: number;
  headerLine: string;
  coordLine: string | null;
  countLine: string | null;
  pointLines: string[];
}

