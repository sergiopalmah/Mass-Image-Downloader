// utils.js - Utility functions for Mass Image Downloader

console.log('[Mass image downloader]: Utility script loaded.');

let closedTabs = new Set();
let debugLoggingEnabled = false;

// Load debug setting on startup
chrome.storage.sync.get(["debugLogging"], (data) => {
    debugLoggingEnabled = data.debugLogging || false;
});

/**
 * Logs messages only if debugging is enabled.
 * Always retrieves the latest setting from storage before logging.
 * @param {string} message - The message to log.
 */
function logDebug(message) {
    chrome.storage.sync.get("debugLogging", (data) => {
        if (data.debugLogging) {
            console.log(`[Mass image downloader]: ${message}`);
        }
    });
}

/**
 * Updates the badge icon to reflect the current process status.
 * @param {number} count - Number of processed images.
 * @param {boolean} isComplete - True if the process is finished.
 */
function updateBadge(count, isComplete = false) {
    if (count === 0 && !isComplete) {
        chrome.action.setBadgeText({ text: '' });
        logDebug("📢 Process started, hiding badge initially.");
    } else {
        const text = count.toString();
        chrome.action.setBadgeText({ text });

        if (isComplete) {
            logDebug(`✅ Total images processed: ${text}`);
            logDebug('---------------------------');
        } else {
            logDebug(`🔄 Images processed so far: ${text}`);
        }

        const backgroundColor = isComplete ? '#1E90FF' : '#4CAF50';
        const textColor = '#FFFFFF';
        chrome.action.setBadgeBackgroundColor({ color: backgroundColor });
        chrome.action.setBadgeTextColor({ color: textColor });

        logDebug('✅ Badge updated successfully.');
    }
}

/**
 * Checks if a URL points to an image file.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if the URL is an image, false otherwise.
 */
function isValidImageUrl(url) {
    try {
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
        const parsedUrl = new URL(url);
        return imageExtensions.some(ext => parsedUrl.pathname.endsWith(ext));
    } catch (error) {
        logDebug(`❌ Invalid URL detected: ${url}`);
        return false;
    }
}

/**
 * Closes a tab safely, avoiding duplicate closure attempts.
 * @param {number} tabId - The ID of the tab to close.
 * @param {function} callback - Function to execute after closure.
 */
function closeTabSafely(tabId, callback) {
    if (closedTabs.has(tabId)) {
        logDebug(`⚠️ Tab ID ${tabId} is already closed. Skipping.`);
        callback();
        return;
    }

    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
            logDebug(`⚠️ Tab ID ${tabId} no longer exists.`);
            callback();
            return;
        }

        chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
                logDebug(`❌ Failed to close tab ${tabId}: ${chrome.runtime.lastError.message}`);
            } else {
                logDebug(`✅ Tab ID ${tabId} closed successfully.`);
                closedTabs.add(tabId);
            }
            callback();
        });
    });
}

/**
 * Moves to the next available tab in the window.
 * @param {number} currentTabIndex - The index of the current tab.
 * @param {array} tabs - Array of all tabs in the current window.
 * @returns {object|null} - The next tab or null if none available.
 */
function moveToNextTab(currentTabIndex, tabs) {
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].index > currentTabIndex) {
            return tabs[i];
        }
    }
    return null;
}

// Export functions for background.js
export { isValidImageUrl, closeTabSafely, moveToNextTab, logDebug, updateBadge };
