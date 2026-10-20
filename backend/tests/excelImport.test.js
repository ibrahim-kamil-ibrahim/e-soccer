import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";
import { validateAndImport } from "../src/services/excel/excelImport.js";
import { getTemplate } from "../src/services/excel/excelTemplates.js";

const runId = `xl${Date.now()}`;
const noopLog = async () => {};

function makeRow(entity, values) {
  return getTemplate(entity).columns.map((c) => values[c.field] ?? "");
}

function headersFor(entity) {
  return getTemplate(entity).columns.map((c) => c.header);
}

describe("Excel import pipeline", () => {
  let competition;

  beforeAll(async () => {
    competition = await prisma.competition.create({
      data: { name: `ITL XL Comp ${runId}`, region: "Dire Dawa", status: "PUBLISHED" },
    });
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { competitionId: competition.id } });
    await prisma.team.deleteMany({ where: { competitionId: competition.id } });
    await prisma.player.deleteMany({ where: { team: { competitionId: competition.id } } });
    await prisma.competition.delete({ where: { id: competition.id } }).catch(() => {});
    await prisma.adminUser.deleteMany({ where: { email: { contains: runId } } });
    await prisma.competition.deleteMany({ where: { name: { contains: "in-batch" } } });
  });

  describe("teams", () => {
    it("imports a valid row and resolves competitionName to competitionId", async () => {
      const teamName = `ITL XL Team ${runId}`;
      const result = await validateAndImport(
        "teams",
        [makeRow("teams", { name: teamName, city: "Dire Dawa", competitionName: competition.name })],
        headersFor("teams"),
        1,
        prisma,
        noopLog
      );
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      const row = await prisma.team.findFirst({ where: { name: teamName } });
      expect(row).toBeTruthy();
      expect(row.competitionId).toBe(competition.id);
      expect(row.status).toBe("PUBLISHED");
      await prisma.team.delete({ where: { id: row.id } });
    });

    it("flags duplicate team names as row errors", async () => {
      const team = await prisma.team.create({
        data: { name: `ITL XL Dup ${runId}`, city: "Dire Dawa", status: "PUBLISHED" },
      });
      const result = await validateAndImport(
        "teams",
        [makeRow("teams", { name: team.name, city: "Dire Dawa" })],
        headersFor("teams"),
        1,
        prisma,
        noopLog
      );
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].errors.join(" ")).toMatch(/already exists/i);
      await prisma.team.delete({ where: { id: team.id } });
    });

    it("reports missing required fields per row", async () => {
      const result = await validateAndImport(
        "teams",
        [makeRow("teams", { name: `ITL XL NoCity ${runId}` })],
        headersFor("teams"),
        1,
        prisma,
        noopLog
      );
      expect(result.imported).toBe(0);
      expect(result.errors[0].errors.join(" ")).toMatch(/City is required/i);
    });
  });

  describe("matches", () => {
    it("resolves team lookups and derives status flags", async () => {
      const home = await prisma.team.create({
        data: { name: `ITL XL Home ${runId}`, city: "Dire Dawa", status: "PUBLISHED" },
      });
      const away = await prisma.team.create({
        data: { name: `ITL XL Away ${runId}`, city: "Dire Dawa", status: "PUBLISHED" },
      });
      const result = await validateAndImport(
        "matches",
        [
          makeRow("matches", {
            competitionName: competition.name,
            homeTeamName: home.name,
            awayTeamName: away.name,
            homeScore: 2,
            awayScore: 1,
            status: "FINISHED",
            date: "2025-08-15",
            timeField: "15:00",
            venue: "Dire Dawa Stadium",
          }),
        ],
        headersFor("matches"),
        1,
        prisma,
        noopLog
      );
      expect(result.imported).toBe(1);
      const match = await prisma.match.findFirst({
        where: { homeTeamId: home.id, awayTeamId: away.id },
      });
      expect(match).toBeTruthy();
      expect(match.status).toBe("FINISHED");
      expect(match.isFinished).toBe(true);
      expect(match.isLive).toBe(false);
      expect(match.homeScore).toBe(2);
      expect(match.competitionId).toBe(competition.id);
      await prisma.match.delete({ where: { id: match.id } });
      await prisma.team.deleteMany({ where: { id: { in: [home.id, away.id] } } });
    });

    it("rejects legacy status values at validation", async () => {
      const home = await prisma.team.create({
        data: { name: `ITL XL H2 ${runId}`, city: "Dire Dawa", status: "PUBLISHED" },
      });
      const away = await prisma.team.create({
        data: { name: `ITL XL A2 ${runId}`, city: "Dire Dawa", status: "PUBLISHED" },
      });
      const result = await validateAndImport(
        "matches",
        [makeRow("matches", { homeTeamName: home.name, awayTeamName: away.name, status: "FT", date: "2025-08-15" })],
        headersFor("matches"),
        1,
        prisma,
        noopLog
      );
      expect(result.imported).toBe(0);
      expect(result.errors[0].errors.join(" ")).toMatch(/Status/i);
      await prisma.team.deleteMany({ where: { id: { in: [home.id, away.id] } } });
    });
  });

  describe("users", () => {
    it("hashes passwords, defaults role/status, lowercases email", async () => {
      const email = `Xl-User-${runId}@Example.com`;
      const result = await validateAndImport(
        "users",
        [makeRow("users", { name: "XL User", email, password: "ImportPass123!" })],
        headersFor("users"),
        1,
        prisma,
        noopLog
      );
      expect(result.imported).toBe(1);
      const row = await prisma.adminUser.findFirst({ where: { email: email.toLowerCase() } });
      expect(row).toBeTruthy();
      expect(row.role).toBe("EDITOR");
      expect(row.status).toBe("ACTIVE");
      expect(row.passwordHash).not.toBe("ImportPass123!");
      expect(bcrypt.compareSync("ImportPass123!", row.passwordHash)).toBe(true);
      await prisma.adminUser.delete({ where: { id: row.id } });
    });
  });

  describe("competitions", () => {
    it("fails the whole batch gracefully on in-batch unique collisions", async () => {
      const name = `ITL In-Batch ${runId}`;
      const result = await validateAndImport(
        "competitions",
        [
          makeRow("competitions", { name, region: "Dire Dawa" }),
          makeRow("competitions", { name, region: "Dire Dawa" }),
        ],
        headersFor("competitions"),
        1,
        prisma,
        noopLog
      );
      expect(result.imported).toBe(0);
      expect(result.errors.some((e) => e.errors.join(" ").match(/Import failed/i))).toBe(true);
      const rows = await prisma.competition.findMany({ where: { name } });
      expect(rows).toHaveLength(0);
    });
  });
});
