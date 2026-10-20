import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const FINISHED = "FINISHED";

export function computeWinner(match) {
  if (!match || match.status !== FINISHED) return null;
  const { homeScore, awayScore, homePenalties, awayPenalties, homeTeamId, awayTeamId } = match;
  if (homeScore != null && awayScore != null) {
    if (homeScore > awayScore) return homeTeamId;
    if (awayScore > homeScore) return awayTeamId;
    if (homePenalties != null && awayPenalties != null) {
      if (homePenalties > awayPenalties) return homeTeamId;
      if (awayPenalties > homePenalties) return awayTeamId;
      return null;
    }
    return null;
  }
  return null;
}

export function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function roundNameFor(size, roundNumber) {
  const matches = size / 2 ** roundNumber;
  if (matches === 1) return "Final";
  if (matches === 2) return "Semi-final";
  if (matches === 4) return "Quarter-final";
  return `Round ${roundNumber}`;
}

function slotTeam(slot) {
  if (!slot) return null;
  if (slot.type === "bye") return slot.resolvedTeamId;
  if (slot.type === "match") return slot.resolvedTeamId;
  return null;
}

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Kickoff for a bracket round, derived from the tournament's base date.
 * Rounds are sequential, so each round gets its own day: a team that advances
 * must not be booked twice at the same kickoff, or the fixture-clash guard
 * rejects the next round's update. Deriving from the round number (rather than
 * "now") also keeps every match of a round on the same slot.
 */
export function roundKickoff(baseDate, roundNumber) {
  const d = new Date(baseDate || Date.now());
  d.setDate(d.getDate() + (roundNumber - 1));
  return d;
}

