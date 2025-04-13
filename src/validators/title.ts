// lib/validators/title.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";

export async function titleValidator(
  context: Context<"pull_request">,
  config: any
): Promise<ValidationResult> {
  try {
    const title = context.payload.pull_request.title;
    if (!title) {
      return {
        status: "error",
        validator: "title",
        message: "No title found",
      };
    }

    // Check title matches patterns
    if (config.match) {
      const patterns = Array.isArray(config.match)
        ? config.match
        : [config.match];
      const matches = patterns.some((pattern: string) => {
        const regex = new RegExp(pattern);
        return regex.test(title);
      });

      if (!matches) {
        return {
          status: "fail",
          validator: "title",
          message:
            config.message ||
            `Title must match one of the patterns: ${patterns.join(", ")}`,
        };
      }
    }

    // Check title length
    if (config.length) {
      if (config.length.min && title.length < config.length.min) {
        return {
          status: "fail",
          validator: "title",
          message:
            config.message ||
            `Title must be at least ${config.length.min} characters`,
        };
      }

      if (config.length.max && title.length > config.length.max) {
        return {
          status: "fail",
          validator: "title",
          message:
            config.message ||
            `Title must not exceed ${config.length.max} characters`,
        };
      }
    }

    return {
      status: "pass",
      validator: "title",
      message: "Title validation passed",
    };
  } catch (error) {
    logger.error(`Error in title validator: ${error}`);
    return {
      status: "error",
      validator: "title",
      message: `Error: ${error}`,
    };
  }
}
