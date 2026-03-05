// ==UserScript==
// @name         no-old-youtube
// @namespace    https://drive.corp.amazon.com/documents/mjheick@/TamperMonkey/no-old-youtube
// @version      1.1
// @description  Hide YouTube videos older than 1 year and log them to console
// @author       mjheick@
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration
    const HIDE_VIDEOS_OLDER_THAN_DAYS = 365; // Change this value to adjust the age threshold
    
    let hiddenVideos = [];
    let hiddenCount = 0;
    let debugMode = true; // Set to false to disable debug logging
    
    // Function to parse relative time strings to approximate dates
    function parseRelativeTime(timeText) {
        if (!timeText) return null;
        
        const now = new Date();
        const timeStr = timeText.toLowerCase().trim();
        
        if (debugMode) console.log('Parsing time:', timeStr);
        
        // Handle "Streamed X ago" or "Premiered X ago"
        const cleanTimeStr = timeStr.replace(/^(streamed|premiered)\s+/, '').replace(/\s+ago$/, '');
        
        // More flexible regex to catch various formats
        const timeRegex = /(\d+)\s*(second|minute|hour|day|week|month|year)s?/;
        const match = cleanTimeStr.match(timeRegex);
        
        if (!match) {
            if (debugMode) console.log('No time match found for:', timeStr);
            return null;
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        if (debugMode) console.log(`Parsed: ${value} ${unit}(s)`);
        
        const date = new Date(now);
        
        switch (unit) {
            case 'second':
                date.setSeconds(date.getSeconds() - value);
                break;
            case 'minute':
                date.setMinutes(date.getMinutes() - value);
                break;
            case 'hour':
                date.setHours(date.getHours() - value);
                break;
            case 'day':
                date.setDate(date.getDate() - value);
                break;
            case 'week':
                date.setDate(date.getDate() - (value * 7));
                break;
            case 'month':
                date.setMonth(date.getMonth() - value);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() - value);
                break;
            default:
                if (debugMode) console.log('Unknown time unit:', unit);
                return null;
        }
        
        return date;
    }
    
    // Function to check if a video is older than the configured threshold
    function isOlderThanThreshold(timeText) {
        const videoDate = parseRelativeTime(timeText);
        if (!videoDate) return false;
        
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - HIDE_VIDEOS_OLDER_THAN_DAYS);
        
        return videoDate < thresholdDate;
    }
    
    // Function to extract video URL from various elements
    function getVideoUrl(element) {
        // Try to find a link element
        const linkElement = element.querySelector('a[href*="/watch?v="]') || 
                           element.querySelector('a[href*="/shorts/"]') ||
                           element.closest('a[href*="/watch?v="]') ||
                           element.closest('a[href*="/shorts/"]');
        
        if (linkElement) {
            return linkElement.href;
        }
        
        return null;
    }
    
    // Function to get video title
    function getVideoTitle(element) {
        const titleSelectors = [
            '#video-title',
            '.ytd-video-meta-block #video-title',
            'h3 a',
            '.video-title',
            '[aria-label]'
        ];
        
        for (const selector of titleSelectors) {
            const titleElement = element.querySelector(selector);
            if (titleElement) {
                return titleElement.textContent?.trim() || titleElement.getAttribute('aria-label')?.trim();
            }
        }
        
        return 'Unknown Title';
    }
    
    // Function to hide old videos
    function hideOldVideos() {
        if (debugMode) console.log('🔍 Scanning for videos...');
        
        // More comprehensive selectors for different YouTube layouts
        const videoSelectors = [
            'ytd-video-renderer',                    // Home page, search results
            'ytd-grid-video-renderer',               // Grid view
            'ytd-compact-video-renderer',            // Sidebar recommendations
            'ytd-rich-item-renderer',                // Home page rich items
            'ytd-reel-item-renderer',                // Shorts
            'ytd-playlist-video-renderer',           // Playlist videos
            'ytd-movie-renderer',                    // Movie results
            'ytd-channel-video-player-renderer',     // Channel videos
            'div[class*="video"]',                   // Generic video containers
            '[data-context-item-id]'                 // Items with video IDs
        ];
        
        let processedCount = 0;
        
        videoSelectors.forEach(selector => {
            const videos = document.querySelectorAll(selector);
            if (debugMode && videos.length > 0) {
                console.log(`Found ${videos.length} elements with selector: ${selector}`);
            }
            
            videos.forEach(video => {
                // Skip if already processed
                if (video.dataset.oldVideoProcessed) return;
                video.dataset.oldVideoProcessed = 'true';
                processedCount++;
                
                // More comprehensive time element selectors
                const timeSelectors = [
                    '#metadata-line span:last-child',
                    '.ytd-video-meta-block span:last-child',
                    '#published-time-text',
                    '.published-time-text',
                    'span[aria-label*="ago"]',
                    '#upload-info #date',
                    '.style-scope.ytd-video-meta-block span:nth-child(2)',
                    '.style-scope.ytd-video-meta-block span:last-of-type',
                    '[id*="date"]',
                    '[class*="date"]',
                    '[class*="time"]'
                ];
                
                let timeElement = null;
                let timeText = null;
                
                // Try each selector
                for (const timeSelector of timeSelectors) {
                    const elements = video.querySelectorAll(timeSelector);
                    for (const element of elements) {
                        const text = element.textContent?.trim();
                        if (text && (text.includes('ago') || text.match(/\d+\s*(second|minute|hour|day|week|month|year)s?/))) {
                            timeElement = element;
                            timeText = text;
                            break;
                        }
                    }
                    if (timeElement) break;
                }
                
                // If no time found with selectors, search all text content more efficiently
                if (!timeElement) {
                    // Search through all elements that might contain time info
                    const allElements = video.querySelectorAll('span, div, p');
                    for (const element of allElements) {
                        const text = element.textContent?.trim();
                        // Look for patterns like "2 years ago", "18 months ago", etc.
                        if (text && text.match(/^\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i)) {
                            timeElement = element;
                            timeText = text;
                            if (debugMode) console.log('Found time via text search:', text);
                            break;
                        }
                    }
                }
                
                // Last resort: look for any element containing "ago" with numbers
                if (!timeElement) {
                    const allElements = video.querySelectorAll('*');
                    for (const element of allElements) {
                        const text = element.textContent?.trim();
                        if (text && text.length < 50 && text.includes('ago') && text.match(/\d+/)) {
                            // Make sure it's not a nested element with more content
                            if (element.children.length === 0 || element.textContent === text) {
                                timeElement = element;
                                timeText = text;
                                if (debugMode) console.log('Found time via fallback search:', text);
                                break;
                            }
                        }
                    }
                }
                
                if (debugMode && timeText) {
                    console.log('Found time text:', timeText);
                }
                
                if (timeText && isOlderThanThreshold(timeText)) {
                    const videoUrl = getVideoUrl(video);
                    const videoTitle = getVideoTitle(video);
                    
                    if (debugMode) {
                        console.log(`🚫 Hiding old video: ${videoTitle} (${timeText})`);
                    }
                    
                    // Hide the video with multiple methods for reliability
                    video.style.display = 'none !important';
                    video.style.visibility = 'hidden';
                    video.style.opacity = '0';
                    video.style.height = '0';
                    video.style.overflow = 'hidden';
                    video.setAttribute('hidden', 'true');
                    
                    hiddenCount++;
                    
                    // Store hidden video info
                    if (videoUrl) {
                        hiddenVideos.push({
                            title: videoTitle,
                            url: videoUrl,
                            age: timeText
                        });
                    }
                } else if (debugMode && !timeText) {
                    console.log('⚠️ No time text found for video:', getVideoTitle(video));
                }
            });
        });
        
        if (debugMode) {
            console.log(`📊 Processed ${processedCount} videos total`);
        }
        
        // Update console log with current count
        if (hiddenCount > 0) {
            console.log(`🚫 no-old-youtube: Hidden ${hiddenCount} videos older than ${HIDE_VIDEOS_OLDER_THAN_DAYS} days`);
            console.log('📋 Hidden videos list:');
            hiddenVideos.forEach((video, index) => {
                console.log(`${index + 1}. ${video.title} (${video.age})`);
                console.log(`   🔗 ${video.url}`);
            });
        } else if (debugMode) {
            console.log('✅ No old videos found to hide');
        }
    }
    
    // Function to reset counters when navigating
    function resetCounters() {
        hiddenVideos = [];
        hiddenCount = 0;
    }
    
    // Observer to watch for new content being loaded
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if new video content was added
                        const hasVideoContent = node.matches && (
                            node.matches('ytd-video-renderer') ||
                            node.matches('ytd-grid-video-renderer') ||
                            node.matches('ytd-rich-item-renderer') ||
                            node.querySelector('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer')
                        );
                        
                        if (hasVideoContent) {
                            shouldProcess = true;
                        }
                    }
                });
            }
        });
        
        if (shouldProcess) {
            // Debounce the processing
            clearTimeout(window.hideOldVideosTimeout);
            window.hideOldVideosTimeout = setTimeout(hideOldVideos, 500);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Listen for navigation changes (YouTube is a SPA)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            resetCounters();
            // Process new page after a short delay
            setTimeout(hideOldVideos, 1000);
        }
    }, 1000);
    
    // Initial run with longer delay to ensure page is loaded
    setTimeout(() => {
        console.log('🚀 no-old-youtube script loaded and running');
        hideOldVideos();
    }, 3000);
    
    // Also run when page becomes visible (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(hideOldVideos, 1000);
        }
    });
    
    // Manual trigger function for debugging
    window.hideOldYouTubeVideos = hideOldVideos;
    window.toggleYouTubeDebug = () => {
        debugMode = !debugMode;
        console.log('Debug mode:', debugMode ? 'ON' : 'OFF');
    };
    
    console.log('🚀 no-old-youtube script loaded');
    console.log('💡 Debug commands: hideOldYouTubeVideos(), toggleYouTubeDebug()');
})();