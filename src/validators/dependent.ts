// lib/validators/dependent.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";

export async function dependentValidator(
  context: Context<"pull_request">,
  config: any
): Promise<ValidationResult> {
  try {
    // Get changed files
    const filesResponse = await context.octokit.pulls.listFiles({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: context.payload.pull_request.number,
    });

    const changedFiles = filesResponse.data.map((file) => file.filename);

    // Check dependencies
    if (Array.isArray(config) && config.length > 0) {
      for (const dependency of config) {
        if (!dependency.when || !dependency.require) {
          continue;
        }

        const matchingFiles = getMatchingFiles(changedFiles, dependency.when);

        if (matchingFiles.length > 0) {
          const requiredFiles = Array.isArray(dependency.require)
            ? dependency.require
            : [dependency.require];

          // Check if all required files are present
          const missingFiles: string[] = [];

          for (const requiredPattern of requiredFiles) {
            let found = false;

            // Handle pattern replacement
            for (const matchingFile of matchingFiles) {
              const requiredFileWithReplacement = replacePattern(
                requiredPattern,
                matchingFile
              );

              if (
                changedFiles.includes(requiredFileWithReplacement) ||
                getMatchingFiles(changedFiles, requiredFileWithReplacement)
                  .length > 0
              ) {
                found = true;
                break;
              }
            }

            if (!found) {
              missingFiles.push(requiredPattern);
            }
          }

          if (missingFiles.length > 0) {
            return {
              status: "fail",
              validator: "dependent",
              message:
                dependency.message ||
                `Missing required files: ${missingFiles.join(
                  ", "
                )} when modifying: ${matchingFiles.join(", ")}`,
            };
          }
        }
      }
    } else if (typeof config === "object") {
      // Old-style configuration with 'files' array
      if (config.files && Array.isArray(config.files)) {
        // Check if any of the dependencies are satisfied
        const dependencies = config.files;
        const matchedFiles = dependencies.filter((file: string) =>
          changedFiles.includes(file)
        );

        // If we matched some files but not all, that's a failure
        if (
          matchedFiles.length > 0 &&
          matchedFiles.length < dependencies.length
        ) {
          const missingFiles = dependencies.filter(
            (file: string) => !changedFiles.includes(file)
          );

          return {
            status: "fail",
            validator: "dependent",
            message:
              config.message ||
              `Missing dependent files: ${missingFiles.join(", ")}`,
          };
        }
      }
    }

    return {
      status: "pass",
      validator: "dependent",
      message: "All dependent files are present",
    };
  } catch (error) {
    logger.error(`Error in dependent validator: ${error}`);
    return {
      status: "error",
      validator: "dependent",
      message: `Error: ${error}`,
    };
  }
}

function getMatchingFiles(files: string[], pattern: string): string[] {
  const regex = new RegExp(pattern.replace(/\*/g, ".*"));
  return files.filter((file) => regex.test(file));
}

function replacePattern(pattern: string, file: string): string {
  // Replace $ with the base name of the file (without extension)
  if (pattern.includes("$")) {
    const baseName = file.split("/").pop()?.split(".")[0] || "";
    return pattern.replace(/\$/g, baseName);
  }
  return pattern;
}
