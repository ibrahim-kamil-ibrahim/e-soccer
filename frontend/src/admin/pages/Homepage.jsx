import { useEffect, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { settingsService } from "../../services/settingsService.js";
import { matchService } from "../../services/matchService.js";
import { newsService } from "../../services/newsService.js";
import { Field, TextInput, TextArea, Select, Checkbox, Button, PageHeader, Badge } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const HERO_EMPTY = { enabled: true, matchId: "", articleId: "", title: "", subtitle: "", image: "", ctaText: "", ctaLink: "" };
const SECTIONS = [
  { key: "live", label: "Live Now" },
  { key: "todayMatches", label: "Today's Matches" },
  { key: "topCompetitions", label: "Top Competitions" },
  { key: "featuredTeams", label: "Featured Teams" },
  { key: "topScorers", label: "Top Scorers" },
  { key: "latestNews", label: "Latest News" },
];

export default function Homepage() {
  const { toast } = useToast();
  const [hero, setHero] = useState(HERO_EMPTY);
  const [sections, setSections] = useState({});
  const [matches, setMatches] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsService.getHomepage(),
      matchService.list({ limit: 100, status: "UPCOMING" }),
      newsService.list({ limit: 60, status: "PUBLISHED" }),
    ])
      .then(([h, m, n]) => {
        const hm = h.homepage;
        setHero({
          enabled: hm.hero?.enabled ?? true,
          matchId: hm.hero?.matchId ?? "",
          articleId: hm.hero?.articleId ?? "",
          title: hm.hero?.title ?? "",
          subtitle: hm.hero?.subtitle ?? "",
          image: hm.hero?.image ?? "",
          ctaText: hm.hero?.ctaText ?? "",
          ctaLink: hm.hero?.ctaLink ?? "",
        });
        setSections({ ...(hm.sections || {}) });
        setMatches(m.items);
        setArticles(n.items);
      })
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const setHeroField = (key) => (e) => setHero((prev) => ({ ...prev, [key]: e.target.value }));
  const setSection = (key) => (e) => setSections((prev) => ({ ...prev, [key]: e.target.checked }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const matchId = hero.matchId ? Number(hero.matchId) : null;
      const articleId = hero.articleId ? Number(hero.articleId) : null;
      await settingsService.updateHomepage({ hero: { ...hero, matchId, articleId }, sections });
      toast("Homepage settings saved");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-96 bg-white border border-[var(--color-border)] rounded-xl animate-pulse" />;
  }

  return (
    <div>
      <PageHeader
        title="Homepage Editor"
        description="Control what appears on the public homepage"
        actions={
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Homepage"}
          </Button>
        }
      />

      <div className="space-y-6 max-w-4xl">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F59E0B]" /> Hero Banner
            </h3>
            <Checkbox label="Enabled" checked={hero.enabled} onChange={(e) => setHero((prev) => ({ ...prev, enabled: e.target.checked }))} />
          </div>
          <p className="text-xs text-[#64748B] mb-5">The big banner at the top of the homepage</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Featured Match">
              <Select value={String(hero.matchId || "")} onChange={setHeroField("matchId")}>
                <option value="">— None —</option>
                {matches.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.homeTeam?.shortName ?? m.homeTeam?.name} vs {m.awayTeam?.shortName ?? m.awayTeam?.name} ({m.date?.slice(0, 10) || "no date"})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Featured Article">
              <Select value={String(hero.articleId || "")} onChange={setHeroField("articleId")}>
                <option value="">— None —</option>
                {articles.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.title}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Hero Title">
                <TextInput value={hero.title} onChange={setHeroField("title")} placeholder="e.g. Welcome to E-Soccer" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Hero Subtitle">
                <TextInput value={hero.subtitle} onChange={setHeroField("subtitle")} placeholder="e.g. Your home of Dire Dawa footbball" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Hero Background Image URL">
                <TextInput value={hero.image} onChange={setHeroField("image")} placeholder="/uploads/hero.jpg" />
              </Field>
            </div>
            <Field label="CTA Text">
              <TextInput value={hero.ctaText} onChange={setHeroField("ctaText")} placeholder="e.g. View Fixtures" />
            </Field>
            <Field label="CTA Link">
              <TextInput value={hero.ctaLink} onChange={setHeroField("ctaLink")} placeholder="e.g. /matches" />
            </Field>
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Homepage Sections</h3>
          <p className="text-xs text-[#64748B] mb-5">Toggle which sections appear on the homepage</p>
          <div className="flex flex-col gap-3">
            {SECTIONS.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-[var(--color-surface-dim)] border border-[var(--color-border)]">
                <span className="text-sm text-[var(--color-text)]">{s.label}</span>
                <Checkbox checked={sections[s.key] ?? true} onChange={setSection(s.key)} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Badge color="slate">Featured match and hero require a saved match/article to render</Badge>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Homepage"}
          </Button>
        </div>
      </div>
    </div>
  );
}
