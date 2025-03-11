// background.js - Mass Image Downloader background script

console.log('[Mass image downloader]: Background script loaded successfully.');

// Display extension version at startup
chrome.runtime.getManifest && console.log(`[Mass image downloader]: Running version ${chrome.runtime.getManifest().version}`);

import { logDebug, updateBadge, closeTabSafely, isValidImageUrl, moveToNextTab } from "./utils.js";

let downloadFolder = "default";
let customFolderPath = "";
let downloadLimit = 2;
let debugLoggingEnabled = false;
let galleryImagesOpened = 0; // Counter for Extract Gallery Images feature
let filenameMode = "none";
let prefix = "";
let suffix = "";
let extractGalleryMode = "tab"; // ✅ Default: Open in new tab before downloading

/**
 * ✅ Apply default settings when the extension is installed for the first time.
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        logDebug("📌 First-time installation detected. Applying default settings...");

        chrome.storage.sync.set({
            // ✅ Global Settings
            downloadFolder: "default",
            allowJPG: true,
            allowJPEG: true,
            allowPNG: true,
            allowWEBP: false, // ❌ WEBP format disabled by default
            downloadLimit: 1,
            filenameMode: "none",
            debugLogging: false,

            // ✅ Extract Gallery Images Settings
            extractGalleryMode: "tab", // 📥 Default: Open in new tab before downloading
        }, () => {
            logDebug("✅ Default settings applied successfully.");
        });
    }
});

/**
 * ✅ Loads settings from storage when the service worker starts.
 */
