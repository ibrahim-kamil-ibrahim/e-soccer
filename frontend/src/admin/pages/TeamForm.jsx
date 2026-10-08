import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Trash2, ChevronDown } from "lucide-react";
import { teamService } from "../../services/teamService.js";
import { cityService } from "../../services/cityService.js";
import { competitionService } from "../../services/competitionService.js";
import { api } from "../../services/api.js";
import { Field, TextInput, TextArea, Select, Button, PageHeader } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUS_OPTIONS = [
  { value: "PUBLISHED", label: "Active" },
  { value: "DRAFT", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

const CLUB_TYPES = ["Professional", "Amateur", "Youth"];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const isValidUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const EMPTY_FORM = {
  name: "",
  shortName: "",
  city: "",
  description: "",
  logo: "",
  // Team Management
  status: "PUBLISHED",
  published: true,
  isFeatured: false,
  sortOrder: 0,
  slug: "",
  // Additional Information
  founded: "",
  type: "Professional",
  stadium: "",
  capacity: "",
  // Contact & Social
  phone: "",
  email: "",
  website: "",
  facebook: "",
  telegram: "",
  instagram: "",
  // Competition & Settings
  competitionId: "",
};

function LogoUpload({ value, onChange, error }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const validate = (file) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
    if (!allowed.includes(file.type)) return "Only JPEG, PNG, WebP, SVG and GIF images are allowed";
    if (file.size > 2 * 1024 * 1024) return "Image must be under 2MB";
    return null;
  };

  const handleFile = async (file) => {
    const err = validate(file);
    if (err) { alert(err); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "TEAM_LOGO");
      const res = await api.post("/media", fd);
      const url = res.media?.url || res.url;
      if (url) {
        setPreview(url);
        onChange(url);
      }
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const remove = () => {
    setPreview("");
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Team Logo</label>
      <div
        className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors cursor-pointer ${
          dragOver ? "border-[#16A34A] bg-[#16A34A]/5" : error ? "border-[#EF4444]/60" : "border-[var(--color-border)]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <div className="relative w-full h-44 flex items-center justify-center bg-black/[0.02]">
            <img src={preview} alt="Team logo" className="max-h-40 max-w-[80%] object-contain" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(); }}
              className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-[#EF4444] text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <div className="w-12 h-12 rounded-full bg-[var(--color-green-dim)] flex items-center justify-center">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload size={20} className="text-[#16A34A]" />
              )}
            </div>
            <div className="text-center pointer-events-none">
              <span className="text-sm font-medium text-[#16A34A]">Click to upload</span>
              <span className="text-xs text-[#94A3B8] block">or drag and drop</span>
            </div>
            <span className="text-[10px] text-[#94A3B8] pointer-events-none">PNG, JPG, WebP, SVG up to 2MB</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
          onChange={onFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--color-border)] hover:bg-black/[0.02] transition-colors">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-[#16A34A]" : "bg-black/20"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
      <div>
        <span className="text-sm font-medium text-[var(--color-text)] block">{label}</span>
        {hint && <span className="text-xs text-[#94A3B8]">{hint}</span>}
      </div>
    </label>
  );
}

