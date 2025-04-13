// lib/filters/files.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";

export async function filesFilter(
  context: Context<"pull_request">,
  config: any
): Promise<FilterResult> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      return {
        matched: false,
        filter: "files",
        message: "No pull request found",
      };
    }

    // Get changed files
    const filesResponse = await context.octokit.pulls.listFiles({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: pr.number,
    });

    const files = filesResponse.data.map((file) => ({
      name: file.filename,
      status: file.status, // 'added', 'removed', 'modified'
    }));

    // No files means no match
    if (files.length === 0) {
      return {
        matched: false,
        filter: "files",
        message: "No files changed in this PR",
      };
    }

    // Check added files
    if (config.added?.match) {
      const patterns = Array.isArray(config.added.match)
        ? config.added.match
        : [config.added.match];
      const addedFiles = files.filter((file) => file.status === "added");

      if (addedFiles.length === 0) {
        // If we're looking for added files but there are none, return no match
        if (patterns.length > 0) {
          return {
            matched: false,
            filter: "files",
            message: "No added files found",
          };
        }
      } else {
        // Check if any added file matches the patterns
        const matches = addedFiles.some((file) =>
          matchAnyPattern(file.name, patterns)
        );
        if (!matches) {
          return {
            matched: false,
            filter: "files",
            message: `No added files match the patterns: ${patterns.join(
              ", "
            )}`,
          };
        }
      }

      // Check if added files should be ignored
      if (config.added.ignore) {
        const ignorePatterns = Array.isArray(config.added.ignore)
          ? config.added.ignore
          : [config.added.ignore];

        const matches = addedFiles.some((file) =>
          matchAnyPattern(file.name, ignorePatterns)
        );
        if (matches) {
          return {
            matched: false,
            filter: "files",
            message: `Added files match ignored patterns: ${ignorePatterns.join(
              ", "
            )}`,
          };
        }
      }
    }

    // Check modified files
    if (config.modified?.match) {
      const patterns = Array.isArray(config.modified.match)
        ? config.modified.match
        : [config.modified.match];
      const modifiedFiles = files.filter((file) => file.status === "modified");

      if (modifiedFiles.length === 0) {
        // If we're looking for modified files but there are none, return no match
        if (patterns.length > 0) {
          return {
            matched: false,
            filter: "files",
            message: "No modified files found",
          };
        }
      } else {
        // Check if any modified file matches the patterns
        const matches = modifiedFiles.some((file) =>
          matchAnyPattern(file.name, patterns)
        );
        if (!matches) {
          return {
            matched: false,
            filter: "files",
            message: `No modified files match the patterns: ${patterns.join(
              ", "
            )}`,
          };
        }
      }

      // Check if modified files should be ignored
      if (config.modified.ignore) {
        const ignorePatterns = Array.isArray(config.modified.ignore)
          ? config.modified.ignore
          : [config.modified.ignore];

        const matches = modifiedFiles.some((file) =>
          matchAnyPattern(file.name, ignorePatterns)
        );
        if (matches) {
          return {
            matched: false,
            filter: "files",
            message: `Modified files match ignored patterns: ${ignorePatterns.join(
              ", "
            )}`,
          };
        }
      }
    }

    // If we get here, all checks passed
    return {
      matched: true,
      filter: "files",
      message: "All file checks passed",
    };
  } catch (error) {
    return {
      matched: false,
      filter: "files",
      message: `Error processing files filter: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
