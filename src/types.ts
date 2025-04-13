// lib/types.ts
import { Context } from "probot";

export interface RulesetConfig {
  ruleset: Rule[];
}

export interface Rule {
  name: string;
  when: string[];
  if?: Condition[];
  validate: Validation[];
  on_success?: Action[];
  on_failure?: Action[];
}

export interface Condition {
  type: string;
  [key: string]: any;
}

export interface Validation {
  type: string;
  [key: string]: any;
}

export interface Action {
  type: string;
  [key: string]: any;
}

export interface ValidationResult {
  status: "pass" | "fail" | "error";
  validator: string;
  message: string;
  details?: any;
}

export interface FilterResult {
  matched: boolean;
  filter: string;
  message?: string;
}

export type FilterFunction = (
  context: Context,
  condition: Condition
) => Promise<FilterResult>;
export type ValidatorFunction = (
  context: Context,
  validation: Validation
) => Promise<ValidationResult>;
export type ActionFunction = (
  context: Context,
  action: Action,
  results: ValidationResult[]
) => Promise<void>;
