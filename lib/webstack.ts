import { asc } from "drizzle-orm";
import { getD1, getDb } from "@/db";
import { categories as categoriesTable, links as linksTable, sections as sectionsTable } from "@/db/schema";
import seedData from "@/app/_generated/webstack.seed.json";
import { mergeLegacyTranslations, type TranslationEntry, type TranslationMap } from "@/lib/i18n";

export type CategoryMode = "links" | "list" | "friend";


export interface LinkItem {
  id?: number;
  title: string;
  title_en?: string | null;
  url: string;
  description?: string | null;
  description_en?: string | null;
  logo?: string | null;
  qrcode?: string | null;
  translations?: TranslationMap;
}

export interface LinkSection {
  term: string;
  term_en?: string | null;
  links: LinkItem[];
}

export interface WebstackCategory {
  taxonomy: string;
  taxonomy_en?: string | null;
  icon?: string | null;
  links?: LinkItem[];
  list?: LinkSection[];
  friend?: LinkItem[];
}

export interface SiteDetailRecord extends LinkItem {
  category: { taxonomy: string; taxonomy_en?: string | null };
  section?: { term: string; term_en?: string | null } | null;
}

const modes = new Set<CategoryMode>(["links", "list", "friend"]);
const languageCodePattern = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

function optionalText(value: unknown, field: string, maxLength = 20_000): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} 必须是字符串`);
  if (value.length > maxLength) throw new RangeError(`${field} 超过最大长度 ${maxLength}`);
  return value;
}

function requiredText(value: unknown, field: string, maxLength = 20_000): string {
  const result = optionalText(value, field, maxLength);
  if (!result?.trim()) throw new TypeError(`${field} 不能为空`);
  return result;
}

function normalizeTranslations(value: unknown, field: string): TranslationMap {
  if (value === undefined || value === null || value === "") return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} 必须是以语言代码为键的对象`);
  const result: TranslationMap = {};
  for (const [language, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    if (!languageCodePattern.test(language)) throw new TypeError(`${field}.${language} 不是有效语言代码`);
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) throw new TypeError(`${field}.${language} 必须是对象`);
    const entry = rawEntry as Record<string, unknown>;
    const normalized: TranslationEntry = {
      title: optionalText(entry.title, `${field}.${language}.title`, 500),
      description: optionalText(entry.description, `${field}.${language}.description`)
    };
    if (normalized.title || normalized.description) result[language] = normalized;
  }
  return result;
}

