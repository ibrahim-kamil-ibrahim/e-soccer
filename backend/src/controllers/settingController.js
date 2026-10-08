import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logActivity } from "../services/helpers.js";

const DEFAULT_SETTINGS = {
  general: {
    siteName: "E-Soccer — Dire Dawa Football Hub",
    siteDescription: "Your home of Ethiopian football.",
    logo: null,
    favicon: null,
  },
  branding: {
    primaryColor: "#16A34A",
    secondaryColor: "#020817",
  },
  social: {
    facebook: "",
    telegram: "",
    instagram: "",
    x: "",
    youtube: "",
  },
  contact: {
    email: "",
    phone: "",
    address: "Dire Dawa, Ethiopia",
  },
  notifications: {
    enabled: true,
    matchNotifications: true,
    newsNotifications: true,
  },
};

const DEFAULT_HOMEPAGE = {
  hero: {
    enabled: true,
    matchId: null,
    articleId: null,
    title: "",
    subtitle: "",
    image: null,
    ctaText: "",
    ctaLink: "",
  },
  sections: {
    live: true,
    todayMatches: true,
    topCompetitions: true,
    featuredTeams: true,
    topScorers: true,
    latestNews: true,
  },
};

export const getSettings = asyncHandler(async (_req, res) => {
  const rows = await prisma.websiteSetting.findMany();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  res.json({ success: true, settings: { ...DEFAULT_SETTINGS, ...map } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const merged = { ...DEFAULT_SETTINGS, ...body };
  for (const key of Object.keys(merged)) {
    const value = merged[key];
    if (value !== undefined) {
      await prisma.websiteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }
  await logActivity("Updated website settings", { userId: req.user.id });
  res.json({ success: true, settings: merged });
});

export const getHomepage = asyncHandler(async (_req, res) => {
  const rows = await prisma.homepageSetting.findMany();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  const merged = {
    hero: { ...DEFAULT_HOMEPAGE.hero, ...(map.hero || {}) },
    sections: { ...DEFAULT_HOMEPAGE.sections, ...(map.sections || {}) },
  };
  res.json({ success: true, homepage: merged });
});

export const updateHomepage = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const merged = {
    hero: { ...DEFAULT_HOMEPAGE.hero, ...(body.hero || {}) },
    sections: { ...DEFAULT_HOMEPAGE.sections, ...(body.sections || {}) },
  };
  await prisma.homepageSetting.upsert({
    where: { key: "homepage" },
    update: { value: merged },
    create: { key: "homepage", value: merged },
  });
  await logActivity("Updated homepage settings", { userId: req.user.id });
  res.json({ success: true, homepage: merged });
});