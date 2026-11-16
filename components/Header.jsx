"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site, nav, navCta } from "@/lib/site";
import { MenuIcon, CloseIcon } from "./Icons";
import { signOutAction } from "@/app/actions/auth";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const [user, setUser] = useState(null);

  useEffect(() => setOpen(false), [pathname]);

  // Show who's signed in (works once Google sign-in is set up; otherwise stays signed out).
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (alive) setUser(s?.user ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Link href="/" className="brand" aria-label={`${site.name} home`}>
          <img className="brand-logo" src={site.logo} alt={site.name} />
        </Link>

        <button
          className="menu-btn"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav id="site-nav" className={`nav${open ? " open" : ""}`}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <div className="nav-user">
              <span>Hi, {(user.name || user.email || "there").split(" ")[0]}</span>
              <form action={signOutAction}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          ) : (
            <Link href={navCta.href} className="btn btn-teal btn-sm nav-cta">
              {navCta.label}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
