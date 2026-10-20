import { useState, useRef, useCallback } from "react";
import { FileUp, FileDown, File, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button, Badge } from "./ui.jsx";
import { api } from "../../services/api.js";

export default function ExcelImportModal({ open, onClose, entity, plural, onDownloadTemplate }) {
  const [phase, setPhase] = useState("select"); // select | loading | result
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const inputElRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      alert("Only .xlsx and .xls files are allowed");
      return;
    }
    setFileName(file.name);
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleValidate = async () => {
    if (!selectedFile) return;
    setPhase("loading");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await api.upload(`/${plural}/import`, formData);
      setResult(res);
      setPhase("result");
    } catch (err) {
      alert(err.message || `Import failed: ${err.message}`);
      setPhase("select");
    }
  };

  const handleDownloadErrorReport = () => {
    if (!result?.errors?.length) return;
    const csvRows = [
      ["Row Number", "Errors"],
      ...result.errors.map((e) => [e.row, e.errors.join("; ")]),
    ];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-import-errors.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDone = () => {
    setPhase("select");
    setFileName("");
    setResult(null);
    setSelectedFile(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/10 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-display font-bold text-[var(--color-text)]">Import {entity}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.04] text-[#94A3B8] hover:text-[var(--color-text)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {phase === "select" && (
            <>
              {/* Download Template */}
              <div className="flex justify-end">
                <Button variant="primary" onClick={onDownloadTemplate}>
                  <FileDownloadIcon className="w-4 h-4" /> Download Template
                </Button>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragOver ? "border-[#16A34A]/40 bg-[#16A34A]/5" : "border-[var(--color-border)] bg-[var(--color-surface-dim)]"
                }`}
              >
                <FileUp className={`w-8 h-8 mx-auto mb-3 ${dragOver ? "text-[#16A34A]" : "text-[#94A3B8]"}`} />
                <p className="text-sm text-[var(--color-text)] font-medium mb-1">Drag & drop your Excel file here</p>
                <p className="text-xs text-[#94A3B8] mb-3">or</p>
                <button
                  onClick={() => inputElRef.current && inputElRef.current.click()}
                  className="text-sm text-[#16A34A] hover:text-[#22C55E] font-medium transition-colors"
                >
                  Choose Excel File
                </button>
                <input
                  ref={inputElRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>

              {/* Selected File Info */}
              {fileName && (
                <div className="flex items-center justify-between bg-black/[0.02] rounded-lg px-3 py-2.5">
                  <span className="text-sm text-[var(--color-text)] flex items-center gap-2">
                    <File className="w-4 h-4 text-[#94A3B8]" />
                    {fileName}
                  </span>
                  <button onClick={() => { setFileName(""); setSelectedFile(null); }} className="p-1 rounded hover:bg-black/[0.04] text-[#94A3B8] hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleValidate} disabled={!fileName}>
                  Validate & Import
                </Button>
              </div>
            </>
          )}

          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
              <p className="text-sm text-[var(--color-text)]">Validating and importing...</p>
            </div>
          )}

          {phase === "result" && result && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-black/[0.02] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--color-text)]">{result.total}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Total Rows</p>
                </div>
                <div className="bg-[#16A34A]/5 rounded-lg p-3 text-center border border-[#16A34A]/20">
                  <p className="text-2xl font-bold text-[#16A34A]">{result.valid}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Valid Rows</p>
                </div>
                <div className="bg-[#DC2626]/5 rounded-lg p-3 text-center border border-[#DC2626]/20">
                  <p className="text-2xl font-bold text-[#DC2626]">{result.failed}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Failed Rows</p>
                </div>
                <div className="bg-[#3B82F6]/5 rounded-lg p-3 text-center border border-[#3B82F6]/20">
                  <p className="text-2xl font-bold text-[#3B82F6]">{result.imported}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Imported</p>
                </div>
              </div>

              {/* Failed Rows */}
              {result.errors?.length > 0 && (
                <div className="border border-[#DC2626]/20 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#DC2626]/5 border-b border-[#DC2626]/20">
                    <h3 className="text-sm font-semibold text-[#DC2626] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Failed Rows ({result.errors.length})
                    </h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {result.errors.slice(0, 10).map((err) => (
                      <div key={err.row} className="flex items-start gap-2 px-4 py-2 border-b border-[#DC2626]/10 last:border-0 hover:bg-black/[0.02]">
                        <span className="text-xs font-mono text-[#DC2626] font-bold mt-0.5">#{err.row}</span>
                        <div className="flex-1">
                          {err.errors.map((msg, i) => (
                            <p key={i} className="text-xs text-[#64748B]">{msg}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="px-4 py-2 text-xs text-[#94A3B8] text-center">... and {result.errors.length - 10} more failed rows</p>
                    )}
                  </div>
                </div>
              )}

              {/* Warning Rows */}
              {result.warningRecords?.length > 0 && (
                <div className="border border-[#F59E0B]/20 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#F59E0B]/5 border-b border-[#F59E0B]/20">
                    <h3 className="text-sm font-semibold text-[#F59E0B] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Warnings ({result.warningRecords.length})
                    </h3>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {result.warningRecords.map((w) => (
                      <div key={w.row} className="px-4 py-2 border-b border-[#F59E0B]/10 last:border-0">
                        <p className="text-xs text-[#64748B]">
                          <span className="font-mono text-[#F59E0B] font-bold">Row #{w.row}:</span> {w.warnings.join("; ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {result.errors?.length > 0 && (
                  <Button variant="outline" onClick={handleDownloadErrorReport}>
                    <FileDown className="w-4 h-4" /> Download Error Report
                  </Button>
                )}
                <Button variant="primary" onClick={handleDone} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable icon helper (since we don't want to add more lucide imports in every page)
function FileDownloadIcon(props) {
  return (
    <svg className={`w-4 h-4 ${props.className || ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
