console.log("Background script is running!");

// Keep track of whether recognition should be running
let isListening = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleVoice") {
    isListening = message.enabled;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "toggleVoice",
          enabled: isListening,
        });
      }
    });
  }

  if (message.action === "minimizeWindow") {
    console.log("Received minimizeWindow action");
    chrome.windows.getCurrent({}, (window) => {
      if (window && window.id) {
        chrome.windows.update(window.id, { state: "minimized" }, () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error minimizing:",
              chrome.runtime.lastError.message
            );
          }
        });
      }
    });
  }

  if (message.action === "openNewWindow") {
    chrome.windows.create({ url: "https://www.google.com", focused: true });
  }
  if (message.action === "closeCurrentWindow") {
    chrome.windows.getCurrent({}, (window) => {
      chrome.windows.remove(window.id);
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://")
  ) {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      })
      .catch((error) =>
        console.error("Error injecting content script:", error)
      );
  }
});
