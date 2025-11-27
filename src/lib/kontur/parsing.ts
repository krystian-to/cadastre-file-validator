import type { Block, Point, Kontur } from "./types";
import {
  ALLOWED_OFU,
  AGRI_CLASSES,
  FOREST_CLASSES,
  NON_CLASSIFIED_OFU,
} from "./constants";

export function normalizeOfu(ofu: string): string {
  let v = ofu.trim();
  v = v.replace("ł", "Ł");
  if (v.toLowerCase() === "dr") return "dr";
  if (v.length === 0) return v;
  if (v.length === 1) return v.toUpperCase();
  return v[0].toUpperCase() + v.slice(1);
}

export function normalizeKlasa(kl?: string | null): string | null {
  const raw = (kl ?? "").trim();
  if (!raw) return null;
  let v = raw.toUpperCase();
  v = v.replace(/([ABZ])$/u, (_, g1: string) => g1.toLowerCase());
  return v;
}

export function splitOfuKlasa(
  token: string,
): { ofu: string | null; klasa: string | null } {
  const raw = token.trim();
  if (!raw) return { ofu: null, klasa: null };

  const normalizedFull = normalizeOfu(raw);
  if (ALLOWED_OFU.has(normalizedFull)) {
    return { ofu: normalizedFull, klasa: null };
  }

  for (const kl of [...AGRI_CLASSES, ...FOREST_CLASSES]) {
    if (raw.toUpperCase().endsWith(kl.toUpperCase())) {
      const ofuPart = raw.slice(0, raw.length - kl.length);
      const ofuNorm = normalizeOfu(ofuPart);
      const klNorm = normalizeKlasa(kl);
      if (ALLOWED_OFU.has(ofuNorm)) {
        return { ofu: ofuNorm, klasa: klNorm };
      }
    }
  }

  if (raw.length > 1) {
    const ofuPart = raw[0];
    const rest = raw.slice(1);
    const ofuNorm = normalizeOfu(ofuPart);
    const klNorm = normalizeKlasa(rest);
    if (ALLOWED_OFU.has(ofuNorm)) {
      return { ofu: ofuNorm, klasa: klNorm };
    }
  }

  return { ofu: normalizedFull, klasa: null };
}

export function parseTextToBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  let idx = 1;

  const headerRegex = /^\s*([0-9xX\-]+)\s*\/\s*(\S+)\s*$/u;

  while (i < lines.length) {
    const line = lines[i]?.replace(/\r$/, "") ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (headerRegex.test(line)) {
      const headerLine = line;
      let coordLine: string | null = null;
      let countLine: string | null = null;
      const pointLines: string[] = [];

      i += 1;
      if (i < lines.length) {
        coordLine = lines[i]?.replace(/\r$/, "") ?? null;
      }

      i += 1;
      while (i < lines.length && !lines[i].trim()) {
        i += 1;
      }

      if (i < lines.length && /^\s*\d+\s*$/.test(lines[i])) {
        countLine = lines[i].trim();
        const n = Number.parseInt(countLine, 10);
        i += 1;
        for (let k = 0; k < n && i < lines.length; k += 1, i += 1) {
          pointLines.push(lines[i]?.replace(/\r$/, "") ?? "");
        }
      }

      blocks.push({
        index: idx,
        headerLine,
        coordLine,
        countLine,
        pointLines,
      });
      idx += 1;
    } else {
      i += 1;
    }
  }

  return blocks;
}

export function parsePointsFromLines(
  pointLines: string[],
  pushWarning: (msg: string) => void,
): Point[] {
  const points: Point[] = [];

  for (const line of pointLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);

    if (parts.length < 3) {
      pushWarning(
        `Nie udało się sparsować węzła (za mało kolumn): "${line.slice(0, 60)}"`,
      );
      continue;
    }

    const xStr = parts[1]?.replace(",", ".");
    const yStr = parts[2]?.replace(",", ".");

    const x = Number.parseFloat(xStr);
    const y = Number.parseFloat(yStr);

    if (Number.isNaN(x) || Number.isNaN(y)) {
      pushWarning(
        `Nie udało się sparsować współrzędnych X/Y z linii: "${line.slice(
          0,
          60,
        )}"`,
      );
      continue;
    }

    points.push({ x, y, rawLine: line });
  }

  return points;
}

