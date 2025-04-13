import { Probot } from "probot";
import { Processor } from "./processor.js";
import { logger } from "./util/logger.js";

export default (app: Probot) => {
  app.log.info("PR Validator loaded!");

  // Pull request events
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
      logger.info(`Processing pull_request event: ${context.payload.action}`);
      const processor = new Processor(context);
      await processor.process();
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
      logger.info(
        `Processing pull_request_review event: ${context.payload.action}`
      );
      const processor = new Processor(context);
      await processor.process();
    }
  );

  // Pull request review comment events
  app.on(
    [
      "pull_request_review_comment.created",
      "pull_request_review_comment.edited",
    ],
    async (context) => {
      logger.info(
        `Processing pull_request_review_comment event: ${context.payload.action}`
      );
      const processor = new Processor(context);
      await processor.process();
    }
  );

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
