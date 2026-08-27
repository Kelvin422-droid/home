"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import type { AdminCopy } from "@/components/admin/admin-copy";
import type { AdminView } from "@/components/admin/admin-utils";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";

export function AdminHeader({ view, copy, language, onLanguageChange, onOpenMenu, dirty, saving, loading, onSave }: {
  view: AdminView;
  copy: AdminCopy;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onOpenMenu: () => void;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  onSave: () => void;
}) {
  const title = view === "dashboard" ? copy.dashboard : view === "categories" ? copy.categories : copy.sites;
  return (
    <header className="adm-header">
      <div className="adm-header-title">
        <button className="adm-menu-trigger" type="button" onClick={onOpenMenu} aria-label={copy.openMenu}><i /><i /><i /></button>
        <div><p>{copy.adminTitle}</p><h1>{title}</h1></div>
      </div>
      <div className="adm-header-actions">
        <span className={`adm-save-state ${dirty ? "is-dirty" : ""}`}><i />{dirty ? copy.unsaved : copy.saved}</span>
        <a className="adm-visit-link" href="/" aria-label={copy.visitSite}>↗</a>
        <LanguageSwitcher language={language} onChange={onLanguageChange} compact />
        <Button variant="primary" onClick={onSave} disabled={loading || saving || !dirty}>{saving ? copy.saving : copy.save}</Button>
      </div>
    </header>
  );
}