function firstTranslation(translations: TranslationMap, field: keyof TranslationEntry): string | null {
  for (const entry of Object.values(translations)) {
    const value = entry[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function normalizeLink(value: unknown, field: string): LinkItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} 必须是对象`);
  const link = value as Record<string, unknown>;
  const rawTitle = optionalText(link.title, `${field}.title`, 500);
  const rawTitleEn = optionalText(link.title_en, `${field}.title_en`, 500);
  const rawDescription = optionalText(link.description, `${field}.description`);
  const rawDescriptionEn = optionalText(link.description_en, `${field}.description_en`);
  const translations = mergeLegacyTranslations({
    translations: normalizeTranslations(link.translations, `${field}.translations`),
    title: rawTitle,
    title_en: rawTitleEn,
    description: rawDescription,
    description_en: rawDescriptionEn
  });
  const title = requiredText(rawTitle ?? translations.zh?.title ?? translations.en?.title ?? firstTranslation(translations, "title"), `${field}.title`, 500);
  const id = Number(link.id);
  return {
    ...(Number.isSafeInteger(id) && id > 0 ? { id } : {}),
    title,
    title_en: rawTitleEn ?? translations.en?.title ?? null,
    url: requiredText(link.url, `${field}.url`, 4_000),
    description: rawDescription ?? translations.zh?.description ?? null,
    description_en: rawDescriptionEn ?? translations.en?.description ?? null,
    logo: optionalText(link.logo, `${field}.logo`, 4_000),
    qrcode: optionalText(link.qrcode, `${field}.qrcode`, 4_000),
    translations
  };
}

function parseStoredTranslations(value: string | null | undefined, legacy: Omit<LinkItem, "translations">): TranslationMap {
  let translations: TranslationMap = {};
  if (value) {
    try { translations = normalizeTranslations(JSON.parse(value), "links.translations"); } catch { translations = {}; }
  }
  return mergeLegacyTranslations({ ...legacy, translations });
}

function rowToLink(row: {
  id: number; title: string; titleEn: string | null; url: string; description: string | null; descriptionEn: string | null;
  logo: string | null; qrcode: string | null; translations: string | null;
}): LinkItem {
  const legacy = { id: row.id, title: row.title, title_en: row.titleEn, url: row.url, description: row.description, description_en: row.descriptionEn, logo: row.logo, qrcode: row.qrcode };
  return { ...legacy, translations: parseStoredTranslations(row.translations, legacy) };
}

export function categoryMode(category: WebstackCategory): CategoryMode {
  if (Array.isArray(category.list)) return "list";
  if (Array.isArray(category.friend)) return "friend";
  return "links";
}

export function normalizeWebstack(value: unknown): WebstackCategory[] {
  if (!Array.isArray(value)) throw new TypeError("数据顶层必须是数组");
  if (value.length > 1_000) throw new RangeError("分类数量不能超过 1000");
  let totalLinks = 0;
  const normalized = value.map((rawCategory, categoryIndex) => {
    const field = `categories[${categoryIndex}]`;
    if (!rawCategory || typeof rawCategory !== "object" || Array.isArray(rawCategory)) throw new TypeError(`${field} 必须是对象`);
    const category = rawCategory as Record<string, unknown>;
    const detected: CategoryMode = Array.isArray(category.list) ? "list" : Array.isArray(category.friend) ? "friend" : "links";
    const requested = typeof category.mode === "string" ? category.mode : detected;
    const mode = modes.has(requested as CategoryMode) ? requested as CategoryMode : detected;
    const result: WebstackCategory = {
      taxonomy: requiredText(category.taxonomy, `${field}.taxonomy`, 500),
      taxonomy_en: optionalText(category.taxonomy_en, `${field}.taxonomy_en`, 500),
      icon: optionalText(category.icon, `${field}.icon`, 100) ?? "fa-star"
    };
    if (mode === "list") {
      const sections = Array.isArray(category.list) ? category.list : [];
      result.list = sections.map((rawSection, sectionIndex) => {
        const sectionField = `${field}.list[${sectionIndex}]`;
        if (!rawSection || typeof rawSection !== "object" || Array.isArray(rawSection)) throw new TypeError(`${sectionField} 必须是对象`);
        const section = rawSection as Record<string, unknown>;
        const rawLinks = Array.isArray(section.links) ? section.links : [];
        totalLinks += rawLinks.length;
        return {
          term: requiredText(section.term, `${sectionField}.term`, 500),
          term_en: optionalText(section.term_en, `${sectionField}.term_en`, 500),
          links: rawLinks.map((link, index) => normalizeLink(link, `${sectionField}.links[${index}]`))
        };
      });
    } else {
      const property = mode === "friend" ? "friend" : "links";
      const rawLinks = Array.isArray(category[property]) ? category[property] : [];
      totalLinks += rawLinks.length;
      result[property] = rawLinks.map((link, index) => normalizeLink(link, `${field}.${property}[${index}]`));
    }
    return result;
  });
  if (totalLinks > 20_000) throw new RangeError("链接数量不能超过 20000");
  return normalized;
}

export function countLinks(data: WebstackCategory[]): number {
  return data.reduce((total, category) => total + (category.links?.length ?? category.friend?.length ?? 0) + (category.list?.reduce((sum, section) => sum + section.links.length, 0) ?? 0), 0);
}

export async function readWebstack(): Promise<WebstackCategory[]> {
  const db = getDb();
  const [categoryRows, sectionRows, linkRows] = await Promise.all([
    db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id)),
    db.select().from(sectionsTable).orderBy(asc(sectionsTable.categoryId), asc(sectionsTable.sortOrder), asc(sectionsTable.id)),
    db.select().from(linksTable).orderBy(asc(linksTable.categoryId), asc(linksTable.sectionId), asc(linksTable.sortOrder), asc(linksTable.id))
  ]);
  const categoryById = new Map<number, WebstackCategory>();
  const sectionById = new Map<number, LinkSection>();
  const result = categoryRows.map((row) => {
    const category: WebstackCategory = { taxonomy: row.name, taxonomy_en: row.nameEn, icon: row.icon };
    if (row.mode === "list") category.list = [];
    else if (row.mode === "friend") category.friend = [];
    else category.links = [];
    categoryById.set(row.id, category);
    return category;
  });
  for (const row of sectionRows) {
    const section: LinkSection = { term: row.name, term_en: row.nameEn, links: [] };
    sectionById.set(row.id, section);
    categoryById.get(row.categoryId)?.list?.push(section);
  }
  for (const row of linkRows) {
    const link = rowToLink(row);
    if (row.sectionId !== null) sectionById.get(row.sectionId)?.links.push(link);
    else if (row.kind === "friend") categoryById.get(row.categoryId)?.friend?.push(link);
    else categoryById.get(row.categoryId)?.links?.push(link);
  }
  return result;
}

export async function findSiteById(id: number): Promise<SiteDetailRecord | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const row = await getD1().prepare(`SELECT
      l.id, l.title, l.title_en, l.url, l.description, l.description_en, l.logo, l.qrcode, l.translations,
      c.name AS category_name, c.name_en AS category_name_en,
      s.name AS section_name, s.name_en AS section_name_en
    FROM links l
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN sections s ON s.id = l.section_id
    WHERE l.id = ?
    LIMIT 1`).bind(id).first<{
      id: number; title: string; title_en: string | null; url: string; description: string | null; description_en: string | null;
      logo: string | null; qrcode: string | null; translations: string | null; category_name: string; category_name_en: string | null;
      section_name: string | null; section_name_en: string | null;
    }>();
  if (!row) return null;
  const link = rowToLink({ id: row.id, title: row.title, titleEn: row.title_en, url: row.url, description: row.description, descriptionEn: row.description_en, logo: row.logo, qrcode: row.qrcode, translations: row.translations });
  return {
    ...link,
    category: { taxonomy: row.category_name, taxonomy_en: row.category_name_en },
    section: row.section_name ? { term: row.section_name, term_en: row.section_name_en } : null
  };
}

function linksIn(data: WebstackCategory[]): LinkItem[] {
  return data.flatMap((category) => category.list?.flatMap((section) => section.links) ?? category.friend ?? category.links ?? []);
}

export async function replaceWebstack(value: unknown) {
  const data = normalizeWebstack(value);
  const d1 = getD1();
  const statements: D1PreparedStatement[] = [d1.prepare("DELETE FROM links"), d1.prepare("DELETE FROM sections"), d1.prepare("DELETE FROM categories")];
  const existingIds = linksIn(data).map((link) => link.id).filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0);
  const usedIds = new Set<number>();
  let nextLinkId = Math.max(0, ...existingIds) + 1;
  let sectionId = 1;
  const reserveLinkId = (link: LinkItem) => {
    if (link.id && !usedIds.has(link.id)) { usedIds.add(link.id); return link.id; }
    while (usedIds.has(nextLinkId)) nextLinkId += 1;
    usedIds.add(nextLinkId);
    return nextLinkId++;
  };
  data.forEach((category, categoryIndex) => {
    const categoryId = categoryIndex + 1;
    const mode = categoryMode(category);
    statements.push(d1.prepare("INSERT INTO categories (id, name, name_en, icon, mode, sort_order) VALUES (?, ?, ?, ?, ?, ?)").bind(categoryId, category.taxonomy, category.taxonomy_en ?? null, category.icon ?? "fa-star", mode, categoryIndex));
    const appendLinks = (items: LinkItem[], currentSectionId: number | null, kind: "link" | "friend") => {
      items.forEach((link, sortOrder) => statements.push(d1.prepare("INSERT INTO links (id, category_id, section_id, kind, title, title_en, url, description, description_en, logo, qrcode, translations, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(reserveLinkId(link), categoryId, currentSectionId, kind, link.title, link.title_en ?? null, link.url, link.description ?? null, link.description_en ?? null, link.logo ?? null, link.qrcode ?? null, JSON.stringify(link.translations ?? {}), sortOrder)));
    };
    if (mode === "list") {
      category.list?.forEach((section, sectionIndex) => {
        const currentSectionId = sectionId++;
        statements.push(d1.prepare("INSERT INTO sections (id, category_id, name, name_en, sort_order) VALUES (?, ?, ?, ?, ?)").bind(currentSectionId, categoryId, section.term, section.term_en ?? null, sectionIndex));
        appendLinks(section.links, currentSectionId, "link");
      });
    } else if (mode === "friend") appendLinks(category.friend ?? [], null, "friend");
    else appendLinks(category.links ?? [], null, "link");
  });
  await d1.batch(statements);
  return { categories: data.length, links: countLinks(data) };
}

let seedReady: Promise<void> | undefined;

export async function ensureSeeded(): Promise<void> {
  if (!seedReady) {
    seedReady = (async () => {
      const row = await getD1().prepare("SELECT COUNT(*) AS count FROM categories").first<{ count: number }>();
      if (Number(row?.count ?? 0) === 0) await replaceWebstack(seedData);
    })().catch((error: unknown) => {
      seedReady = undefined;
      throw error;
    });
  }
  await seedReady;
}
