import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = "C:/Users/Administrator/Desktop/e/backend/src";

// Fix 1: Add crypto import to controllers that use crypto.randomUUID but don't import it
const controllersNeedCrypto = [
  "competitionController.js",
  "newsController.js",
  "userController.js",
  "matchController.js",
  "playerController.js",
  "cityController.js",
];

console.log("=== Fix 1: Add crypto imports ===");
for (const file of controllersNeedCrypto) {
  const filePath = join(base, "controllers", file);
  let content = readFileSync(filePath, "utf-8");
  // Check if crypto is already imported
  if (!content.includes("import crypto from \"node:crypto\"") && content.includes("crypto.randomUUID()")) {
    // Add crypto import after the last node:* import
    content = content.replace(/(import os from "node:os";\n)/, "$1import crypto from \"node:crypto\";\n");
    writeFileSync(filePath, content, "utf-8");
    console.log(`  Added crypto to ${file}`);
  } else {
    console.log(`  ${file}: crypto already imported or not needed`);
  }
}

// Fix 2: Remove duplicate Excel exports from controllers where update-excel.js prepended them
// The script prepended exportXxx at top AND they exist at bottom — remove the top duplicates
const dupControllers = [
  { file: "teamController.js", exports: ["exportTeams", "exportTeamsTemplate", "importTeams"] },
  { file: "matchController.js", exports: ["exportMatches", "exportMatchesTemplate", "importMatches"] },
  { file: "competitionController.js", exports: ["exportCompetitions", "exportCompetitionsTemplate", "importCompetitions"] },
  { file: "cityController.js", exports: ["exportCities", "exportCitiesTemplate", "importCities"] },
  { file: "playerController.js", exports: ["exportPlayers", "exportPlayersTemplate", "importPlayers"] },
  { file: "newsController.js", exports: ["exportNews", "exportNewsTemplate", "importNews"] },
  { file: "mediaController.js", exports: ["exportMedia", "exportMediaTemplate", "importMedia"] },
  { file: "userController.js", exports: ["exportUsers", "exportUsersTemplate", "importUsers"] },
];

console.log("\n=== Fix 2: Remove duplicate prepended exports ===");
for (const { file, exports: exportNames } of dupControllers) {
  const filePath = join(base, "controllers", file);
  let content = readFileSync(filePath, "utf-8");

  // Find the first occurrence of these exports (the prepended ones)
  // and remove them if there's a second occurrence later
  let changed = false;
  let prefix = "";

  // Read lines to find where the original exports are
  const lines = content.split("\n");
  let firstExportLine = -1;
  let lastExportLine = -1;

  for (let i = 0; i < lines.length; i++) {
    for (const exp of exportNames) {
      if (lines[i].includes(`export const ${exp} = asyncHandler`)) {
        if (firstExportLine === -1) firstExportLine = i;
        lastExportLine = i;
      }
    }
  }

  if (firstExportLine !== -1 && lastExportLine !== firstExportLine) {
    // There are duplicates — remove lines from firstExportLine to the end of the first group
    // Find the end of the first export group (the importMatches function end)
    let endOfFirstGroup = lastExportLine;
    // The importXxx function is the last in the group, find its closing
    for (let i = lastExportLine; i < lines.length; i++) {
      if (lines[i].trim() === "});" && i > lastExportLine) {
        endOfFirstGroup = i;
        break;
      }
    }

    // Remove lines from firstExportLine to endOfFirstGroup
    if (endOfFirstGroup > firstExportLine) {
      lines.splice(firstExportLine, endOfFirstGroup - firstExportLine + 1);
      content = lines.join("\n");
      writeFileSync(filePath, content, "utf-8");
      console.log(`  Removed duplicate exports from ${file} (lines ${firstExportLine+1}-${endOfFirstGroup+1})`);
      changed = true;
    }
  }

  if (!changed) {
    console.log(`  ${file}: no duplicates found`);
  }
}

