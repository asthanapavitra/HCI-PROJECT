document.addEventListener("DOMContentLoaded", function () {
    const voiceToggle = document.getElementById("voiceToggle");

    voiceToggle.addEventListener("change", function () {
        let enabled = voiceToggle.checked;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "toggleVoice", enabled });
        });

        chrome.runtime.sendMessage({ action: "voiceStatus", status: enabled ? "started" : "stopped" });
    });
});
