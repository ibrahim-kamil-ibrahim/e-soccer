import { describe, it, expect } from "vitest";
import {
  formatPagination,
  buildSearchWhere,
  slugify,
} from "../src/services/helpers.js";

describe("helpers", () => {
  describe("formatPagination", () => {
    it("returns defaults for empty query", () => {
      expect(formatPagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it("clamps page to minimum 1", () => {
      expect(formatPagination({ page: "-5" })).toEqual({
        page: 1,
        limit: 20,
        skip: 0,
      });
    });

    it("clamps limit to maximum 100", () => {
      expect(formatPagination({ limit: "500" })).toEqual({
        page: 1,
        limit: 100,
        skip: 0,
      });
    });

    it("calculates skip correctly", () => {
      expect(formatPagination({ page: "3", limit: "10" })).toEqual({
        page: 3,
        limit: 10,
        skip: 20,
      });
    });
  });

  describe("buildSearchWhere", () => {
    it("returns empty object for empty search", () => {
      expect(buildSearchWhere("", ["name"])).toEqual({});
      expect(buildSearchWhere(null, ["name"])).toEqual({});
    });

    it("builds OR clause for multiple fields", () => {
      const result = buildSearchWhere("test", ["name", "email"]);
      expect(result).toHaveProperty("OR");
      expect(result.OR).toHaveLength(2);
      expect(result.OR[0]).toHaveProperty("name");
      expect(result.OR[1]).toHaveProperty("email");
    });

    it("escapes special characters", () => {
      const result = buildSearchWhere("test%_value", ["name"]);
      const containsValue = result.OR[0].name.contains;
      expect(containsValue).toBe("test\\%\\_value");
    });
  });

  describe("slugify", () => {
    it("converts to lowercase and replaces spaces with hyphens", () => {
      expect(slugify("Dire Dawa City")).toBe("dire-dawa-city");
    });

    it("removes special characters", () => {
      expect(slugify("Hello, World!")).toBe("hello-world");
    });

    it("collapses multiple hyphens", () => {
      expect(slugify("Hello   World")).toBe("hello-world");
    });

    it("trims leading/trailing hyphens", () => {
      expect(slugify("  Hello World  ")).toBe("hello-world");
    });

    it("returns fallback for empty strings", () => {
      expect(slugify("")).toMatch(/^item-/);
    });
  });
});
