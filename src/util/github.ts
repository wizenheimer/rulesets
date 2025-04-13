// lib/util/github.ts
import { Context } from "probot";
import { logger } from "./logger.js";

type PullRequestContext = Context<"pull_request">;
type IssueContext = Context<"issues">;
type IssueCommentContext = Context<"issue_comment">;
type RepositoryContext =
  | PullRequestContext
  | IssueContext
  | IssueCommentContext;

/**
 * GitHub utility functions for common operations
 */
export const githubUtils = {
  /**
   * Get the repo info from context
   */
  getRepoInfo(context: RepositoryContext) {
    return {
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
    };
  },

  /**
   * Get the PR number from context
   */
  getPrNumber(context: RepositoryContext): number | null {
    if ("pull_request" in context.payload) {
      return context.payload.pull_request.number;
    }

    if ("issue" in context.payload && context.payload.issue.pull_request) {
      return context.payload.issue.number;
    }

    return null;
  },

  /**
   * Get PR details from context or API
   */
  async getPrDetails(
    context: RepositoryContext,
    prNumber?: number
  ): Promise<any> {
    const number = prNumber || this.getPrNumber(context);
    if (!number) {
      throw new Error("No PR number found");
    }

    try {
      const { data } = await context.octokit.pulls.get({
        ...this.getRepoInfo(context),
        pull_number: number,
      });

      return data;
    } catch (error) {
      logger.error(`Error fetching PR details: ${error}`);
      throw error;
    }
  },

  /**
   * Get the file content from the repository
   */
  async getFileContent(
    context: RepositoryContext,
    path: string,
    ref?: string
  ): Promise<string | null> {
    try {
      const params = {
        ...this.getRepoInfo(context),
        path,
      };

      if (ref) {
        (params as any).ref = ref;
      }

      const response = await context.octokit.repos.getContent(params);

      if ("content" in response.data) {
        return Buffer.from(response.data.content, "base64").toString();
      }

      return null;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }

      logger.error(`Error fetching file content: ${error}`);
      throw error;
    }
  },

  /**
   * Get all the labels on an issue or PR
   */
  async getLabels(
    context: RepositoryContext,
    issueNumber: number
  ): Promise<string[]> {
    try {
      const { data } = await context.octokit.issues.listLabelsOnIssue({
        ...this.getRepoInfo(context),
        issue_number: issueNumber,
      });

      return data.map((label) => label.name);
    } catch (error) {
      logger.error(`Error fetching labels: ${error}`);
      throw error;
    }
  },

  /**
   * Get the changed files in a PR
   */
  async getChangedFiles(
    context: RepositoryContext,
    prNumber: number
  ): Promise<any[]> {
    try {
      const files = await context.octokit.pulls.listFiles({
        ...this.getRepoInfo(context),
        pull_number: prNumber,
      });

      return files.data;
    } catch (error) {
      logger.error(`Error fetching changed files: ${error}`);
      throw error;
    }
  },
};
