import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Shield, CheckSquare } from "lucide-react";
import { userService } from "../../services/userService.js";
import DataTable, { SearchInput, FilterSelect, FilterBar } from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { Field, TextInput, Select, Badge, Button, PageHeader } from "../components/ui.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import ExcelActions from "../components/ExcelActions.jsx";
import ExcelImportModal from "../components/ExcelImportModal.jsx";

const ROLE_COLORS = { SUPER_ADMIN: "purple", EDITOR: "green" };
const STATUS_COLORS = { ACTIVE: "green", SUSPENDED: "yellow" };

const EMPTY_FORM = { name: "", email: "", password: "", role: "EDITOR", status: "ACTIVE" };

export default function Users() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const isSuper = me?.role === "SUPER_ADMIN";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await userService.list({ page: pagination.page, limit: pagination.limit, search, role });
      setRows(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, role]);

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
    const available = rows.filter((r) => isSuper || r.id !== me?.id);
    if (selected.size === available.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map((r) => r.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, status: u.status });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "A valid email is required";
    if (!editing && (!form.password || form.password.length < 8)) errs.password = "Password must be at least 8 characters";
    if (editing && form.password && form.password.length < 8) errs.password = "Password must be at least 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (editing) {
        await userService.update(editing.id, form);
        toast("User updated");
      } else {
        await userService.create(form);
        toast("User created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userService.remove(deleteTarget.id);
      toast("User deleted");
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
    if (selected.has(me?.id)) {
      toast("You cannot delete your own account", "error");
      return;
    }
    setDeleting(true);
    try {
      const res = await userService.removeMany([...selected]);
      toast(`Deleted ${res.deleted} user${res.deleted !== 1 ? "s" : ""}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const handleExport = () => window.open(`/api/users/export`, "_blank");
  const handleDownloadTemplate = () => window.open(`/api/users/template`, "_blank");
  const handleImportOpen = () => setImportOpen(true);


  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage admin accounts and roles"
        actions={
          <>
            <ExcelActions
              plural="users"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            {isSuper && (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" /> Add User
              </Button>
            )}
          </>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." />
        <FilterSelect
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={["SUPER_ADMIN", "EDITOR"].map((r) => ({ value: r, label: r }))}
          allLabel="All Roles"
        />
        {!isSuper && <span className="text-xs text-[#94A3B8] inline-flex items-center">Only SUPER_ADMIN can manage users</span>}
      </FilterBar>

      {selected.size > 0 && isSuper && (
        <div className="flex items-center gap-3 px-5 py-3 mb-4 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span className="text-sm font-medium text-[var(--color-text)]">{selected.size} selected</span>
          <Button type="button" size="sm" variant="ghost" onClick={clearSelection} className="text-[#64748B] hover:text-[var(--color-text)] text-xs">
            Clear
          </Button>
          <div className="flex-1" />
          <Button type="button" size="sm" onClick={handleBulkDelete} loading={deleting} className="bg-[#EF4444] hover:bg-[#DC2626] text-white">
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size} Users
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
        emptyText="No users found"
        selectable={isSuper}
        selectedIds={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        columns={[
          { key: "select", checkbox: isSuper },
          {
            key: "name",
            header: "User",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[var(--color-green-dim)] text-[#22C55E] flex items-center justify-center text-sm font-semibold uppercase shrink-0">
                  {r.name.charAt(0)}
                </span>
                <div>
                  <div className="text-[var(--color-text)] font-medium">
                    {r.name}
                    {r.id === me?.id && <span className="text-[#94A3B8] text-xs ml-2">(you)</span>}
                  </div>
                  <div className="text-xs text-[#64748B]">{r.email}</div>
                </div>
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            render: (r) => (
              <Badge color={ROLE_COLORS[r.role]}>
                {r.role === "SUPER_ADMIN" ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {r.role}
              </Badge>
            ),
          },
          { key: "status", header: "Status", render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
          {
            key: "lastLoginAt",
            header: "Last Login",
            render: (r) => <span className="text-[#64748B] text-xs">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString("en-GB") : "Never"}</span>,
          },
          {
            key: "createdAt",
            header: "Created",
            render: (r) => <span className="text-[#64748B] text-xs">{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>,
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {(isSuper || r.id === me?.id) && (
                  <button
                    onClick={() => openEdit(r)}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-black/[0.04] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {isSuper && r.id !== me?.id && (
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-black/[0.04] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit User — ${editing.name}` : "Add User"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} type="submit">
              {saving ? "Saving..." : editing ? "Save Changes" : "Create User"}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Field label="Full Name" required error={errors.name}>
              <TextInput value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} error={errors.name} />
            </Field>
          </div>
          <div>
            <Field label="Email" required error={errors.email}>
              <TextInput type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} error={errors.email} />
            </Field>
          </div>
          <div>
            <Field label={editing ? "New Password" : "Password"} required={!editing} error={errors.password} hint={editing ? "leave blank to keep current" : undefined}>
              <TextInput
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                error={errors.password}
                placeholder="min. 8 characters"
              />
            </Field>
          </div>
          {(isSuper && editing) ? (
            <>
              <div>
                <Field label="Role">
                  <Select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
                    <option value="EDITOR">EDITOR</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </Select>
                </Field>
              </div>
              <div>
                <Field label="Status">
                  <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </Select>
                </Field>
              </div>
            </>
          ) : (
            !editing && (
              <div>
                <Field label="Role">
                  <Select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
                    <option value="EDITOR">EDITOR</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </Select>
                </Field>
              </div>
            )
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete User?"
        message={deleteTarget ? `This will permanently delete "${deleteTarget.name}" (${deleteTarget.email}).` : ""}
      />
      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="User"
        plural="users"
        onDownloadTemplate={handleDownloadTemplate}
      />

    </div>
  );
}
