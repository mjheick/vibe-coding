/**
 * DateParser module
 * Parses date/time string keys into Date objects, sorts entries chronologically,
 * and formats display labels.
 * Zero dependencies — plain browser-global functions.
 */

/**
 * Parses a date/time string into a Date object.
 * Accepts ISO 8601, US format (M/D/YYYY), European format (D.M.YYYY),
 * and natural language strings. Date-only keys default to midnight.
 * @param {string} dateTimeStr - The date/time string to parse.
 * @returns {{date: Date|null, error: string|null}}
 */
function parseDateTime(dateTimeStr) {
  if (typeof dateTimeStr !== 'string' || dateTimeStr.trim() === '') {
    return { date: null, error: 'Cannot parse date: ' + dateTimeStr };
  }

  var str = dateTimeStr.trim();
  var date = null;

  // 1. Try native Date constructor first (handles ISO 8601 and natural language)
  date = tryParseNative(str);
  if (date) return { date: date, error: null };

  // 2. Try US format: M/D/YYYY with optional time H:MM:SS
  date = tryParseUS(str);
  if (date) return { date: date, error: null };

  // 3. Try European format: D.M.YYYY with optional time H:MM:SS
  date = tryParseEuropean(str);
  if (date) return { date: date, error: null };

  return { date: null, error: 'Cannot parse date: ' + dateTimeStr };
}

/**
 * Try to parse using the native Date constructor.
 * Handles ISO 8601 strings and natural language dates.
 * If the string has no time component, ensures midnight (00:00:00).
 * @param {string} str
 * @returns {Date|null}
 */
function tryParseNative(str) {
  var date = new Date(str);
  if (isNaN(date.getTime())) return null;

  // Check if the string looks like it has a time component
  // ISO time: contains 'T' followed by digits, or has HH:MM pattern
  var hasTime = /T\d/.test(str) || /\d{1,2}:\d{2}/.test(str);

  if (!hasTime) {
    // Date-only: normalize to local midnight
    // new Date('YYYY-MM-DD') parses as UTC, so rebuild in local time
    var y = date.getUTCFullYear();
    var m = date.getUTCMonth();
    var d = date.getUTCDate();
    date = new Date(y, m, d, 0, 0, 0);
  }

  return date;
}

/**
 * Try to parse a US format date string: M/D/YYYY or M/D/YYYY H:MM:SS
 * @param {string} str
 * @returns {Date|null}
 */
function tryParseUS(str) {
  var usRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
  var match = str.match(usRegex);
  if (!match) return null;

  var month = parseInt(match[1], 10) - 1;
  var day = parseInt(match[2], 10);
  var year = parseInt(match[3], 10);
  var hours = match[4] !== undefined ? parseInt(match[4], 10) : 0;
  var minutes = match[5] !== undefined ? parseInt(match[5], 10) : 0;
  var seconds = match[6] !== undefined ? parseInt(match[6], 10) : 0;

  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  var date = new Date(year, month, day, hours, minutes, seconds);
  if (isNaN(date.getTime())) return null;
  // Validate that the date components didn't overflow (e.g. Feb 30 -> Mar 2)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

/**
 * Try to parse a European format date string: D.M.YYYY or D.M.YYYY H:MM:SS
 * @param {string} str
 * @returns {Date|null}
 */
function tryParseEuropean(str) {
  var euRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
  var match = str.match(euRegex);
  if (!match) return null;

  var day = parseInt(match[1], 10);
  var month = parseInt(match[2], 10) - 1;
  var year = parseInt(match[3], 10);
  var hours = match[4] !== undefined ? parseInt(match[4], 10) : 0;
  var minutes = match[5] !== undefined ? parseInt(match[5], 10) : 0;
  var seconds = match[6] !== undefined ? parseInt(match[6], 10) : 0;

  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  var date = new Date(year, month, day, hours, minutes, seconds);
  if (isNaN(date.getTime())) return null;
  // Validate that the date components didn't overflow
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

/**
 * Formats a Date object into a human-readable label for display on the timeline.
 * Format: "Mon D, YYYY HH:MM" (e.g. "Apr 4, 2026 00:00")
 * @param {Date} date
 * @returns {string}
 */
function formatDateLabel(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  var months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  var month = months[date.getMonth()];
  var day = date.getDate();
  var year = date.getFullYear();
  var hours = date.getHours().toString().padStart(2, '0');
  var minutes = date.getMinutes().toString().padStart(2, '0');

  return month + ' ' + day + ', ' + year + ' ' + hours + ':' + minutes;
}

/**
 * Takes raw JSON data object and returns a sorted array of timeline entries.
 * @param {Object} rawData - Flat object {dateTimeString: htmlContent}
 * @returns {{entries: Array<{key: string, date: Date, label: string, content: string}>, errors: string[]}}
 */
function parseAndSortEntries(rawData) {
  var entries = [];
  var errors = [];

  if (!rawData || typeof rawData !== 'object') {
    return { entries: entries, errors: ['Invalid data: expected an object.'] };
  }

  var keys = Object.keys(rawData);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = rawData[key];

    // Validate value is a string (Req 20)
    if (typeof value !== 'string') {
      var valueType = value === null ? 'null' : (Array.isArray(value) ? 'array' : typeof value);
      errors.push('Data consistency error: key "' + key + '" has invalid value type "' + valueType + '" (expected string).');
      continue;
    }

    var result = parseDateTime(key);

    if (result.error || !result.date) {
      errors.push(result.error || 'Cannot parse date: ' + key);
      continue;
    }

    entries.push({
      key: key,
      date: result.date,
      label: formatDateLabel(result.date),
      content: value
    });
  }

  // Sort chronologically by parsed Date value
  entries.sort(function (a, b) {
    return a.date.getTime() - b.date.getTime();
  });

  return { entries: entries, errors: errors };
}
