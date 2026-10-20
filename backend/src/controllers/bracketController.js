import { asyncHandler } from "../middleware/errorHandler.js";
import { generateBracket, getBracket } from "../services/bracket.js";
import { logActivity } from "../services/helpers.js";

export const generateCompetitionBracket = asyncHandler(async (req, res) => {
  const { teamIds, date, reset } = req.body;
  const result = await generateBracket(Number(req.params.id), { teamIds, date, reset });
  await logActivity("Generated bracket", { entity: "Competition", entityId: Number(req.params.id), userId: req.user.id });
  res.status(201).json({ success: true, ...result });
});

export const getCompetitionBracket = asyncHandler(async (req, res) => {
  const bracket = await getBracket(Number(req.params.id));
  res.json({ success: true, bracket });
});
