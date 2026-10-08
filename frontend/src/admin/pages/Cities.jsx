import { useCallback, useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, MapPin, Upload, X, Check, CheckSquare } from "lucide-react";
import { cityService } from "../../services/cityService.js";
import { api } from "../../services/api.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Field, TextInput, TextArea, Select, Button, PageHeader, Badge } from "../components/ui.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";

const STATUS_COLORS = { PUBLISHED: "green", DRAFT: "yellow", ARCHIVED: "slate" };

const REGIONS = [
  "Addis Ababa", "Dire Dawa", "Oromia", "Amhara", "Tigray", "Somali", "Afar",
  "Harari", "Sidama", "Central Ethiopia", "South Ethiopia", "Southwest Ethiopia",
  "Benishangul-Gumuz", "Gambela",
];

const CITY_TYPES = ["Regional City", "Zone City", "Chartered City", "Town"];

const STEPS = [
  { key: "basic", label: "Basic Information", num: 1 },
  { key: "hierarchy", label: "Location Hierarchy", num: 2 },
  { key: "details", label: "Details", num: 3 },
  { key: "settings", label: "Status & Settings", num: 4 },
];

const EMPTY_FORM = {
  name: "", slug: "", region: "", cityType: "Regional City", subcity: "", woreda: "",
  kebele: "", logo: "", description: "", latitude: "", longitude: "", isFeatured: false,
  status: "PUBLISHED", sortOrder: 0,
};

function LogoUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { setPreview(value || ""); }, [value]);

  const handleFile = async (file) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return alert("Only JPEG, PNG, WebP, GIF allowed");
    if (file.size > 2 * 1024 * 1024) return alert("Image must be under 2MB");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "CITY_LOGO");
      const res = await api.post("/media", fd);
      const url = res.media?.url || res.url;
      if (url) { setPreview(url); onChange(url); }
    } catch (e) { alert("Upload failed: " + e.message); } finally { setUploading(false); }
  };

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]); };
  const onFileChange = (e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };

  const remove = () => { setPreview(""); onChange(""); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <div className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors ${dragOver ? "border-[#16A34A] bg-[#16A34A]/5" : "border-[var(--color-border)]"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
      onClick={() => { if (!preview) inputRef.current?.click(); }}>
      {preview ? (
        <div className="relative w-full h-36 flex items-center justify-center bg-black/[0.02]">
          <img src={preview} alt="City logo" className="max-h-32 max-w-[80%] object-contain" />
          <button type="button" onClick={(e) => { e.stopPropagation(); remove(); }} className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-[#EF4444] text-white rounded-full flex items-center justify-center"><X size={12} /></button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <div className="w-10 h-10 rounded-full bg-[var(--color-green-dim)] flex items-center justify-center">
            {uploading ? <div className="w-4 h-4 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} className="text-[#16A34A]" />}
          </div>
          <div className="text-center pointer-events-none">
            <span className="text-sm font-medium text-[#16A34A]">Click to upload</span>
            <span className="text-xs text-[#94A3B8] block">or drag and drop</span>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFileChange} className="hidden" />
    </div>
  );
}

function StepIndicator({ steps, current, onStepClick }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1">
          <button type="button" onClick={() => onStepClick(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              i === current ? "bg-[#16A34A] text-white shadow-sm" : i < current ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-black/[0.04] text-[#94A3B8] hover:bg-black/[0.06]"
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < current ? "bg-[#16A34A] text-white" : i === current ? "bg-white/20" : "bg-black/[0.06]"}`}>
              {i < current ? <Check size={12} /> : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
          {i < steps.length - 1 && <div className={`flex-1 h-px mx-1 ${i < current ? "bg-[#16A34A]/40" : "bg-black/[0.08]"}`} />}
        </div>
      ))}
    </div>
  );
}

function StepBasic({ form, setForm, errors }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Field label="City Name" required error={errors.name}>
          <TextInput value={form.name} onChange={set("name")} placeholder="e.g. Dire Dawa" error={errors.name} />
        </Field>
      </div>
      <Field label="Slug" hint="Auto-generated from name">
        <TextInput value={form.slug} onChange={set("slug")} placeholder="dire-dawa" />
      </Field>
      <Field label="Region / Administrative Area" required error={errors.region}>
        <Select value={form.region} onChange={set("region")}>
          <option value="">— Select Region —</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="City Type" required>
          <Select value={form.cityType} onChange={set("cityType")}>
            {CITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
    </div>
  );
}

function StepHierarchy({ form, setForm, allCities }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const uniqueSubcities = [...new Set(allCities.filter((c) => c.region === form.region && c.subcity).map((c) => c.subcity))];
  const filteredWoredas = [...new Set(allCities.filter((c) => { if (c.region !== form.region) return false; if (form.subcity && c.subcity !== form.subcity) return false; return c.woreda; }).map((c) => c.woreda))];
  const filteredKebeles = [...new Set(allCities.filter((c) => { if (c.region !== form.region) return false; if (form.subcity && c.subcity !== form.subcity) return false; if (form.woreda && c.woreda !== form.woreda) return false; return c.kebele; }).map((c) => c.kebele))];

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-green-dim)] rounded-lg p-4 mb-4">
        <p className="text-xs text-[#64748B]"><span className="font-semibold text-[#16A34A]">Hierarchy:</span> Region → City → Sub-city → Woreda → Kebele</p>
        <p className="text-xs text-[#94A3B8] mt-1">Fill only the levels that apply. Leave blank to skip.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Sub-city">
          <TextInput value={form.subcity} onChange={set("subcity")} placeholder="e.g. Kezira" />
          {uniqueSubcities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {uniqueSubcities.slice(0, 6).map((s) => (
                <button key={s} type="button" onClick={() => setForm((p) => ({ ...p, subcity: s }))}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-black/[0.04] text-[#64748B] hover:bg-[#16A34A]/10 hover:text-[#16A34A] transition-colors">{s}</button>
              ))}
            </div>
          )}
        </Field>
        <Field label="Woreda">
          <TextInput value={form.woreda} onChange={set("woreda")} placeholder="e.g. Woreda 01" />
          {filteredWoredas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {filteredWoredas.slice(0, 6).map((w) => (
                <button key={w} type="button" onClick={() => setForm((p) => ({ ...p, woreda: w }))}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-black/[0.04] text-[#64748B] hover:bg-[#16A34A]/10 hover:text-[#16A34A] transition-colors">{w}</button>
              ))}
            </div>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Kebele">
            <TextInput value={form.kebele} onChange={set("kebele")} placeholder="e.g. Kebele 05" />
            {filteredKebeles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filteredKebeles.slice(0, 8).map((k) => (
                  <button key={k} type="button" onClick={() => setForm((p) => ({ ...p, kebele: k }))}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-black/[0.04] text-[#64748B] hover:bg-[#16A34A]/10 hover:text-[#16A34A] transition-colors">{k}</button>
                ))}
              </div>
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}

function StepDetails({ form, setForm }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <LogoUpload value={form.logo} onChange={(v) => setForm((p) => ({ ...p, logo: v }))} />
      </div>
      <div className="sm:col-span-2">
        <Field label="Description" hint="Brief description about the city">
          <TextArea value={form.description} onChange={set("description")} placeholder="Tell us about this city..." rows={3} />
        </Field>
      </div>
      <Field label="Latitude">
        <TextInput type="number" step="any" value={form.latitude} onChange={set("latitude")} placeholder="e.g. 9.5939" />
      </Field>
      <Field label="Longitude">
        <TextInput type="number" step="any" value={form.longitude} onChange={set("longitude")} placeholder="e.g. 41.8529" />
      </Field>
    </div>
  );
}

function StepSettings({ form, setForm }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Status">
        <Select value={form.status} onChange={set("status")}>
          <option value="PUBLISHED">Active</option>
          <option value="DRAFT">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </Field>
      <Field label="Display Order">
        <TextInput type="number" value={form.sortOrder} onChange={set("sortOrder")} placeholder="0" />
      </Field>
      <div className="sm:col-span-2">
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--color-border)] hover:bg-black/[0.02] transition-colors">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))} className="w-4 h-4 rounded border-[var(--color-border)] accent-[#16A34A]" />
          <div>
            <span className="text-sm font-medium text-[var(--color-text)]">Featured City</span>
            <span className="text-xs text-[#94A3B8] block">Highlight this city on the homepage</span>
          </div>
        </label>
      </div>
    </div>
  );
}

export default function Cities() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const handleExport = () => window.open(`/api/cities/export`, "_blank");
  const handleDownloadTemplate = () => window.open(`/api/cities/template`, "_blank");
  const handleImportOpen = () => setImportOpen(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, allRes] = await Promise.all([
        cityService.list({ page: pagination.page, limit: pagination.limit, search, region: regionFilter, cityType: typeFilter }),
        cityService.all(),
      ]);
      setRows(res.items);
      setPagination(res.pagination);
      setAllCities(allRes.items || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [pagination.page, search, regionFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const regions = [...new Set(rows.map((r) => r.region))];
  const cityTypes = [...new Set(rows.map((r) => r.cityType).filter(Boolean))];

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const openCreate = () => {
    setEditingCity(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setStep(0);
    setShowForm(true);
  };

  const openEdit = (city) => {
    setEditingCity(city);
    setForm({
      name: city.name || "", slug: city.slug || "", region: city.region || "", cityType: city.cityType || "Regional City",
      subcity: city.subcity || "", woreda: city.woreda || "", kebele: city.kebele || "", logo: city.logo || "",
      description: city.description || "", latitude: city.latitude ?? "", longitude: city.longitude ?? "",
      isFeatured: city.isFeatured || false, status: city.status || "PUBLISHED", sortOrder: city.sortOrder || 0,
    });
    setFormErrors({});
    setStep(0);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingCity(null); setFormErrors({}); setStep(0); };

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!form.name.trim()) errs.name = "City name is required";
      if (!form.region) errs.region = "Region is required";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSave = async () => {
    if (!validateStep(step)) return;
    setSaving(true);
    try {
      if (editingCity) {
        await cityService.update(editingCity.id, form);
        toast("City updated");
      } else {
        await cityService.create(form);
        toast("City created");
      }
      closeForm();
      load();
    } catch (err) { toast(err.message, "error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await cityService.remove(deleteTarget.id);
      toast("City deleted");
      setDeleteTarget(null);
      load();
    } catch (err) { toast(err.message, "error"); } finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await cityService.removeMany([...selected]);
      toast(`Deleted ${res.deleted} city${res.deleted !== 1 ? "es" : ""}`);
      setSelected(new Set());
      load();
    } catch (err) { toast(err.message, "error"); } finally { setDeleting(false); }
  };

  const stepComponents = [
    <StepBasic key="basic" form={form} setForm={setForm} errors={formErrors} />,
    <StepHierarchy key="hierarchy" form={form} setForm={setForm} allCities={allCities} />,
    <StepDetails key="details" form={form} setForm={setForm} />,
    <StepSettings key="settings" form={form} setForm={setForm} />,
  ];

  return (
    <div>
      <PageHeader
        title="Cities & Regions"
        description="Manage the Ethiopian administrative hierarchy for teams"
        actions={
          <>
            <ExcelActions
              plural="cities"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add City
            </button>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cities..." />
        <FilterSelect value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} options={regions.map((r) => ({ value: r, label: r }))} allLabel="All Regions" />
        <FilterSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={cityTypes.map((t) => ({ value: t, label: t }))} allLabel="All Types" />
      </FilterBar>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 mb-4 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span className="text-sm font-medium text-[var(--color-text)]">{selected.size} selected</span>
          <Button type="button" size="sm" variant="ghost" onClick={clearSelection} className="text-[#64748B] hover:text-[var(--color-text)] text-xs">
            Clear
          </Button>
          <div className="flex-1" />
          <Button type="button" size="sm" onClick={handleBulkDelete} loading={deleting} className="bg-[#EF4444] hover:bg-[#DC2626] text-white">
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Cities
          </Button>
        </div>
      )}

      <DataTable
        loading={loading} error={error} rows={rows}
        page={pagination.page} pages={pagination.pages} total={pagination.total}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        emptyText="No cities found"
        selectable
        selectedIds={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: true },
          {
            key: "name", header: "City",
            render: (r) => (
              <div className="flex items-center gap-3">
                {r.logo ? (
                  <img src={r.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-green-dim)] flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#16A34A]" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[var(--color-text)] font-medium truncate">{r.name}</div>
                  <div className="text-xs text-[#94A3B8]">{r.cityType || ""}</div>
                </div>
              </div>
            ),
          },
          { key: "region", header: "Region", render: (r) => <span className="text-[#64748B] text-xs">{r.region}</span> },
          {
            key: "hierarchy", header: "Hierarchy",
            render: (r) => (
              <div className="text-xs text-[#94A3B8] truncate max-w-[180px]">
                {[r.subcity, r.woreda, r.kebele].filter(Boolean).join(" → ") || "—"}
              </div>
            ),
          },
          { key: "status", header: "Status", render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
          {
            key: "actions", header: "Actions", align: "right",
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-black/[0.04] transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">{editingCity ? "Edit City" : "Add City"}</h2>
            <StepIndicator steps={STEPS} current={step} onStepClick={(i) => { if (i < step || validateStep(step)) setStep(i); }} />
            {stepComponents[step]}
            <div className="flex justify-between gap-3 mt-8 pt-4 border-t border-[var(--color-border)]">
              <div>{step > 0 && <Button type="button" variant="ghost" onClick={prevStep}>Back</Button>}</div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={nextStep}>Next Step</Button>
                ) : (
                  <Button onClick={handleSave} loading={saving}>{saving ? "Saving..." : editingCity ? "Update City" : "Create City"}</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete City?"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? Teams using this city will keep it.` : ""}
      />
      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="City"
        plural="cities"
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
