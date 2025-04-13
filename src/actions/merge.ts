// lib/actions/merge.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { renderTemplate } from "../util/template.js";
import { logger } from "../util/logger.js";

export async function mergeAction(
  context: Context<"pull_request">,
  config: any,
  validationResults: ValidationResult[]
): Promise<void> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      throw new Error("Pull request not found");
    }

    // Check if PR is mergeable
    if (pr.mergeable === false) {
      throw new Error("Pull request is not mergeable");
    }

    // If mergeable status is null (unknown), try to fetch updated PR data
    if (pr.mergeable === null) {
      // Wait a bit for GitHub to calculate mergeable state
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const prResponse = await context.octokit.pulls.get({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: pr.number,
      });

      if (prResponse.data.mergeable === false) {
        throw new Error("Pull request is not mergeable after refresh");
      }
    }

    // Prepare merge options
    const mergeMethod = config.method || "merge";
    const title = config.commit_title
      ? renderTemplate(config.commit_title, context, validationResults)
      : pr.title;

    const message = config.commit_message
      ? renderTemplate(config.commit_message, context, validationResults)
      : "";

    // Attempt to merge
    try {
      await context.octokit.pulls.merge({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: pr.number,
        merge_method: mergeMethod,
        commit_title: title,
        commit_message: message,
      });

      logger.info(
        `Successfully merged PR #${pr.number} using method: ${mergeMethod}`
      );
    } catch (error) {
      throw new Error(`Failed to merge PR: ${error}`);
    }
  } catch (error) {
    logger.error(`Error in merge action: ${error}`);
    throw error;
  }
}
