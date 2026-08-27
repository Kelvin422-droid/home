"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminCopy } from "@/components/admin/admin-copy";
import { createEmptyLink, modeOf, type SiteRow } from "@/components/admin/admin-utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { mergeLegacyTranslations, type TranslationEntry, type TranslationMap } from "@/lib/i18n";
import type { LinkItem, WebstackCategory } from "@/lib/webstack";

export function SiteFormDialog({ open, site, data, copy, onClose, onSubmit }: {
  open: boolean;
  site: SiteRow | null;
  data: WebstackCategory[];
  copy: AdminCopy;
  onClose: () => void;
  onSubmit: (item: LinkItem, categoryIndex: number, sectionIndex?: number) => void;
}) {
  const [item, setItem] = useState<LinkItem>(createEmptyLink());
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [newLanguage, setNewLanguage] = useState("");
  const [activeExtraLanguage, setActiveExtraLanguage] = useState("");
  const [error, setError] = useState("");
  const category = data[categoryIndex];
  const extraLanguages = useMemo(() => Object.keys(item.translations ?? {}).filter((code) => code !== "zh" && code !== "en"), [item.translations]);

  useEffect(() => {
    if (!open) return;
    const initial = site?.item ?? createEmptyLink();
    const translations = mergeLegacyTranslations(initial);
    setItem({ ...initial, translations });
    setCategoryIndex(site?.categoryIndex ?? 0);
    setSectionIndex(site?.location.sectionIndex ?? 0);
    setNewLanguage("");
    setActiveExtraLanguage(Object.keys(translations).find((code) => code !== "zh" && code !== "en") ?? "");
    setError("");
  }, [open, site]);

  const setField = (field: keyof LinkItem, value: string) => setItem((current) => ({ ...current, [field]: value }));
  const setBilingualField = (language: "zh" | "en", field: keyof TranslationEntry, value: string) => {
    setItem((current) => {
      const translations: TranslationMap = { ...(current.translations ?? {}), [language]: { ...(current.translations?.[language] ?? {}), [field]: value } };
      const next = { ...current, translations };
      if (language === "zh" && field === "title") next.title = value;
      if (language === "zh" && field === "description") next.description = value;
      if (language === "en" && field === "title") next.title_en = value;
      if (language === "en" && field === "description") next.description_en = value;
      return next;
    });
  };
  const setExtraField = (field: keyof TranslationEntry, value: string) => {
    if (!activeExtraLanguage) return;
    setItem((current) => ({ ...current, translations: { ...(current.translations ?? {}), [activeExtraLanguage]: { ...(current.translations?.[activeExtraLanguage] ?? {}), [field]: value } } }));
  };
  const addLanguage = () => {
    const code = newLanguage.trim();
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code) || code === "zh" || code === "en") {
      setError(copy.invalidLanguage);
      return;
    }
    setItem((current) => ({ ...current, translations: { ...(current.translations ?? {}), [code]: current.translations?.[code] ?? {} } }));
    setActiveExtraLanguage(code);
    setNewLanguage("");
    setError("");
  };

  const submit = () => {
    if (!data.length || !category) {
      setError(copy.emptyCategories);
      return;
    }
    if (!item.title.trim() || !item.url.trim()) {
      setError(`${copy.titleZh} / ${copy.url}`);
      return;
    }
    try {
      const parsed = new URL(item.url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    } catch {
      setError(copy.url);
      return;
    }
    onSubmit({
      ...item,
      title: item.title.trim(),
      title_en: item.title_en?.trim() || null,
      url: item.url.trim(),
      description: item.description?.trim() || null,
      description_en: item.description_en?.trim() || null,
      logo: item.logo?.trim() || null,
      qrcode: item.qrcode?.trim() || null
    }, categoryIndex, modeOf(category) === "list" ? sectionIndex : undefined);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={site ? copy.editSite : copy.addSite}
      description={copy.siteListHelp}
      size="lg"
      footer={<><Button onClick={onClose}>{copy.cancel}</Button><Button variant="primary" onClick={submit}>{site ? copy.update : copy.create}</Button></>}
    >
      <section className="adm-form-section">
        <div className="adm-form-section-title"><span>01</span><div><h3>{copy.category}</h3><p>{copy.structure}</p></div></div>
        <div className="adm-form-grid">
          <label><span>{copy.category}</span><select value={categoryIndex} onChange={(event) => { setCategoryIndex(Number(event.target.value)); setSectionIndex(0); }}>{data.map((entry, index) => <option value={index} key={`${entry.taxonomy}-${index}`}>{entry.taxonomy}{entry.taxonomy_en ? ` / ${entry.taxonomy_en}` : ""}</option>)}</select></label>
          {category && modeOf(category) === "list" ? <label><span>{copy.section}</span><select value={sectionIndex} onChange={(event) => setSectionIndex(Number(event.target.value))}>{category.list?.map((section, index) => <option value={index} key={`${section.term}-${index}`}>{section.term}{section.term_en ? ` / ${section.term_en}` : ""}</option>)}</select></label> : <label><span>{copy.structure}</span><input value={category ? (modeOf(category) === "friend" ? copy.friendLinks : copy.standardLinks) : ""} disabled /></label>}
        </div>
      </section>

      <section className="adm-form-section">
        <div className="adm-form-section-title"><span>02</span><div><h3>{copy.site}</h3><p>{copy.url}</p></div></div>
        <div className="adm-form-grid">
          <label className="adm-field-full"><span>{copy.url} *</span><input type="url" value={item.url} onChange={(event) => setField("url", event.target.value)} placeholder="https://example.com" /></label>
          <label><span>{copy.logo}</span><input value={item.logo ?? ""} onChange={(event) => setField("logo", event.target.value)} placeholder="/images/logos/example.png" /></label>
          <label><span>{copy.qrcode}</span><input value={item.qrcode ?? ""} onChange={(event) => setField("qrcode", event.target.value)} /></label>
        </div>
      </section>

      <section className="adm-form-section">
        <div className="adm-form-section-title"><span>03</span><div><h3>中文 / English</h3><p>{copy.extraTranslationsHelp}</p></div></div>
        <div className="adm-bilingual-grid">
          <div className="adm-language-panel"><b>中文</b><label><span>{copy.titleZh} *</span><input value={item.title} onChange={(event) => setBilingualField("zh", "title", event.target.value)} /></label><label><span>{copy.descriptionZh}</span><textarea rows={4} value={item.description ?? ""} onChange={(event) => setBilingualField("zh", "description", event.target.value)} /></label></div>
          <div className="adm-language-panel"><b>English</b><label><span>{copy.titleEn}</span><input value={item.title_en ?? ""} onChange={(event) => setBilingualField("en", "title", event.target.value)} /></label><label><span>{copy.descriptionEn}</span><textarea rows={4} value={item.description_en ?? ""} onChange={(event) => setBilingualField("en", "description", event.target.value)} /></label></div>
        </div>
      </section>

      <details className="adm-extra-translations" open={extraLanguages.length > 0}>
        <summary><span>{copy.extraTranslations}</span><b>{extraLanguages.length}</b></summary>
        <div className="adm-extra-body">
          {extraLanguages.length ? <div className="adm-language-tabs">{extraLanguages.map((code) => <button className={activeExtraLanguage === code ? "is-active" : ""} type="button" key={code} onClick={() => setActiveExtraLanguage(code)}>{code.toUpperCase()}</button>)}</div> : null}
          {activeExtraLanguage ? <div className="adm-form-grid"><label><span>{copy.translatedTitle}</span><input value={item.translations?.[activeExtraLanguage]?.title ?? ""} onChange={(event) => setExtraField("title", event.target.value)} /></label><label><span>{copy.translatedDescription}</span><textarea rows={3} value={item.translations?.[activeExtraLanguage]?.description ?? ""} onChange={(event) => setExtraField("description", event.target.value)} /></label></div> : null}
          <div className="adm-add-language"><label><span>{copy.languageCode}</span><input value={newLanguage} onChange={(event) => setNewLanguage(event.target.value)} placeholder="de / ja / pt-BR" /></label><Button size="sm" onClick={addLanguage}>{copy.addLanguage}</Button></div>
        </div>
      </details>
      {error ? <p className="adm-field-error">{error}</p> : null}
    </Dialog>
  );
}
