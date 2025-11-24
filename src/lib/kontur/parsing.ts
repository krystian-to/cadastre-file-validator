// src/lib/kontur/parsing.ts
import type { Block, Point, Kontur, Severity } from "./types";
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
  } else if (!ALLOWED_OFU.has(ofu)) {
    k.errors.push(
      `Nieznany kod użytku: ${ofu} (sprawdź zgodność z EGiB / katalogiem OFU).`,
    );
  }

  if (ofu && NON_CLASSIFIED_OFU.has(ofu)) {
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
  } else if (ofu === "Ls") {
    if (klasa && !FOREST_CLASSES.has(klasa)) {
      k.errors.push(
        `Niepoprawna klasa dla Ls: '${klasa}'. Dopuszczalne: ${[
          ...FOREST_CLASSES,
        ].join(", ")}.`,
      );
    }
  } else if (ofu) {
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

export function suggestionsForKontur(k: Kontur): string[] {
  const sugs = new Set<string>();

  for (const e of k.errors) {
    if (e.includes("powinien mieć klasę") && k.ofu) {
      sugs.add(`Uzupełnij klasę, np. '${k.ofu}IVa' zgodnie z UTKG.`);
    }
    if (e.includes("Niepoprawna klasa")) {
      sugs.add(
        "Zmień klasę na jedną z: I, II, III, IIIa, IIIb, IV, IVa, IVb, V, VI, VIz.",
      );
    }
    if (e.includes("Powierzchnia Ls")) {
      sugs.add(
        "Scal/zmień granice, aby Ls ≥ 0,10 ha, lub zmień użytek na nieleśny.",
      );
    }
    if (e.includes("Niepoprawny format nagłówka")) {
      sugs.add("Nagłówek w formacie 'NN-XX/OFUklasa', np. '23-1/RIVa'.");
    }
  }

  if (k.extraLabel && k.ofu && k.ofu !== "R") {
    sugs.add("Usuń mieszane oznaczenia (pozostaw wyłącznie właściwy OFU).");
  }

  return [...sugs];
}

export function severity(k: Kontur): Severity {
  if (k.errors.length > 0) return "error";
  if (k.warnings.length > 0) return "warning";
  return "ok";
}
