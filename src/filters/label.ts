// lib/filters/label.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";
import { logger } from "../util/logger.js";

export async function labelFilter(
  context: Context<"pull_request">,
  config: any
): Promise<FilterResult> {
  try {
    // Get all labels on the PR
    const prNumber = context.payload.pull_request.number;
    if (!prNumber) {
      return {
        matched: false,
        filter: "label",
        message: "No pull request found",
      };
    }

    const labelsResponse = await context.octokit.issues.listLabelsOnIssue({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: prNumber,
    });

    const labels = labelsResponse.data.map((label) => label.name);

    // Check if labels match the patterns
    if (config.match) {
      const patterns = Array.isArray(config.match)
        ? config.match
        : [config.match];
      const matches = labels.some((label) => matchAnyPattern(label, patterns));

      if (!matches) {
        return {
          matched: false,
          filter: "label",
          message: `No labels match the patterns: ${patterns.join(", ")}`,
        };
      }
    }

    // Check if labels don't match the ignore patterns
    if (config.ignore) {
      const patterns = Array.isArray(config.ignore)
        ? config.ignore
        : [config.ignore];
      const matches = labels.some((label) => matchAnyPattern(label, patterns));

      if (matches) {
        return {
          matched: false,
          filter: "label",
          message: `Labels match ignored patterns: ${patterns.join(", ")}`,
        };
      }
    }

    return { matched: true, filter: "label" };
  } catch (error) {
    logger.error(`Error in label filter: ${error}`);
    return { matched: false, filter: "label", message: `Error: ${error}` };
  }
}
