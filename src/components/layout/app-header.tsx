"use client";

import { motion } from "framer-motion";

export function AppHeader() {
  return (
    <motion.header
      className="mb-4 border-b border-slate-900 bg-slate-950/95 px-6 py-4"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">
            Walidator konturów EGiB
          </h1>
          <p className="text-xs text-slate-400">
            OFU/OZU/OZK · edycja nagłówków · eksport poprawionego pliku TXT
          </p>
        </div>
        <div className="text-[10px] text-slate-500">v0.1 · lokalny walidator</div>
      </div>
    </motion.header>
  );
}
