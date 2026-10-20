import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, CheckSquare } from "lucide-react";
import { playerService } from "../../services/playerService.js";
import { teamService } from "../../services/teamService.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Badge, Button, PageHeader } from "../components/ui.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";

const STATUS_COLORS = { PUBLISHED: "green", DRAFT: "yellow", ARCHIVED: "slate" };

export default function Players() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [position, setPosition] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [playerRes, teamRes] = await Promise.all([
        playerService.list({
          page: pagination.page,
          limit: pagination.limit,
          search,
          team: teamFilter,
          position,
        }),
        teamService.list({ limit: 200 }),
      ]);
      setRows(playerRes.items);
      setPagination(playerRes.pagination);
      setTeams(teamRes.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, teamFilter, position]);

  useEffect(() => {
    load();
  }, [load]);

  const positions = [...new Set(rows.filter((r) => r.position).map((r) => r.position))];

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
      await playerService.remove(deleteTarget.id);
      toast("Player deleted");
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
      const res = await playerService.removeMany([...selected]);
      toast(`Deleted ${res.deleted} player${res.deleted !== 1 ? "s" : ""}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const handleExport = () => window.open(`/api/players/export`, "_blank");
  const handleDownloadTemplate = () => window.open(`/api/players/template`, "_blank");
  const handleImportOpen = () => setImportOpen(true);


  return (
    <div>
      <PageHeader
        title="Players"
        description="Manage all players"
        actions={
          <>
            <ExcelActions
              plural="players"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <Link
              to="/admin/players/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Player
            </Link>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players..." />
        <FilterSelect
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          options={teams.map((t) => ({ value: String(t.id), label: t.shortName || t.name }))}
          allLabel="All Teams"
        />
        <FilterSelect
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          options={positions.map((p) => ({ value: p, label: p }))}
          allLabel="All Positions"
        />
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
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Players
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
        emptyText="No players found"
        selectable
        selectedIds={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: true },
          {
            key: "name",
            header: "Player",
            render: (r) => (
              <div className="flex items-center gap-3">
                {r.photo ? (
                  <img src={r.photo} alt={r.name} className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-green)] shrink-0">
                    {r.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <div className="text-[var(--color-text)] font-medium">{r.name}</div>
                  <div className="text-xs text-[#64748B]">{r.position || "—"}</div>
                </div>
              </div>
            ),
          },
          { key: "team", header: "Team", render: (r) => <span className="text-[#64748B] text-xs">{r.team?.shortName || r.team?.name || "—"}</span> },
          { key: "age", header: "Age", render: (r) => <span className="text-[#64748B]">{r.age ?? "—"}</span> },
          { key: "jerseyNumber", header: "#", render: (r) => <span className="text-[#64748B]">{r.jerseyNumber ?? "—"}</span> },
          { key: "goals", header: "Goals", render: (r) => <span className="text-[#22C55E] font-medium">{r.goals ?? 0}</span> },
          { key: "assists", header: "Assists", render: (r) => <span className="text-[#64748B]">{r.assists ?? 0}</span> },
          { key: "status", header: "Status", render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => navigate(`/admin/players/${r.id}`)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors" title="View">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => navigate(`/admin/players/${r.id}/edit`)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors" title="Edit">
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
        title="Delete Player?"
        message={deleteTarget ? `This will delete "${deleteTarget.name}" permanently.` : ""}
      />
      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="Player"
        plural="players"
        onDownloadTemplate={handleDownloadTemplate}
      />

    </div>
  );
}
