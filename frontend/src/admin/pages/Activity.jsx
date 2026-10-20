import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api.js";
import DataTable from "../components/DataTable.jsx";
import { Badge, PageHeader } from "../components/ui.jsx";
import { Eye, ShieldCheck, Pencil, Trash2, Clock, FileText } from "lucide-react";

const ACTION_ICONS = {
  create: { icon: Pencil, color: "green" },
  update: { icon: Pencil, color: "slate" },
  delete: { icon: Trash2, color: "red" },
  login: { icon: ShieldCheck, color: "blue" },
  publish: { icon: Eye, color: "green" },
  unpublish: { icon: Eye, color: "yellow" },
};

function ActionBadge({ action }) {
  const info = ACTION_ICONS[action] || { icon: FileText, color: "slate" };
  const Icon = info.icon;
  return <Badge color={info.color}><Icon className="w-3 h-3 mr-1" />{action}</Badge>;
}

function buildQuery(page, limit) {
  const sp = new URLSearchParams();
  sp.set("page", page);
  sp.set("limit", limit);
  return sp.toString();
}

export default function Activity() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/activity?${buildQuery(page, limit)}`)
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: "action", header: "Action", render: (a) => <ActionBadge action={a.action} /> },
    { key: "entity", header: "Entity" },
    { key: "entityId", header: "ID" },
    {
      key: "user",
      header: "User",
      render: (a) => {
        const u = a.user;
        return u ? (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#16A34A]/20 flex items-center justify-center text-[10px] font-semibold text-[#22C55E]">
              {u.username?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="text-sm text-[var(--color-text)]">{u.username || u.email}</span>
          </span>
        ) : (
          <span className="text-sm text-[#94A3B8]">—</span>
        );
      },
    },
    { key: "createdAt", header: "Time", render: (a) => (
      <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <Clock className="w-3 h-3" />
        {new Date(a.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </span>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Recent actions across the admin panel"
      />
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        page={page}
        pages={Math.ceil(total / limit)}
        total={total}
        onPageChange={setPage}
        emptyText="No activity recorded yet"
        rowKey={(r) => r.id}
      />
    </div>
  );
}
