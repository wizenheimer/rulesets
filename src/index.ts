import { Probot } from "probot";

export default (app: Probot) => {
  // Pull Request Events
  app.on(
    [
      "pull_request.opened",
      "pull_request.edited",
      "pull_request.reopened",
      "pull_request.synchronize",
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.ready_for_review",
      "pull_request.converted_to_draft",
      "pull_request.assigned",
      "pull_request.unassigned",
      "pull_request.milestoned",
      "pull_request.demilestoned",
    ],
    async (context) => {
      console.log(
        "pull request event",
        context.payload,
        "event type",
        context.name
      );
    }
  );

  // Pull request review events
  app.on(
    [
      "pull_request_review.submitted",
      "pull_request_review.edited",
      "pull_request_review.dismissed",
    ],
    async (context) => {
      console.log(
        "pull request review event",
        context.payload,
        "event type",
        context.name
      );
    }
  );

  // Pull request review comment events
  app.on(
    [
      "pull_request_review_comment.created",
      "pull_request_review_comment.edited",
    ],
    async (context) => {
      console.log(
        "pull request review comment event",
        context.payload,
        "event type",
        context.name
      );
    }
  );

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
