import type { AdminCopy } from "@/components/admin/admin-copy";
import { categoryCount, modeOf, sectionCount, translatedSiteCount, type AdminView } from "@/components/admin/admin-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Language } from "@/lib/i18n";
import type { WebstackCategory } from "@/lib/webstack";

export function DashboardOverview({ data, copy, language, onNavigate }: { data: WebstackCategory[]; copy: AdminCopy; language: Language; onNavigate: (view: AdminView) => void }) {
  const totalSites = data.reduce((sum, category) => sum + categoryCount(category), 0);
  const stats = [
    { label: copy.totalCategories, value: data.length, icon: "◇", tone: "blue" },
    { label: copy.totalSites, value: totalSites, icon: "◎", tone: "orange" },
    { label: copy.totalSections, value: sectionCount(data), icon: "≡", tone: "green" },
    { label: copy.translatedSites, value: translatedSiteCount(data), icon: "文", tone: "violet" }
  ];
  const modeLabel = (category: WebstackCategory) => modeOf(category) === "list" ? copy.groupedLinks : modeOf(category) === "friend" ? copy.friendLinks : copy.standardLinks;

  return (
    <div className="adm-view">
      <section className="adm-page-intro"><div><p>{copy.workspace}</p><h2>{copy.dashboard}</h2><span>{copy.dashboardIntro}</span></div></section>
      <section className="adm-stat-grid">
        {stats.map((stat) => <Card className={`adm-stat adm-stat-${stat.tone}`} key={stat.label}><CardContent><span className="adm-stat-icon" aria-hidden="true">{stat.icon}</span><div><p>{stat.label}</p><strong>{stat.value.toLocaleString()}</strong></div></CardContent></Card>)}
      </section>
      <div className="adm-dashboard-grid">
        <Card>
          <CardHeader title={copy.recentCategories} description={copy.recentCategoriesHelp} action={<Button size="sm" onClick={() => onNavigate("categories")}>{copy.manageCategories}</Button>} />
          <CardContent className="adm-overview-list">
            {data.slice(0, 8).map((category, index) => (
              <button type="button" onClick={() => onNavigate("categories")} key={`${category.taxonomy}-${index}`}>
                <span className="adm-overview-index">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{language === "zh" ? category.taxonomy : category.taxonomy_en || category.taxonomy}</strong><small>{modeLabel(category)}</small></span>
                <b>{categoryCount(category)}</b>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="adm-quick-card">
          <CardHeader title={copy.quickActions} description={copy.dashboardIntro} />
          <CardContent>
            <button type="button" onClick={() => onNavigate("categories")}><span aria-hidden="true">◇</span><div><strong>{copy.manageCategories}</strong><small>{copy.categoryListHelp}</small></div><b>→</b></button>
            <button type="button" onClick={() => onNavigate("sites")}><span aria-hidden="true">◎</span><div><strong>{copy.manageSites}</strong><small>{copy.siteListHelp}</small></div><b>→</b></button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
