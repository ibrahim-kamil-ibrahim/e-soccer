import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, CheckSquare, Play } from "lucide-react";
import { matchService } from "../../services/matchService.js";
import MatchControlModal from "./MatchControlModal.jsx";
import { competitionService } from "../../services/competitionService.js";
import { teamService } from "../../services/teamService.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Badge, Button, PageHeader } from "../components/ui.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUS_COLORS = { LIVE: "green", SCHEDULED: "blue", FINISHED: "slate", POSTPONED: "yellow", CANCELLED: "red" };

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// `timeField` is authoritative, but fixtures saved without the time input have
// null there while `date` still holds the real kickoff instant.
function kickoffOf(r) {
  if (r?.timeField) return r.timeField;
  if (!r?.date) return "";
  return new Date(r.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function roundOf(r) {
  return r?.round || (r?.roundNumber ? `Round ${r.roundNumber}` : "");
}

export default function Matches() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [compFilter, setCompFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [controlId, setControlId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sort, setSort] = useState("all");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const handleExport = () => window.open(`/api/matches/export`, "_blank");
  const handleDownloadTemplate = () => window.open(`/api/matches/template`, "_blank");
  const handleImportOpen = () => setImportOpen(true);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(""); }
    try {
      const [matchRes, compRes, teamRes] = await Promise.all([
        matchService.list({ page: pagination.page, limit: pagination.limit, search, competition: compFilter, status, date, team: teamFilter, sort }),
        competitionService.list({ limit: 100 }),
        teamService.list({ limit: 200 }),
      ]);
      setRows(matchRes.items);
      setPagination(matchRes.pagination);
      setCompetitions(compRes.items);
      setTeams(teamRes.items);
    } catch (err) { if (!quiet) setError(err.message); } finally { if (!quiet) setLoading(false); }
  }, [pagination.page, search, compFilter, status, date, teamFilter, sort]);

  useEffect(() => { load(); }, [load]);

  // keep the table current while a match is actually running
  const hasLive = rows.some((r) => r.status === "LIVE");
  useEffect(() => {
    if (!hasLive) return;
    const iv = setInterval(() => load(true), 30000);
    return () => clearInterval(iv);
  }, [hasLive, load]);

  const toggle = (id) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next); };
  const selectAll = () => { if (selected.size === rows.length) setSelected(new Set()); else setSelected(new Set(rows.map((r) => r.id))); };
  const clearSelection = () => setSelected(new Set());

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await matchService.remove(deleteTarget.id); toast("Match deleted"); setDeleteTarget(null); load(); }
    catch (err) { toast(err.message, "error"); } finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await matchService.removeMany([...selected]);
      toast(`Deleted ${res.deleted} match${res.deleted !== 1 ? "es" : ""}`);
      setSelected(new Set()); load();
    } catch (err) { toast(err.message, "error"); } finally { setDeleting(false); }
  };

  const handleBulkStatus = async () => {
    if (selected.size === 0 || !bulkStatus) return;
    setBulkBusy(true);
    let ok = 0;
    const failures = [];
    for (const id of selected) {
      try {
        await matchService.update(id, { status: bulkStatus });
        ok++;
      } catch (err) {
        const row = rows.find((r) => r.id === id);
        failures.push(`#${id} ${row ? `${row.homeTeam?.shortName || row.homeTeam?.name || "?"} vs ${row.awayTeam?.shortName || row.awayTeam?.name || "?"}` : ""}: ${err.message}`);
      }
    }
    setBulkBusy(false);
    if (failures.length === 0) toast(`Set ${ok} match${ok !== 1 ? "es" : ""} to ${bulkStatus}`);
    else toast(`${ok} updated, ${failures.length} failed — ${failures[0]}`, "error");
    setBulkStatus("");
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <PageHeader
        title="Matches"
        description="Manage all football matches"
        actions={
          <>
            <ExcelActions plural="matches" onImport={handleImportOpen} onExport={handleExport} onDownloadTemplate={handleDownloadTemplate} />
            <Link to="/admin/matches/create" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Match
            </Link>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search venue or referee..." />
        <FilterSelect value={compFilter} onChange={(e) => setCompFilter(e.target.value)} options={competitions.map((c) => ({ value: String(c.id), label: c.name }))} allLabel="All Competitions" />
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)} options={["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"].map((s) => ({ value: s, label: s }))} allLabel="All Statuses" />
        <FilterSelect value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} options={teams.map((t) => ({ value: String(t.id), label: t.shortName || t.name }))} allLabel="All Teams" />
        <div className="relative">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full md:w-40 bg-white border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[#16A34A]/60" />
        </div>
        <FilterSelect
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          allLabel="Newest first"
          options={[
            { value: "date", label: "Oldest first" },
            { value: "competition", label: "By competition" },
            { value: "venue", label: "By venue" },
          ]}
        />
      </FilterBar>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 mb-4 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span className="text-sm font-medium text-[var(--color-text)]">{selected.size} selected</span>
          <Button type="button" size="sm" variant="ghost" onClick={clearSelection} className="text-[#64748B] hover:text-[var(--color-text)] text-xs">Clear</Button>
          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              aria-label="Set status for selected matches"
              className="bg-white border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[#16A34A]/60"
            >
              <option value="">Set status…</option>
              {["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={handleBulkStatus} disabled={!bulkStatus} loading={bulkBusy}>Apply</Button>
          </div>
          <div className="flex-1" />
          <Button type="button" size="sm" onClick={handleBulkDelete} loading={deleting} className="bg-[#EF4444] hover:bg-[#DC2626] text-white">
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Matches
          </Button>
        </div>
      )}

      <DataTable
        loading={loading} error={error} rows={rows}
        page={pagination.page} pages={pagination.pages} total={pagination.total}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        emptyText="No matches found"
        selectable selectedIds={selected} onToggle={toggle} onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: true },
          { key: "date", header: "Date", render: (r) => (
            <span className="text-[#64748B] text-xs whitespace-nowrap">
              {formatDate(r.date)}
              {kickoffOf(r) && <span className="block text-[10px] text-[#94A3B8] font-mono">{kickoffOf(r)}</span>}
            </span>
          ) },
          { key: "competition", header: "Competition", render: (r) => <span className="text-[#64748B] text-xs">{r.competition?.name || "—"}</span> },
          { key: "round", header: "Round", render: (r) => <span className="text-[#64748B] text-xs whitespace-nowrap">{roundOf(r) || "—"}</span> },
          { key: "home", header: "Home", render: (r) => <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text)] max-w-[140px] truncate"><span>{r.homeTeam?.logo || "⚽"}</span>{r.homeTeam?.shortName || r.homeTeam?.name || "—"}</span> },
          { key: "score", header: "Score", align: "right", render: (r) => <span className="inline-block min-w-[52px] text-right text-[var(--color-text)] font-semibold">{r.homeScore ?? "-"} : {r.awayScore ?? "-"}</span> },
          { key: "away", header: "Away", align: "right", render: (r) => <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text)] justify-end ml-auto max-w-[140px] truncate">{r.awayTeam?.shortName || r.awayTeam?.name || "—"}<span>{r.awayTeam?.logo || "⚽"}</span></span> },
          { key: "status", header: "Status", render: (r) => <div className="flex items-center gap-1.5"><Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge>{r.minute ? <span className="text-xs text-[#64748B]">{r.minute}'</span> : null}</div> },
          { key: "venue", header: "Venue", render: (r) => <span className="text-[#64748B] text-xs max-w-[120px] truncate block">{r.venue || "—"}</span> },
          { key: "actions", header: "Actions", align: "right", render: (r) => (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setControlId(r.id)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors" title="Start / control match"><Play className="w-4 h-4" /></button>
              <button onClick={() => navigate(`/match/${r.id}`)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors" title="View"><Eye className="w-4 h-4" /></button>
              <button onClick={() => navigate(`/admin/matches/${r.id}/edit`)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-black/[0.04] transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) },
        ]}
      />

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} title="Delete Match?" message={deleteTarget ? "This will permanently delete this match including all its events, lineups and statistics." : ""} />
      <ExcelImportModal open={importOpen} onClose={() => setImportOpen(false)} entity="Match" plural="matches" onDownloadTemplate={handleDownloadTemplate} />
      <MatchControlModal
        matchId={controlId}
        open={!!controlId}
        onClose={() => setControlId(null)}
        onChanged={() => load()}
      />
    </div>
  );
}
