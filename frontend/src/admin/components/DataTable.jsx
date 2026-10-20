import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Inbox,
  Loader2,
} from "lucide-react";
import { TextInput, Select } from "./ui.jsx";

export default function DataTable({
  columns,
  rows = [],
  loading = false,
  error = null,
  page,
  pages,
  total,
  onPageChange,
  emptyText = "No records found",
  rowKey = (r) => r.id,
  onRowClick,
  selectable = false,
  selectedIds = new Set(),
  onToggle,
  onSelectAll,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const activePage = page ?? currentPage;
  const changePage = (p) => {
    if (p < 1 || p > (pages ?? 1)) return;
    if (onPageChange) onPageChange(p);
    else setCurrentPage(p);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm text-[#64748B]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
        <p className="text-[#EF4444] text-sm">Failed to load data</p>
        <p className="text-xs text-[#94A3B8] break-all">{error}</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Inbox className="w-10 h-10 text-[#CBD5E1]" />
        <p className="text-sm text-[#64748B]">{emptyText}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide whitespace-nowrap ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.checkbox ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.size === rows.length && rows.length > 0}
                        onChange={onSelectAll}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-[#16A34A] rounded border-[#CBD5E1] accent-[#16A34A]"
                      />
                    ) : (
                      <>
                        {col.header}
                        {col.sortable && <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />}
                      </>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-[var(--color-border)] last:border-0 hover:bg-black/[0.02] transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[var(--color-text)] ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {col.checkbox ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rowKey(row))}
                        onChange={() => onToggle?.(rowKey(row))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-[#16A34A] rounded border-[#CBD5E1] accent-[#16A34A]"
                      />
                    ) : col.render ? (
                      col.render(row)
                    ) : (
                      String(row[col.key] ?? "—")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-[#64748B]">
          <span>
            Page {activePage} of {pages} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(activePage - 1)}
              disabled={activePage <= 1}
              className="p-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] disabled:opacity-30 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => changePage(activePage + 1)}
              disabled={activePage >= pages}
              className="p-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] disabled:opacity-30 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar({ children }) {
  return <div className="flex flex-col md:flex-row gap-3 mb-4">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
      <TextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

export function FilterSelect({ value, onChange, options, allLabel = "All", placeholderOption = false }) {
  return (
    <Select value={value} onChange={onChange} className="md:w-44">
      {placeholderOption && (
        <option value="" disabled>
          {value || "Filter..."}
        </option>
      )}
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
