
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
        } else if (command.includes("close window") || command.includes("exit window") || command.includes("close tab")) {
            chrome.runtime.sendMessage({ action: "closeCurrentWindow" });
        }
        
        else if (command.includes("minimize window")) {
            chrome.runtime.sendMessage({ action: "minimizeWindow" });
        }
        else if (command.startsWith("click")) {
            let targetText = command.replace("click", "").trim();
            clickElementByTextOrId(targetText);
        }
        else if (command.startsWith("focus on")) {
            let targetText = command.replace("focus on", "").trim();
            focusElementByTextOrPlaceholder(targetText);
        }
        else if (command.startsWith("type")) {
            let [_, inputText, targetText] = command.match(/type (.+) into (.+)/) || [];
            if (inputText && targetText) {
                typeIntoInput(targetText.trim(), inputText.trim());
            }
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




// Try to match commands like "click login button" or "focus on search"





js
function clickElementByTextOrId(text) {
    text = text.toLowerCase();

    // Try matching by ID
    const byId = document.getElementById(text);
    if (byId) {
        byId.click();
        console.log("Clicked element by ID:", text);
        return;
    }

    // Try matching by button text
    const buttons = [...document.querySelectorAll("button, a, div, span")];
    const matched = buttons.find(el => el.innerText.toLowerCase().includes(text));
    if (matched) {
        matched.click();
        console.log("Clicked element with text:", text);
    } else {
        console.warn("No element found to click with:", text);
    }
}

function focusElementByTextOrPlaceholder(text) {
    text = text.toLowerCase();

    // Try matching inputs or textareas by placeholder
    const inputs = [...document.querySelectorAll("input, textarea")];
    const matched = inputs.find(el => 
        el.placeholder && el.placeholder.toLowerCase().includes(text)
    );

    if (matched) {
        matched.focus();
        console.log("Focused element with placeholder:", text);
    } else {
        console.warn("No input found with placeholder:", text);
    }
}

function typeIntoInput(fieldText, inputText) {
    fieldText = fieldText.toLowerCase();

    const inputs = [...document.querySelectorAll("input, textarea")];
    const matched = inputs.find(el => 
        (el.placeholder && el.placeholder.toLowerCase().includes(fieldText)) ||
        (el.id && el.id.toLowerCase().includes(fieldText))
    );

    if (matched) {
        matched.focus();
        matched.value = inputText;
        matched.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`Typed "${inputText}" into field "${fieldText}"`);
    } else {
        console.warn("No input found for typing:", fieldText);
    }
}


