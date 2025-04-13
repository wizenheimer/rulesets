// lib/validators/age.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";

function isPullRequestEvent(
  context: Context
): context is Context & { payload: { pull_request: any } } {
  return "pull_request" in context.payload;
}

export async function ageValidator(
  context: Context,
  config: any
): Promise<ValidationResult> {
  try {
    // Check if this is a pull request event
    if (!isPullRequestEvent(context)) {
      return {
        status: "error",
        validator: "age",
        message: "This validator can only be used with pull request events",
      };
    }

    const pr = context.payload.pull_request;
    const now = new Date();

    // Check created_at constraints
    if (config.created) {
      const createdAt = new Date(pr.created_at);
      const ageInDays =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (config.created.min && ageInDays < config.created.min) {
        return {
          status: "fail",
          validator: "age",
          message:
            config.created.message ||
            `PR is too new (${ageInDays.toFixed(1)} days). Must be at least ${
              config.created.min
            } days old.`,
        };
      }

      if (config.created.max && ageInDays > config.created.max) {
        return {
          status: "fail",
          validator: "age",
          message:
            config.created.message ||
            `PR is too old (${ageInDays.toFixed(
              1
            )} days). Must not be older than ${config.created.max} days.`,
        };
      }
    }

    // Check updated_at constraints
    if (config.updated) {
      const updatedAt = new Date(pr.updated_at);
      const ageInDays =
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (config.updated.min && ageInDays < config.updated.min) {
        return {
          status: "fail",
          validator: "age",
          message:
            config.updated.message ||
            `PR was updated too recently (${ageInDays.toFixed(
              1
            )} days ago). Must be at least ${
              config.updated.min
            } days since last update.`,
        };
      }

      if (config.updated.max && ageInDays > config.updated.max) {
        return {
          status: "fail",
          validator: "age",
          message:
            config.updated.message ||
            `PR hasn't been updated recently enough (${ageInDays.toFixed(
              1
            )} days ago). Must not be more than ${
              config.updated.max
            } days since last update.`,
        };
      }
    }

    return {
      status: "pass",
      validator: "age",
      message: "Age validation passed",
    };
  } catch (error) {
    logger.error(`Error in age validator: ${error}`);
    return {
      status: "error",
      validator: "age",
      message: `Error: ${error}`,
    };
  }
}
