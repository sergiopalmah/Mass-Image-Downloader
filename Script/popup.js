// popup.js

console.log('[Mass image downloader]: Popup script loaded.');

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start");
    const extractGalleryButton = document.getElementById("extract-gallery");
    const settingsLink = document.getElementById("settings");
    const versionElement = document.getElementById("extension-version");

    // ✅ Load extension version from manifest.json
    if (chrome.runtime.getManifest && versionElement) {
        versionElement.textContent = chrome.runtime.getManifest().version;
        console.log(`[Mass image downloader]: Loaded extension version: ${versionElement.textContent}`);
    } else {
        console.warn("[Mass image downloader]: Could not load extension version.");
    }

    // ✅ Bulk Image Download
    if (startButton) {
        startButton.addEventListener("click", () => {
            console.log("[Mass image downloader]: Bulk Image Download started.");

            chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
                if (activeTabs.length > 0) {
                    chrome.runtime.sendMessage(
                        { action: "startDownload", activeTabIndex: activeTabs[0].index },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                console.error(`[Mass image downloader]: ${chrome.runtime.lastError.message}`);
                            } else if (response?.success) {
                                console.log("[Mass image downloader]: Download process started successfully.");
                            }
                        }
                    );
                } else {
                    console.warn("[Mass image downloader]: No active tab found.");
                }
            });
        });
    } else {
        console.error("[Mass image downloader]: Error - 'start' button not found.");
    }

    // ✅ Extract Gallery Images
    if (extractGalleryButton) {
        extractGalleryButton.addEventListener("click", () => {
            console.log("[Mass image downloader]: Extract Gallery Images triggered.");

            chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
                if (activeTabs.length > 0) {
                    if (chrome.scripting && chrome.scripting.executeScript) {
                        chrome.scripting.executeScript({
                            target: { tabId: activeTabs[0].id },
                            files: ["script/extractGallery.js"]
                        })
                            .then(() => {
                                console.log("[Mass image downloader]: Extract Gallery script injected.");
                            })
                            .catch((error) => {
                                console.error("[Mass image downloader]: Error injecting Extract Gallery script:", error);
                            });
                    } else {
                        console.error("[Mass image downloader]: chrome.scripting.executeScript is not available.");
                    }
                } else {
                    console.warn("[Mass image downloader]: No active tab found.");
                }
            });
        });
    } else {
        console.error("[Mass image downloader]: Error - 'extract-gallery' button not found.");
    }

    // ✅ Open options page when settings link is clicked
    if (settingsLink) {
        settingsLink.addEventListener("click", () => {
            chrome.runtime.openOptionsPage();
            console.log("[Mass image downloader]: Opening settings page.");
        });
    } else {
        console.error("[Mass image downloader]: Error - 'settings' link not found.");
    }
});
