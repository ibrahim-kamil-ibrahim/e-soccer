import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, CheckSquare } from "lucide-react";
import { teamService } from "../../services/teamService.js";
import { competitionService } from "../../services/competitionService.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Badge, Button, PageHeader } from "../components/ui.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUS_COLORS = { PUBLISHED: "green", DRAFT: "yellow", ARCHIVED: "slate" };

export default function Teams() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("all");
  const [division, setDivision] = useState("all");
  const [city, setCity] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teamRes, compRes] = await Promise.all([
        teamService.list({
          page: pagination.page,
          limit: pagination.limit,
          search,
          competition: competitionFilter,
          division,
          city,
        }),
        competitionService.list({ limit: 100 }),
      ]);
      setRows(teamRes.items);
      setPagination(teamRes.pagination);
      setCompetitions(compRes.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, competitionFilter, division, city]);

  useEffect(() => {
    load();
  }, [load]);

  const divisions = [...new Set(rows.filter((r) => r.division).map((r) => r.division))];
  const cities = [...new Set(rows.filter((r) => r.city).map((r) => r.city))];

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
      await teamService.remove(deleteTarget.id);
      toast("Team deleted");
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
      const res = await teamService.removeMany([...selected]);
      toast(`Deleted ${res.deleted} team${res.deleted !== 1 ? "s" : ""}${res.skipped > 0 ? `, ${res.skipped} skipped (has players/matches)` : ""}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const handleExport = () => window.open(`/api/teams/export`, "_blank");
  const handleDownloadTemplate = () => window.open(`/api/teams/template`, "_blank");
  const handleImportOpen = () => setImportOpen(true);


  return (
    <div>
      <PageHeader
        title="Teams"
        description="Manage all football teams"
        actions={
          <>
            <ExcelActions
              plural="teams"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <Link
              to="/admin/teams/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Team
            </Link>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams..." />
        <FilterSelect
          value={competitionFilter}
          onChange={(e) => setCompetitionFilter(e.target.value)}
          options={competitions.map((c) => ({ value: String(c.id), label: c.name }))}
          allLabel="All Competitions"
        />
        <FilterSelect
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          options={divisions.map((d) => ({ value: d, label: d }))}
          allLabel="All Divisions"
        />
        <FilterSelect
          value={city}
          onChange={(e) => setCity(e.target.value)}
          options={cities.map((c) => ({ value: c, label: c }))}
          allLabel="All Cities"
        />
      </FilterBar>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 mb-4 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span className="text-sm font-medium text-[var(--color-text)]">
            {selected.size} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            className="text-[#64748B] hover:text-[var(--color-text)] text-xs"
          >
            Clear
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            size="sm"
            onClick={handleBulkDelete}
            loading={deleting}
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Teams
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
        emptyText="No teams found"
        selectable
        selectedIds={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: true },
          {
            key: "name",
            header: "Team",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="text-lg">{r.logo || "🛡️"}</span>
                <div className="min-w-0">
                  <div className="text-[var(--color-text)] font-medium truncate">{r.name}</div>
                  <div className="text-xs text-[#64748B]">{r.shortName || r.city || ""}</div>
                </div>
              </div>
            ),
          },
          {
            key: "competition",
            header: "Competition",
            render: (r) => <span className="text-[#64748B] text-xs">{r.competition?.name || "—"}</span>,
          },
          { key: "division", header: "Division", render: (r) => <span className="text-[#64748B] text-xs">{r.division || "—"}</span> },
          { key: "city", header: "City", render: (r) => <span className="text-[#64748B] text-xs">{r.city}</span> },
          { key: "position", header: "Pos", render: (r) => <span className="text-[#64748B]">{r.position ?? "—"}</span> },
          {
            key: "status",
            header: "Status",
            render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge>,
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/teams/${r.id}`)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(`/admin/teams/${r.id}/edit`)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(r)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-black/[0.04] transition-colors"
                  title="Delete"
                >
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
        title="Delete Team?"
        message={
          deleteTarget
            ? `This will delete "${deleteTarget.name}". Teams with players or matches cannot be deleted.`
            : ""
        }
      />
      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="Team"
        plural="teams"
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
