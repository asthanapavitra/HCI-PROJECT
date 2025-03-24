console.log("Background script is running!");

// Keep track of whether recognition should be running
let isListening = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleVoice") {
        isListening = message.enabled;
        
        // Send the toggle status to the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "toggleVoice", enabled: isListening });
            }
        });
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
