// lib/validators/size.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";

interface SizeValidatorConfig {
  ignore?: string | string[];
  files?: number;
  total?: number;
  addition?: number;
  deletion?: number;
  message?: string;
}

export async function sizeValidator(
  context: Context<"pull_request">,
  config: SizeValidatorConfig
): Promise<ValidationResult> {
  try {
    const pr = context.payload.pull_request;

    // Get PR stats
    const additions = pr.additions || 0;
    const deletions = pr.deletions || 0;
    const total = additions + deletions;

    // Get file list if we need to filter
    let filteredAdditions = additions;
    let filteredDeletions = deletions;
    let filteredTotal = total;
    let fileCount = 0;

    if (config.ignore) {
      const filesResponse = await context.octokit.pulls.listFiles({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: pr.number,
      });

      fileCount = filesResponse.data.length;

      // Filter files based on ignore patterns
      const ignore = Array.isArray(config.ignore)
        ? config.ignore
        : [config.ignore];

      const filteredFiles = filesResponse.data.filter((file) => {
        return !ignore.some((pattern: string) => {
          const regex = new RegExp(pattern);
          return regex.test(file.filename);
        });
      });

      filteredAdditions = filteredFiles.reduce(
        (sum, file) => sum + file.additions,
        0
      );
      filteredDeletions = filteredFiles.reduce(
        (sum, file) => sum + file.deletions,
        0
      );
      filteredTotal = filteredAdditions + filteredDeletions;
      fileCount = filteredFiles.length;
    } else {
      // If not filtering, we need to get the file count
      const filesResponse = await context.octokit.pulls.listFiles({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: pr.number,
      });

      fileCount = filesResponse.data.length;
    }

    // Check file count
    if (config.files && fileCount > config.files) {
      return {
        status: "fail",
        validator: "size",
        message:
          config.message ||
          `PR contains too many files (${fileCount}). Maximum allowed is ${config.files}.`,
      };
    }

    // Check total changes
    if (config.total && filteredTotal > config.total) {
      return {
        status: "fail",
        validator: "size",
        message:
          config.message ||
          `PR is too large (${filteredTotal} changes). Maximum allowed is ${config.total}.`,
      };
    }

    // Check additions
    if (config.addition && filteredAdditions > config.addition) {
      return {
        status: "fail",
        validator: "size",
        message:
          config.message ||
          `PR has too many additions (${filteredAdditions}). Maximum allowed is ${config.addition}.`,
      };
    }

    // Check deletions
    if (config.deletion && filteredDeletions > config.deletion) {
      return {
        status: "fail",
        validator: "size",
        message:
          config.message ||
          `PR has too many deletions (${filteredDeletions}). Maximum allowed is ${config.deletion}.`,
      };
    }

    return {
      status: "pass",
      validator: "size",
      message: "Size validation passed",
    };
  } catch (error) {
    logger.error(`Error in size validator: ${error}`);
    return {
      status: "error",
      validator: "size",
      message: `Error: ${error}`,
    };
  }
}
