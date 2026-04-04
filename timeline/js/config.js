/**
 * Configuration validation utility.
 * Zero dependencies — plain browser-global function.
 */

/**
 * Validates a configuration value: returns the value if it's a positive number,
 * otherwise returns the provided default.
 * Handles zero, negative, NaN, undefined, null, strings, and non-number types.
 * @param {*} value - The configuration value to validate.
 * @param {number} defaultValue - The fallback default.
 * @returns {number}
 */
function validatePositiveNumber(value, defaultValue) {
  if (typeof value === 'number' && isFinite(value) && value > 0) {
    return value;
  }
  return defaultValue;
}
