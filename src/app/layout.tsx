import type { Metadata } from "next";
import { NavBar } from "./nav-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Progressor",
  description: "個人化生活排程系統 — 每週課表",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