function loadSettings() {
    chrome.storage.sync.get([
        "downloadFolder", "customFolderPath", "downloadLimit", "debugLogging", "filenameMode", "prefix", "suffix", "extractGalleryMode"
    ], (data) => {
        debugLoggingEnabled = data.debugLogging || false;
        filenameMode = data.filenameMode || "none";
        prefix = sanitizeFilenameComponent(data.prefix || "");
        suffix = sanitizeFilenameComponent(data.suffix || "");
        extractGalleryMode = data.extractGalleryMode || "tab"; // ✅ Load setting, default to "tab"

        // 🔄 Apply validations to avoid undefined or invalid values
        downloadFolder = data.downloadFolder || "default";
        customFolderPath = data.customFolderPath ? data.customFolderPath.replace(/[<>:"/\\|?*]+/g, '') : "";
        downloadLimit = data.downloadLimit && data.downloadLimit >= 1 && data.downloadLimit <= 4 ? data.downloadLimit : 2;

        logDebug('------------------------------');
        logDebug('🔄 Retrieving settings from storage...');
        logDebug(`📁 Stored Download Folder: ${downloadFolder}`);
        logDebug(`📂 Stored Custom Folder Path: ${customFolderPath}`);
        logDebug(`📌 Stored Download Limit: ${downloadLimit}`);
        logDebug(`🛠 Debug Logging Enabled: ${debugLoggingEnabled}`);
        logDebug(`📜 File name mode: ${filenameMode}`);
        logDebug(`🔤 Prefix: ${prefix}`);
        logDebug(`🔡 Suffix: ${suffix}`);
        logDebug(`🖼 Extract Gallery Mode: ${extractGalleryMode}`);
        logDebug('------------------------------');
    });
}

// Load settings at startup
loadSettings();

/**
 * Listens for real-time changes in settings and updates dynamically.
 */
chrome.storage.onChanged.addListener((changes) => {
    logDebug('------------------------------');
    logDebug('🔄 Detected real-time settings update.');

    if (changes.downloadFolder) {
        downloadFolder = changes.downloadFolder.newValue;
        logDebug(`✔ Download folder updated: ${downloadFolder}`);
    }
    if (changes.customFolderPath) {
        customFolderPath = changes.customFolderPath.newValue.replace(/[<>:"/\\|?*]+/g, '');
        logDebug(`✔ Custom folder path updated: ${customFolderPath}`);
    }
    if (changes.downloadLimit) {
        downloadLimit = changes.downloadLimit.newValue;
        logDebug(`✔ Download limit updated: ${downloadLimit}`);
    }
    if (changes.debugLogging) {
        debugLoggingEnabled = changes.debugLogging.newValue;
        logDebug(`✔ Debugging setting updated: ${debugLoggingEnabled}`);
    }
    if (changes.filenameMode) {
        filenameMode = changes.filenameMode.newValue;
        logDebug(`✔ Filename mode updated: ${filenameMode}`);
    }
    if (changes.prefix) {
        prefix = sanitizeFilenameComponent(changes.prefix.newValue);
        logDebug(`✔ Prefix updated: ${prefix}`);
    }
    if (changes.suffix) {
        suffix = sanitizeFilenameComponent(changes.suffix.newValue);
        logDebug(`✔ Suffix updated: ${suffix}`);
    }
    if (changes.extractGalleryMode) {
        extractGalleryMode = changes.extractGalleryMode.newValue;
        logDebug(`✔ Extract Gallery Mode updated: ${extractGalleryMode}`);
    }
    logDebug('------------------------------');
});

/**
 * Function to sanitize filename components (prefix/suffix).
 * - Removes leading and trailing spaces.
 * - Allows spaces within the text.
 * - Restricts to alphanumeric characters and spaces.
 */
function sanitizeFilenameComponent(text) {
    return text.trim().replace(/[^a-zA-Z0-9 ]/g, ''); // Allows spaces inside but removes special characters.
}

/**
 * Handles incoming messages from the popup UI and extractGallery.js.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logDebug(`🟢 Received message: ${message.action}`);

    logDebug(' ');
    logDebug('------------------------------------');
    logDebug('Current extension settings:');
    logDebug(`📁 Download Folder: ${downloadFolder}`);
    logDebug(`📂 Custom Folder Path: ${customFolderPath}`);
    logDebug(`📌 Download Limit: ${downloadLimit}`);
    logDebug(`🛠 Debug Logging Enabled: ${debugLoggingEnabled}`);
    logDebug(`📜 File name mode: ${filenameMode}`);
    logDebug(`🔤 Prefix: ${prefix}`);
    logDebug(`🔡 Suffix: ${suffix}`);
    logDebug('------------------------------------');
    logDebug(' ');

    // ✅ Bulk Image Download Functionality
    if (message.action === 'startDownload') {
        logDebug('------------------------------------');
        logDebug('✅ Bulk Image Download Functionality');
        logDebug('------------------------------------');
        logDebug('📥 Download process started');
        logDebug('------------------------------------');

        let successfulDownloads = 0;
        updateBadge(0);

        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const activeTabIndex = message.activeTabIndex;
            const filteredTabs = tabs.filter(tab => tab.index >= activeTabIndex);
            let activeDownloads = 0;
            let tabIndex = 0;

            function startNextDownload() {
                if (tabIndex >= filteredTabs.length && activeDownloads === 0) {
                    logDebug('✅ Done: Finished processing all tabs.');
                    updateBadge(successfulDownloads, true);
                    sendResponse({ success: true, downloads: successfulDownloads });
                    return;
                }

                if (activeDownloads < downloadLimit && tabIndex < filteredTabs.length) {
                    const tab = filteredTabs[tabIndex++];
                    logDebug('---------------------------------------------');
                    logDebug(`▶ Tab id: ${tab.id} process begins`);
                    logDebug(`🔗 Processing URL: ${tab.url}`);

                    try {
                        const url = new URL(tab.url);
                        if (isValidImageUrl(url.href)) {
                            let fileName = url.pathname.split('/').pop();
                            let fileExtension = "";
                            
                            // Extract file extension if present
                            if (fileName.includes('.')) {
                                const lastDotIndex = fileName.lastIndexOf('.');
                                fileExtension = fileName.substring(lastDotIndex);
                                fileName = fileName.substring(0, lastDotIndex);
                            }

                            // Apply prefix/suffix formatting
                            if (filenameMode === "prefix") {
                                fileName = `${prefix}_${fileName}`;
                            } else if (filenameMode === "suffix") {
                                fileName = `${fileName}_${suffix}`;
                            } else if (filenameMode === "both") {
                                fileName = `${prefix}_${fileName}_${suffix}`;
                            } else if (filenameMode === "timestamp") {
                                const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(2, 14);
                                fileName = `${fileName}_${timestamp}`;
                            }

                            const sanitizedFilename = `${fileName}${fileExtension}`;

                            logDebug(`📂 Using filename format: ${sanitizedFilename} (Mode: ${filenameMode})`);

                            const targetPath = downloadFolder === "custom" && customFolderPath
                                ? `${customFolderPath.replace(/\\/g, '/')}/${sanitizedFilename}`
                                : sanitizedFilename;

                            activeDownloads++;
                            chrome.downloads.download({
                                url: tab.url,
                                filename: targetPath,
                                conflictAction: 'uniquify'
                            }, (downloadId) => {
                                if (downloadId) {
                                    successfulDownloads++;
                                    logDebug(`✅ Image ${sanitizedFilename} downloaded successfully!`);
                                    closeTabSafely(tab.id, () => {
                                        updateBadge(successfulDownloads);
                                        logDebug('---------------------------------------------');
                                        logDebug('                                             ');
                                        activeDownloads--;
                                        startNextDownload();
                                    });
                                } else {
                                    logDebug(`❌ Failed to download. Skipped.`);
                                    activeDownloads--;
                                    startNextDownload();
                                }
                            });
                        } else {
                            logDebug(`🚫 Not an image URL: Skipped...`);
                            startNextDownload();
                        }
                    } catch (error) {
                        logDebug(`⚠️ Error processing tab ${tab.index}: ${error.message}`);
                        startNextDownload();
                    }
                }
            }

            startNextDownload();
        });

        return true;
    }

    // ✅ Extract Gallery Images Functionality
    if (message.action === "openGalleryImages") {
        logDebug("📩 Received request to open gallery images...");
        logDebug(`🖼 Gallery Mode: ${extractGalleryMode}`);

        let imagesOpened = 0;
        galleryImagesOpened = 0;

        message.images.forEach((imageUrl, index) => {
            setTimeout(() => {
                let fileName = new URL(imageUrl).pathname.split('/').pop();
                let fileExtension = "";

                // ✅ Extract file extension
                if (fileName.includes('.')) {
                    const lastDotIndex = fileName.lastIndexOf('.');
                    fileExtension = fileName.substring(lastDotIndex);
                    fileName = fileName.substring(0, lastDotIndex);
                }

                // ✅ Apply filename format based on user settings
                if (filenameMode === "prefix") {
                    fileName = `${prefix}_${fileName}`;
                } else if (filenameMode === "suffix") {
                    fileName = `${fileName}_${suffix}`;
                } else if (filenameMode === "both") {
                    fileName = `${prefix}_${fileName}_${suffix}`;
                } else if (filenameMode === "timestamp") {
                    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(2, 14);
                    fileName = `${fileName}_${timestamp}`;
                }

                const sanitizedFilename = `${fileName}${fileExtension}`;

                // ✅ Determine the correct download folder
                const targetPath = downloadFolder === "custom" && customFolderPath
                    ? `${customFolderPath.replace(/\\/g, '/')}/${sanitizedFilename}`
                    : sanitizedFilename;

                if (extractGalleryMode === "immediate") {
                    // ✅ Download the image immediately
                    logDebug(`📥 Downloading gallery image immediately: ${sanitizedFilename}`);
                    chrome.downloads.download({ url: imageUrl, filename: targetPath }, () => {
                        galleryImagesOpened++;
                        updateBadge(galleryImagesOpened);
                        logDebug(`✅ Gallery image downloaded: ${sanitizedFilename}`);

                        if (index === message.images.length - 1) {
                            logDebug("✅ All images have been downloaded immediately.");
                            updateBadge(galleryImagesOpened, true);
                            logDebug("🏁 Extract Gallery Images process completed successfully.");
                        }
                    });
                } else {
                    // ✅ Open image in a new tab before downloading
                    logDebug(`🔗 Opening new tab for gallery image: ${imageUrl}`);
                    chrome.tabs.create({ url: imageUrl, active: false }, (tab) => {
                        imagesOpened++;
                        galleryImagesOpened++;
                        updateBadge(galleryImagesOpened);
                        logDebug(`📂 Opened image ${index + 1}/${message.images.length}: ${imageUrl}`);

                        if (index === message.images.length - 1) {
                            logDebug("✅ All images have been opened.");
                            updateBadge(galleryImagesOpened, true);
                            logDebug("🏁 Extract Gallery Images process completed successfully.");
                        }
                    });
                }
            }, index * 500);
        });

        sendResponse({ success: true });
        return true;
    }

    sendResponse({ success: false, error: "Unknown action." });
});
