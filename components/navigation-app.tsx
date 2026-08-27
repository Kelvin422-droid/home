"use client";

import { useEffect, useMemo, useState } from "react";
import { LanguageSwitcher, useLanguagePreference } from "@/components/language-switcher";
import { SiteLogo } from "@/components/site-logo";
import { formatMessage, languageOptions, localizeContent, type Language } from "@/lib/i18n";
import type { LinkItem, LinkSection, WebstackCategory } from "@/lib/webstack";


function countCategory(category: WebstackCategory) {
  return (category.links?.length ?? category.friend?.length ?? 0) + (category.list?.reduce((sum, section) => sum + section.links.length, 0) ?? 0);
}

function legacyLabel(zh: string | null | undefined, en: string | null | undefined, language: Language) {
  return language === "zh" ? zh || en || "" : en || zh || "";
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function SiteCard({ item, language, index }: { item: LinkItem; language: Language; index: number }) {
  const localized = localizeContent(item, language);
  return (
    <a className="site-card" href={`/site/${item.id ?? 0}`}>
      <SiteLogo logo={item.logo} url={item.url} title={localized.title} className={`site-mark tone-${index % 6}`} />
      <span className="site-copy">
        <span className="site-title-row"><strong>{localized.title}</strong><span aria-hidden="true">→</span></span>
        <span className="site-host">{hostname(item.url)}</span>
        {localized.description ? <span className="site-description">{localized.description}</span> : null}
      </span>
    </a>
  );
}

function filterItems(items: LinkItem[], query: string) {
  if (!query) return items;
  const needle = query.toLocaleLowerCase();
  return items.filter((item) => {
    const translationValues = Object.values(item.translations ?? {}).flatMap((entry) => [entry.title, entry.description]);
    return [item.title, item.title_en, item.description, item.description_en, item.url, ...translationValues]
      .some((value) => value?.toLocaleLowerCase().includes(needle));
  });
}

function filterSections(sections: LinkSection[], query: string) {
  return sections.map((section) => ({ ...section, links: filterItems(section.links, query) })).filter((section) => section.links.length > 0);
}

export function NavigationApp() {
  const { language, setLanguage, message: m } = useLanguagePreference();
  const [data, setData] = useState<WebstackCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetch("/api/data")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || m.loadFailed);
        setData(body);
        setStatus("ready");
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : m.loadFailed);
        setStatus("error");
      });
  }, [m.loadFailed]);

  const totalLinks = useMemo(() => data.reduce((sum, category) => sum + countCategory(category), 0), [data]);
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return data.flatMap((category) => {
      if (activeCategory !== "all" && category.taxonomy !== activeCategory) return [];
      const next = { ...category };
      if (category.list) next.list = filterSections(category.list, normalizedQuery);
      else if (category.friend) next.friend = filterItems(category.friend, normalizedQuery);
      else next.links = filterItems(category.links ?? [], normalizedQuery);
      return countCategory(next) > 0 ? [next] : [];
    });
  }, [activeCategory, data, query]);

  const active = data.find((item) => item.taxonomy === activeCategory);
  const resultTotal = visible.reduce((sum, category) => sum + countCategory(category), 0);

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DawnNav">
          <span className="brand-sun" aria-hidden="true"><i /></span>
          <span><b>DawnNav</b><small>黎明导航</small></span>
        </a>
        <nav className="topnav" aria-label="DawnNav">
          <a href="#explore">{m.explore}</a>
          <a href="/about/index.html">About</a>
          <a href="/admin">{m.manage}</a>
          <LanguageSwitcher language={language} onChange={setLanguage} compact />
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow"><span className={`live-dot ${status}`} /> {m.liveEyebrow}</p>
            <h1>{m.heroLead} <em>{m.heroEmphasis}</em></h1>
            <p className="hero-description">{m.heroDescription}</p>
          </div>
          <div className="hero-stats" aria-label={m.databaseOverview}>
            <div><strong>{status === "ready" ? data.length : "—"}</strong><span>{m.collections}</span></div>
            <div><strong>{status === "ready" ? totalLinks : "—"}</strong><span>{m.curatedLinks}</span></div>
            <div><strong>{languageOptions.length}</strong><span>{m.interfaceLanguages}</span></div>
          </div>
          <label className="hero-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">{m.searchLabel}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={m.searchPlaceholder} />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label={m.clearSearch}>×</button> : <kbd>/</kbd>}
          </label>
        </section>

        <section className="explorer" id="explore">
          <aside className="category-rail">
            <div className="rail-heading"><span>{m.index}</span><small>{String(data.length).padStart(2, "0")}</small></div>
            <button className={activeCategory === "all" ? "active" : ""} type="button" onClick={() => setActiveCategory("all")}>
              <span><i className="category-number">00</i>{m.allEntries}</span><b>{totalLinks}</b>
            </button>
            {data.map((category, index) => (
              <button className={activeCategory === category.taxonomy ? "active" : ""} type="button" key={category.taxonomy} onClick={() => setActiveCategory(category.taxonomy)}>
                <span><i className="category-number">{String(index + 1).padStart(2, "0")}</i>{legacyLabel(category.taxonomy, category.taxonomy_en, language)}</span><b>{countCategory(category)}</b>
              </button>
            ))}
          </aside>

          <div className="catalog">
            <div className="catalog-heading">
              <div><p>{m.liveDirectory}</p><h2>{query ? formatMessage(m.resultsFor, { query }) : activeCategory === "all" ? m.allEntries : legacyLabel(active?.taxonomy, active?.taxonomy_en, language)}</h2></div>
              <span className="result-count">{resultTotal} {m.items}</span>
            </div>

            {status === "loading" ? <div className="state-panel"><span className="loader" /><h3>{m.connecting}</h3></div> : null}
            {status === "error" ? <div className="state-panel error"><b>!</b><h3>{m.unavailable}</h3><p>{error}</p><button type="button" onClick={() => window.location.reload()}>{m.reload}</button></div> : null}
            {status === "ready" && visible.length === 0 ? <div className="state-panel"><b>0</b><h3>{m.noMatches}</h3><p>{m.noMatchesHelp}</p></div> : null}

            {visible.map((category, categoryIndex) => {
              const expanded = activeCategory !== "all" || Boolean(query);
              const directItems = category.friend ?? category.links ?? [];
              const sections = category.list ?? (directItems.length ? [{ term: category.taxonomy, term_en: category.taxonomy_en, links: directItems }] : []);
              return (
                <article className="collection" key={category.taxonomy}>
                  <header className="collection-header">
                    <span className={`collection-index tone-${categoryIndex % 6}`}>{String(data.findIndex((item) => item.taxonomy === category.taxonomy) + 1).padStart(2, "0")}</span>
                    <div><h3>{legacyLabel(category.taxonomy, category.taxonomy_en, language)}</h3><p>{countCategory(category)} {m.sites}</p></div>
                    {!expanded && countCategory(category) > 12 ? <button type="button" onClick={() => setActiveCategory(category.taxonomy)}>{m.viewAll} <span>→</span></button> : null}
                  </header>
                  {sections.map((section, sectionIndex) => {
                    const previous = sections.slice(0, sectionIndex).reduce((sum, item) => sum + Math.min(item.links.length, 12), 0);
                    const items = expanded ? section.links : section.links.slice(0, Math.max(0, 12 - previous));
                    if (!items.length) return null;
                    return <div className="collection-section" key={`${category.taxonomy}-${section.term}`}>
                      {category.list ? <h4><span>{legacyLabel(section.term, section.term_en, language)}</span><small>{section.links.length}</small></h4> : null}
                      <div className="card-grid">{items.map((item, itemIndex) => <SiteCard key={`${item.id ?? item.url}-${itemIndex}`} item={item} language={language} index={categoryIndex + sectionIndex + itemIndex} />)}</div>
                    </div>;
                  })}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#top"><span className="brand-sun" aria-hidden="true"><i /></span><span><b>DawnNav</b><small>{m.footerTagline}</small></span></a>
        <p>{m.footerQuote}</p>
        <a href="/admin">{m.manageDatabase}</a>
      </footer>
    </div>
  );
}
