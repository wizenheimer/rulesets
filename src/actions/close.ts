// lib/actions/close.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { renderTemplate } from "../util/template.js";
import { logger } from "../util/logger.js";

export async function closeAction(
  context: Context<"pull_request">,
  config: any,
  validationResults: ValidationResult[]
): Promise<void> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      throw new Error("No pull request found");
    }

    // Add a closing comment if provided
    if (config.reason) {
      const reason = renderTemplate(config.reason, context, validationResults);

      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: pr.number,
        body: reason,
      });

      logger.info(`Added closing comment to PR #${pr.number}: ${reason}`);
    }

    // Close the PR
    await context.octokit.pulls.update({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: pr.number,
      state: "closed",
    });

    logger.info(`Closed PR #${pr.number}`);
  } catch (error) {
    logger.error(`Error in close action: ${error}`);
    throw error;
  }
}
