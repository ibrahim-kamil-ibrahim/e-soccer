import { useState, useEffect } from "react";
import { newsService } from "../services/newsService.js";
import { NewsCard } from "../components/common/Cards.jsx";
import { NewsSkeleton, EmptyState } from "../components/common/LoadingSkeletons.jsx";
import { Search } from "lucide-react";

export default function News({ setSearchOpen, favorites, setFavorites }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);

  const categories = ["all", "transfers", "match-reports", "tactics", "interviews", "breaking-news"];

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (category !== "all") params.category = category;
        const res = await newsService.list(params);
        if (res.success) {
          const items = (res.items || []).map(a => ({
            ...a,
            image: a.coverImage || "📰",
            date: a.publishedAt || "",
          }));
          setNews(items);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [search, category]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-display font-bold text-[var(--color-text)] mb-6">News</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search news..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/[0.03] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border)] transition-colors"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-black/[0.03] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-border)] transition-colors appearance-none cursor-pointer"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-white text-[var(--color-text)] capitalize">
              {cat === "all" ? "All Categories" : cat.replace("-", " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <NewsSkeleton key={i} />
          ))}
        </div>
      ) : news.length === 0 ? (
        <EmptyState icon="📰" title="No articles found" description="No articles found matching your search." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              favorites={favorites}
              setFavorites={setFavorites}
            />
          ))}
        </div>
      )}
    </div>
  );
}
