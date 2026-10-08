import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = "C:/Users/Administrator/Desktop/e/frontend/src/admin/pages";

const fixes = [
  {
    file: "Competitions.jsx",
    plural: "competitions",
    entity: "Competition",
    linkTo: "/admin/competitions/create",
  },
  {
    file: "Players.jsx",
    plural: "players",
    entity: "Player",
    linkTo: "/admin/players/create",
  },
];

for (const { file, plural, entity, linkTo } of fixes) {
  const path = join(base, file);
  let content = readFileSync(path, "utf-8");

  const oldBlock = `        actions={<>
          <ExcelActions
            plural="${plural}"
            onImport={handleImportOpen}
            onExport={handleExport}
            onDownloadTemplate={handleDownloadTemplate}
          />
            to="${linkTo}"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add ${entity}
          </Link>
          </>
        }`;

  const newBlock = `        actions={
          <>
            <ExcelActions
              plural="${plural}"
              onImport={handleImportOpen}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <Link
              to="${linkTo}"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add ${entity}
            </Link>
          </>
        }`;

  if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    writeFileSync(path, content, "utf-8");
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Pattern not found in ${file}`);
  }
}

console.log("\nDone.");