function CollapsibleSection({ title, subtitle, defaultOpen = false, children, actions }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl mb-5">
      <div
        className="flex items-center justify-between gap-3 p-5 sm:p-6 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
          <ChevronDown
            size={18}
            className={`text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {open && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-[var(--color-border)] pt-5">
          {children}
        </div>
      )}
    </div>
  );
}

export default function TeamForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [cities, setCities] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    cityService
      .all()
      .then((res) => setCities(res.items || []))
      .catch(() => {});
    competitionService
      .list({ limit: 100 })
      .then((res) => setCompetitions(res.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    teamService
      .get(id)
      .then((res) => {
        const t = res.team;
        setForm({
          name: t.name || "",
          shortName: t.shortName || "",
          city: t.city || "",
          description: t.description || "",
          logo: t.logo || "",
          status: t.status || "PUBLISHED",
          published: t.published ?? true,
          isFeatured: t.isFeatured || false,
          sortOrder: t.sortOrder ?? 0,
          slug: t.slug || slugify(t.name || ""),
          founded: t.founded ?? "",
          type: t.type || "Professional",
          stadium: t.stadium || "",
          capacity: t.capacity ?? "",
          phone: t.phone || "",
          email: t.email || "",
          website: t.website || "",
          facebook: t.facebook || "",
          telegram: t.telegram || "",
          instagram: t.instagram || "",
          competitionId: t.competitionId || "",
        });
      })
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  // Auto-generate slug from name (read-only, display only)
  const displaySlug = form.slug || slugify(form.name);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Team name is required";
    if (!form.shortName.trim()) errs.shortName = "Short name is required";
    if (!form.city.trim()) errs.city = "City is required";

    if (isEdit) {
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errs.email = "Enter a valid email address";
      }
      if (form.website && !isValidUrl(form.website)) {
        errs.website = "Enter a valid URL (https://...)";
      }
      if (form.facebook && !isValidUrl(form.facebook)) {
        errs.facebook = "Enter a valid URL (https://...)";
      }
      if (form.telegram && !isValidUrl(form.telegram)) {
        errs.telegram = "Enter a valid URL (https://...)";
      }
      if (form.instagram && !isValidUrl(form.instagram)) {
        errs.instagram = "Enter a valid URL (https://...)";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit) {
        await teamService.update(id, { ...form, slug: displaySlug });
        toast("Team updated successfully");
      } else {
        // Create sends ONLY basic fields — backend applies defaults for the rest
        await teamService.create({
          name: form.name,
          shortName: form.shortName,
          city: form.city,
          description: form.description,
          logo: form.logo,
        });
        toast("Team created successfully");
      }
      navigate("/admin/teams");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await teamService.remove(id);
      toast("Team deleted successfully");
      navigate("/admin/teams");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return <div className="h-96 bg-white border border-[var(--color-border)] rounded-xl animate-pulse" />;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Team" : "Create Team"}
        description={isEdit ? "Update team details and management settings" : "Add a new football club"}
        actions={
          <Button variant="ghost" onClick={() => navigate("/admin/teams")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* ── Basic Team Information (always shown) ── */}
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6 mb-5">
          <div className="mb-5 pb-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Basic Team Information</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">Team details visible to everyone</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <LogoUpload
                value={form.logo}
                onChange={(v) => setForm((p) => ({ ...p, logo: v }))}
                error={errors.logo}
              />
            </div>
            <Field label="Team Name" required error={errors.name}>
              <TextInput
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Dire Dawa City FC"
                error={errors.name}
              />
            </Field>
            <Field label="Short Name" required error={errors.shortName}>
              <TextInput
                value={form.shortName}
                onChange={set("shortName")}
                placeholder="e.g. DFC"
                error={errors.shortName}
              />
            </Field>
            <Field label="City" required error={errors.city}>
              <Select value={form.city} onChange={set("city")} error={errors.city}>
                <option value="">— Select City —</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" hint="Brief description about the team (optional)">
                <TextArea
                  value={form.description}
                  onChange={set("description")}
                  placeholder="Tell us about this team..."
                  rows={3}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Edit-only sections ── */}
        {isEdit && (
          <>
            {/* Team Management */}
            <CollapsibleSection
              title="Team Management"
              subtitle="Admin controls for status, visibility and ordering"
              defaultOpen
              actions={
                !confirmDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444] px-2 py-1 text-xs"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                ) : null
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Status" required>
                  <Select value={form.status} onChange={set("status")}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Display Order" hint="Lower numbers appear first">
                  <TextInput type="number" value={form.sortOrder} onChange={set("sortOrder")} placeholder="0" />
                </Field>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Toggle
                    checked={form.published}
                    onChange={(v) => setForm((p) => ({ ...p, published: v }))}
                    label="Published"
                    hint="Visible on the public site"
                  />
                  <Toggle
                    checked={form.isFeatured}
                    onChange={(v) => setForm((p) => ({ ...p, isFeatured: v }))}
                    label="Featured Team"
                    hint="Highlight on the homepage"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Slug" hint="Auto-generated from team name">
                    <TextInput value={displaySlug} readOnly className="font-mono bg-black/[0.03] cursor-not-allowed" />
                  </Field>
                </div>
              </div>

              {confirmDelete && (
                <div className="mt-4 flex flex-wrap items-center gap-3 p-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/20">
                  <span className="text-sm text-[#EF4444] font-medium">Delete this team permanently?</span>
                  <div className="flex gap-2 ml-auto">
                    <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleDelete}
                      loading={deleting}
                      disabled={deleting}
                      className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              )}
            </CollapsibleSection>

            {/* Additional Information */}
            <CollapsibleSection
              title="Additional Information"
              subtitle="Optional advanced details about the club"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Founded Year">
                  <TextInput type="number" value={form.founded} onChange={set("founded")} placeholder="e.g. 1998" />
                </Field>
                <Field label="Club Type">
                  <Select value={form.type} onChange={set("type")}>
                    {CLUB_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Home Stadium">
                  <TextInput value={form.stadium} onChange={set("stadium")} placeholder="e.g. Dire Dawa Stadium" />
                </Field>
                <Field label="Stadium Capacity">
                  <TextInput type="number" value={form.capacity} onChange={set("capacity")} placeholder="e.g. 15000" />
                </Field>
              </div>
            </CollapsibleSection>

            {/* Contact & Social */}
            <CollapsibleSection
              title="Contact & Social"
              subtitle="Optional contact details and social links"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone">
                  <TextInput value={form.phone} onChange={set("phone")} placeholder="+251..." />
                </Field>
                <Field label="Email" error={errors.email}>
                  <TextInput
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="club@example.com"
                    error={errors.email}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Official Website" error={errors.website}>
                    <TextInput
                      value={form.website}
                      onChange={set("website")}
                      placeholder="https://..."
                      error={errors.website}
                    />
                  </Field>
                </div>
                <Field label="Facebook" error={errors.facebook}>
                  <TextInput
                    value={form.facebook}
                    onChange={set("facebook")}
                    placeholder="https://facebook.com/..."
                    error={errors.facebook}
                  />
                </Field>
                <Field label="Telegram" error={errors.telegram}>
                  <TextInput
                    value={form.telegram}
                    onChange={set("telegram")}
                    placeholder="https://t.me/..."
                    error={errors.telegram}
                  />
                </Field>
                <Field label="Instagram" error={errors.instagram}>
                  <TextInput
                    value={form.instagram}
                    onChange={set("instagram")}
                    placeholder="https://instagram.com/..."
                    error={errors.instagram}
                  />
                </Field>
              </div>
            </CollapsibleSection>

            {/* Competition & Settings */}
            <CollapsibleSection
              title="Competition & Settings"
              subtitle="Optional league assignment"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="League / Competition">
                    <Select value={String(form.competitionId || "")} onChange={set("competitionId")}>
                      <option value="">— None —</option>
                      {competitions.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </CollapsibleSection>
          </>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/teams")}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Team"}
          </Button>
        </div>
      </form>
    </div>
  );
}
