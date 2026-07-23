import type { Metadata } from "next";
import { NavBar } from "./nav-bar";
import { CheckInGate } from "./check-in-gate";
import { listPendingCheckIns } from "@/server/check-ins";
import "./globals.css";

export const metadata: Metadata = {
  title: "Progressor",
  description: "個人化生活排程系統 — 每週課表",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pendingCheckIns = await listPendingCheckIns();

  return (
    <html lang="zh-Hant">
      <body>
        <CheckInGate pending={pendingCheckIns} />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
