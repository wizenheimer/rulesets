// lib/actions/label.ts
import { Context } from "probot";
import { logger } from "../util/logger.js";

export async function labelAction(
  context: Context<"pull_request">,
  config: any
): Promise<void> {
  try {
    const prNumber = context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error("Pull request number not found");
    }

    // Get current labels
    const labelsResponse = await context.octokit.issues.listLabelsOnIssue({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: prNumber,
    });

    const currentLabels = labelsResponse.data.map((label) => label.name);
    let labels = [...currentLabels];

    // Add new labels
    if (config.add && config.add.length > 0) {
      const labelsToAdd = Array.isArray(config.add) ? config.add : [config.add];

      for (const label of labelsToAdd) {
        if (!labels.includes(label)) {
          labels.push(label);
        }
      }
    }

    // Remove labels
    if (config.remove && config.remove.length > 0) {
      const labelsToRemove = Array.isArray(config.remove)
        ? config.remove
        : [config.remove];

      labels = labels.filter((label) => !labelsToRemove.includes(label));
    }

    // If labels changed, update them
    if (
      JSON.stringify(labels.sort()) !== JSON.stringify(currentLabels.sort())
    ) {
      await context.octokit.issues.setLabels({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: prNumber,
        labels: labels,
      });

      const added = labels.filter((label) => !currentLabels.includes(label));
      const removed = currentLabels.filter((label) => !labels.includes(label));

      logger.info(
        `Updated labels on PR #${prNumber} - Added: ${added.join(
          ", "
        )} - Removed: ${removed.join(", ")}`
      );
    } else {
      logger.info(`No label changes needed for PR #${prNumber}`);
    }
  } catch (error) {
    logger.error(`Error in label action: ${error}`);
    throw error;
  }
}
