/**
 * TimelineController module.
 * Manages active entry state, auto-advance timer, manual navigation,
 * notch rendering, and collapse/expand behavior.
 * Zero dependencies — plain browser-global functions.
 * Depends on globals: renderContent, transitionContent, formatDateLabel, validatePositiveNumber
 */

/**
 * Internal timeline state.
 * @type {Object}
 */
var _timelineState = {
  entries: [],
  activeIndex: 0,
  isCollapsed: false,
  isAutoAdvancing: false,
  timerId: null,
  config: {
    advanceInterval: 10,
    fadeOutDuration: 0.5,
    fadeInDuration: 0.5
  }
};

/**
 * Computes the proportional position (0 to 1) for a given date
 * within the range [minDate, maxDate].
 * Returns 0.5 if minDate === maxDate (single entry case).
 *
 * @param {Date} date - The date to position.
 * @param {Date} minDate - The earliest date in the timeline.
 * @param {Date} maxDate - The latest date in the timeline.
 * @returns {number} A value between 0 and 1 (or 0.5 for single entry).
 */
function computeProportionalPosition(date, minDate, maxDate) {
  var range = maxDate.getTime() - minDate.getTime();
  if (range === 0) return 0.5;
  return (date.getTime() - minDate.getTime()) / range;
}

/**
 * Renders bookend markers and labels at the left and right ends
 * of the timeline bar. Makes bookends clickable.
 * @param {Array<{key: string, date: Date, label: string, content: string}>} entries
 */
function renderBookends(entries) {
  var leftLabel = document.getElementById('bookend-label-left');
  var rightLabel = document.getElementById('bookend-label-right');
  var leftBookend = document.getElementById('bookend-left');
  var rightBookend = document.getElementById('bookend-right');

  if (entries.length === 0) return;

  if (leftLabel) {
    leftLabel.textContent = formatDateLabel(entries[0].date);
  }
  if (rightLabel) {
    rightLabel.textContent = formatDateLabel(entries[entries.length - 1].date);
  }

  // Make bookends clickable
  if (leftBookend) {
    leftBookend.addEventListener('click', function () {
      setActiveEntry(0);
    });
  }
  if (rightBookend) {
    rightBookend.addEventListener('click', function () {
      setActiveEntry(entries.length - 1);
    });
  }
}

/**
 * Initializes the timeline with the given configuration and entries.
 * Validates config values, renders notches at proportional positions,
 * renders bookend markers/labels, sets first entry active,
 * and starts auto-advance.
 *
 * @param {Object} config - Configuration object.
 * @param {number} [config.advanceInterval=10] - Seconds between auto-advances.
 * @param {number} [config.fadeOutDuration=0.5] - Fade-out seconds.
 * @param {number} [config.fadeInDuration=0.5] - Fade-in seconds.
 * @param {Array<{key: string, date: Date, label: string, content: string}>} entries - Chronologically sorted entries.
 */
function initTimeline(config, entries) {
  // Validate config values using validatePositiveNumber
  _timelineState.config.advanceInterval = validatePositiveNumber(
    config && config.advanceInterval, 10
  );
  _timelineState.config.fadeOutDuration = validatePositiveNumber(
    config && config.fadeOutDuration, 0.5
  );
  _timelineState.config.fadeInDuration = validatePositiveNumber(
    config && config.fadeInDuration, 0.5
  );

  // Store entries
  _timelineState.entries = entries || [];
  _timelineState.activeIndex = 0;
  _timelineState.isCollapsed = false;
  _timelineState.isAutoAdvancing = false;
  _timelineState.timerId = null;

  // Compute min/max dates for proportional positioning
  var minDate = _timelineState.entries.length > 0 ? _timelineState.entries[0].date : null;
  var maxDate = _timelineState.entries.length > 0 ? _timelineState.entries[_timelineState.entries.length - 1].date : null;

  // Render notches with proportional positioning
  var notchesContainer = document.getElementById('timeline-notches');
  if (notchesContainer) {
    notchesContainer.innerHTML = '';

    for (var i = 0; i < _timelineState.entries.length; i++) {
      var entry = _timelineState.entries[i];
      var notch = document.createElement('div');
      notch.className = 'notch';
      notch.setAttribute('data-index', i);

      // Proportional positioning
      var position = computeProportionalPosition(entry.date, minDate, maxDate);
      notch.style.left = (position * 100) + '%';

      var tooltip = document.createElement('span');
      tooltip.className = 'notch-tooltip';
      tooltip.textContent = formatDateLabel(entry.date);

      notch.appendChild(tooltip);
      notchesContainer.appendChild(notch);

      // Click listener for manual navigation
      (function (index) {
        notch.addEventListener('click', function () {
          setActiveEntry(index);
        });
      })(i);
    }
  }

  // Render bookend labels
  renderBookends(_timelineState.entries);

  // Set first entry as active (no auto-start — Req 18.8)
  if (_timelineState.entries.length > 0) {
    _setActiveNotch(0);
    _renderActiveContent(true);
    _updatePlayButton();
  }
}

