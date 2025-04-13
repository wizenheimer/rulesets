// lib/validators/taskList.ts
import { Context } from "probot";
import { ValidationResult } from "../types.js";
import { logger } from "../util/logger.js";

export async function taskListValidator(
  context: Context<"pull_request">,
  config: any
): Promise<ValidationResult> {
  try {
    const body = context.payload.pull_request.body || "";

    // Parse task list items
    const sections: Record<
      string,
      Array<{ checked: boolean; text: string }>
    > = {};
    let currentSection: string | null = null;

    // Split body by lines
    const lines = body.split("\n");
    for (const line of lines) {
      // Check if this is a section header
      const headerMatch = line.match(/^#+\s+(.+)$/);
      if (headerMatch) {
        currentSection = headerMatch[1].trim();
        if (currentSection) {
          sections[currentSection] = [];
        }
        continue;
      }

      // Check if this is a task list item
      const taskMatch = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
      if (taskMatch && currentSection) {
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
        sections[currentSection].push({
          checked: taskMatch[1] !== " ",
          text: taskMatch[2].trim(),
        });
      }
    }

    // Check if required sections are present and tasks are completed
    if (config.include) {
      const includeSections = Array.isArray(config.include)
        ? config.include
        : [config.include];

      for (const sectionPattern of includeSections) {
        const regex = new RegExp(sectionPattern);

        // Find matching sections
        const matchingSections = Object.keys(sections).filter((section) =>
          regex.test(section)
        );

        if (matchingSections.length === 0) {
          return {
            status: "fail",
            validator: "task_list",
            message:
              config.message ||
              `Required section matching "${sectionPattern}" not found`,
          };
        }

        // Check tasks in matching sections
        for (const section of matchingSections) {
          const tasks = sections[section];
          if (tasks.length === 0) {
            return {
              status: "fail",
              validator: "task_list",
              message:
                config.message || `No tasks found in section "${section}"`,
            };
          }

          const uncheckedTasks = tasks.filter((task) => !task.checked);
          if (uncheckedTasks.length > 0) {
            return {
              status: "fail",
              validator: "task_list",
              message:
                config.message ||
                `There are ${uncheckedTasks.length} uncompleted tasks in section "${section}"`,
            };
          }
        }
      }
    }

    return {
      status: "pass",
      validator: "task_list",
      message: "All required task lists are complete",
    };
  } catch (error) {
    logger.error(`Error in task list validator: ${error}`);
    return {
      status: "error",
      validator: "task_list",
      message: `Error: ${error}`,
    };
  }
}
