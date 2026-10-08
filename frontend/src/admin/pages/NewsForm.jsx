import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { newsService } from "../../services/newsService.js";
import { Field, TextInput, TextArea, Select, Checkbox, Button, PageHeader } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const CATEGORIES = ["Match Reports", "Dire Dawa", "Transfers", "Clubs", "Players", "National Team", "CAF", "Analysis"];
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export default function NewsForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    content: "",
    category: "Match Reports",
    author: "",
    coverImage: "",
    featured: false,
    status: "DRAFT",
    publishedAt: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    newsService
      .get(id)
      .then((res) => {
        const a = res.article;
        setForm({
          title: a.title || "",
          slug: a.slug || "",
          summary: a.summary || "",
          content: a.content || "",
          category: a.category || "Match Reports",
          author: a.author || "",
          coverImage: a.coverImage || "",
          featured: Boolean(a.featured),
          status: a.status || "DRAFT",
          publishedAt: a.publishedAt ? a.publishedAt.slice(0, 16) : "",
        });
      })
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const autoSlug = () => {
    if (!form.slug.trim()) {
      const slug = form.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (slug) setForm((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug.trim(),
        featured: Boolean(form.featured),
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
      };
      if (isEdit) {
        await newsService.update(id, payload);
        toast("Article updated successfully");
      } else {
        await newsService.create(payload);
        toast("Article created successfully");
      }
      navigate("/admin/news");
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
        title={isEdit ? "Edit Article" : "Create Article"}
        description={isEdit ? "Update your news article" : "Write a new news article"}
        actions={
          <Button variant="ghost" onClick={() => navigate("/admin/news")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6 max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="sm:col-span-2">
            <Field label="Title" required error={errors.title}>
              <TextInput value={form.title} onChange={set("title")} onBlur={autoSlug} placeholder="Article title" error={errors.title} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Slug" hint="auto-generated from title, can be changed">
              <TextInput value={form.slug} onChange={set("slug")} placeholder="my-article-slug" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Summary">
              <TextArea value={form.summary} onChange={set("summary")} placeholder="Short summary shown in previews" />
            </Field>
          </div>
          <Field label="Category">
            <Select value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Author">
            <TextInput value={form.author} onChange={set("author")} placeholder="e.g. E-Soccer Staff" />
          </Field>
          <Field label="Cover Image URL">
            <TextInput value={form.coverImage} onChange={set("coverImage")} placeholder="/uploads/cover.jpg or https://..." />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Publish Date" hint="optional, defaults to now when published">
            <TextInput type="datetime-local" value={form.publishedAt} onChange={set("publishedAt")} />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={form.featured} onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))} />
              <span className="text-sm text-[var(--color-text)]">Feature this article (★ on list)</span>
            </label>
          </div>
        </div>

        <div className="sm:col-span-2 mb-6">
          <Field label="Content" hint="plain text or HTML">
            <TextArea value={form.content} onChange={set("content")} rows={14} placeholder="Full article content..." />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/news")}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Article"}
          </Button>
        </div>
      </form>
    </div>
  );
}
