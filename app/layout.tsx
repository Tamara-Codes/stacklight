import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacklight: know what actually changed in your stack",
  description:
    "Daily updates for the AI/dev tools you use, rated red/yellow/green so you know what matters.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
