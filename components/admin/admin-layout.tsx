"use client";

import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import type { AdminCopy } from "@/components/admin/admin-copy";
import type { AdminView } from "@/components/admin/admin-utils";
import type { Language } from "@/lib/i18n";

export function AdminLayout({ children, view, onViewChange, sidebarOpen, onSidebarOpenChange, language, onLanguageChange, copy, token, onTokenChange, categoryTotal, siteTotal, dirty, saving, loading, onSave, notice, onDismissNotice }: {
  children: ReactNode;
  view: AdminView;
  onViewChange: (view: AdminView) => void;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  copy: AdminCopy;
  token: string;
  onTokenChange: (value: string) => void;
  categoryTotal: number;
  siteTotal: number;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  onSave: () => void;
  notice: { tone: "success" | "error"; message: string } | null;
  onDismissNotice: () => void;
}) {
  return (
    <div className="adm-shell">
      <AdminSidebar
        view={view}
        onViewChange={onViewChange}
        open={sidebarOpen}
        onOpenChange={onSidebarOpenChange}
        copy={copy}
        token={token}
        onTokenChange={onTokenChange}
        categoryTotal={categoryTotal}
        siteTotal={siteTotal}
      />
      <div className="adm-inset">
        <AdminHeader
          view={view}
          copy={copy}
          language={language}
          onLanguageChange={onLanguageChange}
          onOpenMenu={() => onSidebarOpenChange(true)}
          dirty={dirty}
          saving={saving}
          loading={loading}
          onSave={onSave}
        />
        {notice ? (
          <div className={`adm-notice adm-notice-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
            <span aria-hidden="true">{notice.tone === "success" ? "✓" : "!"}</span>
            <p>{notice.message}</p>
            <button type="button" onClick={onDismissNotice} aria-label="关闭提示">×</button>
          </div>
        ) : null}
        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}
