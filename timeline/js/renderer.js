/**
 * ContentRenderer module.
 * Updates the Content Area DOM with the active entry's HTML content.
 * Zero dependencies — plain browser-global function.
 */

/**
 * Renders HTML content into the Content Area.
 * @param {string} htmlContent - The HTML string to render.
 * @param {HTMLElement} container - The Content Area DOM element.
 */
function renderContent(htmlContent, container) {
  if (!container) {
    console.warn('renderContent: container element is null or undefined.');
    return;
  }
  if (typeof htmlContent !== 'string') {
    console.warn('renderContent: expected string content, got ' + typeof htmlContent + '. Rendering empty.');
    container.innerHTML = '';
    return;
  }
  container.innerHTML = htmlContent;
}
