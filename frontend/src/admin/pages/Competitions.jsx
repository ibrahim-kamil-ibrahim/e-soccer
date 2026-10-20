import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, CheckSquare, Swords } from "lucide-react";
import { competitionService } from "../../services/competitionService.js";
import { teamService } from "../../services/teamService.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Badge, Button, PageHeader, Field, TextInput, Select } from "../components/ui.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";

const STATUS_COLORS = { PUBLISHED: "green", DRAFT: "yellow", ARCHIVED: "slate" };

export default function Competitions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [type, setType] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await competitionService.list({
        page: pagination.page,
        limit: pagination.limit,
        search,
        region,
        type,
      });
      setRows(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, region, type]);

  useEffect(() => {
    load();
  }, [load]);

  const regions = [...new Set(rows.map((r) => r.region))];
  const types = [...new Set(rows.map((r) => r.type).filter(Boolean))];

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await competitionService.remove(deleteTarget.id);
      toast("Competition deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await competitionService.removeMany([...selected]);
      toast(`Deleted ${res.deleted} competition${res.deleted !== 1 ? "s" : ""}${res.skipped > 0 ? `, ${res.skipped} skipped (has teams/matches)` : ""}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const handleExport = () => window.open(`/api/competitions/export`, "_blank");
  const handleDownloadTemplate = () => window.open(`/api/competitions/template`, "_blank");
  const handleImportOpen = () => setImportOpen(true);

  const [bracketTarget, setBracketTarget] = useState(null);
  const [bracketTeams, setBracketTeams] = useState([]);
  // Ordered seed slots the admin fills in by hand; `null` means an explicit bye.
  const [bracketSeeds, setBracketSeeds] = useState([]);
  const [bracketDate, setBracketDate] = useState("");
  const [bracketLoading, setBracketLoading] = useState(false);
  const [bracketSaving, setBracketSaving] = useState(false);
  const [bracketError, setBracketError] = useState("");
  const [bracketConflict, setBracketConflict] = useState(false);
  // Stored draw for this competition, when one exists; lets the admin edit it.
  const [bracketExisting, setBracketExisting] = useState(null);

  const openBracketModal = async (comp) => {
    setBracketTarget(comp);
    setBracketError("");
    setBracketConflict(false);
    setBracketDate("");
    setBracketLoading(true);
    try {
      const res = await teamService.list({ limit: 1000 });
      // Compare numerically: a string id here silently empties the whole draw.
      const inComp = (res.items || []).filter((t) => Number(t.competitionId) === Number(comp.id));
      setBracketTeams(inComp);

      let existing = null;
      try {
        existing = (await competitionService.bracket(comp.id))?.bracket ?? null;
      } catch {
        existing = null;
      }
      setBracketExisting(existing);

      // Keep the existing kickoff when editing; otherwise a replace moves every fixture to today.
      const firstDate = existing?.rounds?.[0]?.matches?.find((m) => m.date)?.date;
      setBracketDate(firstDate ? String(firstDate).slice(0, 10) : "");

      // Editing keeps the stored seed order; a fresh draw starts from the team list.
      const stored = Array.isArray(existing?.seeds) && existing.seeds.length ? existing.seeds : null;
      const initial = (stored ?? inComp.map((t) => t.id)).slice();
      // A draw needs at least two positions, so always open with 2+ slots.
      while (initial.length < 2) initial.push(null);
      setBracketSeeds(initial);
    } catch (err) {
      setBracketError(err.message);
      setBracketTeams([]);
      setBracketSeeds([]);
      setBracketExisting(null);
    } finally {
      setBracketLoading(false);
    }
  };

  const nextPow2 = (n) => { let p = 1; while (p < n) p *= 2; return p; };
  const filledSeeds = bracketSeeds.filter((id) => id !== null);

  const setSeed = (index, value) => setBracketSeeds((prev) => prev.map((s, i) => (i === index ? value : s)));
  const addSeed = () => setBracketSeeds((prev) => [...prev, null]);
  const removeSeed = (index) => setBracketSeeds((prev) => prev.filter((_, i) => i !== index));
  const clearSeeds = () => setBracketSeeds([]);
  const autoFillSeeds = () => {
    setBracketSeeds((prev) => {
      const used = new Set(prev.filter(Boolean));
      const pool = bracketTeams.filter((t) => !used.has(t.id)).map((t) => t.id);
      const next = [...prev];
      let p = 0;
      for (let i = 0; i < next.length && p < pool.length; i++) if (next[i] === null) next[i] = pool[p++];
      while (p < pool.length) next.push(pool[p++]);
      return next;
    });
  };

  // Round 1 pairs slot 1 v 2, 3 v 4, ... so the admin can see the draw before generating.
  const drawSize = Math.max(nextPow2(bracketSeeds.length), 2);
  const paddedSeeds = [...bracketSeeds, ...Array(Math.max(0, drawSize - bracketSeeds.length)).fill(null)];
  const matchups = [];
  for (let i = 0; i < paddedSeeds.length; i += 2) matchups.push([paddedSeeds[i] ?? null, paddedSeeds[i + 1] ?? null]);
  const teamName = (id) => {
    const t = bracketTeams.find((x) => x.id === id);
    return t ? `${t.logo ? `${t.logo} ` : ""}${t.shortName || t.name}` : "Bye";
  };

  const handleGenerateBracket = async (reset = false) => {
    if (!bracketTarget) return;
    if (filledSeeds.length < 2) {
      setBracketError("Fill in at least 2 seed positions to build a bracket.");
      return;
    }
    setBracketSaving(true);
    setBracketError("");
    try {
      await competitionService.generateBracket(bracketTarget.id, {
        teamIds: bracketSeeds,
        date: bracketDate || new Date().toISOString(),
        reset,
      });
      toast(`Bracket generated for "${bracketTarget.name}"`);
      setBracketTarget(null);
    } catch (err) {
      if (err.status === 409 && !reset) {
        setBracketConflict(true);
        setBracketError("A bracket already exists for this competition.");
      } else {
        setBracketError(err.message);
      }
    } finally {
      setBracketSaving(false);
    }
  };


  return (
    <div>
      <PageHeader
        title="Competitions"
        description="Manage all football competitions"
        actions={
          <>
            <ExcelActions
              plural="competitions"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <Link
              to="/admin/competitions/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Competition
            </Link>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search competitions..." />
        <FilterSelect value={region} onChange={(e) => setRegion(e.target.value)} options={regions.map((r) => ({ value: r, label: r }))} allLabel="All Regions" />
        <FilterSelect value={type} onChange={(e) => setType(e.target.value)} options={types.map((t) => ({ value: t, label: t }))} allLabel="All Types" />
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
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Competitions
          </Button>
        </div>
      )}

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        emptyText="No competitions found"
        selectable
        selectedIds={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: true },
          {
            key: "name",
            header: "Name",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="text-lg">{r.logo || "🏆"}</span>
                <div className="min-w-0">
                  <div className="text-[var(--color-text)] font-medium truncate">{r.name}</div>
                  <div className="text-xs text-[#64748B]">{r.shortName || ""}</div>
                </div>
              </div>
            ),
          },
          { key: "region", header: "Region", render: (r) => <span className="text-[#64748B]">{r.region}</span> },
          { key: "season", header: "Season", render: (r) => <span className="text-[#64748B]">{r.season || "—"}</span> },
          { key: "teams", header: "Teams", render: (r) => <span className="text-[#64748B]">{r._count?.teams ?? "—"}</span> },
          { key: "status", header: "Status", render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openBracketModal(r)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors" title="Generate or edit knockout draw">
                  <Swords className="w-4 h-4" />
                </button>
                <button onClick={() => navigate(`/competitions/${r.id}`)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors" title="View">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => navigate(`/admin/competitions/${r.id}/edit`)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors" title="Edit">
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Competition?"
        message={
          deleteTarget
            ? `This will delete "${deleteTarget.name}" permanently. If it has teams or matches assigned, it cannot be deleted.`
            : ""
        }
      />
      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="Competition"
        plural="competitions"
        onDownloadTemplate={handleDownloadTemplate}
      />

      {bracketTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setBracketTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">{bracketExisting ? "Edit Knockout Draw" : "Set up Knockout Draw"}</h3>
            <p className="text-sm text-[#64748B] mb-4">
              For <span className="font-medium text-[var(--color-text)]">{bracketTarget.name}</span>. Fill the draw below; winners advance automatically and drawn matches go to penalties.
            </p>

            <Field label="First match date">
              <TextInput type="date" value={bracketDate} onChange={(e) => setBracketDate(e.target.value)} />
            </Field>

            <div className="mt-4 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                Draw order ({filledSeeds.length} filled)
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={autoFillSeeds} className="text-xs text-[#16A34A] hover:underline">Auto-fill</button>
                <button type="button" onClick={addSeed} className="text-xs text-[#16A34A] hover:underline">Add slot</button>
                <button type="button" onClick={clearSeeds} className="text-xs text-[#64748B] hover:underline">Clear</button>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8] mb-2">
              Fill the draw position by position. Seed 1 meets seed 2 in round 1, seed 3 meets seed 4, and so on.
              Leave a slot as <span className="font-medium">Bye</span> and its opponent advances without playing.
            </p>

            {bracketLoading ? (
              <div className="py-8 text-center text-sm text-[#94A3B8]">Loading teams...</div>
            ) : bracketTeams.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#94A3B8]">No teams found for this competition.</div>
            ) : (
              <>
                <div className="max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg divide-y divide-black/[0.05]">
                  {bracketSeeds.map((seedId, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="w-14 shrink-0 text-xs text-[#64748B]">Seed {i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <Select value={seedId ?? ""} onChange={(e) => setSeed(i, e.target.value === "" ? null : Number(e.target.value))}>
                          <option value="">— Bye —</option>
                          {bracketTeams.map((t) => (
                            <option key={t.id} value={t.id} disabled={bracketSeeds.some((s, j) => s === t.id && j !== i)}>
                              {t.logo ? `${t.logo} ` : ""}{t.shortName || t.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <button type="button" onClick={() => removeSeed(i)} className="p-1 rounded text-[#94A3B8] hover:text-[#DC2626]" title="Remove slot">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {bracketSeeds.length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-[#94A3B8]">No seed slots.</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={addSeed}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[#16A34A]/40 text-sm text-[#16A34A] hover:bg-[#16A34A]/[0.06] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add another seed
                </button>

                <div className="mt-4 mb-2">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Round 1 preview</span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-[var(--color-border)] rounded-lg divide-y divide-black/[0.05]">
                  {matchups.map(([home, away], i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      <span className="w-14 shrink-0 text-xs text-[#94A3B8]">Match {i + 1}</span>
                      <span className={`flex-1 min-w-0 truncate ${home === null ? "text-[#94A3B8]" : "text-[var(--color-text)]"}`}>{teamName(home)}</span>
                      <span className="text-xs text-[#94A3B8]">vs</span>
                      <span className={`flex-1 min-w-0 truncate text-right ${away === null ? "text-[#94A3B8]" : "text-[var(--color-text)]"}`}>{teamName(away)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {bracketExisting && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-[#F59E0B]/12 border border-[#F59E0B]/30 text-[#92400E] text-sm">
                This competition already has a draw. Updating replaces the fixtures and clears any played results.
              </div>
            )}

            {bracketError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/25 text-[#B91C1C] text-sm">
                {bracketError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <Button type="button" variant="ghost" onClick={() => setBracketTarget(null)}>Cancel</Button>
              {bracketExisting ? (
                <Button type="button" onClick={() => handleGenerateBracket(true)} loading={bracketSaving} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">
                  Replace Draw
                </Button>
              ) : bracketConflict ? (
                <Button type="button" onClick={() => handleGenerateBracket(true)} loading={bracketSaving}>
                  Replace &amp; Generate
                </Button>
              ) : (
                <Button type="button" onClick={() => handleGenerateBracket(false)} loading={bracketSaving}>
                  Generate Bracket
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