/**
 * Sets the active entry by index. Updates notch visuals, renders content.
 * Stops auto-advance and shows play icon (manual navigation pauses slideshow).
 * @param {number} index - The index of the entry to activate.
 */
function setActiveEntry(index) {
  if (index < 0 || index >= _timelineState.entries.length) {
    return;
  }

  _timelineState.activeIndex = index;
  _setActiveNotch(index);
  _renderActiveContent(false);

  // Manual selection stops auto-advance (Req 6.3, 18.6)
  stopAutoAdvance();
  _updatePlayButton();
}

/**
 * Toggles play/pause for the slideshow.
 */
function togglePlayPause() {
  if (_timelineState.isAutoAdvancing) {
    stopAutoAdvance();
  } else {
    startAutoAdvance();
  }
  _updatePlayButton();
}

/**
 * Starts auto-advance from the current active entry.
 * Wraps around to the first entry when the last is reached.
 */
function startAutoAdvance() {
  if (_timelineState.isAutoAdvancing || _timelineState.entries.length === 0) {
    return;
  }

  _timelineState.isAutoAdvancing = true;
  _updatePlayButton();

  _timelineState.timerId = setInterval(function () {
    var nextIndex = _timelineState.activeIndex + 1;

    // Wrap around to beginning (Req 18.7)
    if (nextIndex >= _timelineState.entries.length) {
      nextIndex = 0;
    }

    _timelineState.activeIndex = nextIndex;
    _setActiveNotch(nextIndex);
    _renderActiveContent(false);
  }, _timelineState.config.advanceInterval * 1000);
}

/**
 * Stops auto-advance.
 */
function stopAutoAdvance() {
  if (_timelineState.timerId !== null) {
    clearInterval(_timelineState.timerId);
    _timelineState.timerId = null;
  }
  _timelineState.isAutoAdvancing = false;
  _updatePlayButton();
}

/**
 * Internal: Updates the play/pause button icon based on current state.
 */
function _updatePlayButton() {
  var playBtn = document.getElementById('play-btn');
  if (!playBtn) return;

  if (_timelineState.isAutoAdvancing) {
    playBtn.innerHTML = '&#10074;&#10074;'; // ❚❚ pause
    playBtn.setAttribute('aria-label', 'Pause slideshow');
  } else {
    playBtn.innerHTML = '&#9654;'; // ▶ play
    playBtn.setAttribute('aria-label', 'Play slideshow');
  }
}

/**
 * Collapses the timeline bar.
 * Hides the bar, shows the expand indicator, continues auto-advance.
 */
function collapseTimeline() {
  var timelineBar = document.getElementById('timeline-bar');
  var expandBtn = document.getElementById('expand-btn');
  var contentArea = document.getElementById('content-area');

  if (timelineBar) {
    timelineBar.classList.add('collapsed');
  }
  if (expandBtn) {
    expandBtn.classList.add('visible');
  }
  if (contentArea) {
    contentArea.classList.add('bar-collapsed');
  }

  _timelineState.isCollapsed = true;
  // Auto-advance continues running (Req 11.6)
}

/**
 * Expands the timeline bar.
 * Restores the bar, hides the expand indicator.
 */
function expandTimeline() {
  var timelineBar = document.getElementById('timeline-bar');
  var expandBtn = document.getElementById('expand-btn');
  var contentArea = document.getElementById('content-area');

  if (timelineBar) {
    timelineBar.classList.remove('collapsed');
  }
  if (expandBtn) {
    expandBtn.classList.remove('visible');
  }
  if (contentArea) {
    contentArea.classList.remove('bar-collapsed');
  }

  _timelineState.isCollapsed = false;
}

/**
 * Internal: Updates the active class on notch elements.
 * @param {number} index - The index of the notch to mark active.
 */
function _setActiveNotch(index) {
  var notchesContainer = document.getElementById('timeline-notches');
  if (!notchesContainer) return;

  var notches = notchesContainer.querySelectorAll('.notch');
  for (var i = 0; i < notches.length; i++) {
    if (i === index) {
      notches[i].classList.add('active');
    } else {
      notches[i].classList.remove('active');
    }
  }
}

/**
 * Internal: Renders the content for the currently active entry.
 * Uses direct render for initial load, transition for subsequent changes.
 * @param {boolean} isInitial - True for initial render (no transition).
 */
function _renderActiveContent(isInitial) {
  var contentArea = document.getElementById('content-area');
  if (!contentArea) return;

  var entry = _timelineState.entries[_timelineState.activeIndex];
  if (!entry) return;

  if (isInitial) {
    renderContent(entry.content, contentArea);
  } else {
    transitionContent(
      contentArea,
      entry.content,
      _timelineState.config.fadeOutDuration,
      _timelineState.config.fadeInDuration
    );
  }
}
