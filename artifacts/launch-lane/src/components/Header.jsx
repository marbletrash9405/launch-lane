"use client";

import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { site, nav, navCta } from "@/lib/site";
import { MenuIcon, CloseIcon } from "./Icons";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [pathname] = useLocation();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => setOpen(false), [pathname]);

  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "";

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
          {isLoaded && isSignedIn ? (
            <div className="nav-user">
              <span>{firstName}</span>
              <Link href="/dashboard">Dashboard</Link>
              <button
                type="button"
                onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })}
              >
                Sign out
              </button>
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
