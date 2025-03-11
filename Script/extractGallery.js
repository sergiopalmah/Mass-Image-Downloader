// extractGallery.js - Extract Gallery Images Functionality

console.log("[Mass image downloader]: Extract Gallery script injected.");

(function () {
    let imagesOpened = 0; // Track the number of images opened

    /**
     * Logs debug messages if debugging is enabled.
     * @param {string} message - The message to log.
     */
    function logDebug(message) {
        chrome.storage.sync.get(["debugLogging"], (data) => {
            if (data.debugLogging) {
                console.log(`[Mass image downloader]: ${message}`);
            }
        });
    }

    /**
     * Updates the badge count for opened images.
     * @param {number} count - The number of images processed.
     * @param {boolean} isComplete - Whether the process is finished.
     */
    function updateBadge(count, isComplete = false) {
        chrome.runtime.sendMessage({
            action: "updateBadge",
            count: count,
            complete: isComplete
        });
    }

    /**
     * Finds and extracts image URLs from a gallery.
     * @returns {Array} - Array of valid image URLs.
     */
    function extractGalleryImages() {
        logDebug("🚀 Extract Gallery Images process started...");
        logDebug("🔍 Searching for gallery images...");

        let detectedImages = [];
        const anchorElements = document.querySelectorAll("a[href]");

        anchorElements.forEach(anchor => {
            try {
                const href = anchor.getAttribute("href");
                if (href && isValidImageUrl(href)) {
                    detectedImages.push(href);
                }
            } catch (error) {
                logDebug(`⚠️ Error processing link: ${error.message}`);
            }
        });

        // Remove duplicates
        detectedImages = [...new Set(detectedImages)];

        if (detectedImages.length > 0) {
            logDebug(`✅ Found ${detectedImages.length} image(s) in the gallery.`);
            updateBadge(0); // Reset badge before processing
        } else {
            logDebug("❌ No valid images found in the gallery.");
            showUserMessage("No valid images found in the gallery.");
            updateBadge(0, true); // Reset badge if nothing found
            return [];
        }

        return detectedImages;
    }

    /**
     * Determines if a given URL is a valid image.
     * @param {string} url - The URL to check.
     * @returns {boolean} - True if the URL is an image, false otherwise.
     */
    function isValidImageUrl(url) {
        const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"];
        return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
    }

    /**
     * Sends the extracted image URLs to the background script to open them.
     * @param {Array} imageUrls - Array of image URLs.
     */
    function sendImagesToBackground(imageUrls) {
        if (imageUrls.length === 0) {
            logDebug("⚠ No images to send to background.");
            return;
        }

        logDebug("📤 Sending images to background script for processing...");
        
        chrome.runtime.sendMessage({
            action: "openGalleryImages",
            images: imageUrls
        });
    }

    /**
     * Displays a styled message to the user if no images are found.
     * @param {string} messageText - The message to display.
     */
    function showUserMessage(messageText) {
        const message = document.createElement("div");
        message.textContent = messageText;
        message.style.position = "fixed";
        message.style.top = "20px";
        message.style.right = "20px";
        message.style.backgroundColor = "#d9534f";  // 🔴 Matching error style from options
        message.style.color = "#FFFFFF";
        message.style.padding = "12px";
        message.style.borderRadius = "6px";
        message.style.fontSize = "14px";
        message.style.boxShadow = "2px 2px 8px rgba(0, 0, 0, 0.3)";
        message.style.opacity = "1";
        message.style.transition = "opacity 0.5s ease-in-out";
        message.style.zIndex = "9999";
        document.body.appendChild(message);

        setTimeout(() => {
            message.style.opacity = "0";
            setTimeout(() => message.remove(), 500);
        }, 3000);
    }

    // ✅ Extract gallery images and send them to the background script
    logDebug("🚀 Extract Gallery Images process started...");
    const galleryImages = extractGalleryImages();

    if (galleryImages.length > 0) {
        logDebug(`🛠 Processing ${galleryImages.length} images...`);
        sendImagesToBackground(galleryImages);
    } else {
        logDebug("❌ No images to process.");
    }
})();
