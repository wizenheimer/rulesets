// lib/filters/team.ts
import { Context } from "probot";
import { FilterResult } from "../types.js";
import { logger } from "../util/logger.js";

export async function teamFilter(
  context: Context<"pull_request">,
  config: any
): Promise<FilterResult> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      return {
        matched: false,
        filter: "team",
        message: "No pull request found",
      };
    }

    const username = pr.user.login;

    // Check if user is in any of the specified teams
    if (config.match) {
      const teams = Array.isArray(config.match) ? config.match : [config.match];
      let foundTeam = false;

      for (const team of teams) {
        // Team format should be "org/team-slug"
        const [org, teamSlug] = team.split("/");
        if (!org || !teamSlug) {
          logger.warn(
            `Invalid team format: "${team}". Should be "org/team-slug"`
          );
          continue;
        }

        try {
          // Check if user is a member of the team
          const membership =
            await context.octokit.teams.getMembershipForUserInOrg({
              org,
              team_slug: teamSlug,
              username,
            });

          if (membership.data.state === "active") {
            foundTeam = true;
            break;
          }
        } catch (error) {
          // 404 means user is not a member or team doesn't exist
          if ((error as any).status !== 404) {
            throw error;
          }
        }
      }

      if (!foundTeam) {
        return {
          matched: false,
          filter: "team",
          message: `User "${username}" is not a member of any of the required teams: ${teams.join(
            ", "
          )}`,
        };
      }
    }

    // Check if user is not in any of the ignored teams
    if (config.ignore) {
      const teams = Array.isArray(config.ignore)
        ? config.ignore
        : [config.ignore];

      for (const team of teams) {
        // Team format should be "org/team-slug"
        const [org, teamSlug] = team.split("/");
        if (!org || !teamSlug) {
          logger.warn(
            `Invalid team format: "${team}". Should be "org/team-slug"`
          );
          continue;
        }

        try {
          // Check if user is a member of the team
          const membership =
            await context.octokit.teams.getMembershipForUserInOrg({
              org,
              team_slug: teamSlug,
              username,
            });

          if (membership.data.state === "active") {
            return {
              matched: false,
              filter: "team",
              message: `User "${username}" is a member of ignored team: ${team}`,
            };
          }
        } catch (error) {
          // 404 means user is not a member or team doesn't exist, which is what we want
          if ((error as any).status !== 404) {
            throw error;
          }
        }
      }
    }

    return { matched: true, filter: "team" };
  } catch (error) {
    logger.error(`Error in team filter: ${error}`);
    return { matched: false, filter: "team", message: `Error: ${error}` };
  }
}
