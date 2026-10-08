import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { newsService } from "../services/newsService.js";
import { ArrowLeft, Share2 } from "lucide-react";

export default function NewsArticle({ setSearchOpen, favorites, setFavorites }) {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const res = await newsService.get(id);
        if (res.success && res.article) {
          setArticle({
            ...res.article,
            image: res.article.coverImage || "📰",
            date: res.article.publishedAt || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch article:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/news" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </Link>
        <div className="text-center py-20">
          <p className="text-[var(--color-text-muted)] text-lg">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/news" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </Link>
        <div className="text-center py-20">
          <p className="text-[var(--color-text)] text-lg">Article not found.</p>
        </div>
      </div>
    );
  }

  const paragraphs = article.content?.split("\n\n") || [];
  const related = (article.related || []).slice(0, 3);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: article.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link to="/news" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to News
      </Link>

      <article className="max-w-3xl mx-auto">
        <div className="h-48 sm:h-64 rounded-2xl bg-gradient-to-br from-[var(--color-green)]/20 to-[var(--color-green-dim)] flex items-center justify-center text-6xl mb-6 overflow-hidden">
          {article.image || "📰"}
        </div>

        <div className="flex items-center justify-between">
          <span className="badge-green text-xs uppercase tracking-wider">{article.category}</span>
          <button onClick={handleShare} className="p-2 rounded-lg bg-black/[0.03] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-black/[0.05] transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--color-text)] mt-3">{article.title}</h1>

        <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mt-2 mb-6">
          <span>{article.author || "Staff Writer"}</span>
          <span className="w-1 h-1 rounded-full bg-black/10" />
          <span>{article.date}</span>
        </div>

        <div className="space-y-4 mb-12">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{p}</p>
          ))}
        </div>

        {related.length > 0 && (
          <section className="border-t border-[var(--color-border)] pt-8">
            <h2 className="text-lg font-display font-bold text-[var(--color-text)] mb-4">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/news/${item.id}`}
                  className="es-card es-card-static p-4 block hover:border-[var(--color-border)] transition-all"
                >
                  <span className="badge-muted text-[10px] uppercase tracking-wider">{item.category}</span>
                  <h3 className="text-sm font-display font-bold text-[var(--color-text)] mt-2 line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{item.date}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
