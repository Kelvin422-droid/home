"use client";

import { useState } from "react";
import type { AdminCopy } from "@/components/admin/admin-copy";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { categoryCount, modeOf } from "@/components/admin/admin-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { Language } from "@/lib/i18n";
import type { WebstackCategory } from "@/lib/webstack";

export function CategoryManagement({ data, copy, language, onChange }: {
  data: WebstackCategory[];
  copy: AdminCopy;
  language: Language;
  onChange: (data: WebstackCategory[]) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const modeLabel = (category: WebstackCategory) => modeOf(category) === "list" ? copy.groupedLinks : modeOf(category) === "friend" ? copy.friendLinks : copy.standardLinks;

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= data.length) return;
    const next = [...data];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="adm-view">
      <section className="adm-page-intro adm-page-intro-row">
        <div><p>{copy.workspace}</p><h2>{copy.categories}</h2><span>{copy.categoryListHelp}</span></div>
        <Button variant="primary" onClick={() => { setEditingIndex(null); setDialogOpen(true); }}>＋ {copy.addCategory}</Button>
      </section>
      <Card>
        <CardHeader title={copy.categoryList} description={`${data.length} ${copy.rows}`} />
        <CardContent>
          {data.length === 0 ? <div className="adm-empty"><span aria-hidden="true">◇</span><p>{copy.emptyCategories}</p></div> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th className="adm-col-order">{copy.order}</th><th>{copy.iconAndName}</th><th>{copy.englishName}</th><th>{copy.structure}</th><th className="adm-col-center">{copy.count}</th><th className="adm-col-actions">{copy.actions}</th></tr></thead>
                <tbody>
                  {data.map((category, index) => (
                    <tr key={`${category.taxonomy}-${index}`}>
                      <td><div className="adm-order-cell"><span>{String(index + 1).padStart(2, "0")}</span><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={copy.moveUp}>↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === data.length - 1} aria-label={copy.moveDown}>↓</button></div></div></td>
                      <td><div className="adm-category-cell"><span className="adm-category-icon" aria-hidden="true">{category.icon?.includes("star") ? "★" : "◇"}</span><div><strong>{category.taxonomy}</strong><small>{category.icon || "fa-star"}</small></div></div></td>
                      <td>{category.taxonomy_en || <span className="adm-muted">—</span>}</td>
                      <td><span className={`adm-badge adm-badge-${modeOf(category)}`}>{modeLabel(category)}</span></td>
                      <td className="adm-col-center"><b className="adm-count-badge">{categoryCount(category)}</b></td>
                      <td><div className="adm-row-actions"><Button size="sm" onClick={() => { setEditingIndex(index); setDialogOpen(true); }}>{copy.editCategory}</Button><Button size="sm" variant="ghost" className="adm-text-danger" onClick={() => setDeletingIndex(index)}>{copy.deleteCategory}</Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <CategoryFormDialog
        open={dialogOpen}
        category={editingIndex === null ? null : data[editingIndex]}
        copy={copy}
        onClose={() => setDialogOpen(false)}
        onSubmit={(category) => onChange(editingIndex === null ? [...data, category] : data.map((item, index) => index === editingIndex ? category : item))}
      />
      <ConfirmDialog
        open={deletingIndex !== null}
        onClose={() => setDeletingIndex(null)}
        onConfirm={() => { if (deletingIndex !== null) onChange(data.filter((_, index) => index !== deletingIndex)); }}
        title={copy.deleteCategoryTitle}
        description={copy.deleteCategoryDescription}
        confirmLabel={copy.deleteCategory}
        cancelLabel={copy.cancel}
      />
    </div>
  );
}
