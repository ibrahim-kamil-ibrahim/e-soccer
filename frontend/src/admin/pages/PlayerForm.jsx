import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Check } from "lucide-react";
import { playerService } from "../../services/playerService.js";
import { teamService } from "../../services/teamService.js";
import { cityService } from "../../services/cityService.js";
import { api } from "../../services/api.js";
import { Field, TextInput, TextArea, Select, Button, PageHeader } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const POSITIONS = ["GK", "CB", "LB", "RB", "CM", "AM", "LW", "RW", "ST"];
const PREFERRED_FOOT = ["Right", "Left", "Both"];
const PLAYER_STATUSES = ["Active", "Injured", "Retired"];

const STEPS = [
  { key: "basic", label: "Basic Information", num: 1 },
  { key: "football", label: "Football Info", num: 2 },
  { key: "extra", label: "Additional & Stats", num: 3 },
  { key: "stats", label: "Statistics", num: 4 },
  { key: "settings", label: "Settings", num: 5 },
];

const EMPTY_FORM = {
  name: "",
  slug: "",
  dateOfBirth: "",
  nationality: "Ethiopia",
  city: "",
  teamId: "",
  position: "ST",
  jerseyNumber: "",
  preferredFoot: "Right",
  playerStatus: "Active",
  matches: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  biography: "",
  height: "",
  weight: "",
  instagram: "",
  isFeatured: false,
  status: "PUBLISHED",
  photo: "",
};

function PhotoUpload({ value, onChange, fullBody }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { setPreview(value || ""); }, [value]);

  const handleFile = async (file) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return alert("Only JPEG, PNG, WebP allowed");
    if (file.size > 3 * 1024 * 1024) return alert("Image must be under 3MB");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "PLAYER_PHOTO");
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
        <div className={`relative w-full ${fullBody ? "h-64" : "h-48"} flex items-center justify-center bg-black/[0.02] overflow-hidden`}>
          <img src={preview} alt="Player photo" className={`${fullBody ? "w-full h-full object-cover" : "max-h-44 max-w-[80%] object-contain rounded-lg"}`} />
          <button type="button" onClick={(e) => { e.stopPropagation(); remove(); }} className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-[#EF4444] text-white rounded-full flex items-center justify-center"><X size={14} /></button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <div className={`w-14 h-14 rounded-${fullBody ? "lg" : "full"} bg-[var(--color-green-dim)] flex items-center justify-center`}>
            {uploading ? <div className="w-5 h-5 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" /> : <Upload size={22} className="text-[#16A34A]" />}
          </div>
          <div className="text-center pointer-events-none">
            <span className="text-sm font-medium text-[#16A34A]">Click to upload</span>
            <span className="text-xs text-[#94A3B8] block">or drag and drop</span>
          </div>
          <span className="text-[10px] text-[#94A3B8] pointer-events-none">JPG, PNG, WebP up to 3MB{fullBody ? " — Full body shot" : ""}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="hidden" />
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

function StepBasic({ form, setForm, errors, cities }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const uniqueRegions = [...new Set(cities.map((c) => c.region).filter(Boolean))];
  const filteredCities = form.nationality === "Ethiopia"
    ? cities.filter((c) => !form.region || c.region === form.region)
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <PhotoUpload value={form.photo} onChange={(v) => setForm((p) => ({ ...p, photo: v }))} fullBody />
      </div>
      <div className="sm:col-span-2">
        <Field label="Full Name" required error={errors.name}>
          <TextInput value={form.name} onChange={set("name")} placeholder="e.g. Musa Ahmed" error={errors.name} />
        </Field>
      </div>
      <Field label="Date of Birth">
        <TextInput type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
      </Field>
      <Field label="Nationality">
        <TextInput value={form.nationality} onChange={set("nationality")} placeholder="e.g. Ethiopia" />
      </Field>
      {form.nationality === "Ethiopia" && (
        <>
          <Field label="Region">
            <Select value={form.region || ""} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value, city: "" }))}>
              <option value="">— Any —</option>
              {uniqueRegions.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="City">
            <Select value={form.city} onChange={set("city")}>
              <option value="">— Select City —</option>
              {filteredCities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </Field>
        </>
      )}
      {form.nationality !== "Ethiopia" && (
        <div className="sm:col-span-2">
          <Field label="City">
            <TextInput value={form.city} onChange={set("city")} placeholder="City of origin" />
          </Field>
        </div>
      )}
    </div>
  );
}

