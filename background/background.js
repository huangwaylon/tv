/**
 * TVer Subtitle Extractor - Background Script
 * 
 * Handles extension initialization and message passing.
 */

// Initialize default settings when extension is installed
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get('enabled')
    .then(result => {
      if (result.enabled === undefined) {
        return browser.storage.local.set({ enabled: false });
      }
    })
    .catch(error => {
      console.error('Error initializing extension settings:', error);
    });
});

// Handle messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleSubtitles') {
    // No need to do anything special here for now, but we could
    // handle global state changes or cross-tab communication if needed
  }
});

// When a tab is updated, inject content script if needed
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('tver.jp')) {
    browser.storage.local.get('enabled')
      .then(result => {
        const enabled = result.enabled ?? false;
        if (enabled) {
          browser.tabs.sendMessage(tabId, { action: 'toggleSubtitles', enabled })
            .catch(error => {
              // Ignore expected errors when content script is not yet loaded
              if (!error.message.includes('receiving end does not exist')) {
                console.error('Error sending message to tab:', error);
              }
            });
        }
      })
      .catch(error => {
        console.error('Error retrieving settings:', error);
      });
  }
}); 