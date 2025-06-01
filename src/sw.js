chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'GET_PAGE_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        sendResponse({ error: 'No active tab found.' });
        return;
      }
      const { id: tabId, title, url } = tab;

      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: () => {
            return document.documentElement.outerHTML;
          },
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else if (
            Array.isArray(injectionResults) &&
            injectionResults.length > 0
          ) {
            sendResponse({ content: injectionResults[0].result, title, url });
          } else {
            sendResponse({ error: 'Failed to retrieve page content.' });
          }
        }
      );
    });
    return true;
  }
});
