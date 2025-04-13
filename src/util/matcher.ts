// lib/util/matcher.ts

/**
 * Check if the given event string matches any of the provided event patterns
 */
export function matchEvent(patterns: string[], eventString: string): boolean {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }

  return patterns.some((pattern) => {
    // Handle wildcards, e.g., "pull_request.*"
    if (pattern.endsWith(".*")) {
      const prefix = pattern.substring(0, pattern.length - 2);
      return eventString.startsWith(prefix);
    }
    return pattern === eventString;
  });
}

/**
 * Check if a string matches the given pattern (simple glob or regex)
 */
export function matchPattern(input: string, pattern: string): boolean {
  // Handle regex patterns
  if (pattern.startsWith("/") && pattern.endsWith("/")) {
    const regexBody = pattern.substring(1, pattern.length - 1);
    const regex = new RegExp(regexBody, "i");
    return regex.test(input);
  }

  // Handle glob patterns
  // For simplicity, we'll just handle * as a wildcard
  if (pattern.includes("*")) {
    const escapedPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex special chars except *
      .replace(/\*/g, ".*"); // Replace * with .*

    const regex = new RegExp(`^${escapedPattern}$`, "i");
    return regex.test(input);
  }

  // Exact match
  return input.toLowerCase() === pattern.toLowerCase();
}

/**
 * Check if the input matches any of the patterns
 */
export function matchAnyPattern(input: string, patterns: string[]): boolean {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }

  return patterns.some((pattern) => matchPattern(input, pattern));
}