export function computeAreaM2(points: Point[]): number | null {
  if (!points || points.length < 3) return null;

  const pts = [...points];
  if (pts.length > 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first.x === last.x && first.y === last.y) {
      pts.pop();
    }
  }

  let s = 0;
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    s += p1.x * p2.y - p2.x * p1.y;
  }

  return Math.abs(s) * 0.5;
}

export function buildKonturFromBlock(block: Block): Kontur {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rawHeader = block.headerLine.trim();

  let kodId: string | null = null;
  let ofu: string | null = null;
  let klasa: string | null = null;
  let extraLabel: string | null = null;

  const caseA = /^\s*([0-9xX\-]+)\s*\/\s*([^\s]+)\s*$/u;
  const caseB =
    /^\s*([0-9xX\-]+)\s*\/\s*([A-Za-zŁł]{1,2})\s+([A-Za-zŁł]{1,2}[IVXivx]{0,3}[abzZ]?)\s*$/u;

  const mA = rawHeader.match(caseA);
  if (mA) {
    kodId = mA[1];
    const token = mA[2];
    if (!token.includes(" ")) {
      const split = splitOfuKlasa(token);
      ofu = split.ofu;
      klasa = split.klasa;
      extraLabel = null;
    } else {
      errors.push(
        "Niepoprawny format nagłówka (zbyt wiele tokenów po '/'). Oczekiwano np. '23-1/RIVa'.",
      );
    }
  } else {
    const mB = rawHeader.match(caseB);
    if (mB) {
      kodId = mB[1];
      ofu = normalizeOfu(mB[2]);
      klasa = null;
      extraLabel = mB[3];
    } else {
      errors.push(
        "Niepoprawny format nagłówka (np. '23-1/RIVa' albo '23-3/B RIIIb').",
      );
    }
  }

  const kontur: Kontur = {
    index: block.index,
    rawHeader,
    kodId,
    ofu,
    klasa,
    extraLabel,
    points: [],
    errors,
    warnings,
  };

  kontur.points = parsePointsFromLines(block.pointLines, (msg) =>
    kontur.warnings.push(msg),
  );

  validateKontur(kontur);

  return kontur;
}

export function validateKontur(k: Kontur): void {
  const { ofu, klasa, extraLabel } = k;

  if (!ofu) {
    k.errors.push("Brak kodu użytku (OFU) w nagłówku.");
    return;
  }

  if (!ALLOWED_OFU.has(ofu)) {
    k.errors.push(
      `Nieznany kod użytku: ${ofu} (sprawdź zgodność z EGiB / katalogiem OFU).`,
    );
    return;
  }

  if (NON_CLASSIFIED_OFU.has(ofu)) {
    if (klasa) {
      k.warnings.push(
        `Użytek ${ofu} zwykle nie ma klasy bonitacyjnej — rozważ usunięcie '${klasa}'.`,
      );
    }
    if (
      extraLabel &&
      /^[A-Za-zŁł]{1,2}[IVXivx]{0,3}[abzZ]?$/.test(extraLabel)
    ) {
      k.warnings.push(
        `Dodatkowa etykieta '${extraLabel}' wygląda na klasę — usuń ją dla ${ofu}.`,
      );
    }
    return;
  }

  if (ofu === "Ls") {
    if (klasa && !FOREST_CLASSES.has(klasa)) {
      k.errors.push(
        `Niepoprawna klasa dla Ls: '${klasa}'. Dopuszczalne: ${[
          ...FOREST_CLASSES,
        ].join(", ")}.`,
      );
    }
  } else {
    if (!klasa) {
      k.errors.push(`Użytek ${ofu} powinien mieć klasę (np. ${ofu}IVa).`);
    } else if (!AGRI_CLASSES.has(klasa)) {
      k.errors.push(
        `Niepoprawna klasa '${klasa}' dla ${ofu}. Dopuszczalne: ${[
          ...AGRI_CLASSES,
        ].join(", ")}.`,
      );
    }
  }

  if (ofu === "Ls") {
    const area = computeAreaM2(k.points);
    if (area == null) {
      k.warnings.push("Brak możliwości obliczenia pola (za mało punktów).");
    } else if (area < 1000) {
      k.errors.push(
        `Powierzchnia Ls ≈ ${area.toFixed(
          1,
        )} m² (< 1000 m²). Art. 3 u.lasów: las ≥ 0,10 ha.`,
      );
    }
  }
}

