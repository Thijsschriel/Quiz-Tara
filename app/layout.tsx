import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalimera! — De Griekenland & Kreta Quiz",
  description: "Zes rondes, dertig vragen en één winnaar. Speel samen op je eigen telefoon.",
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
