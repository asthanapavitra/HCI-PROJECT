if (!window.hasVoiceRecognition) {
  console.log("✅ content.js injected!");

  window.hasVoiceRecognition = true;

  let recognition;
  let isListening = false;

  chrome.runtime.sendMessage({ action: "getWindowInfo" }, (response) => {
    chrome.storage.local.get(
      ["voiceEnabled", "activeVoiceWindowId"],
      (data) => {
        if (
          data.voiceEnabled &&
          response &&
          (response.windowId === data.activeVoiceWindowId ||
            data.activeVoiceWindowId === undefined)
        ) {
          startVoiceRecognition();
        }
      }
    );
  });

  chrome.runtime.sendMessage({ action: "contentLoaded" });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Toggling message received:");
    if (message.action === "toggleVoice") {
      console.log("Toggling voice recognition:", message.enabled);
      if (message.enabled) {
        console.log("Toggled voice recognition:", message.enabled);
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
      const transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
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
      scrollPage(500);
    } else if (command.includes("scroll up")) {
      scrollPage(-500);
    } else if (command.includes("go back")) {
      window.history.back();
    } else if (command.includes("go forward")) {
      window.history.forward();
    } else if (command.includes("reload page")) {
      location.reload();
    } else if (command.includes("open new tab")) {
      chrome.runtime.sendMessage({ action: "openNewTab" });
    } else if (command.includes("close tab")) {
      chrome.runtime.sendMessage({ action: "closeActiveVoiceTab" });
    } else if (command.startsWith("search for")) {
      let site = command.replace("search for", "").trim();
      let url = `https://www.google.com/search?q=${site}`;
      window.location.href = url;
    } else if (command.includes("zoom in")) {
      zoomPage(0.1); // Zoom in by 10%
    } else if (command.includes("zoom out")) {
      zoomPage(-0.1); // Zoom out by 10%
    } else if (command.includes("open new window")) {
      const browser = getBrowserName();
      chrome.runtime.sendMessage({ action: "openNewWindow", browser });
    } else if (
      command.includes("close window") ||
      command.includes("exit window")
    ) {
      chrome.runtime.sendMessage({ action: "closeCurrentWindow" });
    } else if (command.includes("move to new window")) {
      chrome.runtime.sendMessage({ action: "moveTabToNewWindow" });
    }else if (command.startsWith("click on")) {
      const targetText = command.replace("click on", "").trim().replace(/[.?!,;]$/, "").toLowerCase();
      const targetWords = targetText.split(/\s+/); // Split the command into words based on spaces
    
      const links = Array.from(document.querySelectorAll("a")).filter(
        (link) => link.offsetParent !== null && link.innerText.trim().length > 0
      );
    
      console.log("Target words:", targetWords);
    
      for (const link of links) {
        const linkText = link.innerText.trim().toLowerCase();
        console.log("Link text:", linkText);
       
        let found=true;
        for(const word of targetWords) {
        
          if (!linkText.includes(word)) {
            found=false;
            break;
          }
        }
        if (found) {
          link.click();
          console.log("Found link:",linkText);
          return;
        }
    
      }
    }
    
    
     else if (
      command.includes("minimize window") ||
      command.includes("minimise window")
    ) {
      chrome.runtime.sendMessage({ action: "minimizeWindow" });
    } else if (command.startsWith("click")) {
      let targetText = command.replace("click", "").trim();
      clickElementByTextOrId(targetText);
    } else if (command.startsWith("focus on")) {
      let targetText = command.replace("focus on", "").trim();
      focusElementByTextOrPlaceholder(targetText);
    } else if (command.startsWith("type")) {
      let [_, inputText, targetText] =
        command.match(/type (.+) into (.+)/) || [];
      if (inputText && targetText) {
        typeIntoInput(targetText.trim(), inputText.trim());
      }
    } else if (command.includes("open camera")) {
      openCamera();
    } else if (command.includes("close camera")) {
      closeCamera();
    }
  }
  function scrollPage(amount) {
    const scrollElement =
      document.scrollingElement || document.documentElement || document.body;
    scrollElement.scrollBy({ top: amount, behavior: "smooth" });
  }
  function levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] =
          b[i - 1] === a[j - 1]
            ? matrix[i - 1][j - 1]
            : Math.min(
                matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
              );
      }
    }

    return matrix[b.length][a.length];
  }

  function openCamera() {
    // Prevent multiple cameras from opening
    if (document.getElementById("voiceCameraPreview")) return;

    const video = document.createElement("video");
    video.id = "voiceCameraPreview";
    video.autoplay = true;
    video.style.position = "fixed";
    video.style.bottom = "20px";
    video.style.right = "20px";
    video.style.width = "300px";
    video.style.height = "200px";
    video.style.border = "2px solid #4CAF50";
    video.style.borderRadius = "10px";
    video.style.zIndex = "9999";
    video.style.backgroundColor = "black";

    document.body.appendChild(video);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        video.srcObject = stream;

        // Optionally store stream to stop it later
        video.dataset.streamActive = "true";
        video.dataset.streamId = stream.id;
      })
      .catch((err) => {
        console.error("Camera error:", err);
        video.remove();
        alert("Unable to access camera.");
      });
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

function getBrowserName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Edg/")) {
    return "Edge";
  } else if (userAgent.includes("Chrome/")) {
    return "Chrome";
  } else {
    return "Unknown";
  }
}

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
  const matched = buttons.find((el) =>
    el.innerText.toLowerCase().includes(text)
  );
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
  const matched = inputs.find(
    (el) => el.placeholder && el.placeholder.toLowerCase().includes(text)
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
  const matched = inputs.find(
    (el) =>
      (el.placeholder && el.placeholder.toLowerCase().includes(fieldText)) ||
      (el.id && el.id.toLowerCase().includes(fieldText))
  );

  if (matched) {
    matched.focus();
    matched.value = inputText;
    matched.dispatchEvent(new Event("input", { bubbles: true }));
    console.log(`Typed "${inputText}" into field "${fieldText}"`);
  } else {
    console.warn("No input found for typing:", fieldText);
  }
}

function closeCamera() {
  const video = document.getElementById("voiceCameraPreview");
  if (video && video.srcObject) {
    let stream = video.srcObject;
    let tracks = stream.getTracks();
    tracks.forEach((track) => track.stop());
    video.remove();
    console.log("Camera stopped.");
  }
}
