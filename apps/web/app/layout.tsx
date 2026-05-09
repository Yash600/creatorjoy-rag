import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creatorjoy RAG",
  description:
    "Paste two YouTube URLs. Ask why one outperformed the other.",
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
