/**
 * AnimationController module.
 * Orchestrates fade-out/fade-in transitions when the active entry changes.
 * Zero dependencies — plain browser-global function.
 */

/** @type {number|null} Current transition cancel token */
var _transitionToken = null;

/**
 * Performs a fade-out then fade-in transition on the content area.
 * Fade-out completes before fade-in begins (sequential).
 * Supports cancellation: if a new transition starts mid-animation,
 * the previous one is cancelled.
 *
 * @param {HTMLElement} container - The Content Area DOM element.
 * @param {string} newContent - The new HTML content to display after fade-out.
 * @param {number} fadeOutDuration - Duration in seconds for fade-out.
 * @param {number} fadeInDuration - Duration in seconds for fade-in.
 * @returns {Promise<void>} Resolves when the full transition completes.
 */
function transitionContent(container, newContent, fadeOutDuration, fadeInDuration) {
  // Generate a unique token for this transition
  var token = Date.now() + Math.random();
  _transitionToken = token;

  return new Promise(function (resolve) {
    // Set transition duration for fade-out
    container.style.transition = 'opacity ' + fadeOutDuration + 's ease';
    container.style.opacity = '0';

    setTimeout(function () {
      // Check if this transition was cancelled
      if (_transitionToken !== token) {
        resolve();
        return;
      }

      // Swap content while invisible
      renderContent(newContent, container);

      // Set transition duration for fade-in
      container.style.transition = 'opacity ' + fadeInDuration + 's ease';
      container.style.opacity = '1';

      setTimeout(function () {
        resolve();
      }, fadeInDuration * 1000);
    }, fadeOutDuration * 1000);
  });
}
