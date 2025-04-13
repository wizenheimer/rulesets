// lib/config.ts
import { Context } from "probot";
import yaml from "js-yaml";
import { RulesetConfig } from "./types.js";

type RepositoryContext = Context<"pull_request">;

export async function loadConfig(
  context: RepositoryContext
): Promise<RulesetConfig | null> {
  try {
    const configResponse = await context.octokit.repos.getContent({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      path: ".github/Ruleset.yml",
      ref: context.payload.pull_request?.head.ref || "main",
    });

    // Handle the case where the response is an array of content
    if (Array.isArray(configResponse.data)) {
      return null;
    }

    // Get the content as a string
    if ("content" in configResponse.data) {
      const content = Buffer.from(
        configResponse.data.content,
        "base64"
      ).toString();
      return yaml.load(content) as RulesetConfig;
    }

    return null;
  } catch (error) {
    // Config file not found or other error
    if ((error as any).status === 404) {
      context.log.info("No Ruleset.yml found");
      return null;
    }
    throw error;
  }
}
