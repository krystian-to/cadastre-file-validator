"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface UploadPanelProps {
  rawText: string;
  onRawTextChange: (value: string) => void;
  onClear: () => void;
}

export function UploadPanel({
  rawText,
  onRawTextChange,
  onClear,
}: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setFileName(file.name);
    onRawTextChange(text);
  };

  return (
    <Card className="border-slate-800/70 bg-slate-950/70 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-100">Wczytaj dane z pliku lub wklej zawartość</CardTitle>
      </CardHeader>
      <Separator className="bg-slate-800" />
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-300">
              Wgraj plik TXT z konturami
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900 text-[11px] text-slate-100 hover:bg-slate-800"
              onClick={() => fileInputRef.current?.click()}
            >
              Wybierz plik TXT
            </Button>
            <span className="truncate text-[11px] text-slate-400">
              {fileName ?? "Brak wybranego pliku"}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="space-y-2 text-xs">
          <label className="text-[11px] font-medium text-slate-300">
            Wklej zawartość pliku
          </label>
          <Textarea
            value={rawText}
            onChange={(e) => onRawTextChange(e.target.value)}
            placeholder="Wklej tutaj treść Kontury_eksport_dz.txt"
            className="h-40 resize-none border-slate-800 bg-slate-900/70 text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-900 text-xs text-slate-100 hover:bg-slate-800"
            onClick={() => {
              setFileName(null);
              onClear();
            }}
          >
            Wyczyść
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
