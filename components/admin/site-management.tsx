"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminCopy } from "@/components/admin/admin-copy";
import { flattenSites, type SiteLocation, type SiteRow } from "@/components/admin/admin-utils";
import { SiteFormDialog } from "@/components/admin/site-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { localizeContent, type Language } from "@/lib/i18n";
import type { LinkItem, WebstackCategory } from "@/lib/webstack";

const PAGE_SIZE = 20;

export function SiteManagement({ data, copy, language, onUpsert, onDelete }: {
  data: WebstackCategory[];
  copy: AdminCopy;
  language: Language;
  onUpsert: (location: SiteLocation | null, item: LinkItem, categoryIndex: number, sectionIndex?: number) => void;
  onDelete: (location: SiteLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteRow | null>(null);
  const [deleting, setDeleting] = useState<SiteRow | null>(null);
  const allSites = useMemo(() => flattenSites(data), [data]);
  const filteredSites = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return allSites.filter((row) => {
      if (categoryFilter !== "all" && row.categoryIndex !== Number(categoryFilter)) return false;
      if (!needle) return true;
      const translations = Object.values(row.item.translations ?? {}).flatMap((entry) => [entry.title, entry.description]);
      return [row.item.title, row.item.title_en, row.item.description, row.item.description_en, row.item.url, row.category.taxonomy, row.category.taxonomy_en, row.sectionName, ...translations].some((value) => value?.toLocaleLowerCase().includes(needle));
    });
  }, [allSites, categoryFilter, query]);
  const totalPages = Math.max(1, Math.ceil(filteredSites.length / PAGE_SIZE));
  const visibleSites = filteredSites.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [categoryFilter, query]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const categoryLabel = (category: WebstackCategory) => language === "zh" ? category.taxonomy : category.taxonomy_en || category.taxonomy;

  return (
    <div className="adm-view">
      <section className="adm-page-intro adm-page-intro-row">
        <div><p>{copy.workspace}</p><h2>{copy.sites}</h2><span>{copy.siteListHelp}</span></div>
        <Button variant="primary" disabled={!data.length} onClick={() => { setEditing(null); setDialogOpen(true); }}>＋ {copy.addSite}</Button>
      </section>
      <Card>
        <CardHeader title={copy.siteList} description={`${filteredSites.length} / ${allSites.length} ${copy.rows}`} />
        <CardContent>
          <div className="adm-table-tools">
            <label className="adm-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchSites} /></label>
            <label className="adm-filter"><span className="adm-sr-only">{copy.category}</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">{copy.allCategories}</option>{data.map((category, index) => <option value={index} key={`${category.taxonomy}-${index}`}>{categoryLabel(category)}</option>)}</select></label>
          </div>
          {visibleSites.length === 0 ? <div className="adm-empty"><span aria-hidden="true">◎</span><p>{data.length ? copy.emptySites : copy.emptyCategories}</p></div> : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-site-table">
                <thead><tr><th>{copy.site}</th><th>{copy.category}</th><th>{copy.url}</th><th>Logo / QR</th><th className="adm-col-actions">{copy.actions}</th></tr></thead>
                <tbody>
                  {visibleSites.map((row) => {
                    const localized = localizeContent(row.item, language);
                    return (
                      <tr key={row.key}>
                        <td><div className="adm-site-cell"><span className="adm-site-mark">{row.item.logo ? <img src={row.item.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}<i>{(localized.title || "?").slice(0, 2).toUpperCase()}</i></span><div><strong>{localized.title}</strong><small>{localized.description || "—"}</small></div></div></td>
                        <td><div className="adm-category-location"><span>{categoryLabel(row.category)}</span>{row.sectionName ? <small>{row.sectionName}</small> : null}</div></td>
                        <td><a className="adm-url" href={row.item.url} target="_blank" rel="noopener noreferrer">{row.item.url}<span aria-hidden="true">↗</span></a></td>
                        <td><div className="adm-asset-status"><span className={row.item.logo ? "is-set" : ""}>Logo</span><span className={row.item.qrcode ? "is-set" : ""}>QR</span></div></td>
                        <td><div className="adm-row-actions"><Button size="sm" onClick={() => { setEditing(row); setDialogOpen(true); }}>{copy.editSite}</Button><Button size="sm" variant="ghost" className="adm-text-danger" onClick={() => setDeleting(row)}>{copy.deleteSite}</Button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 ? <div className="adm-pagination"><Button size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>{copy.previous}</Button><span>{copy.page} {page} / {totalPages}</span><Button size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>{copy.next}</Button></div> : null}
        </CardContent>
      </Card>
      <SiteFormDialog
        open={dialogOpen}
        site={editing}
        data={data}
        copy={copy}
        onClose={() => setDialogOpen(false)}
        onSubmit={(item, categoryIndex, sectionIndex) => onUpsert(editing?.location ?? null, item, categoryIndex, sectionIndex)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) onDelete(deleting.location); }}
        title={copy.deleteSiteTitle}
        description={deleting ? `${deleting.item.title} — ${copy.deleteSiteDescription}` : copy.deleteSiteDescription}
        confirmLabel={copy.deleteSite}
        cancelLabel={copy.cancel}
      />
    </div>
  );
}
