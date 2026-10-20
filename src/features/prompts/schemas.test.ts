import { describe, expect, it } from "vitest";

import {
  createPromptSchema,
  promptListFiltersSchema,
  promptMetadataSchema,
} from "@/features/prompts/schemas";

describe("Prompt schemas", () => {
  it("accepts fixed categories and trims persisted text", () => {
    expect(
      createPromptSchema.parse({
        title: "  API reviewer  ",
        description: "  Review an API  ",
        category: "coding",
        content: "  Review {{endpoint}}  ",
      }),
    ).toEqual({
      title: "API reviewer",
      description: "Review an API",
      category: "coding",
      content: "  Review {{endpoint}}  ",
    });
  });

  it("checks raw lengths before normalization to match database constraints", () => {
    const result = createPromptSchema.safeParse({
      title: `x${" ".repeat(120)}`,
      description: "",
      category: "coding",
      content: `x${" ".repeat(50000)}`,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
      expect(result.error.flatten().fieldErrors.content).toBeDefined();
    }
  });

  it("rejects blank required fields, invalid categories, and oversized values", () => {
    expect(
      createPromptSchema.safeParse({
        title: "   ",
        description: "",
        category: "sales",
        content: "   ",
      }).success,
    ).toBe(false);
    expect(
      promptMetadataSchema.safeParse({
        title: "x".repeat(121),
        description: "x".repeat(1001),
        category: "coding",
      }).success,
    ).toBe(false);
  });

  it("normalizes unsafe list filter values to bounded defaults", () => {
    expect(
      promptListFiltersSchema.parse({
        query: "x".repeat(501),
        category: "invalid",
        page: "0",
        pageSize: "100",
      }),
    ).toEqual({ query: "", category: "all", page: 1, pageSize: 12 });
  });
});