function StepFootball({ form, setForm, errors, teams }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Field label="Team / Club" required error={errors.teamId}>
          <Select value={String(form.teamId || "")} onChange={set("teamId")}>
            <option value="">— Select Team —</option>
            {teams.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.shortName || t.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Position" required>
        <Select value={form.position} onChange={set("position")}>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
      </Field>
      <Field label="Jersey Number">
        <TextInput type="number" value={form.jerseyNumber} onChange={set("jerseyNumber")} placeholder="e.g. 10" />
      </Field>
      <Field label="Preferred Foot">
        <Select value={form.preferredFoot} onChange={set("preferredFoot")}>
          {PREFERRED_FOOT.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
      </Field>
      <Field label="Player Status">
        <Select value={form.playerStatus} onChange={set("playerStatus")}>
          {PLAYER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
    </div>
  );
}

function StepExtra({ form, setForm }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Physical</p>
      </div>
      <Field label="Height">
        <TextInput value={form.height} onChange={set("height")} placeholder="e.g. 178cm" />
      </Field>
      <Field label="Weight (kg)">
        <TextInput type="number" value={form.weight} onChange={set("weight")} placeholder="e.g. 72" />
      </Field>
      <div className="sm:col-span-2">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1 mt-2">Social</p>
      </div>
      <div className="sm:col-span-2">
        <Field label="Instagram">
          <TextInput value={form.instagram} onChange={set("instagram")} placeholder="Instagram profile URL" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1 mt-2">Biography</p>
      </div>
      <div className="sm:col-span-2">
        <Field label="Biography" hint="Tell us about this player">
          <TextArea value={form.biography} onChange={set("biography")} placeholder="Player biography..." rows={3} />
        </Field>
      </div>
    </div>
  );
}

function StepStats({ form, setForm }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-green-dim)] rounded-lg p-4">
        <p className="text-xs text-[#64748B]">
          <span className="font-semibold text-[#16A34A]">Note:</span> Statistics can be updated later from the admin dashboard after matches are played.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Matches">
          <TextInput type="number" value={form.matches} onChange={set("matches")} />
        </Field>
        <Field label="Goals">
          <TextInput type="number" value={form.goals} onChange={set("goals")} />
        </Field>
        <Field label="Assists">
          <TextInput type="number" value={form.assists} onChange={set("assists")} />
        </Field>
        <Field label="Yellow Cards">
          <TextInput type="number" value={form.yellowCards} onChange={set("yellowCards")} />
        </Field>
        <Field label="Red Cards">
          <TextInput type="number" value={form.redCards} onChange={set("redCards")} />
        </Field>
      </div>
    </div>
  );
}

function StepSettings({ form, setForm }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Status">
        <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
          <option value="PUBLISHED">Active</option>
          <option value="DRAFT">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </Field>
      <div />
      <div className="sm:col-span-2">
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--color-border)] hover:bg-black/[0.02] transition-colors">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
            className="w-4 h-4 rounded border-[var(--color-border)] accent-[#16A34A]" />
          <div>
            <span className="text-sm font-medium text-[var(--color-text)]">Featured Player</span>
            <span className="text-xs text-[#94A3B8] block">Highlight on the homepage</span>
          </div>
        </label>
      </div>
    </div>
  );
}

export default function PlayerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [teams, setTeams] = useState([]);
  const [cities, setCities] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    teamService.list({ limit: 200 }).then((res) => setTeams(res.items || [])).catch(() => {});
    cityService.all().then((res) => setCities(res.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    playerService.get(id).then((res) => {
      const p = res.player;
      setForm({
        name: p.name || "",
        slug: p.slug || "",
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
        nationality: p.nationality || "Ethiopia",
        city: p.city || "",
        teamId: p.teamId || "",
        position: p.position || "ST",
        jerseyNumber: p.jerseyNumber ?? "",
        preferredFoot: p.preferredFoot || "Right",
        playerStatus: p.playerStatus || "Active",
        matches: p.matches ?? 0,
        goals: p.goals ?? 0,
        assists: p.assists ?? 0,
        yellowCards: p.yellowCards ?? 0,
        redCards: p.redCards ?? 0,
        biography: p.biography || "",
        height: p.height || "",
        weight: p.weight ?? "",
        instagram: p.instagram || "",
        isFeatured: p.isFeatured || false,
        status: p.status || "PUBLISHED",
        photo: p.photo || "",
      });
    }).catch((err) => toast(err.message, "error")).finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  useEffect(() => {
    if (isEdit || !form.name) return;
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setForm((p) => ({ ...p, slug }));
  }, [form.name, isEdit]);

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!form.name.trim()) errs.name = "Full name is required";
    }
    if (s === 1) {
      if (!form.teamId) errs.teamId = "Please select a team";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setSaving(true);
    try {
      const payload = { ...form, teamId: Number(form.teamId) };
      if (isEdit) {
        await playerService.update(id, payload);
        toast("Player updated");
      } else {
        await playerService.create(payload);
        toast("Player created");
      }
      navigate("/admin/players");
    } catch (err) { toast(err.message, "error"); } finally { setSaving(false); }
  };

  if (loading) return <div className="h-96 bg-white border border-[var(--color-border)] rounded-xl animate-pulse" />;

  const stepComponents = [
    <StepBasic key="basic" form={form} setForm={setForm} errors={errors} cities={cities} />,
    <StepFootball key="football" form={form} setForm={setForm} errors={errors} teams={teams} />,
    <StepExtra key="extra" form={form} setForm={setForm} />,
    <StepStats key="stats" form={form} setForm={setForm} />,
    <StepSettings key="settings" form={form} setForm={setForm} />,
  ];

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Player" : "Create Player"}
        description={isEdit ? "Update player details" : "Add a new player to a team"}
        actions={<Button variant="ghost" onClick={() => navigate("/admin/players")}><ArrowLeft className="w-4 h-4" /> Back</Button>}
      />

      <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6 max-w-4xl">
        <StepIndicator steps={STEPS} current={step} onStepClick={(i) => { if (i < step || validateStep(step)) setStep(i); }} />

        {stepComponents[step]}

        <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-[var(--color-border)]">
          <div>{step > 0 && <Button type="button" variant="ghost" onClick={prevStep}>Back</Button>}</div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/admin/players")}>Cancel</Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>Next Step</Button>
            ) : (
              <Button type="button" onClick={handleSubmit} loading={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Create Player"}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
