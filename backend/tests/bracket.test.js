import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const runId = `brk${Date.now()}`;
const password = "BracketTest123!";

let adminAgent;
let editorAgent;
let competition;
let teams;

async function csrf(a) {
  const res = await a.get("/api/csrf-token");
  return res.body.token;
}

async function login(a, email) {
  const token = await csrf(a);
  return a.post("/api/auth/login").set("X-CSRF-Token", token).send({ email, password });
}

describe("Knockout bracket", () => {
  let adminUser;
  let editorUser;
  const adminEmail = `brk-admin-${runId}@test.com`;
  const editorEmail = `brk-editor-${runId}@test.com`;

  beforeAll(async () => {
    adminUser = await prisma.adminUser.create({
      data: { name: "Bracket Admin", email: adminEmail, username: `brka${runId}`, passwordHash: await bcrypt.hash(password, 4), role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    editorUser = await prisma.adminUser.create({
      data: { name: "Bracket Editor", email: editorEmail, username: `brke${runId}`, passwordHash: await bcrypt.hash(password, 4), role: "EDITOR", status: "ACTIVE" },
    });

    competition = await prisma.competition.create({
      data: { name: `Bracket Comp ${runId}`, region: "Test", type: "KNOCKOUT", status: "PUBLISHED" },
    });

    teams = [];
    for (let i = 1; i <= 8; i++) {
      teams.push(await prisma.team.create({ data: { name: `Team ${runId} ${i}`, city: "Test", region: "Test", competitionId: competition.id } }));
    }

    adminAgent = request.agent(app);
    editorAgent = request.agent(app);
    expect((await login(adminAgent, adminEmail)).status).toBe(200);
    expect((await login(editorAgent, editorEmail)).status).toBe(200);
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { competitionId: competition.id } });
    await prisma.competition.delete({ where: { id: competition.id } }).catch(() => {});
    await prisma.team.deleteMany({ where: { name: { contains: runId } } });
    await prisma.adminUser.deleteMany({ where: { email: { contains: runId } } });
  });

  it("generate bracket: rejects fewer than 2 teams", async () => {
    const token = await csrf(adminAgent);
    const res = await adminAgent.post(`/api/competitions/${competition.id}/bracket`).set("X-CSRF-Token", token).send({ teamIds: [teams[0].id] });
    expect(res.status).toBe(422);
  });

  it("generate bracket: rejects non-existent team", async () => {
    const token = await csrf(adminAgent);
    const res = await adminAgent.post(`/api/competitions/${competition.id}/bracket`).set("X-CSRF-Token", token).send({ teamIds: [teams[0].id, 999999] });
    expect(res.status).toBe(422);
  });

  it("generate bracket: editor forbidden", async () => {
    const token = await csrf(editorAgent);
    const res = await editorAgent.post(`/api/competitions/${competition.id}/bracket`).set("X-CSRF-Token", token).send({ teamIds: teams.map((t) => t.id) });
    expect(res.status).toBe(403);
  });

  it("generate bracket: creates round 1 matches with byes for 6 teams", async () => {
    const token = await csrf(adminAgent);
    const six = teams.slice(0, 6);
    const res = await adminAgent.post(`/api/competitions/${competition.id}/bracket`).set("X-CSRF-Token", token).send({ teamIds: six.map((t) => t.id), date: "2026-11-01T15:00:00Z" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.size).toBe(8);
    expect(res.body.totalRounds).toBe(3);
    expect(res.body.matchesCreated).toBe(3);
  });

  it("get bracket: returns full tree with placeholders", async () => {
    const res = await request(app).get(`/api/competitions/${competition.id}/bracket`);
    expect(res.status).toBe(200);
    expect(res.body.bracket).toBeTruthy();
    expect(res.body.bracket.rounds).toHaveLength(3);
    expect(res.body.bracket.rounds[0].name).toBe("Quarter-final");
    expect(res.body.bracket.rounds[1].name).toBe("Semi-final");
    expect(res.body.bracket.rounds[2].name).toBe("Final");
    expect(res.body.bracket.rounds[0].matches).toHaveLength(4);
    expect(res.body.bracket.rounds[0].matches[0].home.name).toBe(teams[0].name);
    expect(res.body.bracket.rounds[0].matches[0].away.name).toBe(teams[1].name);
  });

  it("get bracket: bye slot shows team vs Bye", async () => {
    const r1 = await prisma.match.findMany({ where: { competitionId: competition.id, roundNumber: 1 }, orderBy: { bracketPosition: "asc" } });
    const last = r1[r1.length - 1];
    if (last && last.status !== "FINISHED") {
      const token = await csrf(adminAgent);
      await adminAgent.put(`/api/matches/${last.id}`).set("X-CSRF-Token", token).send({
        homeTeamId: last.homeTeamId, awayTeamId: last.awayTeamId, status: "FINISHED", date: last.date.toISOString(),
        homeScore: 1, awayScore: 0,
      });
      await new Promise((r) => setTimeout(r, 300));
    }

    const res = await request(app).get(`/api/competitions/${competition.id}/bracket`);
    const allMatches = res.body.bracket.rounds.flatMap((r) => r.matches);
    const byeMatch = allMatches.find((m) => m.away?.name === "Bye");
    expect(byeMatch).toBeTruthy();
    expect(byeMatch.home.id).not.toBeNull();
  });

  it("propagation: finishing both R1 matches auto-creates semi-final", async () => {
    const r1 = await prisma.match.findMany({ where: { competitionId: competition.id, roundNumber: 1 }, orderBy: { bracketPosition: "asc" } });
    expect(r1.length).toBeGreaterThanOrEqual(2);

    for (const m of r1.slice(0, 2)) {
      const token = await csrf(adminAgent);
      const homeWins = m.bracketPosition % 2 === 0;
      const res = await adminAgent.put(`/api/matches/${m.id}`).set("X-CSRF-Token", token).send({
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        date: m.date.toISOString(),
        status: "FINISHED",
        homeScore: homeWins ? 2 : 0,
        awayScore: homeWins ? 0 : 2,
      });
      expect(res.status).toBe(200);
      expect(res.body.match.winnerTeamId).toBe(homeWins ? m.homeTeamId : m.awayTeamId);
    }

    await new Promise((r) => setTimeout(r, 500));

    const sf = await prisma.match.findMany({ where: { competitionId: competition.id, roundNumber: 2 } });
    expect(sf.length).toBeGreaterThanOrEqual(1);
    expect(sf[0].homeTeamId).not.toBeNull();
    expect(sf[0].awayTeamId).not.toBeNull();
  });

  it("propagation: penalties decide winner on level score", async () => {
    const r1 = await prisma.match.findMany({ where: { competitionId: competition.id, roundNumber: 1 }, orderBy: { bracketPosition: "asc" } });
    const remaining = r1.filter((m) => m.status !== "FINISHED");
    if (remaining.length === 0) return;

    const m = remaining[0];
    const token = await csrf(adminAgent);
    const res = await adminAgent.put(`/api/matches/${m.id}`).set("X-CSRF-Token", token).send({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      date: m.date.toISOString(),
      status: "FINISHED",
      homeScore: 1,
      awayScore: 1,
      homePenalties: 4,
      awayPenalties: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.match.winnerTeamId).toBe(m.homeTeamId);
  });

  it("propagation: level score without penalties yields no winner", async () => {
    const r1 = await prisma.match.findMany({ where: { competitionId: competition.id, roundNumber: 1 }, orderBy: { bracketPosition: "asc" } });
    const remaining = r1.filter((m) => m.status !== "FINISHED");
    if (remaining.length === 0) return;

    const m = remaining[0];
    const token = await csrf(adminAgent);
    const res = await adminAgent.put(`/api/matches/${m.id}`).set("X-CSRF-Token", token).send({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      date: m.date.toISOString(),
      status: "FINISHED",
      homeScore: 1,
      awayScore: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.match.winnerTeamId).toBeNull();
  });

  it("regenerate: 409 without reset, succeeds with reset=true", async () => {
    const token = await csrf(adminAgent);
    const res1 = await adminAgent.post(`/api/competitions/${competition.id}/bracket`).set("X-CSRF-Token", token).send({ teamIds: teams.map((t) => t.id) });
    expect(res1.status).toBe(409);

    const res2 = await adminAgent.post(`/api/competitions/${competition.id}/bracket`).set("X-CSRF-Token", token).send({ teamIds: teams.map((t) => t.id), reset: true });
    expect(res2.status).toBe(201);
    expect(res2.body.matchesCreated).toBe(4);
  });

  it("full bracket playthrough: champion determined", async () => {
    for (let i = 0; i < 10; i++) {
      const unfinished = await prisma.match.findMany({ where: { competitionId: competition.id, roundNumber: { not: null }, status: { not: "FINISHED" } } });
      if (unfinished.length === 0) break;
      for (const m of unfinished) {
        const token = await csrf(adminAgent);
        await adminAgent.put(`/api/matches/${m.id}`).set("X-CSRF-Token", token).send({
          homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, status: "FINISHED", date: m.date.toISOString(),
          homeScore: m.bracketPosition % 2 === 0 ? 3 : 1, awayScore: m.bracketPosition % 2 === 0 ? 1 : 0,
        });
      }
      await new Promise((r) => setTimeout(r, 800));
    }

    const bracket = await request(app).get(`/api/competitions/${competition.id}/bracket`);
    const final = bracket.body.bracket.rounds[2].matches[0];
    expect(final.status).toBe("FINISHED");
    expect(final.winnerTeamId).not.toBeNull();
    expect(bracket.body.bracket.champion).toBeTruthy();
  });

  it("manual draw: respects the admin's seed order and explicit byes", async () => {
    const token = await csrf(adminAgent);
    // Deliberately reversed, with seed 2 left empty so seed 1 takes a bye.
    const draw = [teams[7].id, null, teams[6].id, teams[5].id, teams[4].id, teams[3].id, teams[2].id, teams[1].id];
    const res = await adminAgent
      .post(`/api/competitions/${competition.id}/bracket`)
      .set("X-CSRF-Token", token)
      .send({ teamIds: draw, reset: true });
    expect(res.status).toBe(201);
    expect(res.body.seeds).toEqual(draw);

    const r1 = await prisma.match.findMany({ where: { competitionId: competition.id, roundNumber: 1 }, orderBy: { bracketPosition: "asc" } });
    // Seed 1 sat against an empty slot, so it advances without playing.
    expect(r1.some((m) => m.homeTeamId === teams[7].id || m.awayTeamId === teams[7].id)).toBe(false);
    // The first real fixture is seed 3 v seed 4.
    expect(r1[0].homeTeamId).toBe(teams[6].id);
    expect(r1[0].awayTeamId).toBe(teams[5].id);
  });

  it("manual draw: rejects a draw with fewer than 2 teams", async () => {
    const token = await csrf(adminAgent);
    const res = await adminAgent
      .post(`/api/competitions/${competition.id}/bracket`)
      .set("X-CSRF-Token", token)
      .send({ teamIds: [teams[0].id, null, null], reset: true });
    expect(res.status).toBe(422);
  });

  it("edit draw: replaces the fixtures, keeps the seed order and the kickoff", async () => {
    const token = await csrf(adminAgent);
    const first = [teams[1].id, teams[2].id, teams[3].id, teams[4].id, teams[5].id, teams[6].id];
    const kickoff = "2026-12-01T17:00:00.000Z";
    await adminAgent
      .post(`/api/competitions/${competition.id}/bracket`)
      .set("X-CSRF-Token", token)
      .send({ teamIds: first, reset: true, date: kickoff });

    const view = await adminAgent.get(`/api/competitions/${competition.id}/bracket`);
    expect(view.status).toBe(200);
    // The stored draw is padded to a power of two so the tree can be built.
    expect(view.body.bracket.seeds).toEqual([...first, null, null]);
    expect(view.body.bracket.rounds[0].matches[0].date).toBeTruthy();

    // Admin reorders the draw and turns seed 2 into a bye.
    const edited = [teams[6].id, null, teams[5].id, teams[4].id, teams[3].id, teams[2].id];
    const res = await adminAgent
      .post(`/api/competitions/${competition.id}/bracket`)
      .set("X-CSRF-Token", token)
      .send({ teamIds: edited, reset: true, date: kickoff });
    expect(res.status).toBe(201);

    const after = await adminAgent.get(`/api/competitions/${competition.id}/bracket`);
    expect(after.body.bracket.seeds).toEqual([...edited, null, null]);
    const r1 = after.body.bracket.rounds[0].matches;
    // Seed 1 (teams[6]) is paired against an empty slot, so it takes the bye.
    expect(r1.some((m) => m.away.name === "Bye")).toBe(true);
    const real = r1.filter((m) => m.away.name !== "Bye");
    expect(real[0].home.id).toBe(teams[5].id);
    expect(real[0].away.id).toBe(teams[4].id);
    // Editing must not silently move the fixtures to a new day.
    expect(String(real[0].date).startsWith("2026-12-01")).toBe(true);

    // An existing draw is still protected against a replace without reset.
    const clash = await adminAgent
      .post(`/api/competitions/${competition.id}/bracket`)
      .set("X-CSRF-Token", token)
      .send({ teamIds: edited });
    expect(clash.status).toBe(409);
  });
});
