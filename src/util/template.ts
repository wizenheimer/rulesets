// lib/util/template.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";

type RepositoryContext = Context<"pull_request">;

/**
 * Render a template string with variables from context and validation results
 */
export function renderTemplate(
  template: string,
  context: RepositoryContext,
  validationResults: ValidationResult[]
): string {
  let rendered = template;

  // Replace pull request variables
  if (context.payload.pull_request) {
    const pr = context.payload.pull_request;
    rendered = rendered
      .replace(/{{ pull_request\.user\.login }}/g, pr.user.login)
      .replace(/{{ pull_request\.title }}/g, pr.title)
      .replace(/{{ pull_request\.body }}/g, pr.body || "")
      .replace(/{{ pull_request\.number }}/g, String(pr.number));
  }

  // Replace repository variables
  if (context.payload.repository) {
    const repo = context.payload.repository;
    rendered = rendered
      .replace(/{{ repository\.name }}/g, repo.name)
      .replace(/{{ repository\.full_name }}/g, repo.full_name);
  }

  // Add validation results summary
  rendered = rendered.replace(
    /{{ validation_summary }}/g,
    generateValidationSummary(validationResults)
  );

  return rendered;
}

/**
 * Generate a validation summary for use in templates
 */
export function generateValidationSummary(
  validationResults: ValidationResult[]
): string {
  if (!validationResults || validationResults.length === 0) {
    return "No validation results available";
  }

  const summary: string[] = [];
  summary.push("## Validation Results\n");

  validationResults.forEach((result) => {
    const icon =
      result.status === "pass" ? "✅" : result.status === "error" ? "⚠️" : "❌";
    summary.push(`${icon} **${result.validator}**: ${result.message}`);
  });

  return summary.join("\n");
}
