// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walidator konturów EGiB",
  description:
    "Walidator plików konturów (OFU/OZU/OZK) z edycją nagłówków — wersja web.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
