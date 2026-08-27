"use client";

import { useEffect, useState } from "react";
import type { AdminCopy } from "@/components/admin/admin-copy";
import { convertCategoryMode, createEmptyCategory, modeOf } from "@/components/admin/admin-utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { CategoryMode, WebstackCategory } from "@/lib/webstack";

export function CategoryFormDialog({ open, category, copy, onClose, onSubmit }: {
  open: boolean;
  category: WebstackCategory | null;
  copy: AdminCopy;
  onClose: () => void;
  onSubmit: (category: WebstackCategory) => void;
}) {
  const [draft, setDraft] = useState<WebstackCategory>(createEmptyCategory());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(category ? { ...category } : createEmptyCategory());
    setError("");
  }, [category, open]);

  const submit = () => {
    if (!draft.taxonomy.trim()) {
      setError(copy.categoryZh);
      return;
    }
    onSubmit({ ...draft, taxonomy: draft.taxonomy.trim(), taxonomy_en: draft.taxonomy_en?.trim() || null, icon: draft.icon?.trim() || "fa-star" });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={category ? copy.editCategory : copy.addCategory}
      description={copy.categoryListHelp}
      footer={<><Button onClick={onClose}>{copy.cancel}</Button><Button variant="primary" onClick={submit}>{category ? copy.update : copy.create}</Button></>}
    >
      <div className="adm-form-grid">
        <label><span>{copy.categoryZh} *</span><input value={draft.taxonomy} onChange={(event) => setDraft({ ...draft, taxonomy: event.target.value })} /></label>
        <label><span>{copy.categoryEn}</span><input value={draft.taxonomy_en ?? ""} onChange={(event) => setDraft({ ...draft, taxonomy_en: event.target.value })} /></label>
        <label><span>{copy.categoryIcon}</span><input value={draft.icon ?? ""} onChange={(event) => setDraft({ ...draft, icon: event.target.value })} placeholder="fa-star" /></label>
        <label><span>{copy.categoryMode}</span><select value={modeOf(draft)} onChange={(event) => setDraft(convertCategoryMode(draft, event.target.value as CategoryMode))}><option value="links">{copy.standardLinks}</option><option value="list">{copy.groupedLinks}</option><option value="friend">{copy.friendLinks}</option></select></label>
      </div>
      {error ? <p className="adm-field-error">{error}</p> : null}
      <p className="adm-form-note">{copy.unsaved}</p>
    </Dialog>
  );
}
