/**
 * TVer Subtitle Extractor - Popup Script
 * 
 * Handles the popup UI interactions and communicates with the background script.
 */

document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * Initialize the popup UI and set up event listeners
 */
function initializePopup() {
  const toggle = document.getElementById('subtitle-toggle');
  const statusValue = document.getElementById('status-value');

  if (!toggle || !statusValue) {
    console.error('Required DOM elements not found');
    return;
  }

  // Load the current state from storage
  loadStateFromStorage(toggle, statusValue);

  // Handle toggle changes
  toggle.addEventListener('change', () => handleToggleChange(toggle, statusValue));
}

/**
 * Load extension state from storage and update UI
 * @param {HTMLElement} toggle - The toggle checkbox element
 * @param {HTMLElement} statusValue - The status text element
 */
function loadStateFromStorage(toggle, statusValue) {
  browser.storage.local.get('enabled')
    .then(result => {
      const enabled = result.enabled ?? false;
      toggle.checked = enabled;
      updateStatus(statusValue, enabled);
    })
    .catch(error => {
      console.error('Error loading extension state:', error);
      // Set to default state if error
      toggle.checked = false;
      updateStatus(statusValue, false);
    });
}

/**
 * Handle toggle state changes
 * @param {HTMLElement} toggle - The toggle checkbox element
 * @param {HTMLElement} statusValue - The status text element
 */
function handleToggleChange(toggle, statusValue) {
  const enabled = toggle.checked;
  
  // Update the storage
  browser.storage.local.set({ enabled })
    .catch(error => {
      console.error('Error saving extension state:', error);
    });
  
  // Update the UI
  updateStatus(statusValue, enabled);
  
  // Send message to content script in active tab
  browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
      if (tabs[0]) {
        return browser.tabs.sendMessage(tabs[0].id, { action: 'toggleSubtitles', enabled });
      }
    })
    .catch(error => {
      // Ignore expected errors when content script is not yet loaded
      if (!error.message.includes('receiving end does not exist')) {
        console.error('Error sending message to content script:', error);
      }
    });
  
  // Notify background script
  browser.runtime.sendMessage({ action: 'toggleSubtitles', enabled })
    .catch(error => {
      console.error('Error sending message to background script:', error);
    });
}

/**
 * Update the status text element
 * @param {HTMLElement} statusValue - The status text element
 * @param {boolean} enabled - Whether the extension is enabled
 */
function updateStatus(statusValue, enabled) {
  statusValue.textContent = enabled ? 'On' : 'Off';
  statusValue.className = enabled ? 'on' : '';
} 