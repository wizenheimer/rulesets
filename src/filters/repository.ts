// lib/filters/repository.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { matchAnyPattern } from "../util/matcher.js";
import { logger } from "../util/logger.js";

export async function repositoryFilter(
  context: Context<"pull_request">,
  config: any
): Promise<FilterResult> {
  try {
    const repo = context.payload.repository;

    // Check visibility
    if (config.visibility) {
      const visibility = repo.private ? "private" : "public";
      if (visibility !== config.visibility) {
        return {
          matched: false,
          filter: "repository",
          message: `Repository visibility is "${visibility}" but "${config.visibility}" is required`,
        };
      }
    }

    // Check repository name
    if (config.name) {
      if (config.name.match) {
        const patterns = Array.isArray(config.name.match)
          ? config.name.match
          : [config.name.match];
        if (!matchAnyPattern(repo.name, patterns)) {
          return {
            matched: false,
            filter: "repository",
            message: `Repository name "${
              repo.name
            }" does not match the patterns: ${patterns.join(", ")}`,
          };
        }
      }

      if (config.name.ignore) {
        const patterns = Array.isArray(config.name.ignore)
          ? config.name.ignore
          : [config.name.ignore];
        if (matchAnyPattern(repo.name, patterns)) {
          return {
            matched: false,
            filter: "repository",
            message: `Repository name "${
              repo.name
            }" matches ignored patterns: ${patterns.join(", ")}`,
          };
        }
      }
    }

    // Check repository topics
    if (config.topics) {
      try {
        // Get repository topics
        const topicsResponse = await context.octokit.repos.getAllTopics({
          owner: repo.owner.login,
          repo: repo.name,
        });

        const topics = topicsResponse.data.names || [];

        if (config.topics.match) {
          const patterns = Array.isArray(config.topics.match)
            ? config.topics.match
            : [config.topics.match];
          const hasAnyMatchingTopic = topics.some((topic) =>
            patterns.some((pattern: string) =>
              matchAnyPattern(topic, [pattern])
            )
          );

          if (!hasAnyMatchingTopic) {
            return {
              matched: false,
              filter: "repository",
              message: `Repository topics [${topics.join(
                ", "
              )}] do not include any of the required topics: ${patterns.join(
                ", "
              )}`,
            };
          }
        }

        if (config.topics.ignore) {
          const patterns = Array.isArray(config.topics.ignore)
            ? config.topics.ignore
            : [config.topics.ignore];
          const hasIgnoredTopic = topics.some((topic) =>
            patterns.some((pattern: string) =>
              matchAnyPattern(topic, [pattern])
            )
          );

          if (hasIgnoredTopic) {
            return {
              matched: false,
              filter: "repository",
              message: `Repository topics [${topics.join(
                ", "
              )}] include ignored topics: ${patterns.join(", ")}`,
            };
          }
        }
      } catch (error) {
        return {
          matched: false,
          filter: "repository",
          message: `Error fetching repository topics: ${error}`,
        };
      }
    }

    return { matched: true, filter: "repository" };
  } catch (error) {
    logger.error(`Error in repository filter: ${error}`);
    return { matched: false, filter: "repository", message: `Error: ${error}` };
  }
}
