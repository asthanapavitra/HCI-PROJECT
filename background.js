console.log("Background script is running!");

// Keep track of whether recognition should be running
let isListening = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleVoice") {
        isListening = message.enabled;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "toggleVoice", enabled: isListening });
            }
        });
    }

    if (message.action === "minimizeWindow") {
        chrome.windows.getCurrent({}, (window) => {
            chrome.windows.update(window.id, { state: "minimized" });
        });
    }

    if (message.action === "openNewWindow") {
        chrome.windows.create({ url: "https://www.google.com", focused: true });
    }
   
    
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && !tab.url.startsWith("chrome://")) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"]
        }).catch((error) => console.error("Error injecting content script:", error));
    }
});
