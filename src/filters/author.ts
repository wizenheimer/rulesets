// lib/filters/author.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";
import { logger } from "../util/logger.js";

export async function authorFilter(
  context: Context<"pull_request">,
  config: any
): Promise<FilterResult> {
  try {
    // Get PR author
    const author = context.payload.pull_request.user.login;
    if (!author) {
      return { matched: false, filter: "author", message: "No author found" };
    }

    // Check author matches patterns
    if (config.match) {
      const patterns = Array.isArray(config.match)
        ? config.match
        : [config.match];
      if (!matchAnyPattern(author, patterns)) {
        return {
          matched: false,
          filter: "author",
          message: `Author "${author}" does not match the patterns: ${patterns.join(
            ", "
          )}`,
        };
      }
    }

    // Check if author should be ignored
    if (config.ignore) {
      const patterns = Array.isArray(config.ignore)
        ? config.ignore
        : [config.ignore];
      if (matchAnyPattern(author, patterns)) {
        return {
          matched: false,
          filter: "author",
          message: `Author "${author}" matches ignored patterns: ${patterns.join(
            ", "
          )}`,
        };
      }
    }

    return { matched: true, filter: "author" };
  } catch (error) {
    logger.error(`Error in author filter: ${error}`);
    return { matched: false, filter: "author", message: `Error: ${error}` };
  }
}
