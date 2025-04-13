// lib/processor.ts
import { Context } from "probot";
import {
  Rule,
  ValidationResult,
  Condition,
  FilterResult,
  FilterFunction,
  Validation,
  ValidatorFunction,
} from "./types.js";
import { loadConfig } from "./config.js";
import { matchEvent } from "./util/matcher.js";
import * as filters from "./filters/index.js";
import * as validators from "./validators/index.js";
import * as actions from "./actions/index.js";
import { logger } from "./util/logger.js";

export class Processor {
  constructor(private context: Context) {}

  async process(): Promise<void> {
    try {
      // Load configuration
      const config = await loadConfig(this.context);
      if (!config || !config.ruleset) {
        logger.info("No valid Ruleset configuration found");
        return;
      }

      // Get event name
      const eventName = this.context.name;
      const action =
        "action" in this.context.payload
          ? this.context.payload.action
          : undefined;
      const eventString = action ? `${eventName}.${action}` : eventName;

      logger.info(`Processing event: ${eventString}`);

      // Process each rule
      for (const ruleConfig of config.ruleset) {
        await this.processRule(ruleConfig, eventString);
      }
    } catch (error) {
      logger.error(`Error processing event: ${error}`);
    }
  }

  private async processRule(rule: Rule, eventString: string): Promise<void> {
    try {
      // Check if rule applies to this event
      if (!matchEvent(rule.when, eventString)) {
        return;
      }

      logger.info(`Applying rule: ${rule.name || "unnamed rule"}`);

      // Apply filters if present
      if (rule.if && rule.if.length > 0) {
        const filterResults = await this.applyFilters(rule.if);
        if (!filterResults.every((result) => result.matched)) {
          logger.info(`Rule conditions not met, skipping`);
          return;
        }
      }

      // Apply validations
      const validationResults = await this.applyValidations(rule.validate);
      const passed = validationResults.every(
        (result) => result.status === "pass"
      );

      // Apply appropriate actions
      const actionsToApply = passed ? rule.on_success : rule.on_failure;
      if (actionsToApply) {
        await this.applyActions(actionsToApply, validationResults);
      }
    } catch (error) {
      logger.error(`Error processing rule: ${error}`);
    }
  }

  private async applyFilters(conditions: Condition[]): Promise<FilterResult[]> {
    const results: FilterResult[] = [];

    for (const condition of conditions) {
      const filterType = condition.type;
      const filterConfig = condition;

      try {
        if (filterType in filters) {
          const filterFunction = (filters as any)[filterType] as FilterFunction;
          const result = await filterFunction(this.context, filterConfig);
          results.push(result);
        } else {
          logger.warn(`Unknown filter type: ${filterType}`);
          results.push({
            matched: false,
            filter: filterType,
            message: `Unknown filter type: ${filterType}`,
          });
        }
      } catch (error) {
        logger.error(`Error applying filter ${filterType}: ${error}`);
        results.push({
          matched: false,
          filter: filterType,
          message: `Error: ${error}`,
        });
      }
    }

    return results;
  }

  private async applyValidations(
    validations: Validation[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validation of validations) {
      const validatorType = validation.type;
      const validatorConfig = validation;

      try {
        if (validatorType in validators) {
          const validatorFunction = (validators as any)[
            validatorType
          ] as ValidatorFunction;
          const result = await validatorFunction(this.context, validatorConfig);
          results.push(result);
        } else {
          logger.warn(`Unknown validator type: ${validatorType}`);
          results.push({
            status: "error",
            validator: validatorType,
            message: `Unknown validator type: ${validatorType}`,
          });
        }
      } catch (error) {
        logger.error(`Error applying validator ${validatorType}: ${error}`);
        results.push({
          status: "error",
          validator: validatorType,
          message: `Error: ${error}`,
        });
      }
    }

    return results;
  }

  private async applyActions(
    actionsToApply: any[],
    validationResults: ValidationResult[]
  ): Promise<void> {
    for (const actionConfig of actionsToApply) {
      const actionType = Object.keys(actionConfig)[0];
      const actionSettings = actionConfig[actionType];

      try {
        if (actionType in actions) {
          const actionFunction = (actions as any)[actionType];
          await actionFunction(this.context, actionSettings, validationResults);
        } else {
          logger.warn(`Unknown action type: ${actionType}`);
        }
      } catch (error) {
        logger.error(`Error applying action ${actionType}: ${error}`);
      }
    }
  }
}
