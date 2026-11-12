import type { Metadata } from "next";
import "./globals.css";
import "./kahoot.css";

export const metadata: Metadata = {
  title: "Griekenland & Kreta Quiz — gemaakt door Tara",
  description: "De quiz van Tara. Zes rondes, dertig vragen en één winnaar. Speel samen op je eigen telefoon.",
  authors: [{ name: "Tara" }],
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
    <html lang="nl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
