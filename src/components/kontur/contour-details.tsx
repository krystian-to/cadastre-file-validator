"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Kontur } from "@/lib/kontur";
import {
  computeAreaM2,
  severity,
  suggestionsForKontur,
} from "@/lib/kontur";

interface ContourDetailsProps {
  kontur: Kontur | null;
}

export function ContourDetails({ kontur }: ContourDetailsProps) {
  if (!kontur) {
    return (
      <Card className="border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-100">
            Szczegóły konturu
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-500">
          Wybierz kontur z tabeli, aby zobaczyć detale.
        </CardContent>
      </Card>
    );
  }

  const sev = severity(kontur);
  const area = computeAreaM2(kontur.points);
  const suggestions = suggestionsForKontur(kontur);

  return (
    <Card className="border-slate-800/70 bg-slate-950/75 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm text-slate-100">
          <span>Szczegóły konturu #{kontur.index}</span>
          <Status sev={sev} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="space-y-1 text-[11px]">
          <div className="font-mono text-slate-200">
            Nagłówek:{" "}
            <span className="text-slate-100">{kontur.rawHeader}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-300">
            <span>
              <span className="text-slate-500">Kod/ID:</span>{" "}
              <span className="font-mono">
                {kontur.kodId ?? <span className="text-slate-500">—</span>}
              </span>
            </span>
            <span>
              <span className="text-slate-500">OFU:</span>{" "}
              <span className="font-mono">
                {kontur.ofu ?? <span className="text-slate-500">—</span>}
              </span>
            </span>
            <span>
              <span className="text-slate-500">Klasa:</span>{" "}
              <span className="font-mono">
                {kontur.klasa ?? <span className="text-slate-500">—</span>}
              </span>
            </span>
            <span>
              <span className="text-slate-500">extra:</span>{" "}
              <span className="font-mono">
                {kontur.extraLabel ?? (
                  <span className="text-slate-500">—</span>
                )}
              </span>
            </span>
            <span>
              <span className="text-slate-500">Pole:</span>{" "}
              {area != null ? `${area.toFixed(1)} m²` : "—"}
            </span>
          </div>
        </div>

        <ScrollArea className="max-h-64 space-y-3 pr-2">
          {kontur.errors.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-red-300">
                Błędy ({kontur.errors.length})
              </div>
              <ul className="ml-4 list-disc space-y-1 text-[11px] text-red-200">
                {kontur.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {kontur.warnings.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-amber-300">
                Ostrzeżenia ({kontur.warnings.length})
              </div>
              <ul className="ml-4 list-disc space-y-1 text-[11px] text-amber-100">
                {kontur.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-emerald-300">
                Propozycje poprawek
              </div>
              <ul className="ml-4 list-disc space-y-1 text-[11px] text-emerald-100">
                {suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {kontur.errors.length === 0 &&
            kontur.warnings.length === 0 &&
            suggestions.length === 0 && (
              <div className="text-[11px] text-slate-500">
                Brak błędów i ostrzeżeń. Wygląda dobrze.
              </div>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Status({ sev }: { sev: ReturnType<typeof severity> }) {
  if (sev === "error") {
    return (
      <Badge className="border-none bg-red-500/20 px-2 py-0 text-[10px] font-medium text-red-300">
        ❌ Błąd
      </Badge>
    );
  }
  if (sev === "warning") {
    return (
      <Badge className="border-none bg-amber-500/20 px-2 py-0 text-[10px] font-medium text-amber-200">
        ⚠️ Ostrz.
      </Badge>
    );
  }
  return (
    <Badge className="border-none bg-emerald-500/20 px-2 py-0 text-[10px] font-medium text-emerald-200">
      ✅ OK
    </Badge>
  );
}
