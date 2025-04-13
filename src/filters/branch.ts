// lib/filters/branch.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";
import { logger } from "../util/logger.js";

export async function branchFilter(
  context: Context<"pull_request">,
  config: any
): Promise<FilterResult> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      return {
        matched: false,
        filter: "branch",
        message: "No pull request found",
      };
    }

    const baseBranch = pr.base.ref;
    const headBranch = pr.head.ref;

    // Check base branch
    if (config.base) {
      if (config.base.match) {
        const patterns = Array.isArray(config.base.match)
          ? config.base.match
          : [config.base.match];
        const matches = matchAnyPattern(baseBranch, patterns);

        if (!matches) {
          return {
            matched: false,
            filter: "branch",
            message: `Base branch '${baseBranch}' does not match the patterns: ${patterns.join(
              ", "
            )}`,
          };
        }
      }

      if (config.base.ignore) {
        const patterns = Array.isArray(config.base.ignore)
          ? config.base.ignore
          : [config.base.ignore];
        const matches = matchAnyPattern(baseBranch, patterns);

        if (matches) {
          return {
            matched: false,
            filter: "branch",
            message: `Base branch '${baseBranch}' matches ignored patterns: ${patterns.join(
              ", "
            )}`,
          };
        }
      }
    }

    // Check head branch
    if (config.head) {
      if (config.head.match) {
        const patterns = Array.isArray(config.head.match)
          ? config.head.match
          : [config.head.match];
        const matches = matchAnyPattern(headBranch, patterns);

        if (!matches) {
          return {
            matched: false,
            filter: "branch",
            message: `Head branch '${headBranch}' does not match the patterns: ${patterns.join(
              ", "
            )}`,
          };
        }
      }

      if (config.head.ignore) {
        const patterns = Array.isArray(config.head.ignore)
          ? config.head.ignore
          : [config.head.ignore];
        const matches = matchAnyPattern(headBranch, patterns);

        if (matches) {
          return {
            matched: false,
            filter: "branch",
            message: `Head branch '${headBranch}' matches ignored patterns: ${patterns.join(
              ", "
            )}`,
          };
        }
      }
    }

    return { matched: true, filter: "branch" };
  } catch (error) {
    logger.error(`Error in branch filter: ${error}`);
    return { matched: false, filter: "branch", message: `Error: ${error}` };
  }
}
