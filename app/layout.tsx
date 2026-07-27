import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Ledgerly | Personal Expense Tracker",
  description: "Import bank statements, track spending, and understand where your money goes.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
