"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { PageShell } from "@/components/layout/page-shell";
import { UploadPanel } from "@/components/kontur/upload-panel";
import { ContoursTable } from "@/components/kontur/contours-table";
import { ContourDetails } from "@/components/kontur/contour-details";
import {
  Block,
  Kontur,
  parseTextToBlocks,
  buildKonturFromBlock,
} from "@/lib/kontur";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function blocksToText(blocks: Block[], headersOverride: Record<number, string>) {
  const lines: string[] = [];

  for (const b of blocks) {
    const header =
      headersOverride[b.index] !== undefined
        ? headersOverride[b.index]
        : b.headerLine;

    lines.push(header);
    if (b.coordLine != null) {
      lines.push(b.coordLine);
    }
    if (b.countLine != null) {
      lines.push(String(b.countLine));
      lines.push(...b.pointLines);
    }
  }

  return `${lines.join("\n")}\n`;
}

export default function HomePage() {
  const [rawText, setRawText] = useState<string>("");
  const [editedHeaders, setEditedHeaders] = useState<Record<number, string>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const blocks = useMemo<Block[]>(() => {
    if (!rawText.trim()) return [];
    return parseTextToBlocks(rawText);
  }, [rawText]);

  const kontury = useMemo<Kontur[]>(() => {
    return blocks.map((b) => {
      const headerOverride = editedHeaders[b.index];
      const blockWithHeader: Block = {
        ...b,
        headerLine: headerOverride !== undefined ? headerOverride : b.headerLine,
      };
      return buildKonturFromBlock(blockWithHeader);
    });
  }, [blocks, editedHeaders]);

  const selectedKontur: Kontur | null = useMemo(() => {
    if (kontury.length === 0) return null;
    if (selectedIndex == null) return kontury[0];
    return kontury.find((k) => k.index === selectedIndex) ?? kontury[0];
  }, [kontury, selectedIndex]);

  const handleHeaderChange = (index: number, value: string) => {
    setEditedHeaders((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const handleClear = () => {
    setRawText("");
    setEditedHeaders({});
    setSelectedIndex(null);
  };

  const handleDownload = () => {
    if (blocks.length === 0) return;

    const outText = blocksToText(blocks, editedHeaders);
    const blob = new Blob([outText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Kontury_eksport_dz_poprawione.txt";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const totalErrors = kontury.reduce((acc, k) => acc + k.errors.length, 0);
  const totalWarnings = kontury.reduce(
    (acc, k) => acc + k.warnings.length,
    0,
  );

  return (
    <>
      <AppHeader />
      <PageShell>
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/70 px-4 py-3 text-[11px] text-slate-300 backdrop-blur">
          <p className="font-semibold text-slate-100">
            Jak używać walidatora?
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>
              Wgraj plik TXT z konturami (lub wklej jego treść w pole po lewej).
            </li>
            <li>
              W tabeli po prawej poprawiaj nagłówki w kolumnie{" "}
              <span className="font-mono">Nagłówek</span> – walidacja od razu
              się odświeża.
            </li>
            <li>
              Po zakończeniu użyj przycisku{" "}
              <span className="font-mono">Pobierz zaktualizowany TXT</span>, aby
              zapisać poprawiony plik.
            </li>
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          <UploadPanel
            rawText={rawText}
            onRawTextChange={(value) => {
              setRawText(value);
              setEditedHeaders({});
              setSelectedIndex(null);
            }}
            onClear={handleClear}
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="text-[11px] text-slate-400">
                {kontury.length > 0 ? (
                  <>
                    Konturów:{" "}
                    <span className="font-medium text-slate-100">
                      {kontury.length}
                    </span>{" "}
                    · Błędów:{" "}
                    <span className="font-medium text-red-300">
                      {totalErrors}
                    </span>{" "}
                    · Ostrzeżeń:{" "}
                    <span className="font-medium text-amber-200">
                      {totalWarnings}
                    </span>
                  </>
                ) : (
                  "Brak danych do walidacji."
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-600 bg-slate-900 text-[11px] text-slate-100 hover:bg-slate-800"
                disabled={blocks.length === 0}
                onClick={handleDownload}
              >
                ⬇️ Pobierz zaktualizowany TXT
              </Button>
            </div>

            <ContoursTable
              kontury={kontury}
              editedHeaders={editedHeaders}
              onHeaderChange={handleHeaderChange}
              selectedIndex={selectedKontur?.index ?? null}
              onSelect={(idx) => setSelectedIndex(idx)}
            />
          </div>
        </div>

        <Separator className="my-2 bg-slate-800/70" />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ContourDetails kontur={selectedKontur} />

          <div className="rounded-lg border border-slate-800/70 bg-slate-950/75 p-4 text-[11px] text-slate-400 backdrop-blur">
            <div className="mb-2 text-[11px] font-semibold text-slate-200">
              Legenda i uwagi
            </div>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="font-mono">❌ Błąd</span> – nagłówek lub dane
                są niezgodne z zasadami EGiB / klasyfikacji (np. brak klasy,
                niepoprawna klasa, za mała powierzchnia Ls).
              </li>
              <li>
                <span className="font-mono">⚠️ Ostrz.</span> – sytuacje
                podejrzane, warto je sprawdzić (np. klasa przy użytku, który jej
                zwykle nie ma).
              </li>
              <li>
                <span className="font-mono">✅ OK</span> – brak błędów i
                ostrzeżeń według wbudowanych reguł.
              </li>
              <li>
                Wszystko liczone jest lokalnie w Twojej przeglądarce – plik nie
                jest nigdzie wysyłany.
              </li>
            </ul>
          </div>
        </div>
      </PageShell>
    </>
  );
}
