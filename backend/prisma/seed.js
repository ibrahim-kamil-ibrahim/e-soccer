import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seed datasets live with the backend so seeding never depends on frontend files.
const { competitions } = await import("./data/competitions.js");
const { teams } = await import("./data/teams.js");
const { players } = await import("./data/players.js");
const { getMatches, getMatchEvents, getMatchStatistics, getMatchLineups } = await import("./data/matches.js");
const { news } = await import("./data/news.js");

// Canonical Prisma MatchStatus enum, with legacy aliases from the old static data.
const MATCH_STATUSES = ["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"];
const STATUS_ALIASES = { FT: "FINISHED", UPCOMING: "SCHEDULED" };
function matchStatusFlags(status) {
  const aliased = STATUS_ALIASES[status] || status;
  const normalized = MATCH_STATUSES.includes(aliased) ? aliased : "SCHEDULED";
  return { status: normalized, isLive: normalized === "LIVE", isFinished: normalized === "FINISHED" };
}

async function main() {
  console.log("Seeding E-Soccer database...");

  // ---- Competitions (idempotent by name) ----
  const competitionMap = new Map();
  for (const c of competitions) {
    const data = {
      shortName: c.shortName || null,
      country: c.country || null,
      region: c.region || null,
      level: c.level || null,
      season: c.season || null,
      description: null,
      logo: c.logo || null,
      color: c.color || null,
      status: "PUBLISHED",
      sortOrder: c.id,
    };
    const row = await prisma.competition.upsert({
      where: { name: c.name },
      update: data,
      create: { name: c.name, ...data },
    });
    competitionMap.set(c.name, row.id);
  }
  console.log(`  Competitions: ${competitions.length}`);

  // ---- Teams (idempotent by name) ----
  const teamMap = new Map();
  for (const t of teams) {
    const competitionId = competitionMap.get(t.competition) ?? null;
    const data = {
      shortName: t.shortName || null,
      city: t.city || null,
      region: t.region || null,
      competitionId,
      division: t.division || null,
      type: t.type || null,
      position: t.position ?? null,
      form: t.form || null,
      logo: t.logo || null,
      color: t.color || null,
      founded: t.founded ?? null,
      stadium: t.stadium || null,
      capacity: t.capacity ?? null,
      league: t.league || null,
      status: "PUBLISHED",
      sortOrder: t.id,
    };
    const row = await prisma.team.upsert({
      where: { name: t.name },
      update: data,
      create: { name: t.name, ...data },
    });
    teamMap.set(teamKey(t.name), row.id);
  }
  console.log(`  Teams: ${teams.length}`);

  // ---- Players (idempotent by name + team) ----
  let playersCreated = 0;
  let playersUpdated = 0;
  for (const p of players) {
    const teamId = teamMap.get(teamKey(p.team));
    if (!teamId) {
      console.warn(`  ! Player "${p.name}" references unknown team "${p.team}", skipping`);
      continue;
    }
    const data = {
      position: p.position || null,
      age: p.age ?? null,
      nationality: p.nationality || null,
      height: p.height || null,
      photo: p.photo || null,
      goals: p.goals || 0,
      assists: p.assists || 0,
      matches: p.matches || 0,
      yellowCards: p.yellowCards || 0,
      redCards: p.redCards || 0,
      minutesPlayed: p.minutesPlayed || 0,
      status: "PUBLISHED",
    };
    const existing = await prisma.player.findFirst({ where: { name: p.name, teamId } });
    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data });
      playersUpdated++;
    } else {
      await prisma.player.create({ data: { name: p.name, teamId, ...data } });
      playersCreated++;
    }
  }
  console.log(`  Players: ${players.length} (${playersCreated} created, ${playersUpdated} updated)`);

  // ---- Matches (idempotent by teams + date + time) ----
  const matchTeamNameToId = {};
  const resolveMatchTeam = async (name, logo) => {
    if (matchTeamNameToId[name]) return matchTeamNameToId[name];
    // Deterministic resolution: exact name first, then shortName
    const byName = await prisma.team.findFirst({ where: { name } });
    if (byName) {
      matchTeamNameToId[name] = byName.id;
      return byName.id;
    }
    const byShort = await prisma.team.findFirst({ where: { shortName: name } });
    if (byShort) {
      matchTeamNameToId[name] = byShort.id;
      return byShort.id;
    }
    const created = await prisma.team.create({
      data: {
        name,
        shortName: name,
        city: "Dire Dawa",
        region: "Dire Dawa",
        division: null,
        type: "Local",
        form: null,
        logo: logo || "⚽",
        status: "PUBLISHED",
      },
    });
    matchTeamNameToId[name] = created.id;
    return created.id;
  };

  const matchList = getMatches();
  let matchesCreated = 0;
  let matchesUpdated = 0;
  for (const m of matchList) {
    const homeTeamId = await resolveMatchTeam(m.homeTeam, m.homeLogo);
    const awayTeamId = await resolveMatchTeam(m.awayTeam, m.awayLogo);
    const competitionId = competitionMap.get(m.competition) ?? null;
    const { status, isLive, isFinished } = matchStatusFlags(m.status);

    const date = new Date(`${m.date}T${m.time || "15:00"}:00`);
    const timeField = m.time || null;

    const statistics = getMatchStatistics();
    const events = getMatchEvents();
    const lineups = getMatchLineups();

    const matchData = {
      competitionId,
      season: m.season || null,
      division: m.division || null,
      homeTeamId,
      awayTeamId,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      status,
      minute: m.minute ?? null,
      date,
      timeField,
      venue: m.venue || null,
      referee: m.referee || null,
      attendance: m.attendance ?? null,
      isLive,
      isFinished,
    };

    const existing = await prisma.match.findFirst({
      where: { homeTeamId, awayTeamId, date },
    });

    let matchId;
    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data: matchData });
      await prisma.matchEvent.deleteMany({ where: { matchId: existing.id } });
      await prisma.matchLineup.deleteMany({ where: { matchId: existing.id } });
      await prisma.matchStatistic.deleteMany({ where: { matchId: existing.id } });
      matchId = existing.id;
      matchesUpdated++;
    } else {
      const created = await prisma.match.create({ data: matchData });
      matchId = created.id;
      matchesCreated++;
    }

    await prisma.matchEvent.createMany({
      data: events.map((e) => ({
        matchId,
        type: e.type.toUpperCase(),
        side: e.team === "away" ? "AWAY" : "HOME",
        minute: e.minute,
        playerName: e.player || e.playerIn || e.playerOut || null,
        assist: e.assist || null,
        playerIn: e.playerIn || null,
        playerOut: e.playerOut || null,
      })),
    });
    await prisma.matchLineup.createMany({
      data: ["home", "away"].map((side) => ({
        matchId,
        side: side === "away" ? "AWAY" : "HOME",
        formation: lineups[side]?.formation || null,
        startingXI: lineups[side]?.starting || [],
        substitutes: lineups[side]?.substitutes || [],
      })),
    });
    await prisma.matchStatistic.create({
      data: {
        matchId,
        possession: statistics.possession ? statistics.possession.home : null,
        shots: statistics.shots ? statistics.shots.home : null,
        shotsOnTarget: statistics.shotsOnTarget ? statistics.shotsOnTarget.home : null,
        corners: statistics.corners ? statistics.corners.home : null,
        fouls: statistics.fouls ? statistics.fouls.home : null,
        offside: statistics.offside ? statistics.offside.home : null,
        saves: statistics.saves ? statistics.saves.home : null,
        yellowCards: statistics.yellowCards ? statistics.yellowCards.home : null,
        redCards: statistics.redCards ? statistics.redCards.home : null,
      },
    });
  }
  console.log(`  Matches: ${matchList.length} (${matchesCreated} created, ${matchesUpdated} updated)`);

  // ---- News (idempotent by slug) ----
  for (const n of news) {
    const slug = slugify(n.title);
    const data = {
      title: n.title,
      summary: n.summary || null,
      content: n.content || null,
      category: n.category || null,
      author: n.author || null,
      coverImage: n.image || null,
      publishedAt: n.date ? new Date(`${n.date}T09:00:00`) : new Date(),
      status: "PUBLISHED",
    };
    await prisma.newsArticle.upsert({
      where: { slug },
      update: data,
      create: { slug, featured: false, ...data },
    });
  }
  console.log(`  News: ${news.length}`);

  // ---- Settings defaults ----
  const settings = {
    general: {
      siteName: "E-Soccer — Dire Dawa Football Hub",
      siteDescription: "Your home of Ethiopian football.",
      logo: "/logo.png",
      favicon: "/favicon.svg",
    },
    branding: { primaryColor: "#16A34A", secondaryColor: "#020817" },
    social: { facebook: "", telegram: "", instagram: "", x: "", youtube: "" },
    contact: { email: "", phone: "", address: "Dire Dawa, Ethiopia" },
    notifications: { enabled: true, matchNotifications: true, newsNotifications: true },
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.websiteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const homepage = {
    hero: { enabled: true, matchId: null, articleId: null, title: "", subtitle: "", image: null, ctaText: "", ctaLink: "" },
    sections: { live: true, todayMatches: true, topCompetitions: true, featuredTeams: true, topScorers: true, latestNews: true },
  };
  await prisma.homepageSetting.upsert({
    where: { key: "homepage" },
    update: { value: homepage },
    create: { key: "homepage", value: homepage },
  });

  // ---- Admin users (idempotent by email) ----
  // Passwords are env-driven; the fallback below is for local development only.
  // Production seeding without SEED_ADMIN_PASSWORD is refused.
  const nodeEnv = process.env.NODE_ENV || "development";
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (nodeEnv === "production" && !seedPassword) {
    throw new Error("Refusing to seed admin users in production without SEED_ADMIN_PASSWORD");
  }
  const adminPassword = seedPassword || "12344321";
  const adminUsers = [
    { name: "E-Soccer Admin", email: "esoccer170@gmail.com", username: "esoccer", role: "SUPER_ADMIN" },
    { name: "Super Admin", email: "admin@esoccer.et", username: "admin", role: "SUPER_ADMIN" },
    { name: "Editor", email: "editor@esoccer.et", username: "editor", role: "EDITOR" },
    { name: "Ibro", email: "ibro@esoccer.et", username: "ibro", role: "SUPER_ADMIN" },
  ];
  for (const u of adminUsers) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: u.email },
      update: { name: u.name, username: u.username, role: u.role, status: "ACTIVE", passwordHash },
      create: { name: u.name, email: u.email, username: u.username, role: u.role, status: "ACTIVE", passwordHash },
    });
  }

  console.log("Seed complete.");
  console.log(`  Admin accounts seeded (${adminPassword === seedPassword ? "password from SEED_ADMIN_PASSWORD" : "development fallback password"}):`);
  for (const u of adminUsers) console.log(`    ${u.role}: ${u.email}`);
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function teamKey(name) {
  return name.trim().toLowerCase();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
