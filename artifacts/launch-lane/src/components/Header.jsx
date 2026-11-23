"use client";

import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { site, nav, navCta } from "@/lib/site";
import { MenuIcon, CloseIcon } from "./Icons";
import { firebaseConfigured } from "@/lib/firebase-config";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [pathname] = useLocation();

  const [user, setUser] = useState(null);

  useEffect(() => setOpen(false), [pathname]);

  // Show who's signed in via Firebase (only loads Firebase once it's configured).
  useEffect(() => {
    if (!firebaseConfigured) return;
    let unsub = () => {};
    let alive = true;
    import("@/lib/firebase").then((fb) => {
      if (!alive) return;
      unsub = fb.watchUser((u) => setUser(u ? { name: u.displayName, email: u.email } : null));
    });
    return () => { alive = false; unsub(); };
  }, []);

  async function handleSignOut() {
    const fb = await import("@/lib/firebase");
    await fb.signOutUser();
  }

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
              <button type="button" onClick={handleSignOut}>Sign out</button>
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
