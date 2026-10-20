import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma before importing controllers
vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    match: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock auth middleware
vi.mock("../src/middleware/auth.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 1, role: "SUPER_ADMIN" };
    next();
  },
  requireRole: (...roles) => (req, _res, next) => {
    next();
  },
}));

const { buildMatchData, assertTeamsDiffer } = await import(
  "../src/controllers/matchController.js"
);

describe("matchController", () => {
  describe("assertTeamsDiffer", () => {
    it("throws when home and away teams are the same", () => {
      expect(() =>
        assertTeamsDiffer({ homeTeamId: 1, awayTeamId: 1 })
      ).toThrowError("Home team and away team must be different");
    });

    it("does not throw when teams differ", () => {
      expect(() =>
        assertTeamsDiffer({ homeTeamId: 1, awayTeamId: 2 })
      ).not.toThrow();
    });

    it("does not throw when only one team is provided", () => {
      expect(() =>
        assertTeamsDiffer({ homeTeamId: 1, awayTeamId: null })
      ).not.toThrow();
    });
  });

  describe("buildMatchData", () => {
    it("defaults status to SCHEDULED", () => {
      const data = buildMatchData({
        homeTeamId: 1,
        awayTeamId: 2,
        date: "2025-01-01",
      });
      expect(data.status).toBe("SCHEDULED");
    });

    it("maps FINISHED to isFinished", () => {
      const data = buildMatchData({
        homeTeamId: 1,
        awayTeamId: 2,
        date: "2025-01-01",
        status: "FINISHED",
      });
      expect(data.isFinished).toBe(true);
      expect(data.isLive).toBe(false);
    });

    it("maps LIVE to isLive", () => {
      const data = buildMatchData({
        homeTeamId: 1,
        awayTeamId: 2,
        date: "2025-01-01",
        status: "LIVE",
      });
      expect(data.isLive).toBe(true);
      expect(data.isFinished).toBe(false);
    });

    it("handles null scores", () => {
      const data = buildMatchData({
        homeTeamId: 1,
        awayTeamId: 2,
        date: "2025-01-01",
        homeScore: "",
        awayScore: "",
      });
      expect(data.homeScore).toBeNull();
      expect(data.awayScore).toBeNull();
    });

    it("handles valid scores", () => {
      const data = buildMatchData({
        homeTeamId: 1,
        awayTeamId: 2,
        date: "2025-01-01",
        homeScore: 3,
        awayScore: 1,
      });
      expect(data.homeScore).toBe(3);
      expect(data.awayScore).toBe(1);
    });

    it("preserves round and notes", () => {
      const data = buildMatchData({
        homeTeamId: 1,
        awayTeamId: 2,
        date: "2025-01-01",
        round: "Quarter-final",
        notes: "Test match",
      });
      expect(data.round).toBe("Quarter-final");
      expect(data.notes).toBe("Test match");
    });
  });
});
