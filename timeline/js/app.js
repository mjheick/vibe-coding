/**
 * App entry point.
 * Wires all modules together on DOMContentLoaded.
 * Zero dependencies — plain browser-global functions.
 * Depends on globals: loadTimelineData, parseAndSortEntries,
 *   validatePositiveNumber, initTimeline, collapseTimeline, expandTimeline
 */

var TIMELINE_CONFIG = {
  dataUrl: 'data/timeline.json',
  advanceInterval: 10,
  fadeOutDuration: 0.5,
  fadeInDuration: 0.5
};

document.addEventListener('DOMContentLoaded', function () {
  var errorBanner = document.getElementById('error-banner');
  var collapseBtn = document.getElementById('collapse-btn');

  // Wire error banner click-to-dismiss
  if (errorBanner) {
    errorBanner.addEventListener('click', function () {
      errorBanner.classList.add('fading');
      setTimeout(function () {
        errorBanner.setAttribute('hidden', '');
        errorBanner.classList.remove('fading');
      }, 500);
    });
  }
  var expandBtn = document.getElementById('expand-btn');
  var playBtn = document.getElementById('play-btn');
  var contentArea = document.getElementById('content-area');

  // Wire collapse/expand buttons
  if (collapseBtn) {
    collapseBtn.addEventListener('click', function () {
      collapseTimeline();
    });
  }
  if (expandBtn) {
    expandBtn.addEventListener('click', function () {
      expandTimeline();
    });
  }

  // Wire play/pause button
  if (playBtn) {
    playBtn.addEventListener('click', function () {
      togglePlayPause();
    });
  }

  // Validate configuration values
  var config = {
    dataUrl: TIMELINE_CONFIG.dataUrl,
    advanceInterval: validatePositiveNumber(TIMELINE_CONFIG.advanceInterval, 10),
    fadeOutDuration: validatePositiveNumber(TIMELINE_CONFIG.fadeOutDuration, 0.5),
    fadeInDuration: validatePositiveNumber(TIMELINE_CONFIG.fadeInDuration, 0.5)
  };

  // Load data and initialize timeline
  loadTimelineData(config.dataUrl, 'data/timeline.json').then(function (result) {
    // Show error banner if data loading had an issue
    if (result.error && errorBanner) {
      errorBanner.textContent = result.error;
      errorBanner.removeAttribute('hidden');
    }

    // Malformed JSON — data is null, stop here
    if (result.data === null) {
      return;
    }

    // Parse and sort entries
    var parsed = parseAndSortEntries(result.data);

    // Log parse errors to console and show in banner
    if (parsed.errors && parsed.errors.length > 0) {
      for (var i = 0; i < parsed.errors.length; i++) {
        console.error('Timeline parse error: ' + parsed.errors[i]);
      }
      // Show data consistency errors in the error banner
      if (errorBanner) {
        errorBanner.textContent = parsed.errors.join(' | ');
        errorBanner.removeAttribute('hidden');
      }
    }

    // No valid entries
    if (!parsed.entries || parsed.entries.length === 0) {
      if (contentArea) {
        contentArea.textContent = 'No valid timeline entries found.';
      }
      return;
    }

    // Initialize timeline with validated config and parsed entries
    initTimeline(config, parsed.entries);
  });
});
