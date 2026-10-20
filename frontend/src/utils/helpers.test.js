import { describe, it, expect } from "vitest";
import {
  getStatusLabel,
  getStatusColor,
  formatTime,
  MATCH_STATUSES,
} from "./helpers.js";

describe("match status display helpers", () => {
  it("exposes canonical statuses", () => {
    expect(MATCH_STATUSES).toEqual(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]);
  });

  describe("getStatusLabel", () => {
    it("keeps the branded UPCOMING label for SCHEDULED", () => {
      expect(getStatusLabel("SCHEDULED")).toBe("UPCOMING");
    });

    it("keeps the branded FT label for FINISHED", () => {
      expect(getStatusLabel("FINISHED")).toBe("FT");
    });

    it("passes LIVE through and defaults unknown values", () => {
      expect(getStatusLabel("LIVE")).toBe("LIVE");
      expect(getStatusLabel("POSTPONED")).toBe("POSTPONED");
      expect(getStatusLabel(undefined)).toBe("");
    });
  });

  describe("getStatusColor", () => {
    it("returns a distinct class per canonical status", () => {
      const colors = MATCH_STATUSES.map(getStatusColor);
      expect(new Set(colors).size).toBe(MATCH_STATUSES.length);
    });

    it("falls back for unknown statuses", () => {
      expect(getStatusColor("WEIRD")).toBe("text-slate-600 bg-slate-100");
    });
  });

  describe("formatTime", () => {
    it("formats 24h times to 12h with AM/PM", () => {
      expect(formatTime("15:00")).toBe("3:00 PM");
      expect(formatTime("09:30")).toBe("9:30 AM");
      expect(formatTime("00:15")).toBe("12:15 AM");
    });

    it("returns empty string for missing time", () => {
      expect(formatTime("")).toBe("");
      expect(formatTime(null)).toBe("");
    });
  });
});
