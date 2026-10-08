import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";
import Spinner from "./Spinner.jsx";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-[var(--color-text)] bg-black/[0.04] hover:bg-black/[0.08] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              danger ? "bg-[#DC2626] hover:bg-[#EF4444]" : "bg-[#16A34A] hover:bg-[#22C55E]"
            }`}
          >
            {loading ? <Spinner className="w-4 h-4" /> : confirmText}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            danger ? "bg-[#DC2626]/10 text-[#EF4444]" : "bg-[#16A34A]/10 text-[#22C55E]"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-[#64748B] leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
