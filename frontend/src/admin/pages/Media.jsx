import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Trash2, Copy } from "lucide-react";
import { mediaService } from "../../services/mediaService.js";
import DataTable, { FilterSelect, FilterBar } from "../components/DataTable.jsx";
import { Badge, Button, PageHeader } from "../components/ui.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";

const CATEGORIES = [
  "TEAM_LOGO",
  "PLAYER_PHOTO",
  "NEWS_COVER",
  "COMPETITION_LOGO",
  "HOMEPAGE",
  "OTHER",
];

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Media() {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [uploadCategory, setUploadCategory] = useState("OTHER");
  const [uploading, setUploading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await mediaService.list({ page: pagination.page, limit: pagination.limit, category });
      setRows(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, category]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const res = await mediaService.upload(file, uploadCategory);
      toast(`Uploaded "${res.media.filename}"`);
      setCategory("all");
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await mediaService.remove(deleteTarget.id);
      toast("Media deleted");
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
      await mediaService.removeMany([...selected]);
      toast(`Deleted ${selected.size} item${selected.size !== 1 ? "s" : ""}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

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

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast("URL copied to clipboard");
    } catch {
      toast("Could not copy URL", "error");
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const handleExport = () => window.open(`/api/media/export`, "_blank");
  const handleDownloadTemplate = () => window.open(`/api/media/template`, "_blank");
  const handleImportOpen = () => setImportOpen(true);


  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Upload and manage images used across the site"
        actions={
          <>
            <ExcelActions
              plural="media"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="bg-white border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[#16A34A]/60"
              >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />
            <Button onClick={() => fileRef.current?.click()} loading={uploading}>
              {uploading ? "Uploading..." : (<><Upload className="w-4 h-4" /> Upload Image</>)}
            </Button>
          </div>
          </>
        }
      />

      <FilterBar>
        <FilterSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          allLabel="All Categories"
        />
        <span className="text-xs text-[#94A3B8] inline-flex items-center">
          {pagination.total} item{pagination.total === 1 ? "" : "s"} · 5MB max
        </span>
      </FilterBar>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 mb-4 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg">
          <Trash2 className="w-4 h-4 text-[#16A34A] shrink-0" />
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
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Items
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
        emptyText="No media uploaded yet"
        selectable
        selectedIds={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: true },
          {
            key: "preview",
            header: "Preview",
            render: (r) => (
              <img
                src={r.url}
                alt={r.filename}
                className="w-12 h-12 rounded-lg object-cover bg-[var(--color-surface-dim)] border border-[var(--color-border)]"
              />
            ),
          },
          {
            key: "filename",
            header: "File",
            render: (r) => (
              <div>
                <div className="text-[var(--color-text)] text-sm max-w-[240px] truncate">{r.filename}</div>
                <code className="text-[11px] text-[#94A3B8]">{r.url}</code>
              </div>
            ),
          },
          {
            key: "dimensions",
            header: "Dimensions",
            render: (r) => <span className="text-[#64748B] text-xs">{r.width && r.height ? `${r.width} × ${r.height}` : "—"}</span>,
          },
          { key: "mime", header: "Type", render: (r) => <Badge color="slate">{r.mimeType}</Badge> },
          { key: "size", header: "Size", render: (r) => <span className="text-[#64748B] text-xs">{formatSize(r.size)}</span> },
          { key: "category", header: "Category", render: (r) => <Badge color="blue">{r.category}</Badge> },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => copyUrl(r.url)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" />
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
        title="Delete Media?"
        message={deleteTarget ? `This will permanently delete "${deleteTarget.filename}" and its file.` : ""}
      />

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="Media"
        plural="media"
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
