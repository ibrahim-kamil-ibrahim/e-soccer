import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    competition: {
      findUnique: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
    },
  },
}));

const { computeStandings } = await import("../src/services/standings.js");
const { prisma } = await import("../src/config/prisma.js");

describe("standings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when competition not found", async () => {
    prisma.competition.findUnique.mockResolvedValue(null);
    const result = await computeStandings(999);
    expect(result).toEqual([]);
  });

  it("returns empty array when no teams", async () => {
    prisma.competition.findUnique.mockResolvedValue({ id: 1, name: "Test", teams: [] });
    prisma.match.findMany.mockResolvedValue([]);
    const result = await computeStandings(1);
    expect(result).toEqual([]);
  });

  it("computes standings correctly for finished matches", async () => {
    prisma.competition.findUnique.mockResolvedValue({
      id: 1,
      name: "Test League",
      teams: [
        { id: 1, name: "Team A", shortName: "TA", logo: null },
        { id: 2, name: "Team B", shortName: "TB", logo: null },
      ],
    });
    prisma.match.findMany.mockResolvedValue([
      {
        competitionId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 2,
        awayScore: 1,
        status: "FINISHED",
        isFinished: true,
        homeTeam: { id: 1, name: "Team A", shortName: "TA", logo: null },
        awayTeam: { id: 2, name: "Team B", shortName: "TB", logo: null },
      },
      {
        competitionId: 1,
        homeTeamId: 2,
        awayTeamId: 1,
        homeScore: 1,
        awayScore: 1,
        status: "FINISHED",
        isFinished: true,
        homeTeam: { id: 2, name: "Team B", shortName: "TB", logo: null },
        awayTeam: { id: 1, name: "Team A", shortName: "TA", logo: null },
      },
    ]);

    const result = await computeStandings(1);

    expect(result).toHaveLength(2);
    // Team A: 1 win (3pts) + 1 draw (1pt) = 4pts, GD: +1
    expect(result[0].name).toBe("TA");
    expect(result[0].points).toBe(4);
    expect(result[0].played).toBe(2);
    expect(result[0].won).toBe(1);
    expect(result[0].drawn).toBe(1);
    expect(result[0].lost).toBe(0);
    expect(result[0].goalsFor).toBe(3);
    expect(result[0].goalsAgainst).toBe(2);
    expect(result[0].goalDifference).toBe(1);
    expect(result[0].rank).toBe(1);
    // Team B: 1 loss + 1 draw = 1pt, GD: -1
    expect(result[1].name).toBe("TB");
    expect(result[1].points).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it("ignores unfinished matches", async () => {
    prisma.competition.findUnique.mockResolvedValue({
      id: 1,
      name: "Test League",
      teams: [
        { id: 1, name: "Team A", shortName: "TA", logo: null },
        { id: 2, name: "Team B", shortName: "TB", logo: null },
      ],
    });
    prisma.match.findMany.mockResolvedValue([
      {
        competitionId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 2,
        awayScore: 1,
        status: "SCHEDULED",
        isFinished: false,
        homeTeam: { id: 1, name: "Team A", shortName: "TA", logo: null },
        awayTeam: { id: 2, name: "Team B", shortName: "TB", logo: null },
      },
    ]);

    const result = await computeStandings(1);

    expect(result).toHaveLength(2);
    expect(result[0].played).toBe(0);
    expect(result[0].points).toBe(0);
    expect(result[1].played).toBe(0);
  });
});
