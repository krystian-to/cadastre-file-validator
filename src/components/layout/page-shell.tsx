"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <motion.main
      className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col gap-4 px-4 pb-8 pt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.main>
  );
}
