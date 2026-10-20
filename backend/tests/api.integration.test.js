import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const runId = `itl${Date.now()}`;
const stamp = () => new Date().toISOString();

function agent() {
  return request.agent(app);
}

async function csrf(a) {
  const res = await a.get("/api/csrf-token");
  expect(res.status).toBe(200);
  return res.body.token;
}

async function login(a, email, password) {
  const token = await csrf(a);
  return a.post("/api/auth/login").set("X-CSRF-Token", token).send({ email, password });
}

describe("API integration", () => {
  let adminUser;
  let editorUser;
  const adminEmail = `admin-${runId}@itl.test`;
  const editorEmail = `editor-${runId}@itl.test`;
  const password = "ItlTestPass123!";

  let adminAgent;
  let editorAgent;

  beforeAll(async () => {
    adminUser = await prisma.adminUser.create({
      data: {
        name: "ITL Admin",
        email: adminEmail,
        username: `adm${runId}`,
        passwordHash: await bcrypt.hash(password, 4),
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    editorUser = await prisma.adminUser.create({
      data: {
        name: "ITL Editor",
        email: editorEmail,
        username: `edt${runId}`,
        passwordHash: await bcrypt.hash(password, 4),
        role: "EDITOR",
        status: "ACTIVE",
      },
    });

    adminAgent = agent();
    editorAgent = agent();
    expect((await login(adminAgent, adminEmail, password)).status).toBe(200);
    expect((await login(editorAgent, editorEmail, password)).status).toBe(200);
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email: { contains: runId } } });
  });

  describe("health and errors", () => {
    it("GET /api/health returns success", async () => {
      const res = await agent().get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it("unknown route returns 404 envelope", async () => {
      const res = await agent().get("/api/definitely-not-a-route");
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ success: false, message: "Route not found" });
    });

    it("protected route without auth returns 401 envelope", async () => {
      const res = await agent().get("/api/users");
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false });
    });
  });

  describe("CSRF protection", () => {
    it("rejects state-changing requests without a CSRF token", async () => {
      const res = await agent()
        .post("/api/auth/login")
        .send({ email: adminEmail, password });
      expect(res.status).toBe(403);
    });
  });

  describe("login", () => {
    it("rejects wrong password with 401 and no token leak", async () => {
      const a = agent();
      const res = await login(a, adminEmail, "wrong-password");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).not.toContain(passwordHashFragment());
    });

    it("returns user shape without passwordHash and sets an httpOnly cookie", async () => {
      const a = agent();
      const res = await login(a, adminEmail, password);
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ email: adminEmail, role: "ADMIN" });
      expect(res.body.user).not.toHaveProperty("passwordHash");
      const setCookie = res.headers["set-cookie"] || [];
      expect(setCookie.join(";")).toContain("token=");
      expect(setCookie.join(";")).toContain("HttpOnly");
    });

    it("locks the account after 5 failed attempts (DB-backed)", async () => {
      const lockEmail = `lock-${runId}@itl.test`;
      const lockUser = await prisma.adminUser.create({
        data: {
          name: "ITL Lock",
          email: lockEmail,
          passwordHash: await bcrypt.hash(password, 4),
          role: "EDITOR",
          status: "ACTIVE",
        },
      });
      const a = agent();
      for (let i = 0; i < 5; i++) {
        const res = await login(a, lockEmail, "nope");
        expect(res.status).toBe(401);
      }
      const locked = await login(a, lockEmail, password);
      expect(locked.status).toBe(429);
      expect(locked.body.message).toMatch(/locked/i);

      const fresh = await prisma.adminUser.findUnique({ where: { id: lockUser.id } });
      expect(fresh.lockedUntil).not.toBeNull();

      await prisma.adminUser.delete({ where: { id: lockUser.id } });
    });

    it("resets failed attempt counter on successful login", async () => {
      const user = await prisma.adminUser.create({
        data: {
          name: "ITL Reset",
          email: `reset-${runId}@itl.test`,
          passwordHash: await bcrypt.hash(password, 4),
          role: "EDITOR",
          status: "ACTIVE",
          failedLoginAttempts: 3,
        },
      });
      const a = agent();
      const res = await login(a, user.email, password);
      expect(res.status).toBe(200);
      const fresh = await prisma.adminUser.findUnique({ where: { id: user.id } });
      expect(fresh.failedLoginAttempts).toBe(0);
      expect(fresh.lockedUntil).toBeNull();
      await prisma.adminUser.delete({ where: { id: user.id } });
    });
  });

  describe("role authorization", () => {
    it("GET /api/users allows ADMIN but not EDITOR", async () => {
      const editorRes = await editorAgent.get("/api/users");
      expect(editorRes.status).toBe(403);

      const adminRes = await adminAgent.get("/api/users");
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
    });

    it("PUT /api/settings requires ADMIN role", async () => {
      const before = (await agent().get("/api/settings")).body.settings;
      const token = await csrf(editorAgent);
      const editorRes = await editorAgent
        .put("/api/settings")
        .set("X-CSRF-Token", token)
        .send({ general: { siteName: "hijacked" } });
      expect(editorRes.status).toBe(403);

      const adminToken = await csrf(adminAgent);
      const adminRes = await adminAgent
        .put("/api/settings")
        .set("X-CSRF-Token", adminToken)
        .send({ general: { ...(before.general || {}), siteName: "ITL Test Site" } });
      expect(adminRes.status).toBe(200);

      // Restore prior settings so the suite leaves no trace on the shared DB
      const restoreToken = await csrf(adminAgent);
      await adminAgent
        .put("/api/settings")
        .set("X-CSRF-Token", restoreToken)
        .send({ general: before.general });
    });

    it("PUT /api/users/:id requires SUPER_ADMIN (ADMIN gets 403)", async () => {
      const token = await csrf(adminAgent);
      const res = await adminAgent
        .put(`/api/users/${editorUser.id}`)
        .set("X-CSRF-Token", token)
        .send({ name: "Renamed" });
      expect(res.status).toBe(403);
    });
  });

  describe("profile updates", () => {
    it("rejects an email already used by another account", async () => {
      const a = agent();
      await login(a, adminEmail, password);
      const token = await csrf(a);
      const res = await a
        .put("/api/auth/profile")
        .set("X-CSRF-Token", token)
        .send({ email: editorEmail });
      expect(res.status).toBe(409);
    });

    it("rejects an invalid email with 422", async () => {
      const a = agent();
      await login(a, adminEmail, password);
      const token = await csrf(a);
      const res = await a
        .put("/api/auth/profile")
        .set("X-CSRF-Token", token)
        .send({ email: "not-an-email" });
      expect(res.status).toBe(422);
    });
  });

  describe("match status validation", () => {
    let homeTeam;
    let awayTeam;

    beforeAll(async () => {
      homeTeam = await prisma.team.create({
        data: { name: `ITL Home ${runId}`, shortName: "ITH", city: "Dire Dawa", status: "PUBLISHED" },
      });
      awayTeam = await prisma.team.create({
        data: { name: `ITL Away ${runId}`, shortName: "ITA", city: "Dire Dawa", status: "PUBLISHED" },
      });
    });

    afterAll(async () => {
      await prisma.match.deleteMany({ where: { homeTeamId: homeTeam.id } });
      await prisma.team.deleteMany({ where: { id: { in: [homeTeam.id, awayTeam.id] } } });
    });

    async function createMatch(body) {
      const token = await csrf(adminAgent);
      return adminAgent.post("/api/matches").set("X-CSRF-Token", token).send(body);
    }

    it("rejects non-canonical status values with 422", async () => {
      const res = await createMatch({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: stamp(),
        status: "UPCOMING",
      });
      expect(res.status).toBe(422);
    });

    it("creates a LIVE match and derives isLive from status", async () => {
      const res = await createMatch({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: stamp(),
        time: "15:00",
        status: "LIVE",
        minute: 34,
      });
      expect(res.status).toBe(201);
      const row = await prisma.match.findUnique({ where: { id: res.body.match.id } });
      expect(row.status).toBe("LIVE");
      expect(row.isLive).toBe(true);
      expect(row.isFinished).toBe(false);
      expect(row.minute).toBe(34);
    });

    it("ignores caller-supplied isLive/isFinished flags on create", async () => {
      const res = await createMatch({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: stamp(),
        time: "16:00",
        status: "FINISHED",
        homeScore: 2,
        awayScore: 1,
        isLive: true,
        isFinished: false,
      });
      expect(res.status).toBe(201);
      const row = await prisma.match.findUnique({ where: { id: res.body.match.id } });
      expect(row.isLive).toBe(false);
      expect(row.isFinished).toBe(true);
    });

    it("rejects legacy status on update with 422", async () => {
      const created = await createMatch({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: stamp(),
        time: "17:00",
        status: "SCHEDULED",
      });
      const token = await csrf(adminAgent);
      const res = await adminAgent
        .put(`/api/matches/${created.body.match.id}`)
        .set("X-CSRF-Token", token)
        .send({ homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, status: "FT" });
      expect(res.status).toBe(422);
    });
  });

  describe("match scheduling guards", () => {
    let homeTeam;
    let awayTeam;
    let otherTeam;
    const ids = () => [homeTeam.id, awayTeam.id, otherTeam.id];
    const day = "2030-05-20";

    beforeAll(async () => {
      homeTeam = await prisma.team.create({
        data: { name: `SCH Home ${runId}`, shortName: "SCH", city: "Dire Dawa", status: "PUBLISHED" },
      });
      awayTeam = await prisma.team.create({
        data: { name: `SCH Away ${runId}`, shortName: "SCA", city: "Dire Dawa", status: "PUBLISHED" },
      });
      otherTeam = await prisma.team.create({
        data: { name: `SCH Other ${runId}`, shortName: "SCO", city: "Dire Dawa", status: "PUBLISHED" },
      });
    });

    afterAll(async () => {
      await prisma.match.deleteMany({
        where: {
          OR: [{ homeTeamId: { in: ids() } }, { awayTeamId: { in: ids() } }],
        },
      });
      await prisma.team.deleteMany({ where: { id: { in: ids() } } });
    });

    async function create(body) {
      const token = await csrf(adminAgent);
      return adminAgent.post("/api/matches").set("X-CSRF-Token", token).send(body);
    }

    async function update(id, body) {
      const token = await csrf(adminAgent);
      return adminAgent.put(`/api/matches/${id}`).set("X-CSRF-Token", token).send(body);
    }

    it("filters by calendar day rather than an exact timestamp", async () => {
      const created = await create({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: `${day}T12:00:00.000Z`,
        time: "12:00",
      });
      expect(created.status).toBe(201);

      const res = await adminAgent.get(`/api/matches?date=${day}&limit=100`);
      expect(res.status).toBe(200);
      expect(res.body.items.some((m) => m.id === created.body.match.id)).toBe(true);
    });

    it("requires a score when the match is FINISHED", async () => {
      const res = await create({
        homeTeamId: homeTeam.id,
        awayTeamId: otherTeam.id,
        date: `${day}T20:00:00.000Z`,
        time: "20:00",
        status: "FINISHED",
      });
      expect(res.status).toBe(422);
    });

    it("rejects a team that does not exist", async () => {
      const res = await create({ homeTeamId: 99999999, awayTeamId: awayTeam.id, date: `${day}T21:00:00.000Z` });
      expect(res.status).toBe(422);
    });

    it("prevents a team from kicking off twice at the same time", async () => {
      const ok = await create({
        homeTeamId: homeTeam.id,
        awayTeamId: otherTeam.id,
        date: `${day}T22:00:00.000Z`,
        time: "22:00",
      });
      expect(ok.status).toBe(201);

      const clash = await create({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: `${day}T22:00:00.000Z`,
        time: "22:00",
      });
      expect(clash.status).toBe(409);

      const later = await create({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: `${day}T23:00:00.000Z`,
        time: "23:00",
      });
      expect(later.status).toBe(201);
    });

    it("clears the live clock on a partial status update without dropping teams", async () => {
      const live = await create({
        homeTeamId: otherTeam.id,
        awayTeamId: awayTeam.id,
        date: `${day}T17:00:00.000Z`,
        time: "17:00",
        status: "LIVE",
        minute: 63,
        phase: "ET",
        addedTime: 4,
      });
      expect(live.status).toBe(201);

      const res = await update(live.body.match.id, { status: "POSTPONED" });
      expect(res.status).toBe(200);
      expect(res.body.match.minute).toBeNull();
      expect(res.body.match.phase).toBeNull();
      expect(res.body.match.addedTime).toBeNull();
      expect(res.body.match.homeTeamId).toBe(otherTeam.id);
      expect(res.body.match.awayTeamId).toBe(awayTeam.id);
      expect(new Date(res.body.match.date).toISOString()).toBe(`${day}T17:00:00.000Z`);
    });
  });

  describe("standings", () => {
    let competition;
    let teams;

    beforeAll(async () => {
      competition = await prisma.competition.create({
        data: { name: `ITL Comp ${runId}`, region: "Dire Dawa", status: "PUBLISHED" },
      });
      teams = [];
      for (const label of ["A", "B", "C"]) {
        teams.push(
          await prisma.team.create({
            data: { name: `ITL ${label} ${runId}`, city: "Dire Dawa", competitionId: competition.id, status: "PUBLISHED" },
          })
        );
      }
      const mk = async (h, a, hs, as) =>
        prisma.match.create({
          data: {
            competitionId: competition.id,
            homeTeamId: teams[h].id,
            awayTeamId: teams[a].id,
            homeScore: hs,
            awayScore: as,
            status: "FINISHED",
            isFinished: true,
            date: new Date(),
          },
        });
      await mk(0, 1, 2, 0); // A beats B
      await mk(0, 2, 1, 0); // A beats C
      await mk(1, 2, 3, 1); // B beats C
    });

    afterAll(async () => {
      await prisma.match.deleteMany({ where: { competitionId: competition.id } });
      await prisma.team.deleteMany({ where: { competitionId: competition.id } });
      await prisma.competition.delete({ where: { id: competition.id } });
    });

    it("returns ranked table via GET /api/competitions/:id/standings", async () => {
      const res = await agent().get(`/api/competitions/${competition.id}/standings`);
      expect(res.status).toBe(200);
      const table = res.body.standings;
      expect(table).toHaveLength(3);
      expect(table.map((r) => r.rank)).toEqual([1, 2, 3]);
      expect(table[0].name).toContain("ITL A");
      expect(table[0].points).toBe(6);
      expect(table[0].played).toBe(2);
      expect(table[0].won).toBe(2);
      expect(table[0].goalsFor).toBe(3);
      expect(table[0].goalsAgainst).toBe(0);
      expect(table[0].goalDifference).toBe(3);
      expect(table[1].points).toBe(3);
      expect(table[2].points).toBe(0);
    });

    it("exposes the same table via GET /api/matches/:id/standings", async () => {
      const match = await prisma.match.findFirst({ where: { competitionId: competition.id } });
      const res = await agent().get(`/api/matches/${match.id}/standings`);
      expect(res.status).toBe(200);
      expect(res.body.standings).toHaveLength(3);
    });
  });
});

function passwordHashFragment() {
  return "passwordHash";
}
