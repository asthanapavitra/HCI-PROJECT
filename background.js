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
    console.log("Opening new window for browser:", message.browser);
    let url = "https://www.google.com";
    if (message.browser === "Edge") url = "https://www.bing.com";

    chrome.storage.local.get("activeVoiceWindowId", (data) => {
      const oldWindowId = data.activeVoiceWindowId;

      // 🔇 Step 1: Stop recognition in old window
      if (oldWindowId) {
        chrome.tabs.query({ windowId: oldWindowId, active: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "toggleVoice",
              enabled: false,
            });
          }
        });
      }

      // 🪟 Step 2: Create new window
      chrome.windows.create({ url: url, focused: true }, (newWindow) => {
        // 🕐 Step 3: Wait for the new tab to finish loading
        chrome.tabs.onUpdated.addListener(function waitForTab(
          tabId,
          changeInfo,
          tab
        ) {
          if (
            tab.windowId === newWindow.id &&
            changeInfo.status === "complete" &&
            tab.active
          ) {
            chrome.tabs.onUpdated.removeListener(waitForTab);

            // 🧠 Step 4: Inject content.js, then start voice
            chrome.scripting
              .executeScript({
                target: { tabId: tab.id },
                files: ["content.js"],
              })
              .then(() => {
                chrome.tabs.sendMessage(tab.id, {
                  action: "toggleVoice",
                  enabled: true,
                });

                chrome.storage.local.set({
                  activeVoiceWindowId: newWindow.id,
                });
              })
              .catch((err) => {
                console.error("Script injection failed:", err);
              });
          }
        });
      });
    });
  }
  if (message.action === "openNewTab") {
    chrome.windows.getCurrent((currentWindow) => {
      chrome.tabs.query(
        { active: true, windowId: currentWindow.id },
        (tabs) => {
          const currentTab = tabs[0];

          // 🔇 Step 1: Turn off voice in current tab
          chrome.tabs.sendMessage(currentTab.id, {
            action: "toggleVoice",
            enabled: false,
          });

          // 🆕 Step 2: Create new tab
          chrome.tabs.create(
            { url: "https://www.google.com", active: true },
            (newTab) => {
              chrome.tabs.onUpdated.addListener(function waitForNewTab(
                tabId,
                changeInfo,
                tab
              ) {
                if (tabId === newTab.id && changeInfo.status === "complete") {
                  chrome.tabs.onUpdated.removeListener(waitForNewTab);

                  chrome.scripting
                    .executeScript({
                      target: { tabId: newTab.id },
                      files: ["content.js"],
                    })
                    .then(() => {
                      // ✅ Step 3: Start voice in new tab
                      chrome.tabs.sendMessage(newTab.id, {
                        action: "toggleVoice",
                        enabled: true,
                      });

                      // Store both current and previous tabs
                      chrome.storage.local.set({
                        activeVoiceTabId: newTab.id,
                        previousVoiceTabId: currentTab.id,
                      });
                    });
                }
              });
            }
          );
        }
      );
    });
  }

  if (message.action === "closeActiveVoiceTab") {
    chrome.storage.local.get(
      ["activeVoiceTabId", "previousVoiceTabId"],
      (data) => {
        const activeId = data.activeVoiceTabId;
        const prevId = data.previousVoiceTabId;

        if (activeId) {
          // 📴 Stop voice before closing
          chrome.tabs.sendMessage(
            activeId,
            {
              action: "toggleVoice",
              enabled: false,
            },
            () => {
              chrome.tabs.remove(activeId, () => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Tab close error:",
                    chrome.runtime.lastError.message
                  );
                } else if (prevId) {
                  // ✅ Resume voice in previous tab
                  chrome.tabs.sendMessage(prevId, {
                    action: "toggleVoice",
                    enabled: true,
                  });

                  chrome.storage.local.set({
                    activeVoiceTabId: prevId,
                    previousVoiceTabId: null,
                  });
                }
              });
            }
          );
        }
      }
    );
  }
  if (message.action === "moveTabToNewWindow") {
    chrome.windows.getCurrent((currentWindow) => {
      chrome.tabs.query({ active: true, windowId: currentWindow.id }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab) return;
  
        const tabId = currentTab.id;
  
        // Move the active tab to a new window
        chrome.windows.create({ tabId: tabId, focused: true }, (newWindow) => {
          if (!newWindow || !newWindow.tabs || !newWindow.tabs[0]) {
            console.error("Failed to create new window or locate tab");
            return;
          }
  
          const newTabId = newWindow.tabs[0].id;
  
          // Listen for when the tab finishes loading
          chrome.tabs.onUpdated.addListener(function handleTabUpdated(updatedTabId, changeInfo) {
            if (updatedTabId === newTabId && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(handleTabUpdated);
  
              // Inject content.js into the moved tab
              chrome.scripting.executeScript({
                target: { tabId: newTabId },
                files: ["content.js"],
              }).then(() => {
                // Start voice recognition again
                chrome.tabs.sendMessage(newTabId, {
                  action: "toggleVoice",
                  enabled: true,
                });
  
                // Track which tab is active for voice
                chrome.storage.local.set({
                  activeVoiceTabId: newTabId,
                  previousVoiceTabId: tabId,
                });
  
                console.log("✅ Voice recognition restarted on moved tab");
              }).catch((err) => {
                console.error("❌ Failed to inject content script:", err);
              });
            }
          });
        });
      });
    });
  }
  
  

  if (message.action === "closeCurrentWindow") {
    chrome.windows.getCurrent({}, (window) => {
      chrome.windows.remove(window.id);
    });
  }
  if (message.action === "getWindowInfo") {
    chrome.windows.getCurrent((window) => {
      chrome.tabs.query({ active: true, windowId: window.id }, (tabs) => {
        if (tabs.length > 0) {
          sendResponse({ windowId: window.id, tabId: tabs[0].id });
        } else {
          sendResponse({ windowId: window.id, tabId: null });
        }
      });
    });
    return true; // ✅ Required to keep the message channel open
  }
  
  
  
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://")&& !tab.url.startsWith("edge://") 
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

chrome.windows.onRemoved.addListener((closedWindowId) => {
  chrome.storage.local.get("activeVoiceWindowId", (data) => {
    if (data.activeVoiceWindowId === closedWindowId) {
      chrome.storage.local.remove("activeVoiceWindowId");

      // Try to resume voice recognition in another window (e.g., the last focused one)
      chrome.windows.getAll({ populate: true }, (windows) => {
        for (let win of windows) {
          const activeTab = win.tabs.find((tab) => tab.active);
          if (activeTab && !activeTab.url.startsWith("chrome://")) {
            chrome.tabs.sendMessage(activeTab.id, {
              action: "toggleVoice",
              enabled: true,
            });
            chrome.storage.local.set({ activeVoiceWindowId: win.id });
            break;
          }
        }
      });
    }
  });
});
chrome.tabs.onRemoved.addListener((closedTabId, removeInfo) => {
  chrome.storage.local.get(
    ["activeVoiceTabId", "previousVoiceTabId"],
    (data) => {
      if (data.activeVoiceTabId === closedTabId && data.previousVoiceTabId) {
        // The active tab with voice was closed — resume previous one
        chrome.tabs.sendMessage(data.previousVoiceTabId, {
          action: "toggleVoice",
          enabled: true,
        });

        // Update storage
        chrome.storage.local.set({
          activeVoiceTabId: data.previousVoiceTabId,
          previousVoiceTabId: null,
        });
      }
    }
  );
});
