import { describe, it, expect } from "vitest";
import {
  normalizeMatchStatus,
  matchStatusFlags,
  toMatchStatus,
  MATCH_STATUSES,
} from "../src/services/helpers.js";

describe("match status normalization", () => {
  it("exposes only canonical statuses", () => {
    expect(MATCH_STATUSES).toEqual(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]);
  });

  describe("normalizeMatchStatus", () => {
    it("passes canonical statuses through", () => {
      for (const s of MATCH_STATUSES) expect(normalizeMatchStatus(s)).toBe(s);
    });

    it("maps legacy UPCOMING to SCHEDULED", () => {
      expect(normalizeMatchStatus("UPCOMING")).toBe("SCHEDULED");
    });

    it("maps legacy FT to FINISHED", () => {
      expect(normalizeMatchStatus("FT")).toBe("FINISHED");
    });

    it("coerces unknown values to SCHEDULED", () => {
      expect(normalizeMatchStatus("NONSENSE")).toBe("SCHEDULED");
      expect(normalizeMatchStatus(undefined)).toBe("SCHEDULED");
      expect(normalizeMatchStatus(null)).toBe("SCHEDULED");
    });
  });

  describe("matchStatusFlags", () => {
    it("derives isLive/isFinished from status", () => {
      expect(matchStatusFlags("LIVE")).toEqual({ status: "LIVE", isLive: true, isFinished: false });
      expect(matchStatusFlags("FINISHED")).toEqual({ status: "FINISHED", isLive: false, isFinished: true });
      expect(matchStatusFlags("SCHEDULED")).toEqual({ status: "SCHEDULED", isLive: false, isFinished: false });
      expect(matchStatusFlags("POSTPONED")).toEqual({ status: "POSTPONED", isLive: false, isFinished: false });
      expect(matchStatusFlags("CANCELLED")).toEqual({ status: "CANCELLED", isLive: false, isFinished: false });
    });

    it("ignores any caller-supplied flags", () => {
      const flags = matchStatusFlags("SCHEDULED");
      expect(flags.isLive).toBe(false);
      expect(flags.isFinished).toBe(false);
    });
  });

  describe("toMatchStatus", () => {
    it("defaults minute for LIVE matches", () => {
      expect(toMatchStatus({ status: "LIVE" })).toEqual({
        status: "LIVE",
        isLive: true,
        isFinished: false,
        minute: 0,
      });
    });

    it("nulls scores for SCHEDULED matches without scores", () => {
      expect(toMatchStatus({ status: "SCHEDULED", homeScore: null, awayScore: null, minute: 55 })).toEqual({
        status: "SCHEDULED",
        isLive: false,
        isFinished: false,
        homeScore: null,
        awayScore: null,
        minute: null,
      });
    });

    it("passes provided scores through for SCHEDULED matches but clears minute", () => {
      expect(toMatchStatus({ status: "SCHEDULED", homeScore: 2, awayScore: 1 })).toMatchObject({
        status: "SCHEDULED",
        homeScore: 2,
        awayScore: 1,
        minute: null,
      });
    });

    it("keeps scores for FINISHED matches", () => {
      expect(toMatchStatus({ status: "FINISHED", homeScore: 2, awayScore: 1 })).toEqual({
        status: "FINISHED",
        isLive: false,
        isFinished: true,
      });
    });
  });
});
