// lib/actions/comment.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { renderTemplate } from "../util/template.js";
import { logger } from "../util/logger.js";

export async function commentAction(
  context: Context<"pull_request">,
  config: any,
  validationResults: ValidationResult[]
): Promise<void> {
  try {
    if (!config.body) {
      throw new Error("Comment body is required");
    }

    const body = renderTemplate(config.body, context, validationResults);
    const prNumber = context.payload.pull_request.number;

    if (!prNumber) {
      throw new Error("Pull request number not found");
    }

    const { owner, repo } = context.repo();

    // Check if we should create a new comment or update an existing one
    if (config.create_new !== false) {
      // Create a new comment
      await context.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: body,
      });

      logger.info(`Created new comment on PR #${prNumber}`);
    } else {
      // Try to find and update an existing bot comment
      const comments = await context.octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });

      // Get the bot's username
      const botAuth = await context.octokit.apps.getAuthenticated();
      const botLogin = botAuth.data?.slug ? `${botAuth.data.slug}[bot]` : null;

      if (!botLogin) {
        throw new Error("Could not determine bot username");
      }

      // Find comments from the bot
      const botComments = comments.data.filter(
        (comment) => comment.user?.login === botLogin
      );

      if (botComments.length > 0) {
        // Update the most recent bot comment
        const comment = botComments[botComments.length - 1];

        await context.octokit.issues.updateComment({
          owner,
          repo,
          comment_id: comment.id,
          body: body,
        });

        logger.info(`Updated comment #${comment.id} on PR #${prNumber}`);
      } else {
        // No bot comments found, create a new one
        await context.octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: body,
        });

        logger.info(
          `Created new comment on PR #${prNumber} (no existing bot comments found)`
        );
      }
    }
  } catch (error) {
    logger.error(`Error in comment action: ${error}`);
    throw error;
  }
}
