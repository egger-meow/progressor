"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./page.module.css";

const NAV_ITEMS = [
  { href: "/", label: "每週課表" },
  { href: "/items", label: "書籍與課程" },
  { href: "/routines", label: "常規事件" },
  { href: "/commitments", label: "學期事務" },
];

// Shared, persistent top bar (layout.tsx) replacing the plain text links
// that used to repeat inside every page's own <nav> — project owner,
// 2026-07-21: wanted cross-page navigation "more highlighted." A client
// component (not the rest of the app's usual server-only pattern) only
// because usePathname() is what lets the current section render as
// visibly active rather than identical to the other three links.
export function NavBar() {
  const pathname = usePathname();

  return (
    <header className={styles.navBar}>
      <div className={styles.navBarInner}>
        <span className={styles.navBrand}>Progressor</span>
        <nav className={styles.navBarLinks}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? styles.navBarLinkActive : styles.navBarLink}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
