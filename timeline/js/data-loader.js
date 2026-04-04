/**
 * DataLoader module
 * Fetches timeline JSON from a primary URL via fetch(), validates the response,
 * and falls back to a fallback URL or embedded default data.
 * Handles file:// protocol where fetch() is blocked by CORS.
 * Zero dependencies — plain browser-global functions.
 */

/**
 * Embedded default data used as last-resort fallback when fetch() is
 * unavailable (e.g. file:// protocol) or both URLs fail.
 * This mirrors the contents of data/timeline.json.
 * @type {Object}
 */
var EMBEDDED_DEFAULT_DATA = {
  "4/4/2026": "Left",
  "4/4/2026 4:00:00": "Left-Middle",
  "4/7/2026 12:00:00": "Middle",
  "4/5/2026": "Right"
};

/**
 * Attempts to fetch and parse JSON from a given URL.
 * @param {string} url
 * @returns {Promise<{data: Object|null, error: string|null, isMalformed: boolean}>}
 */
async function _fetchJson(url) {
  var response;
  try {
    response = await fetch(url);
  } catch (e) {
    return { data: null, error: 'network', isMalformed: false };
  }

  if (!response.ok) {
    return { data: null, error: 'http', isMalformed: false };
  }

  var text;
  try {
    text = await response.text();
  } catch (e) {
    return { data: null, error: 'network', isMalformed: false };
  }

  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { data: null, error: 'malformed', isMalformed: true };
  }

  return { data: parsed, error: null, isMalformed: false };
}

/**
 * Checks if fetch() is likely to work (i.e. not on file:// protocol).
 * @returns {boolean}
 */
function _canFetch() {
  return window.location.protocol !== 'file:';
}

/**
 * Loads timeline data from a primary URL. On network/HTTP failure,
 * falls back to the fallback URL. If both fail (or fetch is unavailable
 * due to file:// protocol), uses the embedded default data.
 *
 * On malformed JSON from the primary source, returns null data with an error
 * (no fallback for bad JSON).
 *
 * @param {string} primaryUrl - The primary JSON URL to fetch.
 * @param {string} fallbackUrl - The fallback JSON URL (e.g. "data/timeline.json").
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
async function loadTimelineData(primaryUrl, fallbackUrl) {
  // If we can't fetch (file:// protocol), use embedded data directly
  if (!_canFetch()) {
    return {
      data: EMBEDDED_DEFAULT_DATA,
      error: "Running from file:// — using embedded default data."
    };
  }

  var result = await _fetchJson(primaryUrl);

  // Primary succeeded
  if (result.data !== null && !result.error) {
    return { data: result.data, error: null };
  }

  // Primary returned malformed JSON — do NOT fall back
  if (result.isMalformed) {
    return { data: null, error: "Timeline data format is invalid." };
  }

  // Primary failed (network/HTTP) — try fallback URL
  var fallbackResult = await _fetchJson(fallbackUrl);

  if (fallbackResult.data !== null && !fallbackResult.error) {
    return {
      data: fallbackResult.data,
      error: "Could not load timeline data. Showing default content."
    };
  }

  // Fallback also returned malformed JSON
  if (fallbackResult.isMalformed) {
    return { data: null, error: "Timeline data format is invalid." };
  }

  // Both URLs failed — use embedded default as last resort
  return {
    data: EMBEDDED_DEFAULT_DATA,
    error: "Could not load timeline data. Showing default content."
  };
}
