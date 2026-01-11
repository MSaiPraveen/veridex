/**
 * Type declarations for json-logic-js
 */

declare module 'json-logic-js' {
  /**
   * Apply JSON Logic rules to data
   * @param rule - The JSON Logic rule object
   * @param data - The data to apply the rule to
   * @returns The result of applying the rule
   */
  export function apply(rule: unknown, data?: unknown): unknown;

  /**
   * Check if an object is a valid JSON Logic rule
   * @param rule - The object to check
   * @returns True if the object is a valid JSON Logic rule
   */
  export function is_logic(rule: unknown): boolean;

  /**
   * Add a custom operation
   * @param name - The name of the operation
   * @param handler - The handler function
   */
  export function add_operation(
    name: string,
    handler: (...args: unknown[]) => unknown,
  ): void;

  /**
   * Remove a custom operation
   * @param name - The name of the operation to remove
   */
  export function rm_operation(name: string): void;

  /**
   * Get all available operations
   * @returns Object containing all operations
   */
  export function get_operator(name: string): ((...args: unknown[]) => unknown) | undefined;

  /**
   * Uses the first argument as a string to look up a value in the second argument
   */
  export function get_values(data: unknown, key: unknown): unknown;
}
