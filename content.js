
if (!window.hasVoiceRecognition) {
    window.hasVoiceRecognition = true;

    let recognition;
    let isListening = false;

    chrome.storage.local.get("voiceEnabled", (data) => {
        if (data.voiceEnabled) {
            startVoiceRecognition();
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "toggleVoice") {
            if (message.enabled) {
                chrome.storage.local.set({ voiceEnabled: true });
                startVoiceRecognition();
            } else {
                chrome.storage.local.set({ voiceEnabled: false });
                stopVoiceRecognition();
            }
        }
    });

    function startVoiceRecognition() {
        if (!("webkitSpeechRecognition" in window)) {
            console.error("Speech Recognition API not supported.");
            return;
        }

        if (isListening) return;

        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            isListening = true;
            console.log("Voice recognition started...");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            console.log("Recognized:", transcript);
            performAction(transcript);
        };

        recognition.onerror = (event) => console.error("Error:", event.error);

        recognition.onend = () => {
            if (isListening) recognition.start();
        };

        recognition.start();
    }

    function stopVoiceRecognition() {
        if (recognition) {
            recognition.stop();
            isListening = false;
            console.log("Voice recognition stopped.");
        }
    }

    function performAction(command) {
        console.log("Executing command:", command);

        if (command.includes("scroll down")) {
            window.scrollBy(0, 500);
        } else if (command.includes("scroll up")) {
            window.scrollBy(0, -500);
        } else if (command.includes("go back")) {
            window.history.back();
        } else if (command.includes("go forward")) {
            window.history.forward();
        } else if (command.includes("reload page")) {
            location.reload();
        } else if (command.includes("open new tab")) {
            window.open("https://www.google.com", "_blank");
        } else if (command.includes("close tab")) {
            window.close();
        } else if (command.startsWith("search for")) {
            let site = command.replace("search for", "").trim();
            let url = `https://www.google.com/search?q=${site}`;
            window.location.href = url;
        } else if (command.includes("zoom in")) {
            zoomPage(0.1); // Zoom in by 10%
        } else if (command.includes("zoom out")) {
            zoomPage(-0.1); // Zoom out by 10%
        }
        else if (command.includes("open new window")) {
            chrome.runtime.sendMessage({ action: "openNewWindow" });
        } else if (command.includes("close tab") || command.includes("close window") || command.includes("exit window")) {
            window.close();
        } else if (command.includes("minimize window")) {
            chrome.runtime.sendMessage({ action: "minimizeWindow" });
        }
          
    }

    function zoomPage(change) {
        let currentZoom = parseFloat(document.body.style.zoom) || 1;
        currentZoom += change;
        currentZoom = Math.max(0.1, Math.min(currentZoom, 3)); // limit zoom range
        document.body.style.zoom = currentZoom;
        console.log(`Zoom set to: ${currentZoom}`);
    }
}

