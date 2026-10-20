import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, CheckSquare } from "lucide-react";
import { newsService } from "../../services/newsService.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Badge, Button, PageHeader } from "../components/ui.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUS_COLORS = { PUBLISHED: "green", DRAFT: "yellow", ARCHIVED: "slate" };

export default function News() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [importOpen, setImportOpen] = useState(false);

  const handleExport = () => window.open("/api/news/export", "_blank");
  const handleDownloadTemplate = () => window.open("/api/news/template", "_blank");
  const handleImportOpen = () => setImportOpen(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await newsService.list({
        page: pagination.page,
        limit: pagination.limit,
        search,
        status,
      });
      setRows(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const selectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await newsService.remove(deleteTarget.id);
      toast("Article deleted");
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
      const res = await newsService.removeMany([...selected]);
      toast(`Deleted ${res.deleted} article${res.deleted !== 1 ? "s" : ""}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="News Articles"
        description="Manage news, reports and articles"
        actions={
          <>
            <ExcelActions
              plural="news"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <Link
              to="/admin/news/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Article
            </Link>
          </>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
        />
        <FilterSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "PUBLISHED", label: "Published" },
            { value: "DRAFT", label: "Draft" },
            { value: "ARCHIVED", label: "Archived" },
          ]}
          allLabel="All Statuses"
        />
      </FilterBar>

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
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Articles
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
        emptyText="No articles found"
        selectable
        selectedIds={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: true },
          {
            key: "title",
            header: "Title",
            render: (r) => (
              <div className="max-w-[200px] truncate" title={r.title}>
                {r.title || "Untitled"}
              </div>
            ),
          },
          {
            key: "excerpt",
            header: "Excerpt",
            render: (r) => (
              <span className="text-[#64748B] text-xs max-w-[200px] truncate block">
                {r.excerpt || "—"}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <Badge color={STATUS_COLORS[r.status] || "slate"}>{r.status}</Badge>,
          },
          {
            key: "category",
            header: "Category",
            render: (r) => <span className="text-[#64748B] text-xs">{r.category || "—"}</span>,
          },
          {
            key: "createdAt",
            header: "Created",
            render: (r) => (
              <span className="text-[#64748B] text-xs">
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "—"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/admin/news/${r.id}/edit`)}
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
        title="Delete Article?"
        message={
          deleteTarget ? `This will permanently delete "${deleteTarget.title}".` : ""
        }
      />
      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="News Article"
        plural="news"
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
