"use client";

import { useState } from "react";
import type { AdminCopy } from "@/components/admin/admin-copy";
import type { AdminView } from "@/components/admin/admin-utils";

const navItems: Array<{ view: AdminView; icon: string }> = [
  { view: "dashboard", icon: "▦" },
  { view: "categories", icon: "◇" },
  { view: "sites", icon: "◎" }
];

export function AdminSidebar({ view, onViewChange, open, onOpenChange, copy, token, onTokenChange, categoryTotal, siteTotal }: {
  view: AdminView;
  onViewChange: (view: AdminView) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: AdminCopy;
  token: string;
  onTokenChange: (value: string) => void;
  categoryTotal: number;
  siteTotal: number;
}) {
  const [showToken, setShowToken] = useState(false);
  const labels: Record<AdminView, string> = { dashboard: copy.dashboard, categories: copy.categories, sites: copy.sites };
  const counts: Partial<Record<AdminView, number>> = { categories: categoryTotal, sites: siteTotal };

  return (
    <>
      <button className={`adm-sidebar-scrim ${open ? "is-open" : ""}`} type="button" onClick={() => onOpenChange(false)} aria-label={copy.closeMenu} />
      <aside className={`adm-sidebar ${open ? "is-open" : ""}`} aria-label={copy.navigation}>
        <div className="adm-sidebar-brand">
          <a href="/" className="brand" aria-label="DawnNav">
            <span className="brand-sun" aria-hidden="true"><i /></span>
            <span><b>DawnNav</b><small>{copy.workspace}</small></span>
          </a>
          <button type="button" onClick={() => onOpenChange(false)} aria-label={copy.closeMenu}>×</button>
        </div>

        <nav className="adm-nav">
          <p>{copy.navigation}</p>
          {navItems.map((item) => (
            <button
              key={item.view}
              className={view === item.view ? "is-active" : ""}
              type="button"
              onClick={() => { onViewChange(item.view); onOpenChange(false); }}
              aria-current={view === item.view ? "page" : undefined}
            >
              <span className="adm-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{labels[item.view]}</span>
              {counts[item.view] !== undefined ? <b>{counts[item.view]}</b> : null}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-token">
          <div className="adm-sidebar-token-heading"><span>{copy.token}</span><button type="button" onClick={() => setShowToken((value) => !value)}>{showToken ? copy.hideToken : copy.showToken}</button></div>
          <input type={showToken ? "text" : "password"} value={token} onChange={(event) => onTokenChange(event.target.value)} autoComplete="current-password" placeholder="••••••••••••" />
          <p>{copy.tokenHint}</p>
        </div>

        <a className="adm-sidebar-home" href="/"><span aria-hidden="true">↗</span>{copy.visitSite}</a>
      </aside>
    </>
  );
}
