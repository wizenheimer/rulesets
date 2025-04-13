// lib/filters/description.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { logger } from "../util/logger.js";

export async function descriptionFilter(
  context: Context<"pull_request.opened">,
  config: { match?: string | string[]; ignore?: string | string[] }
): Promise<FilterResult> {
  try {
    const description = context.payload.pull_request.body || "";

    // Check description matches patterns
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
          matched: false,
          filter: "description",
          message: `Description does not match the patterns: ${patterns.join(
            ", "
          )}`,
        };
      }
    }

    // Check if description should be ignored
    if (config.ignore) {
      const patterns = Array.isArray(config.ignore)
        ? config.ignore
        : [config.ignore];
      const matches = patterns.some((pattern: string) => {
        const regex = new RegExp(pattern, "i");
        return regex.test(description);
      });

      if (matches) {
        return {
          matched: false,
          filter: "description",
          message: `Description matches ignored patterns: ${patterns.join(
            ", "
          )}`,
        };
      }
    }

    return { matched: true, filter: "description" };
  } catch (error) {
    logger.error(`Error in description filter: ${error}`);
    return {
      matched: false,
      filter: "description",
      message: `Error: ${error}`,
    };
  }
}