function kickoffFields(baseDate, roundNumber) {
  const d = roundKickoff(baseDate, roundNumber);
  return { date: d, timeField: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` };
}

async function buildBracketTree(competitionId, { materialize = false } = {}) {
  const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!competition) throw new AppError(404, "Competition not found");
  const seeds = competition.bracketSeeds;
  if (!Array.isArray(seeds) || seeds.length === 0) return null;
  const size = seeds.length;
  const totalRounds = Math.round(Math.log2(size));
  if (2 ** totalRounds !== size) throw new AppError(422, "Invalid bracket seeds");

  const dbMatches = await prisma.match.findMany({
    where: { competitionId, roundNumber: { not: null } },
    include: { homeTeam: true, awayTeam: true },
  });
  const matchMap = new Map(dbMatches.map((m) => [`${m.roundNumber}-${m.bracketPosition}`, m]));
  // Later rounds schedule relative to round 1, so a team advancing plays on a
  // different day instead of colliding with its own previous fixture.
  const bracketBase = dbMatches.find((m) => m.roundNumber === 1)?.date || new Date();

  for (const m of dbMatches) {
    const w = computeWinner(m);
    if (w !== m.winnerTeamId) {
      await prisma.match.update({ where: { id: m.id }, data: { winnerTeamId: w } });
      m.winnerTeamId = w;
    }
  }

  const teams = await prisma.team.findMany({ select: { id: true, name: true, shortName: true, logo: true } });
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const slots = [];
  slots[1] = [];
  for (let p = 0; p < size / 2; p++) {
    const home = seeds[2 * p];
    const away = seeds[2 * p + 1];
    if (home != null && away != null) {
      const key = `1-${p}`;
      let m = matchMap.get(key);
      if (!m && materialize) {
        m = await prisma.match.create({ data: { competitionId, roundNumber: 1, bracketPosition: p, homeTeamId: home, awayTeamId: away, status: "SCHEDULED", ...kickoffFields(bracketBase, 1) } });
        matchMap.set(key, m);
      }
      slots[1][p] = { type: "match", homeTeamId: home, awayTeamId: away, dbMatch: m || null, resolvedTeamId: m?.winnerTeamId ?? null };
    } else if (home != null) {
      slots[1][p] = { type: "bye", resolvedTeamId: home };
    } else if (away != null) {
      slots[1][p] = { type: "bye", resolvedTeamId: away };
    } else {
      slots[1][p] = { type: "empty" };
    }
  }

  for (let r = 2; r <= totalRounds; r++) {
    slots[r] = [];
    const count = size / 2 ** r;
    for (let p = 0; p < count; p++) {
      const left = slots[r - 1][2 * p];
      const right = slots[r - 1][2 * p + 1];
      const lt = slotTeam(left);
      const rt = slotTeam(right);
      if (lt != null && rt != null) {
        const key = `${r}-${p}`;
        let m = matchMap.get(key);
        if (!m && materialize) {
          m = await prisma.match.create({ data: { competitionId, roundNumber: r, bracketPosition: p, homeTeamId: lt, awayTeamId: rt, status: "SCHEDULED", ...kickoffFields(bracketBase, r) } });
          matchMap.set(key, m);
        } else if (m && materialize && (m.homeTeamId !== lt || m.awayTeamId !== rt)) {
          m = await prisma.match.update({ where: { id: m.id }, data: { homeTeamId: lt, awayTeamId: rt } });
          matchMap.set(key, m);
        }
        slots[r][p] = { type: "match", homeTeamId: lt, awayTeamId: rt, dbMatch: m || null, resolvedTeamId: m?.winnerTeamId ?? null };
      } else if (lt != null) {
        slots[r][p] = { type: "bye", resolvedTeamId: lt };
      } else if (rt != null) {
        slots[r][p] = { type: "bye", resolvedTeamId: rt };
      } else {
        slots[r][p] = { type: "empty" };
      }
    }
  }

  const formatSlot = (r, p) => {
    const s = slots[r][p];
    if (!s) return null;
    if (s.type === "match") {
      return {
        id: s.dbMatch?.id ?? null,
        position: p,
        home: s.homeTeamId ? teamById.get(s.homeTeamId) || { id: s.homeTeamId, name: "TBD", shortName: null, logo: null } : null,
        away: s.awayTeamId ? teamById.get(s.awayTeamId) || { id: s.awayTeamId, name: "TBD", shortName: null, logo: null } : null,
        homeScore: s.dbMatch?.homeScore ?? null,
        awayScore: s.dbMatch?.awayScore ?? null,
        status: s.dbMatch?.status ?? "SCHEDULED",
        winnerTeamId: s.dbMatch?.winnerTeamId ?? null,
        homePenalties: s.dbMatch?.homePenalties ?? null,
        awayPenalties: s.dbMatch?.awayPenalties ?? null,
        date: s.dbMatch?.date ?? null,
        timeField: s.dbMatch?.timeField ?? null,
      };
    }
    if (s.type === "bye") {
      const team = teamById.get(s.resolvedTeamId) || { id: s.resolvedTeamId, name: "TBD", shortName: null, logo: null };
      return { id: null, position: p, home: team, away: { id: null, name: "Bye", shortName: null, logo: null }, homeScore: null, awayScore: null, status: "SCHEDULED", winnerTeamId: null, homePenalties: null, awayPenalties: null, date: null, timeField: null };
    }
    return { id: null, position: p, home: { id: null, name: "TBD", shortName: null, logo: null }, away: { id: null, name: "TBD", shortName: null, logo: null }, homeScore: null, awayScore: null, status: "SCHEDULED", winnerTeamId: null, homePenalties: null, awayPenalties: null, date: null, timeField: null };
  };

  const rounds = [];
  for (let r = 1; r <= totalRounds; r++) {
    const count = size / 2 ** r;
    const matches = [];
    for (let p = 0; p < count; p++) {
      const fm = formatSlot(r, p);
      if (fm) matches.push(fm);
    }
    rounds.push({ roundNumber: r, name: roundNameFor(size, r), matches });
  }

  const finalSlot = slots[totalRounds]?.[0];
  const champion = finalSlot?.type === "match" && finalSlot.resolvedTeamId ? teamById.get(finalSlot.resolvedTeamId) || null : null;

  return { competitionId, seeds, size, totalRounds, rounds, champion };
}

export async function syncBracket(competitionId) {
  if (!competitionId) return;
  try {
    await buildBracketTree(competitionId, { materialize: true });
  } catch (e) {
    console.error("Bracket sync failed:", e.message);
  }
}

export async function getBracket(competitionId) {
  return buildBracketTree(competitionId, { materialize: false });
}

export async function generateBracket(competitionId, { teamIds, date, reset = false } = {}) {
  if (!Array.isArray(teamIds) || teamIds.length < 2) throw new AppError(422, "At least 2 team IDs are required");
  // The admin fills the draw position by position. A null/empty slot is an
  // explicit bye: the team paired against it advances without playing.
  const seedsIn = teamIds.map((v) => (v === null || v === "" ? null : Number(v)));
  if (seedsIn.some((n) => n !== null && !Number.isInteger(n))) throw new AppError(422, "Team IDs must be integers");
  const present = seedsIn.filter((n) => n !== null);
  if (present.length < 2) throw new AppError(422, "A bracket needs at least 2 teams in the draw");
  const size = nextPow2(seedsIn.length);
  const unique = [...new Set(present)];
  const teams = await prisma.team.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (teams.length !== unique.length) throw new AppError(422, "One or more teams do not exist");
  const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!competition) throw new AppError(404, "Competition not found");
  const existing = await prisma.match.count({ where: { competitionId, roundNumber: { not: null } } });
  if (existing > 0 && !reset) throw new AppError(409, "Bracket already exists for this competition. Pass reset=true to regenerate.");
  if (existing > 0 && reset) await prisma.match.deleteMany({ where: { competitionId, roundNumber: { not: null } } });

  const seeds = [...seedsIn, ...Array(size - seedsIn.length).fill(null)];
  const matchDate = date ? new Date(date) : new Date();
  const created = [];
  for (let p = 0; p < size / 2; p++) {
    const home = seeds[2 * p];
    const away = seeds[2 * p + 1];
    if (home != null && away != null) {
      const m = await prisma.match.create({ data: { competitionId, roundNumber: 1, bracketPosition: p, homeTeamId: home, awayTeamId: away, status: "SCHEDULED", ...kickoffFields(matchDate, 1) } });
      created.push(m);
    }
  }
  await prisma.competition.update({ where: { id: competitionId }, data: { bracketSeeds: seeds } });
  return { competitionId, size, totalRounds: Math.round(Math.log2(size)), matchesCreated: created.length, seeds };
}
