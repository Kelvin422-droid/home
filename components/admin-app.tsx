"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { CategoryManagement } from "@/components/admin/category-management";
import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { getAdminCopy } from "@/components/admin/admin-copy";
import { categoryCount, removeSiteAt, upsertSite, type AdminView, type SiteLocation } from "@/components/admin/admin-utils";
import { SiteManagement } from "@/components/admin/site-management";
import { Button } from "@/components/ui/button";
import { useLanguagePreference } from "@/components/language-switcher";
import { formatMessage } from "@/lib/i18n";
import type { LinkItem, WebstackCategory } from "@/lib/webstack";

export function AdminApp() {
  const { language, setLanguage, message: messages } = useLanguagePreference();
  const copy = useMemo(() => getAdminCopy(language), [language]);
  const [data, setData] = useState<WebstackCategory[]>([]);
  const [view, setView] = useState<AdminView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const totalSites = useMemo(() => data.reduce((sum, category) => sum + categoryCount(category), 0), [data]);

  const loadData = async () => {
    const response = await fetch("/api/data", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || messages.loadFailed);
    setData(body);
    setDirty(false);
  };

  useEffect(() => {
    loadData()
      .catch((error) => setNotice({ tone: "error", message: error instanceof Error ? error.message : messages.loadFailed }))
      .finally(() => setLoading(false));
    // The initial database load should not repeat when the interface language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateData = (next: WebstackCategory[]) => {
    setData(next);
    setDirty(true);
    setNotice(null);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-admin-token": token } : {}) },
        body: JSON.stringify({ data })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || messages.saveFailed);
      await loadData();
      setNotice({ tone: "success", message: formatMessage(messages.writeResult, { categories: body.categories, links: body.links }) });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : messages.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const upsertWebsite = (location: SiteLocation | null, item: LinkItem, categoryIndex: number, sectionIndex?: number) => {
    updateData(upsertSite(data, location, categoryIndex, sectionIndex, item));
  };

  return (
    <AdminLayout
      view={view}
      onViewChange={setView}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      language={language}
      onLanguageChange={setLanguage}
      copy={copy}
      token={token}
      onTokenChange={setToken}
      categoryTotal={data.length}
      siteTotal={totalSites}
      dirty={dirty}
      saving={saving}
      loading={loading}
      onSave={save}
      notice={notice}
      onDismissNotice={() => setNotice(null)}
    >
      {loading ? (
        <div className="adm-loading"><span className="loader" /><h2>{copy.loading}</h2></div>
      ) : notice?.tone === "error" && data.length === 0 ? (
        <div className="adm-loading adm-load-error"><b>!</b><h2>{copy.loadFailed}</h2><Button variant="primary" onClick={() => { setLoading(true); loadData().catch((error) => setNotice({ tone: "error", message: error instanceof Error ? error.message : copy.loadFailed })).finally(() => setLoading(false)); }}>{copy.retry}</Button></div>
      ) : view === "dashboard" ? (
        <DashboardOverview data={data} copy={copy} language={language} onNavigate={setView} />
      ) : view === "categories" ? (
        <CategoryManagement data={data} copy={copy} language={language} onChange={updateData} />
      ) : (
        <SiteManagement data={data} copy={copy} language={language} onUpsert={upsertWebsite} onDelete={(location) => updateData(removeSiteAt(data, location))} />
      )}
    </AdminLayout>
  );
}
