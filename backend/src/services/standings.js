import { prisma } from "../config/prisma.js";
import { normalizeMatchStatus } from "./helpers.js";

export async function computeStandings(competitionId) {
  const competition = await prisma.competition.findUnique({
    where: { id: Number(competitionId) },
    include: { teams: true },
  });
  if (!competition) return [];

  const matches = await prisma.match.findMany({
    where: { competitionId: competition.id },
    include: { homeTeam: true, awayTeam: true },
  });

  const finished = matches.filter(
    (m) =>
      m.homeScore !== null &&
      m.awayScore !== null &&
      (normalizeMatchStatus(m.status) === "FINISHED" || m.isFinished)
  );

  const stats = new Map(
    competition.teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        name: t.shortName || t.name,
        logo: t.logo,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ])
  );

  for (const m of finished) {
    const home = stats.get(m.homeTeamId);
    const away = stats.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  for (const s of stats.values()) {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  }

  return [...stats.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    )
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export async function computeTopScorers(limit = 10) {
  const players = await prisma.player.findMany({
    where: { status: "PUBLISHED", goals: { gt: 0 } },
    include: { team: true },
    orderBy: [{ goals: "desc" }, { assists: "desc" }],
    take: limit,
  });

  return players.map((p, i) => ({
    rank: i + 1,
    playerId: p.id,
    player: p.name,
    teamId: p.teamId,
    team: p.team.shortName || p.team.name,
    goals: p.goals,
    assists: p.assists,
  }));
}