// Fix 3: Add missing imports to route files
console.log("\n=== Fix 3: Fix route file imports ===");
const routes = ["teams", "matches", "competitions", "cities", "players"];
const routeImports = {
  teams: {
    extraImports: "import path from \"node:path\";\nimport { AppError } from \"../middleware/errorHandler.js\";\nimport multer from \"multer\";\n\nconst importMulter = multer({\n  storage: multer.memoryStorage(),\n  limits: { fileSize: 5 * 1024 * 1024 },\n  fileFilter: (_req, file, cb) => {\n    const allowed = [\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\", \"application/vnd.ms-excel\"];\n    const ext = path.extname(file.originalname).toLowerCase();\n    if (allowed.includes(file.mimetype) || ext === \".xlsx\" || ext === \".xls\") cb(null, true);\n    else cb(new AppError(400, \"Only .xlsx and .xls files are allowed\"));\n  },\n});\n",
    exportImports: "exportTeams,\n  exportTeamsTemplate,\n  importTeams,",
  },
  matches: {
    extraImports: "import path from \"node:path\";\nimport { AppError } from \"../middleware/errorHandler.js\";\nimport multer from \"multer\";\n\nconst importMulter = multer({\n  storage: multer.memoryStorage(),\n  limits: { fileSize: 5 * 1024 * 1024 },\n  fileFilter: (_req, file, cb) => {\n    const allowed = [\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\", \"application/vnd.ms-excel\"];\n    const ext = path.extname(file.originalname).toLowerCase();\n    if (allowed.includes(file.mimetype) || ext === \".xlsx\" || ext === \".xls\") cb(null, true);\n    else cb(new AppError(400, \"Only .xlsx and .xls files are allowed\"));\n  },\n});\n",
    exportImports: "exportMatches,\n  exportMatchesTemplate,\n  importMatches,",
  },
  competitions: {
    extraImports: "import path from \"node:path\";\nimport { AppError } from \"../middleware/errorHandler.js\";\nimport multer from \"multer\";\n\nconst importMulter = multer({\n  storage: multer.memoryStorage(),\n  limits: { fileSize: 5 * 1024 * 1024 },\n  fileFilter: (_req, file, cb) => {\n    const allowed = [\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\", \"application/vnd.ms-excel\"];\n    const ext = path.extname(file.originalname).toLowerCase();\n    if (allowed.includes(file.mimetype) || ext === \".xlsx\" || ext === \".xls\") cb(null, true);\n    else cb(new AppError(400, \"Only .xlsx and .xls files are allowed\"));\n  },\n});\n",
    exportImports: "exportCompetitions,\n  exportCompetitionsTemplate,\n  importCompetitions,",
  },
  cities: {
    extraImports: "import path from \"node:path\";\nimport { AppError } from \"../middleware/errorHandler.js\";\nimport multer from \"multer\";\n\nconst importMulter = multer({\n  storage: multer.memoryStorage(),\n  limits: { fileSize: 5 * 1024 * 1024 },\n  fileFilter: (_req, file, cb) => {\n    const allowed = [\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\", \"application/vnd.ms-excel\"];\n    const ext = path.extname(file.originalname).toLowerCase();\n    if (allowed.includes(file.mimetype) || ext === \".xlsx\" || ext === \".xls\") cb(null, true);\n    else cb(new AppError(400, \"Only .xlsx and .xls files are allowed\"));\n  },\n});\n",
    exportImports: "exportCities,\n  exportCitiesTemplate,\n  importCities,",
  },
  players: {
    extraImports: "import path from \"node:path\";\nimport { AppError } from \"../middleware/errorHandler.js\";\nimport multer from \"multer\";\n\nconst importMulter = multer({\n  storage: multer.memoryStorage(),\n  limits: { fileSize: 5 * 1024 * 1024 },\n  fileFilter: (_req, file, cb) => {\n    const allowed = [\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\", \"application/vnd.ms-excel\"];\n    const ext = path.extname(file.originalname).toLowerCase();\n    if (allowed.includes(file.mimetype) || ext === \".xlsx\" || ext === \".xls\") cb(null, true);\n    else cb(new AppError(400, \"Only .xlsx and .xls files are allowed\"));\n  },\n});\n",
    exportImports: "exportPlayers,\n  exportPlayersTemplate,\n  importPlayers,",
  },
};

for (const entity of routes) {
  const filePath = join(base, "routes", `${entity}.js`);
  let content = readFileSync(filePath, "utf-8");
  const config = routeImports[entity];

  // Check if already fixed
  if (content.includes(`import path from "node:path"`)) {
    console.log(`  ${entity}.js: already has path import`);
    continue;
  }

  // Find the import block and add exports
  const importEndMatch = content.match(/(\],\s*from\s+["'].*?["']\s*;)/);
  if (importEndMatch) {
    const insertPos = importEndMatch.index + importEndMatch[0].length;
    const before = content.substring(0, insertPos);
    const after = content.substring(insertPos);

    // Add export imports to the import list
    const originalImport = importEndMatch[0];
    const newImport = originalImport.replace(/\s*\}$/, `,\n  ${config.exportImports}\n}`);

    content = before.replace(importEndMatch[0], newImport) + after;

    // Add the multer/importMulter block after "const router = Router();\n"
    content = content.replace(
      /const router = Router;\n\n/,
      `const router = Router();\n\n${config.extraImports}`
    );

    writeFileSync(filePath, content, "utf-8");
    console.log(`  Fixed ${entity}.js`);
  } else {
    console.log(`  ${entity}.js: could not find import block`);
  }
}

console.log("\nDone.");
