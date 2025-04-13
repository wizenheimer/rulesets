// lib/actions/assign.ts
import { Context } from "probot";
import { logger } from "../util/logger.js";

export async function assignAction(
  context: Context<"pull_request.opened">,
  config: any
): Promise<void> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      throw new Error("No pull request found");
    }

    // Get current assignees
    const currentAssignees = pr.assignees.map(
      (assignee: { login: string }) => assignee.login
    );

    // Prepare new assignees
    let assignees: string[] = [];
    if (config.assignees && config.assignees.length > 0) {
      assignees = Array.isArray(config.assignees)
        ? config.assignees
        : [config.assignees];

      // Handle special annotations
      assignees = assignees
        .map((assignee) => {
          if (assignee === "@author") {
            return pr.user.login;
          }

          // Handle team references
          if (assignee.includes("/")) {
            logger.warn(
              `Team assignments not supported directly in assign action: ${assignee}`
            );
            return null;
          }

          return assignee;
        })
        .filter((assignee) => assignee !== null) as string[];

      // Filter out current assignees
      const newAssignees = assignees.filter(
        (assignee) => !currentAssignees.includes(assignee)
      );

      if (newAssignees.length > 0) {
        // Add new assignees
        await context.octokit.issues.addAssignees({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: pr.number,
          assignees: newAssignees,
        });

        logger.info(
          `Added assignees to PR #${pr.number}: ${newAssignees.join(", ")}`
        );
      } else {
        logger.info(`No new assignees to add to PR #${pr.number}`);
      }
    }

    // Handle removal of assignees
    if (config.remove && config.remove.length > 0) {
      const assigneesToRemove = Array.isArray(config.remove)
        ? config.remove
        : [config.remove];

      const toRemove = assigneesToRemove.filter((assignee: string) =>
        currentAssignees.includes(assignee)
      );

      if (toRemove.length > 0) {
        await context.octokit.issues.removeAssignees({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: pr.number,
          assignees: toRemove,
        });

        logger.info(
          `Removed assignees from PR #${pr.number}: ${toRemove.join(", ")}`
        );
      }
    }
  } catch (error) {
    logger.error(`Error in assign action: ${error}`);
    throw error;
  }
}
