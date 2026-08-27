import type { CategoryMode, LinkItem, WebstackCategory } from "@/lib/webstack";

export type AdminView = "dashboard" | "categories" | "sites";

export interface SiteLocation {
  categoryIndex: number;
  linkIndex: number;
  kind: "links" | "friend" | "list";
  sectionIndex?: number;
}

export interface SiteRow {
  key: string;
  item: LinkItem;
  category: WebstackCategory;
  categoryIndex: number;
  sectionName: string | null;
  location: SiteLocation;
}

export function modeOf(category: WebstackCategory): CategoryMode {
  if (Array.isArray(category.list)) return "list";
  if (Array.isArray(category.friend)) return "friend";
  return "links";
}

export function categoryCount(category: WebstackCategory): number {
  return (category.links?.length ?? category.friend?.length ?? 0) + (category.list?.reduce((sum, section) => sum + section.links.length, 0) ?? 0);
}

export function sectionCount(data: WebstackCategory[]): number {
  return data.reduce((sum, category) => sum + (category.list?.length ?? 0), 0);
}

export function translatedSiteCount(data: WebstackCategory[]): number {
  return flattenSites(data).filter(({ item }) => Object.keys(item.translations ?? {}).some((code) => code !== "zh" && code !== "en")).length;
}

export function createEmptyCategory(): WebstackCategory {
  return { taxonomy: "新分类", taxonomy_en: "New collection", icon: "fa-star", links: [] };
}

export function createEmptyLink(): LinkItem {
  return {
    title: "新站点",
    title_en: "New website",
    url: "https://",
    description: "",
    description_en: "",
    translations: {
      zh: { title: "新站点", description: "" },
      en: { title: "New website", description: "" }
    }
  };
}

export function flattenSites(data: WebstackCategory[]): SiteRow[] {
  return data.flatMap((category, categoryIndex) => {
    if (category.list) {
      return category.list.flatMap((section, sectionIndex) => section.links.map((item, linkIndex) => ({
        key: `${categoryIndex}-list-${sectionIndex}-${linkIndex}-${item.id ?? item.url}`,
        item,
        category,
        categoryIndex,
        sectionName: section.term,
        location: { categoryIndex, sectionIndex, linkIndex, kind: "list" as const }
      })));
    }
    const kind = category.friend ? "friend" as const : "links" as const;
    return (category[kind] ?? []).map((item, linkIndex) => ({
      key: `${categoryIndex}-${kind}-${linkIndex}-${item.id ?? item.url}`,
      item,
      category,
      categoryIndex,
      sectionName: null,
      location: { categoryIndex, linkIndex, kind }
    }));
  });
}

function allCategoryLinks(category: WebstackCategory): LinkItem[] {
  return category.list?.flatMap((section) => section.links) ?? category.friend ?? category.links ?? [];
}

export function convertCategoryMode(category: WebstackCategory, mode: CategoryMode): WebstackCategory {
  if (modeOf(category) === mode) return category;
  const links = allCategoryLinks(category);
  const base = { taxonomy: category.taxonomy, taxonomy_en: category.taxonomy_en, icon: category.icon };
  if (mode === "list") return { ...base, list: [{ term: "默认分组", term_en: "Default group", links }] };
  if (mode === "friend") return { ...base, friend: links };
  return { ...base, links };
}

export function removeSiteAt(data: WebstackCategory[], location: SiteLocation): WebstackCategory[] {
  return data.map((category, categoryIndex) => {
    if (categoryIndex !== location.categoryIndex) return category;
    if (location.kind === "list") {
      return {
        ...category,
        list: category.list?.map((section, sectionIndex) => sectionIndex === location.sectionIndex
          ? { ...section, links: section.links.filter((_, linkIndex) => linkIndex !== location.linkIndex) }
          : section)
      };
    }
    return { ...category, [location.kind]: (category[location.kind] ?? []).filter((_, linkIndex) => linkIndex !== location.linkIndex) };
  });
}

function targetsLocation(data: WebstackCategory[], location: SiteLocation, categoryIndex: number, sectionIndex?: number): boolean {
  if (location.categoryIndex !== categoryIndex) return false;
  const targetMode = modeOf(data[categoryIndex]);
  if (targetMode === "list") return location.kind === "list" && location.sectionIndex === sectionIndex;
  return location.kind === targetMode;
}

function replaceSiteAt(data: WebstackCategory[], location: SiteLocation, item: LinkItem): WebstackCategory[] {
  return data.map((category, categoryIndex) => {
    if (categoryIndex !== location.categoryIndex) return category;
    if (location.kind === "list") {
      return { ...category, list: category.list?.map((section, sectionIndex) => sectionIndex === location.sectionIndex
        ? { ...section, links: section.links.map((current, linkIndex) => linkIndex === location.linkIndex ? item : current) }
        : section) };
    }
    return { ...category, [location.kind]: (category[location.kind] ?? []).map((current, linkIndex) => linkIndex === location.linkIndex ? item : current) };
  });
}

function appendSite(data: WebstackCategory[], categoryIndex: number, sectionIndex: number | undefined, item: LinkItem): WebstackCategory[] {
  return data.map((category, index) => {
    if (index !== categoryIndex) return category;
    const mode = modeOf(category);
    if (mode === "list") {
      const list = category.list?.length ? category.list : [{ term: "默认分组", term_en: "Default group", links: [] }];
      const targetSection = Math.min(Math.max(sectionIndex ?? 0, 0), list.length - 1);
      return { ...category, list: list.map((section, currentIndex) => currentIndex === targetSection ? { ...section, links: [...section.links, item] } : section) };
    }
    const property = mode === "friend" ? "friend" : "links";
    return { ...category, [property]: [...(category[property] ?? []), item] };
  });
}

export function upsertSite(data: WebstackCategory[], location: SiteLocation | null, categoryIndex: number, sectionIndex: number | undefined, item: LinkItem): WebstackCategory[] {
  if (location && targetsLocation(data, location, categoryIndex, sectionIndex)) return replaceSiteAt(data, location, item);
  const withoutPrevious = location ? removeSiteAt(data, location) : data;
  return appendSite(withoutPrevious, categoryIndex, sectionIndex, item);
}
