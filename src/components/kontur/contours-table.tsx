"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Kontur } from "@/lib/kontur";
import { computeAreaM2, severity } from "@/lib/kontur";

interface ContoursTableProps {
  kontury: Kontur[];
  editedHeaders: Record<number, string>;
  onHeaderChange: (index: number, value: string) => void;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function ContoursTable({
  kontury,
  editedHeaders,
  onHeaderChange,
  selectedIndex,
  onSelect,
}: ContoursTableProps) {
  if (kontury.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-800/80 bg-slate-950/60 p-8 text-xs text-slate-500">
        Wgraj plik lub wklej treść, aby zobaczyć kontury.
      </div>
    );
  }

  return (
    <div className="h-[420px] rounded-lg border border-slate-800/70 bg-slate-950/75 backdrop-blur">
      <ScrollArea className="h-full">
        <Table className="min-w-full text-xs">
          <TableHeader className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur">
            <TableRow className="border-slate-800">
              <TableHead className="w-[40px] text-[11px] text-slate-400">
                ID
              </TableHead>
              <TableHead className="w-[260px] text-[11px] text-slate-400">
                Nagłówek (edytuj)
              </TableHead>
              <TableHead className="w-[80px] text-[11px] text-slate-400">
                Status
              </TableHead>
              <TableHead className="w-[80px] text-[11px] text-slate-400">
                Pole [m²]
              </TableHead>
              <TableHead className="w-[60px] text-center text-[11px] text-slate-400">
                Błędy
              </TableHead>
              <TableHead className="w-[60px] text-center text-[11px] text-slate-400">
                Ostrz.
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kontury.map((k) => {
              const sev = severity(k);
              const area = computeAreaM2(k.points);
              const headerValue = editedHeaders[k.index] ?? k.rawHeader;
              const isSelected = selectedIndex === k.index;

              return (
                <TableRow
                  key={k.index}
                  className={`cursor-pointer border-slate-800 text-[11px] transition-colors hover:bg-slate-900/70 ${
                    isSelected ? "bg-slate-900/80" : ""
                  }`}
                  onClick={() => onSelect(k.index)}
                >
                  <TableCell className="align-middle text-[11px] text-slate-400">
                    {k.index}
                  </TableCell>
                  <TableCell className="align-middle">
                    <Input
                      value={headerValue}
                      onChange={(e) =>
                        onHeaderChange(k.index, e.target.value ?? "")
                      }
                      className="h-7 border-slate-700 bg-slate-900/70 text-[11px] text-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <StatusBadge sev={sev} />
                  </TableCell>
                  <TableCell className="align-middle text-[11px] text-slate-200">
                    {area != null ? area.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="align-middle text-center text-[11px] text-red-300">
                    {k.errors.length}
                  </TableCell>
                  <TableCell className="align-middle text-center text-[11px] text-amber-300">
                    {k.warnings.length}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ sev }: { sev: ReturnType<typeof severity> }) {
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
