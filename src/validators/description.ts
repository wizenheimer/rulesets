// lib/validators/description.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";
import { PullRequestOpenedEvent } from "@octokit/webhooks-types";

export async function descriptionValidator(
  context: Context<"pull_request.opened">,
  config: any
): Promise<ValidationResult> {
  try {
    const description =
      (context.payload as PullRequestOpenedEvent).pull_request.body || "";

    // Check for empty description
    if (config.no_empty && description.trim() === "") {
      return {
        status: "fail",
        validator: "description",
        message: config.message || "PR description cannot be empty",
      };
    }

    // Check length
    if (config.length) {
      if (config.length.min && description.length < config.length.min) {
        return {
          status: "fail",
          validator: "description",
          message:
            config.message ||
            `Description must be at least ${config.length.min} characters`,
        };
      }

      if (config.length.max && description.length > config.length.max) {
        return {
          status: "fail",
          validator: "description",
          message:
            config.message ||
            `Description must not exceed ${config.length.max} characters`,
        };
      }
    }

    // Check that description matches patterns
    if (config.match) {
      const patterns = Array.isArray(config.match)
        ? config.match
        : [config.match];
      const matches = patterns.some((pattern: string) => {
        const regex = new RegExp(pattern, "i");
        return regex.test(description);
      });

      if (!matches) {
        return {
          status: "fail",
          validator: "description",
          message:
            config.message ||
            `Description must include patterns: ${patterns.join(", ")}`,
        };
      }
    }

    return {
      status: "pass",
      validator: "description",
      message: "Description validation passed",
    };
  } catch (error) {
    logger.error(`Error in description validator: ${error}`);
    return {
      status: "error",
      validator: "description",
      message: `Error: ${error}`,
    };
  }
}
