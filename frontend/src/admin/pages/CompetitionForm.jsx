import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { competitionService } from "../../services/competitionService.js";
import { Field, TextInput, TextArea, Select, Button, PageHeader } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const LEVELS = ["Top Tier", "Regional", "National", "Cup", "Women's", "Youth"];
const TYPES = ["League", "Cup", "Women's", "Youth", "Regional", "National"];
const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"];

export default function CompetitionForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    shortName: "",
    country: "Ethiopia",
    region: "Dire Dawa",
    level: "Regional",
    type: "League",
    season: "2025-26",
    description: "",
    logo: "🏆",
    color: "#16A34A",
    status: "PUBLISHED",
    sortOrder: 0,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    competitionService
      .get(id)
      .then((res) => {
        const c = res.competition;
        setForm({
          name: c.name || "",
          shortName: c.shortName || "",
          country: c.country || "Ethiopia",
          region: c.region || "Dire Dawa",
          level: c.level || "Regional",
          type: c.type || "League",
          season: c.season || "2025-26",
          description: c.description || "",
          logo: c.logo || "🏆",
          color: c.color || "#16A34A",
          status: c.status || "PUBLISHED",
          sortOrder: c.sortOrder ?? 0,
        });
      })
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.region.trim()) errs.region = "Region is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (isEdit) {
        await competitionService.update(id, form);
        toast("Competition updated successfully");
      } else {
        await competitionService.create(form);
        toast("Competition created successfully");
      }
      navigate("/admin/competitions");
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
        title={isEdit ? "Edit Competition" : "Create Competition"}
        description={isEdit ? "Update competition details" : "Add a new competition"}
        actions={
          <Button variant="ghost" onClick={() => navigate("/admin/competitions")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6 max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="sm:col-span-2">
            <Field label="Name" required error={errors.name}>
              <TextInput value={form.name} onChange={set("name")} placeholder="e.g. Dire Dawa Higher Division" error={errors.name} />
            </Field>
          </div>
          <Field label="Short Name">
            <TextInput value={form.shortName} onChange={set("shortName")} placeholder="e.g. DDH" />
          </Field>
          <Field label="Country">
            <TextInput value={form.country} onChange={set("country")} />
          </Field>
          <Field label="Region" required error={errors.region}>
            <TextInput value={form.region} onChange={set("region")} placeholder="e.g. Dire Dawa / National" error={errors.region} />
          </Field>
          <Field label="Season">
            <TextInput value={form.season} onChange={set("season")} placeholder="e.g. 2025-26" />
          </Field>
          <Field label="Level">
            <Select value={form.level} onChange={set("level")}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={set("type")}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Logo (emoji)">
            <TextInput value={form.logo} onChange={set("logo")} placeholder="e.g. 🏆 or /uploads/image.png" />
          </Field>
          <Field label="Brand Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={set("color")}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border border-[var(--color-border)]"
              />
              <TextInput value={form.color} onChange={set("color")} className="font-mono" />
            </div>
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
          <Field label="Sort Order">
            <TextInput type="number" value={form.sortOrder} onChange={set("sortOrder")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <TextArea value={form.description} onChange={set("description")} placeholder="Competition description" />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/competitions")}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Competition"}
          </Button>
        </div>
      </form>
    </div>
  );
}
