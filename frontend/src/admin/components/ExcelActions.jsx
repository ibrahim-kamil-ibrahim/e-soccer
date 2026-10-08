import { FileUp, FileDown, File } from "lucide-react";
import { Button } from "./ui.jsx";

export default function ExcelActions({ plural, onImport, onExport, onDownloadTemplate }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="primary" onClick={onImport}>
        <FileUp className="w-4 h-4" /> Import Excel
      </Button>
      <Button variant="outline" onClick={onExport}>
        <FileDown className="w-4 h-4" /> Export Excel
      </Button>
      <Button variant="ghost" onClick={onDownloadTemplate}>
        <File className="w-4 h-4" /> Template
      </Button>
    </div>
  );
}
