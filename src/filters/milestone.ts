// lib/filters/milestone.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";
import { logger } from "../util/logger.js";

export async function milestoneFilter(
  context: Context<"pull_request">,
  config: any
): Promise<FilterResult> {
  try {
    const milestone = context.payload.pull_request.milestone;

    // If no milestone is set but one is required
    if (!milestone) {
      if (config.required === true) {
        return {
          matched: false,
          filter: "milestone",
          message: "No milestone is set but one is required",
        };
      }

      // If no milestone but we're checking for specific patterns, it can't match
      if (config.match) {
        return {
          matched: false,
          filter: "milestone",
          message: "No milestone is set",
        };
      }
    } else {
      // Check milestone title matches patterns
      if (config.match) {
        const patterns = Array.isArray(config.match)
          ? config.match
          : [config.match];
        if (!matchAnyPattern(milestone.title, patterns)) {
          return {
            matched: false,
            filter: "milestone",
            message: `Milestone "${
              milestone.title
            }" does not match the patterns: ${patterns.join(", ")}`,
          };
        }
      }

      // Check if milestone should be ignored
      if (config.ignore) {
        const patterns = Array.isArray(config.ignore)
          ? config.ignore
          : [config.ignore];
        if (matchAnyPattern(milestone.title, patterns)) {
          return {
            matched: false,
            filter: "milestone",
            message: `Milestone "${
              milestone.title
            }" matches ignored patterns: ${patterns.join(", ")}`,
          };
        }
      }
    }

    return { matched: true, filter: "milestone" };
  } catch (error) {
    logger.error(`Error in milestone filter: ${error}`);
    return { matched: false, filter: "milestone", message: `Error: ${error}` };
  }
}
