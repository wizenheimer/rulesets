// lib/validators/commit.ts
import { Context } from "probot";
import { ValidationResult, Validation } from "../types.js";

import { logger } from "../util/logger.js";

export async function commitValidator(
  context: Context<"pull_request">,
  config: Validation
): Promise<ValidationResult> {
  try {
    const prNumber = context.payload.pull_request?.number;
    if (!prNumber) {
      return {
        status: "error",
        validator: "commit",
        message: "No pull request found",
      };
    }

    // Get commits
    const commitsResponse = await context.octokit.pulls.listCommits({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: prNumber,
    });

    const commits = commitsResponse.data;

    // Skip merge commits if specified
    let filteredCommits = commits;
    if (config.ignore_merge_commits) {
      filteredCommits = commits.filter(
        (commit) => !commit.commit.message.startsWith("Merge ")
      );
    }

    // Early return if no commits after filtering
    if (filteredCommits.length === 0) {
      return {
        status: "pass",
        validator: "commit",
        message: "No commits to validate after filtering",
      };
    }

    // Validate commit messages
    if (config.match) {
      const patterns = Array.isArray(config.match)
        ? config.match
        : [config.match];

      // Determine which commits to check
      let commitsToCheck = filteredCommits;

      if (config.first_only) {
        commitsToCheck = [filteredCommits[0]];
      } else if (config.last_only) {
        commitsToCheck = [filteredCommits[filteredCommits.length - 1]];
      }

      const invalidCommits = commitsToCheck.filter(
        (commit) =>
          !patterns.some((pattern: string) => {
            const regex = new RegExp(pattern, "i");
            return regex.test(commit.commit.message);
          })
      );

      if (invalidCommits.length > 0) {
        const invalidMessages = invalidCommits.map(
          (commit) => `"${commit.commit.message.split("\n")[0]}"` // Just the first line
        );

        return {
          status: "fail",
          validator: "commit",
          message:
            config.message ||
            `The following commit messages don't match the required format: ${invalidMessages.join(
              ", "
            )}`,
        };
      }
    }

    // Check for ignored patterns
    if (config.ignore) {
      const patterns = Array.isArray(config.ignore)
        ? config.ignore
        : [config.ignore];

      const invalidCommits = filteredCommits.filter((commit) =>
        patterns.some((pattern: string) => {
          const regex = new RegExp(pattern, "i");
          return regex.test(commit.commit.message);
        })
      );

      if (invalidCommits.length > 0) {
        const invalidMessages = invalidCommits.map(
          (commit) => `"${commit.commit.message.split("\n")[0]}"` // Just the first line
        );

        return {
          status: "fail",
          validator: "commit",
          message:
            config.message ||
            `The following commit messages match ignored patterns: ${invalidMessages.join(
              ", "
            )}`,
        };
      }
    }

    return {
      status: "pass",
      validator: "commit",
      message: "Commit validation passed",
    };
  } catch (error) {
    logger.error(`Error in commit validator: ${error}`);
    return {
      status: "error",
      validator: "commit",
      message: `Error: ${error}`,
    };
  }
}
