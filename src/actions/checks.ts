// lib/actions/checks.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";
import { renderTemplate } from "../util/template.js";

type ChecksOutput = {
  title: string;
  summary: string;
  text?: string;
};

export async function checksAction(
  context: Context<"pull_request">,
  config: any,
  validationResults: ValidationResult[]
): Promise<void> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      throw new Error("No pull request found");
    }

    // Default values
    const status = config.status || "completed";
    const conclusion = config.conclusion || "success";
    const title = config.title || "PR Validator";
    const summary = config.summary || "PR validation complete";

    // Prepare output
    const output: ChecksOutput = {
      title: renderTemplate(title, context, validationResults),
      summary: renderTemplate(summary, context, validationResults),
    };

    // Add detailed text if provided
    if (config.text) {
      output.text = renderTemplate(config.text, context, validationResults);
    }

    // Create or update check
    try {
      await context.octokit.checks.create({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        name: config.name || "PR Validator",
        head_sha: pr.head.sha,
        status,
        conclusion: status === "completed" ? conclusion : undefined,
        output,
        started_at: new Date().toISOString(),
        completed_at:
          status === "completed" ? new Date().toISOString() : undefined,
      });

      logger.info(
        `Created check for PR #${pr.number} with status: ${status}, conclusion: ${conclusion}`
      );
    } catch (error) {
      throw new Error(`Failed to create check: ${error}`);
    }
  } catch (error) {
    logger.error(`Error in checks action: ${error}`);
    throw error;
  }
}
