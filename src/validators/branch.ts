// lib/validators/branch.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";
import { logger } from "../util/logger.js";

export async function branchValidator(
  context: Context<"pull_request">,
  config: any
): Promise<ValidationResult> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      return {
        status: "error",
        validator: "branch",
        message: "No pull request found",
      };
    }

    const baseBranch = pr.base.ref;
    const headBranch = pr.head.ref;

    // Validate base branch
    if (config.base) {
      if (config.base.match) {
        const patterns = Array.isArray(config.base.match)
          ? config.base.match
          : [config.base.match];
        if (!matchAnyPattern(baseBranch, patterns)) {
          return {
            status: "fail",
            validator: "branch",
            message:
              config.base.message ||
              `Base branch "${baseBranch}" does not match the required patterns: ${patterns.join(
                ", "
              )}`,
          };
        }
      }

      if (config.base.ignore) {
        const patterns = Array.isArray(config.base.ignore)
          ? config.base.ignore
          : [config.base.ignore];
        if (matchAnyPattern(baseBranch, patterns)) {
          return {
            status: "fail",
            validator: "branch",
            message:
              config.base.message ||
              `Base branch "${baseBranch}" matches ignored patterns: ${patterns.join(
                ", "
              )}`,
          };
        }
      }
    }

    // Validate head branch
    if (config.head) {
      if (config.head.match) {
        const patterns = Array.isArray(config.head.match)
          ? config.head.match
          : [config.head.match];
        if (!matchAnyPattern(headBranch, patterns)) {
          return {
            status: "fail",
            validator: "branch",
            message:
              config.head.message ||
              `Head branch "${headBranch}" does not match the required patterns: ${patterns.join(
                ", "
              )}`,
          };
        }
      }

      if (config.head.ignore) {
        const patterns = Array.isArray(config.head.ignore)
          ? config.head.ignore
          : [config.head.ignore];
        if (matchAnyPattern(headBranch, patterns)) {
          return {
            status: "fail",
            validator: "branch",
            message:
              config.head.message ||
              `Head branch "${headBranch}" matches ignored patterns: ${patterns.join(
                ", "
              )}`,
          };
        }
      }
    }

    return {
      status: "pass",
      validator: "branch",
      message: "Branch validation passed",
    };
  } catch (error) {
    logger.error(`Error in branch validator: ${error}`);
    return {
      status: "error",
      validator: "branch",
      message: `Error: ${error}`,
    };
  }
}
