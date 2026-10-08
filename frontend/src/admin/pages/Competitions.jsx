import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, CheckSquare } from "lucide-react";
import { competitionService } from "../../services/competitionService.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Badge, PageHeader } from "../components/ui.jsx";
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

    </div>
  );
}
