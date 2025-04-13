// lib/validators/approvals.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";

export async function approvalsValidator(
  context: Context<"pull_request">,
  config: any
): Promise<ValidationResult> {
  try {
    const pr = context.payload.pull_request;

    // Get reviews
    const reviewsResponse = await context.octokit.pulls.listReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: pr.number,
    });

    // Group reviews by user, keeping only the latest review from each user
    const latestReviews = new Map();
    reviewsResponse.data.forEach((review) => {
      if (review.user && review.user.login) {
        latestReviews.set(review.user.login, review);
      }
    });

    // Filter approved reviews
    const approvedReviews = Array.from(latestReviews.values()).filter(
      (review) => review.state === "APPROVED"
    );

    const approvers = approvedReviews.map((review) => review.user.login);

    // Check minimum approvals
    if (config.count && config.count.min) {
      if (approvedReviews.length < config.count.min) {
        return {
          status: "fail",
          validator: "approvals",
          message:
            config.message ||
            `PR requires at least ${config.count.min} approvals, but has only ${approvedReviews.length}`,
        };
      }
    }

    // Check maximum approvals
    if (config.count && config.count.max) {
      if (approvedReviews.length > config.count.max) {
        return {
          status: "fail",
          validator: "approvals",
          message:
            config.message ||
            `PR has ${approvedReviews.length} approvals, exceeding maximum of ${config.count.max}`,
        };
      }
    }

    // Check required approvers
    if (config.include) {
      const requiredApprovers = Array.isArray(config.include)
        ? config.include
        : [config.include];

      const missingApprovers = requiredApprovers.filter(
        (required: string) => !approvers.includes(required)
      );

      if (missingApprovers.length > 0) {
        return {
          status: "fail",
          validator: "approvals",
          message:
            config.message ||
            `Missing required approvals from: ${missingApprovers.join(", ")}`,
        };
      }
    }

    // Check code owners approval if required
    if (config.require_code_owners) {
      try {
        // Get CODEOWNERS file
        let codeownersContent;
        try {
          const codeownersResponse = await context.octokit.repos.getContent({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            path: ".github/CODEOWNERS",
          });

          if ("content" in codeownersResponse.data) {
            codeownersContent = Buffer.from(
              codeownersResponse.data.content,
              "base64"
            ).toString();
          }
        } catch (error) {
          if ((error as any).status === 404) {
            return {
              status: "fail",
              validator: "approvals",
              message:
                "CODEOWNERS file not found but code owners approval is required",
            };
          }
          throw error;
        }

        if (!codeownersContent) {
          return {
            status: "fail",
            validator: "approvals",
            message:
              "Empty CODEOWNERS file but code owners approval is required",
          };
        }

        // Get changed files
        const filesResponse = await context.octokit.pulls.listFiles({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          pull_number: pr.number,
        });

        const changedFiles = filesResponse.data.map((file) => file.filename);

        // Parse CODEOWNERS file to find code owners for changed files
        const codeOwners = parseCodeowners(codeownersContent, changedFiles);

        // Check if all code owners have approved
        const missingCodeOwners = codeOwners.filter(
          (owner) => !approvers.includes(owner.replace("@", ""))
        );

        if (missingCodeOwners.length > 0) {
          return {
            status: "fail",
            validator: "approvals",
            message:
              config.message ||
              `Missing approvals from code owners: ${missingCodeOwners.join(
                ", "
              )}`,
          };
        }
      } catch (error) {
        logger.error(`Error checking code owners: ${error}`);
        return {
          status: "error",
          validator: "approvals",
          message: `Error checking code owners: ${error}`,
        };
      }
    }

    return {
      status: "pass",
      validator: "approvals",
      message: `PR has ${approvedReviews.length} valid approvals`,
    };
  } catch (error) {
    logger.error(`Error in approvals validator: ${error}`);
    return {
      status: "error",
      validator: "approvals",
      message: `Error: ${error}`,
    };
  }
}

function parseCodeowners(content: string, changedFiles: string[]): string[] {
  const owners = new Set<string>();
  const lines = content.split("\n");

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith("#") || line.trim() === "") {
      continue;
    }

    // Parse line: pattern owner1 owner2 ...
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;

    const pattern = parts[0];
    const lineOwners = parts.slice(1);

    // Check if any changed file matches this pattern
    for (const file of changedFiles) {
      if (matchGlob(file, pattern)) {
        lineOwners.forEach((owner) => owners.add(owner));
        break;
      }
    }
  }

  return Array.from(owners);
}

function matchGlob(file: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  // Handle directory matching
  if (pattern.endsWith("/")) {
    regexPattern += ".*";
  }

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(file);
}
