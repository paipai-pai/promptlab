import { describe, expect, it } from "vitest";

import {
  extractTemplateVariables,
  renderPromptTemplate,
} from "@/features/prompts/template";

describe("extractTemplateVariables", () => {
  it("returns unique valid variables in source order", () => {
    expect(
      extractTemplateVariables(
        "{{language}} / {{task_2}} / {{language}} / {{_private}}",
      ),
    ).toEqual(["language", "task_2", "_private"]);
  });

  it("ignores invalid names", () => {
    expect(
      extractTemplateVariables("{{2bad}} {{has-dash}} {{ has_space }}"),
    ).toEqual([]);
  });
});

describe("renderPromptTemplate", () => {
  it("replaces valid variables and reuses one value for duplicates", () => {
    expect(
      renderPromptTemplate(
        "用 {{language}} 编写 {{task_2}}。再次使用 {{language}}。",
        { language: "TypeScript", task_2: "单元测试" },
      ),
    ).toEqual({
      renderedContent: "用 TypeScript 编写 单元测试。再次使用 TypeScript。",
      missingVariables: [],
    });
  });

  it("keeps missing placeholders and reports each missing variable once", () => {
    expect(
      renderPromptTemplate("{{topic}} / {{topic}} / {{audience}}", {
        topic: "   ",
      }),
    ).toEqual({
      renderedContent: "{{topic}} / {{topic}} / {{audience}}",
      missingVariables: ["topic", "audience"],
    });
  });

  it("leaves invalid placeholders unchanged", () => {
    expect(
      renderPromptTemplate("{{2bad}} {{has-dash}} {{ valid_space }}", {
        "2bad": "wrong",
      }),
    ).toEqual({
      renderedContent: "{{2bad}} {{has-dash}} {{ valid_space }}",
      missingVariables: [],
    });
  });

  it("inserts replacement values literally", () => {
    expect(renderPromptTemplate("Value: {{value}}", { value: "$& $` $$" })).toEqual({
      renderedContent: "Value: $& $` $$",
      missingVariables: [],
    });
  });
});
