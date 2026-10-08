import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { settingsService } from "../../services/settingsService.js";
import { Field, TextInput, TextArea, Checkbox, Button, PageHeader } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">{title}</h3>
      <p className="text-xs text-[#64748B] mb-5">{description}</p>
      {children}
    </div>
  );
}

const EMPTY = {
  general: { siteName: "", siteDescription: "", logo: "", favicon: "" },
  branding: { primaryColor: "#16A34A", secondaryColor: "#ffffff" },
  social: { facebook: "", telegram: "", instagram: "", x: "", youtube: "" },
  contact: { email: "", phone: "", address: "" },
  notifications: { enabled: true, matchNotifications: true, newsNotifications: true },
};

export default function Settings() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService
      .get()
      .then((res) => {
        const s = res.settings;
        setForm({
          general: { ...EMPTY.general, ...(s.general || {}) },
          branding: { ...EMPTY.branding, ...(s.branding || {}) },
          social: { ...EMPTY.social, ...(s.social || {}) },
          contact: { ...EMPTY.contact, ...(s.contact || {}) },
          notifications: { ...EMPTY.notifications, ...(s.notifications || {}) },
        });
      })
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const setGeneral = (key) => (e) => setForm((p) => ({ ...p, general: { ...p.general, [key]: e.target.value } }));
  const setBranding = (key) => (e) => setForm((p) => ({ ...p, branding: { ...p.branding, [key]: e.target.value } }));
  const setSocial = (key) => (e) => setForm((p) => ({ ...p, social: { ...p.social, [key]: e.target.value } }));
  const setContact = (key) => (e) => setForm((p) => ({ ...p, contact: { ...p.contact, [key]: e.target.value } }));
  const setNotification = (key) => (e) => setForm((p) => ({ ...p, notifications: { ...p.notifications, [key]: e.target.checked } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.update(form);
      toast("Settings saved successfully");
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
    <form onSubmit={handleSave}>
      <PageHeader
        title="Website Settings"
        description="Global site settings"
        actions={
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      />

      <div className="space-y-6 max-w-4xl">
        <SectionCard title="General" description="Site identity and branding basics">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Site Name">
                <TextInput value={form.general.siteName} onChange={setGeneral("siteName")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Site Description">
                <TextInput value={form.general.siteDescription} onChange={setGeneral("siteDescription")} />
              </Field>
            </div>
            <Field label="Logo URL">
              <TextInput value={form.general.logo} onChange={setGeneral("logo")} placeholder="/uploads/logo.png" />
            </Field>
            <Field label="Favicon URL">
              <TextInput value={form.general.favicon} onChange={setGeneral("favicon")} placeholder="/uploads/favicon.png" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Branding" description="Colors used across the site">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Primary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.branding.primaryColor}
                  onChange={setBranding("primaryColor")}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border border-[var(--color-border)]"
                />
                <TextInput value={form.branding.primaryColor} onChange={setBranding("primaryColor")} className="font-mono" />
              </div>
            </Field>
            <Field label="Secondary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.branding.secondaryColor}
                  onChange={setBranding("secondaryColor")}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border border-[var(--color-border)]"
                />
                <TextInput value={form.branding.secondaryColor} onChange={setBranding("secondaryColor")} className="font-mono" />
              </div>
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Social Links" description="Social media profiles">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Facebook"><TextInput value={form.social.facebook} onChange={setSocial("facebook")} /></Field>
            <Field label="Telegram"><TextInput value={form.social.telegram} onChange={setSocial("telegram")} /></Field>
            <Field label="Instagram"><TextInput value={form.social.instagram} onChange={setSocial("instagram")} /></Field>
            <Field label="X (Twitter)"><TextInput value={form.social.x} onChange={setSocial("x")} /></Field>
            <Field label="YouTube"><TextInput value={form.social.youtube} onChange={setSocial("youtube")} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Contact" description="Contact details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Email"><TextInput type="email" value={form.contact.email} onChange={setContact("email")} /></Field>
            <Field label="Phone"><TextInput value={form.contact.phone} onChange={setContact("phone")} /></Field>
            <Field label="Address"><TextInput value={form.contact.address} onChange={setContact("address")} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Notifications" description="Notification preferences">
          <div className="flex flex-col gap-3">
            <Checkbox label="Enable notifications" checked={form.notifications.enabled} onChange={setNotification("enabled")} />
            <Checkbox label="Match notifications" checked={form.notifications.matchNotifications} onChange={setNotification("matchNotifications")} />
            <Checkbox label="News notifications" checked={form.notifications.newsNotifications} onChange={setNotification("newsNotifications")} />
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
