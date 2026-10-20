const TEMPLATE_VARIABLE_PATTERN = /{{([A-Za-z_][A-Za-z0-9_]*)}}/g;

export type PromptVariableValues = Readonly<Record<string, string>>;

export type RenderedPromptTemplate = {
  renderedContent: string;
  missingVariables: string[];
};

export function extractTemplateVariables(content: string) {
  const variables: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const variable = match[1];

    if (!seen.has(variable)) {
      seen.add(variable);
      variables.push(variable);
    }
  }

  return variables;
}

export function renderPromptTemplate(
  content: string,
  variableValues: PromptVariableValues,
): RenderedPromptTemplate {
  const missingVariables: string[] = [];
  const missing = new Set<string>();

  const renderedContent = content.replace(
    TEMPLATE_VARIABLE_PATTERN,
    (placeholder, variable: string) => {
      const value = variableValues[variable];

      if (value === undefined || value.trim().length === 0) {
        if (!missing.has(variable)) {
          missing.add(variable);
          missingVariables.push(variable);
        }

        return placeholder;
      }

      return value;
    },
  );

  return { renderedContent, missingVariables };
}
