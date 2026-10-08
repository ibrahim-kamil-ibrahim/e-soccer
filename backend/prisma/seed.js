import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Import existing frontend datasets (pure ESM data modules)
const { competitions } = await import("../../frontend/src/data/competitions.js");
const { teams } = await import("../../frontend/src/data/teams.js");
const { players } = await import("../../frontend/src/data/players.js");
const { getMatches, getMatchEvents, getMatchStatistics, getMatchLineups } = await import(
  "../../frontend/src/data/matches.js"
);
const { news } = await import("../../frontend/src/data/news.js");

async function main() {
  console.log("Seeding E-Soccer database...");

  // ---- Competitions ----
  const competitionMap = new Map();
  for (const c of competitions) {
    const row = await prisma.competition.upsert({
      where: { name: c.name },
      update: {
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
      },
      create: {
        name: c.name,
        shortName: c.shortName || null,
        country: c.country || null,
        region: c.region || null,
        level: c.level || null,
        season: c.season || null,
        logo: c.logo || null,
        color: c.color || null,
        status: "PUBLISHED",
        sortOrder: c.id,
      },
    });
    competitionMap.set(c.name, row.id);
  }

  // ---- Teams (from teams.js) ----
  const teamMap = new Map();
  for (const t of teams) {
    const competitionId = competitionMap.get(t.competition) ?? null;
    const row = await prisma.team.upsert({
      where: { name: t.name },
      update: {
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
      },
      create: {
        name: t.name,
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
      },
    });
    teamMap.set(teamKey(t.name), row.id);
  }

  // ---- Players ----
  for (const p of players) {
    const teamId = teamMap.get(teamKey(p.team));
    if (!teamId) {
      console.warn(`  ! Player "${p.name}" references unknown team "${p.team}", skipping`);
      continue;
    }
    await prisma.player.create({
      data: {
        name: p.name,
        teamId,
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
      },
    });
  }

  // ---- Matches (with lookup teams) ----
  // Matches reference team names not present in teams.js (e.g. "Dire Dawa City S.C.")
  // so we create missing teams on the fly, keyed by short name used in matches data.
  const matchTeamNameToId = {};
  const resolveMatchTeam = async (name, logo) => {
    if (matchTeamNameToId[name]) return matchTeamNameToId[name];
    // Existing team via teams.js? matched by name or shortName
    const existing = await prisma.team.findFirst({
      where: { OR: [{ name }, { shortName: name }] },
    });
    if (existing) {
      matchTeamNameToId[name] = existing.id;
      return existing.id;
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
  for (const m of matchList) {
    const homeTeamId = await resolveMatchTeam(m.homeTeam, m.homeLogo);
    const awayTeamId = await resolveMatchTeam(m.awayTeam, m.awayLogo);
    const competitionId = competitionMap.get(m.competition) ?? null;

    const date = new Date(`${m.date}T${m.time || "15:00"}:00`);

    const statistics = getMatchStatistics();
    const events = getMatchEvents();
    const lineups = getMatchLineups();

    await prisma.match.create({
      data: {
        competitionId,
        season: m.season || null,
        division: m.division || null,
        homeTeamId,
        awayTeamId,
        homeScore: m.homeScore ?? null,
        awayScore: m.awayScore ?? null,
        status: m.status === "UPCOMING" ? "UPCOMING" : m.status === "LIVE" ? "LIVE" : "FT",
        minute: m.minute ?? null,
        date,
        timeField: m.time || null,
        venue: m.venue || null,
        referee: m.referee || null,
        attendance: m.attendance ?? null,
        isLive: Boolean(m.isLive),
        isFinished: Boolean(m.isFinished),
        events: {
          create: events.map((e) => ({
            type: e.type.toUpperCase(),
            side: e.team === "away" ? "AWAY" : "HOME",
            minute: e.minute,
            playerName: e.player || e.playerIn || e.playerOut || null,
            assist: e.assist || null,
            playerIn: e.playerIn || null,
            playerOut: e.playerOut || null,
          })),
        },
        lineups: {
          create: ["home", "away"].map((side) => ({
            side: side === "away" ? "AWAY" : "HOME",
            formation: lineups[side]?.formation || null,
            startingXI: lineups[side]?.starting || [],
            substitutes: lineups[side]?.substitutes || [],
          })),
        },
        statistics: {
          create: {
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
        },
      },
    });
  }

  console.log(`  Matches: ${matchList.length}`);

  // ---- News ----
  for (const n of news) {
    const slug = slugify(n.title);
    await prisma.newsArticle.upsert({
      where: { slug },
      update: {
        title: n.title,
        summary: n.summary || null,
        content: n.content || null,
        category: n.category || null,
        author: n.author || null,
        coverImage: n.image || null,
        publishedAt: n.date ? new Date(`${n.date}T09:00:00`) : new Date(),
        status: "PUBLISHED",
      },
      create: {
        title: n.title,
        slug,
        summary: n.summary || null,
        content: n.content || null,
        category: n.category || null,
        author: n.author || null,
        coverImage: n.image || null,
        publishedAt: n.date ? new Date(`${n.date}T09:00:00`) : new Date(),
        status: "PUBLISHED",
        featured: false,
      },
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

  // ---- Admin users ----
  const adminPassword = await bcrypt.hash("admin1234", 12);
  const editorPassword = await bcrypt.hash("editor1234", 12);
  const ibroPassword = await bcrypt.hash("12341234", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@esoccer.et" },
    update: { name: "Super Admin", username: "admin", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: adminPassword },
    create: { name: "Super Admin", email: "admin@esoccer.et", username: "admin", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: adminPassword },
  });
  await prisma.adminUser.upsert({
    where: { email: "editor@esoccer.et" },
    update: { name: "Editor", username: "editor", role: "EDITOR", status: "ACTIVE", passwordHash: editorPassword },
    create: { name: "Editor", email: "editor@esoccer.et", username: "editor", role: "EDITOR", status: "ACTIVE", passwordHash: editorPassword },
  });
  await prisma.adminUser.upsert({
    where: { email: "ibro@esoccer.et" },
    update: { name: "Ibro", username: "ibro", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: ibroPassword },
    create: { name: "Ibro", email: "ibro@esoccer.et", username: "ibro", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: ibroPassword },
  });

  console.log("Seed complete.");
  console.log("  Admin login: admin@esoccer.et / admin1234");
  console.log("  Editor login: editor@esoccer.et / editor1234");
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