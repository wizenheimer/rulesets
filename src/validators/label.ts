// lib/validators/label.ts
import { Context } from "probot";
import { ValidationResult, Validation } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";
import { logger } from "../util/logger.js";

interface LabelConfig extends Validation {
  count?: {
    min?: number;
    max?: number;
  };
  include?: string | string[];
  exclude?: string | string[];
  message?: string;
}

export async function labelValidator(
  context: Context<"pull_request">,
  config: LabelConfig
): Promise<ValidationResult> {
  try {
    const prNumber = context.payload.pull_request?.number;
    if (!prNumber) {
      return {
        status: "error",
        validator: "label",
        message: "No pull request found",
      };
    }

    // Get all labels on the PR
    const labelsResponse = await context.octokit.issues.listLabelsOnIssue({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: prNumber,
    });

    const labels = labelsResponse.data.map((label) => label.name);

    // Check for minimum label count
    if (config.count?.min !== undefined && labels.length < config.count.min) {
      return {
        status: "fail",
        validator: "label",
        message:
          config.message || `PR must have at least ${config.count.min} labels`,
      };
    }

    // Check for maximum label count
    if (config.count?.max !== undefined && labels.length > config.count.max) {
      return {
        status: "fail",
        validator: "label",
        message:
          config.message ||
          `PR must not have more than ${config.count.max} labels`,
      };
    }

    // Check that PR has required labels
    if (config.include) {
      const required = Array.isArray(config.include)
        ? config.include
        : [config.include];
      const missing = required.filter(
        (pattern: string) =>
          !labels.some((label) => matchAnyPattern(label, [pattern]))
      );

      if (missing.length > 0) {
        return {
          status: "fail",
          validator: "label",
          message:
            config.message ||
            `PR is missing required labels matching: ${missing.join(", ")}`,
        };
      }
    }

    // Check that PR doesn't have excluded labels
    if (config.exclude) {
      const excluded = Array.isArray(config.exclude)
        ? config.exclude
        : [config.exclude];
      const forbidden = labels.filter((label) =>
        excluded.some((pattern: string) => matchAnyPattern(label, [pattern]))
      );

      if (forbidden.length > 0) {
        return {
          status: "fail",
          validator: "label",
          message:
            config.message ||
            `PR has forbidden labels: ${forbidden.join(", ")}`,
        };
      }
    }

    return {
      status: "pass",
      validator: "label",
      message: "Label validation passed",
    };
  } catch (error) {
    logger.error(`Error in label validator: ${error}`);
    return {
      status: "error",
      validator: "label",
      message: `Error: ${error}`,
    };
  }
}
