// options.js - Mass Image Downloader

console.log("[Mass image downloader]: Options script loaded.");

// Debugging function for developers
function logDebug(message) {
    const debugLogging = document.getElementById("debugLogging")?.checked;
    if (debugLogging) {
        console.log(`[Mass image downloader ]: ${message}`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const defaultFolderRadio = document.getElementById("defaultFolder");
    const customFolderRadio = document.getElementById("customFolder");
    const folderPathInput = document.getElementById("folderPath");
    const downloadLimitInput = document.getElementById("downloadLimit");
    const debugLoggingCheckbox = document.getElementById("debugLogging");
    const filenameModeSelect = document.getElementById("filenameMode");
    const prefixInput = document.getElementById("prefix");
    const suffixInput = document.getElementById("suffix");
    const extractGalleryModeSelect = document.getElementById("extractGalleryMode"); // ✅ Corrected ID
    const saveButton = document.getElementById("saveOptions");
    const closeButton = document.getElementById("closeOptions");
    const extensionVersion = document.getElementById("extension-version");

    logDebug("🔄 Retrieving settings from storage...");

    // Load stored settings
    chrome.storage.sync.get([
        "downloadFolder", "customFolderPath", "downloadLimit", "debugLogging",
        "filenameMode", "prefix", "suffix", "extractGalleryMode"
    ], (data) => {
        logDebug("✅ Settings loaded from storage.");

        // Folder path configuration
        if (data.downloadFolder === "custom" && data.customFolderPath) {
            customFolderRadio.checked = true;
            folderPathInput.value = data.customFolderPath;
            folderPathInput.disabled = false;
        } else {
            defaultFolderRadio.checked = true;
            folderPathInput.disabled = true;
        }

        // Load other settings
        downloadLimitInput.value = data.downloadLimit || 2;
        debugLoggingCheckbox.checked = data.debugLogging || false;
        filenameModeSelect.value = data.filenameMode || "none";
        prefixInput.value = data.prefix || "";
        suffixInput.value = data.suffix || "";
        extractGalleryModeSelect.value = data.extractGalleryMode || "immediate"; // ✅ Load correct setting

        // Update filename inputs based on selection
        updateFilenameInputs();
    });

    // Load extension version
    extensionVersion.textContent = chrome.runtime.getManifest().version;

    // Enable/Disable folder path input based on selection
    defaultFolderRadio.addEventListener("change", () => {
        folderPathInput.disabled = true;
        folderPathInput.value = "";
    });

    customFolderRadio.addEventListener("change", () => {
        folderPathInput.disabled = false;
    });

    // Update filename inputs based on selection
    filenameModeSelect.addEventListener("change", updateFilenameInputs);

    function updateFilenameInputs() {
        const mode = filenameModeSelect.value;
        if (mode === "prefix") {
            prefixInput.disabled = false;
            suffixInput.value = "";
            suffixInput.disabled = true;
        } else if (mode === "suffix") {
            suffixInput.disabled = false;
            prefixInput.value = "";
            prefixInput.disabled = true;
        } else if (mode === "both") {
            prefixInput.disabled = false;
            suffixInput.disabled = false;
        } else if (mode === "timestamp") {
            prefixInput.value = "";
            suffixInput.value = "";
            prefixInput.disabled = true;
            suffixInput.disabled = true;
        } else {
            prefixInput.value = "";
            suffixInput.value = "";
            prefixInput.disabled = true;
            suffixInput.disabled = true;
        }
    }

    // Validate alphanumeric input (allow spaces between characters)
    function isValidAlphanumeric(text) {
        return /^[a-zA-Z0-9 ]*$/.test(text) && text.trim().length >= 4;
    }

    // Save settings
    saveButton.addEventListener("click", () => {
        const selectedFolder = customFolderRadio.checked ? "custom" : "default";
        let folderPath = customFolderRadio.checked ? folderPathInput.value.trim() : "";
        let downloadLimit = parseInt(downloadLimitInput.value, 10);
        const debugLogging = debugLoggingCheckbox.checked;
        const filenameMode = filenameModeSelect.value;
        let prefix = prefixInput.value.trim();
        let suffix = suffixInput.value.trim();
        const extractGalleryMode = extractGalleryModeSelect.value; // ✅ Corrected variable

        logDebug("🔄 Validating input before saving...");

        // Validate custom folder path
        if (selectedFolder === "custom" && folderPath === "") {
            userShowMessage("Custom folder path cannot be empty.", "#FF0000");
            logDebug("❌ Error: Custom folder path is empty.");
            return;
        }

        // Validate download limit
        if (isNaN(downloadLimit) || downloadLimit < 1 || downloadLimit > 4) {
            userShowMessage("Download limit must be between 1 and 4.", "#FF0000");
            logDebug("❌ Error: Invalid download limit.");
            return;
        }

        // Validate prefix and suffix inputs
        if (filenameMode === "prefix" && (!isValidAlphanumeric(prefix) || prefix.length > 25)) {
            userShowMessage("Prefix must be alphanumeric, allow spaces, and be between 4-25 characters.", "#FF0000");
            logDebug("❌ Error: Invalid prefix.");
            return;
        }
        if (filenameMode === "suffix" && (!isValidAlphanumeric(suffix) || suffix.length > 10)) {
            userShowMessage("Suffix must be alphanumeric, allow spaces, and be between 4-10 characters.", "#FF0000");
            logDebug("❌ Error: Invalid suffix.");
            return;
        }
        if (filenameMode === "both" && (!isValidAlphanumeric(prefix) || prefix.length > 25 || !isValidAlphanumeric(suffix) || suffix.length > 10)) {
            userShowMessage("Prefix/Suffix must be alphanumeric, allow spaces, and be within limits.", "#FF0000");
            logDebug("❌ Error: Invalid prefix/suffix.");
            return;
        }

        logDebug("✅ All validations passed. Saving settings...");

        // Save settings to chrome.storage
        chrome.storage.sync.set({
            downloadFolder: selectedFolder,
            customFolderPath: folderPath,
            downloadLimit: downloadLimit,
            debugLogging: debugLogging,
            filenameMode: filenameMode,
            prefix: filenameMode === "prefix" || filenameMode === "both" ? prefix : "",
            suffix: filenameMode === "suffix" || filenameMode === "both" ? suffix : "",
            extractGalleryMode: extractGalleryMode, // ✅ Save correct value
        }, () => {
            userShowMessage("Settings Saved!", "#007EE3");
            logDebug("✔ Settings saved successfully.");
        });
    });

    // Function to show messages to users
    function userShowMessage(text, bgColor) {
        const message = document.createElement("div");
        message.textContent = text;
        message.style.position = "fixed";
        message.style.top = "20px";
        message.style.right = "20px";
        message.style.backgroundColor = bgColor;
        message.style.color = "#FFFFFF";
        message.style.padding = "10px";
        message.style.borderRadius = "5px";
        message.style.fontSize = "14px";
        message.style.boxShadow = "2px 2px 8px rgba(0, 0, 0, 0.2)";
        message.style.opacity = "1";
        message.style.transition = "opacity 0.5s ease-in-out";
        document.body.appendChild(message);

        setTimeout(() => {
            message.style.opacity = "0";
            setTimeout(() => message.remove(), 500);
        }, 3000);
    }

    // Close options page
    closeButton.addEventListener("click", () => {
        window.close();
    });
});
