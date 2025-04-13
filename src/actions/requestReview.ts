// lib/actions/requestReview.ts
import { Context } from "probot";
import { logger } from "../util/logger.js";

export async function requestReviewAction(
  context: Context<"pull_request">,
  config: any
): Promise<void> {
  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      throw new Error("No pull request found");
    }

    // Get current requested reviewers
    const reviewersResponse =
      await context.octokit.pulls.listRequestedReviewers({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: pr.number,
      });

    const currentReviewers = reviewersResponse.data.users.map(
      (user) => user.login
    );
    const currentTeams = reviewersResponse.data.teams.map((team) => team.slug);

    // Prepare new reviewers
    let reviewers: string[] = [];
    if (config.reviewers && config.reviewers.length > 0) {
      reviewers = Array.isArray(config.reviewers)
        ? config.reviewers
        : [config.reviewers];

      // Handle special annotations
      reviewers = reviewers.map((reviewer) => {
        if (reviewer === "@author") {
          return pr.user.login;
        }
        return reviewer;
      });

      // Filter out the author (cannot review their own PR)
      reviewers = reviewers.filter((reviewer) => reviewer !== pr.user.login);

      // Filter out current reviewers
      reviewers = reviewers.filter(
        (reviewer) => !currentReviewers.includes(reviewer)
      );
    }

    // Prepare new team reviewers
    let teams: string[] = [];
    if (config.teams && config.teams.length > 0) {
      teams = Array.isArray(config.teams) ? config.teams : [config.teams];

      // Filter out current teams
      teams = teams.filter((team) => !currentTeams.includes(team));
    }

    // Request reviews if there are new reviewers or teams
    if (reviewers.length > 0 || teams.length > 0) {
      await context.octokit.pulls.requestReviewers({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: pr.number,
        reviewers: reviewers,
        team_reviewers: teams,
      });

      logger.info(
        `Requested reviews for PR #${pr.number} from ${reviewers.join(
          ", "
        )} and teams ${teams.join(", ")}`
      );
    } else {
      logger.info(`No new reviewers to request for PR #${pr.number}`);
    }
  } catch (error) {
    logger.error(`Error in request review action: ${error}`);
    throw error;
  }
}
