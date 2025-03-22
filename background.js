console.log("Background script is running!");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "voiceStatus") {
        console.log("Voice Recognition Status:", message.status);
    }
});
