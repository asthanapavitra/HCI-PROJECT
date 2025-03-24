document.addEventListener("DOMContentLoaded", function () {
    const voiceToggle = document.getElementById("voiceToggle");

    voiceToggle.addEventListener("change", function () {
        let enabled = voiceToggle.checked;
        chrome.runtime.sendMessage({ action: "toggleVoice", enabled });
    });
});
