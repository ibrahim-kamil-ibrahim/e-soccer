import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { matchService } from "../../services/matchService.js";
import { competitionService } from "../../services/competitionService.js";
import { teamService } from "../../services/teamService.js";
import { Field, TextInput, Select, Button, PageHeader, Badge } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUSES = ["UPCOMING", "LIVE", "FT", "POSTPONED", "CANCELLED"];
const EVENT_TYPES = ["GOAL", "OWN_GOAL", "PENALTY", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"];
const SIDES = ["HOME", "AWAY"];
const TAB_COLORS = { GOAL: "green", OWN_GOAL: "yellow", PENALTY: "blue", YELLOW_CARD: "yellow", RED_CARD: "red", SUBSTITUTION: "purple" };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM = {
  competitionId: "",
  season: "2025-26",
  division: "",
  homeTeamId: "",
  awayTeamId: "",
  homeScore: "",
  awayScore: "",
  status: "UPCOMING",
  minute: "",
  date: todayStr(),
  time: "15:00",
  venue: "",
  referee: "",
  attendance: "",
};

export default function MatchForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [events, setEvents] = useState([]);
  const [lineups, setLineups] = useState([
    { side: "HOME", formation: "4-3-3", startingXI: "", substitutes: "" },
    { side: "AWAY", formation: "4-2-3-1", startingXI: "", substitutes: "" },
  ]);
  const [stats, setStats] = useState({
    possession: "", shots: "", shotsOnTarget: "", corners: "", fouls: "", offside: "", saves: "", yellowCards: "", redCards: "", passes: "",
  });
  const [competitions, setCompetitions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      competitionService.list({ limit: 100 }),
      teamService.list({ limit: 200 }),
    ])
      .then(([c, t]) => {
        setCompetitions(c.items);
        setTeams(t.items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    matchService
      .get(id)
      .then((res) => {
        const m = res.match;
        setForm({
          competitionId: m.competitionId || "",
          season: m.season || "2025-26",
          division: m.division || "",
          homeTeamId: m.homeTeamId || "",
          awayTeamId: m.awayTeamId || "",
          homeScore: m.homeScore ?? "",
          awayScore: m.awayScore ?? "",
          status: m.status || "UPCOMING",
          minute: m.minute ?? "",
          date: m.date ? m.date.slice(0, 10) : todayStr(),
          time: m.timeField || "15:00",
          venue: m.venue || "",
          referee: m.referee || "",
          attendance: m.attendance ?? "",
        });
        setEvents(
          (m.events || []).map((e) => ({
            type: e.type,
            side: e.side,
            minute: e.minute ?? "",
            playerName: e.playerName || "",
            assist: e.assist || "",
            playerIn: e.playerIn || "",
            playerOut: e.playerOut || "",
          }))
        );
        if (m.lineups?.length) {
          setLineups(
            m.lineups.map((l) => ({
              side: l.side,
              formation: l.formation || "",
              startingXI: (l.startingXI || []).join(", "),
              substitutes: (l.substitutes || []).join(", "),
            }))
          );
        }
        if (m.statistics) {
          const s = m.statistics;
          setStats({
            possession: s.possession ?? "", shots: s.shots ?? "", shotsOnTarget: s.shotsOnTarget ?? "",
            corners: s.corners ?? "", fouls: s.fouls ?? "", offside: s.offside ?? "", saves: s.saves ?? "",
            yellowCards: s.yellowCards ?? "", redCards: s.redCards ?? "", passes: s.passes ?? "",
          });
        }
      })
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const addEvent = () => {
    setEvents((prev) => [...prev, { type: "GOAL", side: "HOME", minute: "", playerName: "", assist: "", playerIn: "", playerOut: "" }]);
  };
  const updateEvent = (i, key, value) => {
    setEvents((prev) => prev.map((e, idx) => (idx === i ? { ...e, [key]: value } : e)));
  };
  const removeEvent = (i) => setEvents((prev) => prev.filter((_, idx) => idx !== i));

  const setLineup = (side, key, value) => {
    setLineups((prev) => prev.map((l) => (l.side === side ? { ...l, [key]: value } : l)));
  };

  const setStat = (key) => (e) => setStats((prev) => ({ ...prev, [key]: e.target.value }));

  const buildPayload = () => {
    const toArray = (v) => (typeof v === "string" && v.trim() ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined);
    const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    return {
      ...form,
      competitionId: form.competitionId ? Number(form.competitionId) : null,
      homeTeamId: Number(form.homeTeamId),
      awayTeamId: Number(form.awayTeamId),
      homeScore: numOrNull(form.homeScore),
      awayScore: numOrNull(form.awayScore),
      minute: numOrNull(form.minute),
      attendance: numOrNull(form.attendance),
      events: events.map((e) => ({
        type: e.type,
        side: e.side,
        minute: numOrNull(e.minute),
        playerName: e.playerName || null,
        assist: e.assist || null,
        playerIn: e.playerIn || null,
        playerOut: e.playerOut || null,
      })),
      lineups: lineups.map((l) => ({
        side: l.side,
        formation: l.formation || null,
        startingXI: toArray(l.startingXI),
        substitutes: toArray(l.substitutes),
      })),
      statistics: {
        possession: numOrNull(stats.possession),
        shots: numOrNull(stats.shots),
        shotsOnTarget: numOrNull(stats.shotsOnTarget),
        corners: numOrNull(stats.corners),
        fouls: numOrNull(stats.fouls),
        offside: numOrNull(stats.offside),
        saves: numOrNull(stats.saves),
        yellowCards: numOrNull(stats.yellowCards),
        redCards: numOrNull(stats.redCards),
        passes: numOrNull(stats.passes),
      },
    };
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!form.homeTeamId) errs.homeTeamId = "Home team is required";
    if (!form.awayTeamId) errs.awayTeamId = "Away team is required";
    if (form.homeTeamId && form.awayTeamId && form.homeTeamId === form.awayTeamId) {
      errs.homeTeamId = "Home and away teams must be different";
      errs.awayTeamId = "Home and away teams must be different";
    }
    if (!form.date) errs.date = "Date is required";
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTab("basic");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await matchService.update(id, payload);
        toast("Match updated successfully");
      } else {
        await matchService.create(payload);
        toast("Match created successfully");
      }
      navigate("/admin/matches");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-96 bg-white border border-[var(--color-border)] rounded-xl animate-pulse" />;
  }

  const teamName = (teamId, side) => {
    const t = teams.find((x) => String(x.id) === String(teamId));
    return t ? `${t.logo || ""} ${t.shortName || t.name}` : (side === "HOME" ? "Home" : "Away");
  };

  const tabs = [
    { key: "basic", label: "Basic Info" },
    { key: "events", label: `Events (${events.length})` },
    { key: "lineups", label: "Lineups" },
    { key: "stats", label: "Statistics" },
  ];

  return (
    <div>
      <PageHeader
        title={isEdit ? `Edit Match${form.homeTeamId && form.awayTeamId ? `: ${teamName(form.homeTeamId, "HOME")} vs ${teamName(form.awayTeamId, "AWAY")}` : ""}` : "Create Match"}
        description="Set up a match with events, lineups and statistics"
        actions={
          <Button variant="ghost" onClick={() => navigate("/admin/matches")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === t.key ? "bg-[var(--color-green-dim)] text-[#22C55E] border border-[#16A34A]/30" : "text-[#64748B] bg-white border border-[var(--color-border)] hover:text-[var(--color-text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6 max-w-4xl">
          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Field label="Competition">
              <Select value={String(form.competitionId || "")} onChange={set("competitionId")}>
                <option value="">— None —</option>
                {competitions.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Season">
              <TextInput value={form.season} onChange={set("season")} />
            </Field>
            <Field label="Division">
              <TextInput value={form.division} onChange={set("division")} placeholder="e.g. Premier League" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date" required error={errors.date}>
              <TextInput type="date" value={form.date} onChange={set("date")} error={errors.date} />
            </Field>
            <Field label="Kickoff Time">
              <TextInput type="time" value={form.time} onChange={set("time")} />
            </Field>
            <Field label="Venue">
              <TextInput value={form.venue} onChange={set("venue")} placeholder="e.g. Dire Dawa Stadium" />
            </Field>
            <Field label="Referee">
              <TextInput value={form.referee} onChange={set("referee")} />
            </Field>
            <Field label="Attendance">
              <TextInput type="number" value={form.attendance} onChange={set("attendance")} />
            </Field>
            {form.status === "LIVE" && (
              <Field label="Current Minute">
                <TextInput type="number" value={form.minute} onChange={set("minute")} />
              </Field>
            )}
          </div>

          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Teams</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Field label="Home Team" required error={errors.homeTeamId}>
              <Select value={String(form.homeTeamId || "")} onChange={set("homeTeamId")} error={errors.homeTeamId}>
                <option value="">— Select Home Team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.logo} {t.shortName || t.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Away Team" required error={errors.awayTeamId}>
              <Select value={String(form.awayTeamId || "")} onChange={set("awayTeamId")} error={errors.awayTeamId}>
                <option value="">— Select Away Team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.logo} {t.shortName || t.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Score</h3>
          <div className="grid grid-cols-2 gap-4 mb-6 max-w-xs">
            <Field label="Home Score">
              <TextInput type="number" min="0" value={form.homeScore} onChange={set("homeScore")} placeholder="null" />
            </Field>
            <Field label="Away Score">
              <TextInput type="number" min="0" value={form.awayScore} onChange={set("awayScore")} placeholder="null" />
            </Field>
          </div>
          {form.homeTeamId && form.awayTeamId && form.homeTeamId === form.awayTeamId && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/25 text-[#F87171] text-sm">
              Home and away teams cannot be the same team.
            </div>
          )}
        </div>
      )}

      {tab === "events" && (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Match Events</h3>
            <Button variant="outline" onClick={addEvent}>
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          </div>
          {events.length === 0 && (
            <div className="py-10 text-center text-sm text-[#94A3B8]">No events yet. Add goals, cards or substitutions.</div>
          )}
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-3 p-3 rounded-lg bg-[var(--color-surface-dim)] border border-[var(--color-border)]">
                <Select value={e.type} onChange={(ev) => updateEvent(i, "type", ev.target.value)} className="md:w-40">
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
                <Select value={e.side} onChange={(ev) => updateEvent(i, "side", ev.target.value)} className="md:w-24">
                  {SIDES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                <TextInput type="number" value={e.minute} onChange={(ev) => updateEvent(i, "minute", ev.target.value)} placeholder="Min" className="md:w-24" />
                <TextInput
                  value={e.playerName}
                  onChange={(ev) => updateEvent(i, "playerName", ev.target.value)}
                  placeholder="Player name"
                  className="md:flex-1"
                />
                {e.type === "SUBSTITUTION" && (
                  <>
                    <TextInput value={e.playerIn} onChange={(ev) => updateEvent(i, "playerIn", ev.target.value)} placeholder="Player IN" className="md:flex-1" />
                    <TextInput value={e.playerOut} onChange={(ev) => updateEvent(i, "playerOut", ev.target.value)} placeholder="Player OUT" className="md:flex-1" />
                  </>
                )}
                {(e.type === "GOAL" || e.type === "PENALTY" || e.type === "OWN_GOAL") && (
                  <TextInput value={e.assist} onChange={(ev) => updateEvent(i, "assist", ev.target.value)} placeholder="Assist" className="md:flex-1" />
                )}
                <button
                  onClick={() => removeEvent(i)}
                  className="p-2 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-black/[0.04] transition-colors self-center"
                  aria-label="Remove event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "lineups" && (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6 max-w-4xl">
          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Starting Lineups</h3>
          <div className="space-y-6">
            {lineups.map((l) => (
              <div key={l.side} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge color={l.side === "HOME" ? "green" : "blue"}>{l.side === "HOME" ? "HOME" : "AWAY"}</Badge>
                  <span className="text-sm text-[var(--color-text)]">{l.side === "HOME" && form.homeTeamId ? teamName(form.homeTeamId, "HOME") : l.side === "AWAY" && form.awayTeamId ? teamName(form.awayTeamId, "AWAY") : l.side}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Formation">
                    <TextInput value={l.formation} onChange={(e) => setLineup(l.side, "formation", e.target.value)} placeholder="4-3-3" />
                  </Field>
                  <Field label="Starting XI" hint="comma separated">
                    <TextInput value={l.startingXI} onChange={(e) => setLineup(l.side, "startingXI", e.target.value)} placeholder="Player 1, Player 2" className="md:col-span-1" />
                  </Field>
                  <Field label="Substitutes" hint="comma separated">
                    <TextInput value={l.substitutes} onChange={(e) => setLineup(l.side, "substitutes", e.target.value)} placeholder="Player 12, Player 14" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sm:p-6 max-w-4xl">
          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Match Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries({
              possession: "Possession %",
              shots: "Shots",
              shotsOnTarget: "Shots on Target",
              corners: "Corners",
              fouls: "Fouls",
              offside: "Offsides",
              saves: "Saves",
              yellowCards: "Yellow Cards",
              redCards: "Red Cards",
              passes: "Passes",
            }).map(([key, label]) => (
              <Field key={key} label={label}>
                <TextInput type="number" value={stats[key]} onChange={setStat(key)} />
              </Field>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 sticky bottom-4">
        <Button variant="ghost" onClick={() => navigate("/admin/matches")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={saving}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Match"}
        </Button>
      </div>
    </div>
  );
}