function levenshtein(a: string, b: string): number {
  const s = a;
  const t = b;
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1),
  );
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function closestClass(input: string, allowed: Set<string>): string | null {
  const normInput = normalizeKlasa(input);
  if (!normInput) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const candidate of allowed) {
    const d = levenshtein(normInput, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  if (bestDist > 2) return null;
  return best;
}

function closestOfu(input: string, allowed: Set<string>): string | null {
  const normInput = normalizeOfu(input);
  if (!normInput) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const candidate of allowed) {
    const d = levenshtein(normInput, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  if (bestDist > 2) return null;
  return best;
}

export function suggestionsForKontur(k: Kontur): string[] {
  const sugs = new Set<string>();

  for (const e of k.errors) {
    if (e.includes("Nieznany kod użytku") && k.ofu) {
      const best = closestOfu(k.ofu, ALLOWED_OFU);
      if (best) {
        sugs.add(
          `Zmień kod użytku z '${k.ofu}' na '${best}' (najbliższy dopuszczalny kod OFU).`,
        );
      } else {
        sugs.add(
          "Popraw kod użytku zgodnie z katalogiem OFU (np. R, Ł, Ps, Ls, Lz, B, N, W itd.).",
        );
      }
    }

    if (e.includes("powinien mieć klasę") && k.ofu) {
      sugs.add(
        `Dodaj poprawną klasę bonitacyjną dla użytku ${k.ofu} zgodnie z operatem klasyfikacyjnym.`,
      );
    }

    if (e.includes("Niepoprawna klasa") && k.klasa && k.ofu) {
      const allowed = k.ofu === "Ls" ? FOREST_CLASSES : AGRI_CLASSES;
      const best = closestClass(k.klasa, allowed);
      if (best) {
        sugs.add(
          `Zmień klasę z '${k.klasa}' na '${best}' (najbliższa poprawna wartość).`,
        );
      } else {
        sugs.add(
          "Zmień klasę na jedną z dopuszczalnych wartości (I, II, III, IIIa, IIIb, IV, IVa, IVb, V, VI, VIz).",
        );
      }
    }

    if (e.includes("Powierzchnia Ls")) {
      sugs.add(
        "Scal lub zmień granice konturu, aby Ls miała co najmniej 0,10 ha, albo zmień użytek na nieleśny.",
      );
    }

    if (e.includes("Niepoprawny format nagłówka")) {
      sugs.add(
        "Popraw nagłówek do formatu 'NN-XX/OFUklasa', np. '23-1/RIVa' lub '23-3/B RIIIb'.",
      );
    }
  }

  if (k.extraLabel && k.ofu && k.ofu !== "R") {
    sugs.add("Usuń mieszane oznaczenia i pozostaw wyłącznie właściwy OFU.");
  }

  return [...sugs];
}

export type Severity = "ok" | "warning" | "error";

export function severity(k: Kontur): Severity {
  if (k.errors.length > 0) return "error";
  if (k.warnings.length > 0) return "warning";
  return "ok";
}
