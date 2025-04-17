/**
 * TVer Subtitle Extractor
 * 
 * This content script extracts closed captions from TVer videos and renders them
 * as selectable text overlay.
 */

class TVerSubtitleExtractor {
  constructor() {
    // State variables
    this.enabled = false;
    this.currentSubtitleText = '';
    this.nativeSubtitleElements = [];
    
    // DOM elements
    this.subtitleOverlay = null;
    this.videoElement = null;
    
    // Observers
    this.observer = null;
    this.resizeObserver = null;
    
    // Performance optimization
    this.lastCheckTime = 0;
    this.checkInterval = 250; // ms
    this.pendingPositionUpdate = false;
    
    // Bind methods to preserve 'this' context
    this.boundHandleScroll = this.throttle(this.handleScroll.bind(this), 100);
    this.boundHandleResize = this.throttle(this.handleResize.bind(this), 100);
    this.boundHandleFullscreenChange = this.handleFullscreenChange.bind(this);

    // Initialize from storage
    this.loadStateFromStorage();
    
    // Set up message listener
    this.setupMessageListener();
  }

  /**
   * Generic throttle function for performance optimization
   * @param {Function} func - The function to throttle
   * @param {number} limit - The time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }

  /**
   * Load the enabled state from browser storage
   */
  loadStateFromStorage() {
    browser.storage.local.get('enabled')
      .then(result => {
        this.enabled = result.enabled ?? false;
        if (this.enabled) {
          this.initialize();
        }
      })
      .catch(error => console.error('Error loading storage:', error));
  }

  /**
   * Set up the message listener for toggle actions
   */
  setupMessageListener() {
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'toggleSubtitles') {
        this.enabled = message.enabled;
        this.enabled ? this.initialize() : this.cleanup();
      }
    });
  }

  /**
   * Initialize subtitle extraction and rendering
   */
  initialize() {
    this.initializeSubtitleOverlay();
    this.currentSubtitleText = '';
    this.findVideoElement();
    this.startMutationObserver();
    this.addEventListeners();
  }

  /**
   * Create or restore the subtitle overlay
   */
  initializeSubtitleOverlay() {
    if (!this.subtitleOverlay) {
      this.subtitleOverlay = document.createElement('div');
      this.subtitleOverlay.className = 'tver-subtitle-overlay';
      this.subtitleOverlay.style.opacity = '0';
      document.body.appendChild(this.subtitleOverlay);
    } else {
      this.subtitleOverlay.classList.remove('hidden');
      this.subtitleOverlay.style.display = 'block';
      this.subtitleOverlay.style.opacity = '0';
    }
  }

  /**
   * Add all event listeners
   */
  addEventListeners() {
    window.addEventListener('resize', this.boundHandleResize, { passive: true });
    window.addEventListener('scroll', this.boundHandleScroll, { passive: true });
    document.addEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);
  }

  /**
   * Clean up resources and restore original state
   */
  cleanup() {
    this.disconnectObservers();
    this.showNativeSubtitles();
    this.nativeSubtitleElements = [];
    this.hideOverlay();
    this.removeEventListeners();
  }

  /**
   * Hide the subtitle overlay
   */
  hideOverlay() {
    if (this.subtitleOverlay) {
      this.subtitleOverlay.classList.add('hidden');
      this.subtitleOverlay.style.opacity = '0';
      this.subtitleOverlay.style.display = 'none';
      this.currentSubtitleText = '';
    }
  }

  /**
   * Disconnect all observers
   */
  disconnectObservers() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Remove all event listeners
   */
  removeEventListeners() {
    window.removeEventListener('resize', this.boundHandleResize);
    window.removeEventListener('scroll', this.boundHandleScroll);
    document.removeEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);
  }

  /**
   * Find the video element on the page
   */
  findVideoElement() {
    const videoElements = document.querySelectorAll('video');
    if (videoElements.length > 0) {
      this.videoElement = videoElements[0];
      this.positionSubtitleOverlay();
      this.setupResizeObserver();
    }
  }

  /**
   * Set up observer to track video size changes
   */
  setupResizeObserver() {
    if (!this.videoElement || !window.ResizeObserver) return;
    
    this.resizeObserver = new ResizeObserver(
      this.throttle(() => {
        this.positionSubtitleOverlay();
      }, 100)
    );
    this.resizeObserver.observe(this.videoElement);
  }

  /**
   * Start observing DOM changes to detect subtitles
   */
  startMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const observerCallback = this.throttle(() => {
      if (!this.videoElement) {
        this.findVideoElement();
      }
      this.checkForSubtitles();
      this.requestPositionUpdate();
    }, this.checkInterval);

    this.observer = new MutationObserver(observerCallback);

    // Observe the entire document with optimized settings
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * Request a position update using requestAnimationFrame for better performance
   */
  requestPositionUpdate() {
    if (!this.pendingPositionUpdate) {
      this.pendingPositionUpdate = true;
      window.requestAnimationFrame(() => {
        this.positionSubtitleOverlay();
        this.pendingPositionUpdate = false;
      });
    }
  }

  /**
   * Check for subtitle elements on the page
   */
  checkForSubtitles() {
    if (!this.enabled) return;
    
    const subtitleElements = this.findSubtitleElements();
    
    if (subtitleElements.length > 0) {
      this.nativeSubtitleElements = subtitleElements;
      
      const subtitleText = this.extractSubtitleText(subtitleElements);
      if (subtitleText && subtitleText !== this.currentSubtitleText) {
        this.currentSubtitleText = subtitleText;
        this.updateSubtitleOverlay(subtitleText);
      }
      
      this.hideNativeSubtitles();
    }
  }

  /**
   * Find subtitle elements using various selectors
   * @returns {Array} Array of found subtitle elements
   */
  findSubtitleElements() {
    const possibleSubtitleSelectors = [
      '.tver-caption',
      '.video-caption',
      '.subtitle-text',
      '.vjs-text-track-display',
      '.caption-text',
      '[class*="caption"]',
      '[class*="subtitle"]'
    ];

    for (const selector of possibleSubtitleSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return [...elements];
      }
    }
    
    return [];
  }

  /**
   * Extract text from subtitle elements
   * @param {Array} elements - The subtitle elements
   * @returns {string} Extracted subtitle text
   */
  extractSubtitleText(elements) {
    const textParts = [];
    
    for (const element of elements) {
      const content = element.textContent?.trim();
      if (content) {
        textParts.push(content);
      }
    }
    
    return textParts.join(' ');
  }

  /**
   * Update the subtitle overlay with new text
   * @param {string} text - The subtitle text to display
   */
  updateSubtitleOverlay(text) {
    if (!this.subtitleOverlay || !this.enabled) return;
    
    this.subtitleOverlay.textContent = text;
    this.subtitleOverlay.style.opacity = '1';
    this.subtitleOverlay.style.display = 'block';
    
    // Ensure font size is properly set
    const isFullscreen = this.isVideoFullscreen();
    this.subtitleOverlay.style.fontSize = isFullscreen ? '48px' : '28px';
    
    this.requestPositionUpdate();
  }

  /**
   * Position the subtitle overlay relative to the video
   */
  positionSubtitleOverlay() {
    if (!this.subtitleOverlay || !this.videoElement || !this.enabled) return;

    const videoRect = this.videoElement.getBoundingClientRect();
    const isFullscreen = this.isVideoFullscreen();
    
    if (!isFullscreen && !this.isElementInViewport(videoRect)) {
      this.subtitleOverlay.style.opacity = '0';
      return;
    }
    
    const position = this.calculateOverlayPosition(videoRect, isFullscreen);
    
    Object.assign(this.subtitleOverlay.style, {
      position: 'fixed',
      left: `${position.left}px`,
      bottom: `${position.bottom}px`,
      transform: 'translateX(-50%)',
      maxWidth: isFullscreen ? '80vw' : '80%',
      fontSize: isFullscreen ? '48px' : '28px'
    });
    
    if (this.currentSubtitleText && this.enabled) {
      this.subtitleOverlay.style.opacity = '1';
    }
  }

  /**
   * Check if an element is in the viewport
   * @param {DOMRect} rect - The element's bounding rectangle
   * @returns {boolean} Whether the element is visible
   */
  isElementInViewport(rect) {
    return (
      rect.top < window.innerHeight && 
      rect.bottom > 0 && 
      rect.left < window.innerWidth && 
      rect.right > 0
    );
  }

  /**
   * Check if video is in fullscreen mode
   * @returns {boolean} Whether the video is in fullscreen
   */
  isVideoFullscreen() {
    const fullscreenElement = 
      document.fullscreenElement || 
      document.webkitFullscreenElement || 
      document.mozFullScreenElement ||
      document.msFullscreenElement;
    
    // Check if our video is the fullscreen element
    if (fullscreenElement === this.videoElement) {
      return true;
    }
    
    // Check if our video is contained within the fullscreen element
    if (fullscreenElement && this.videoElement && fullscreenElement.contains(this.videoElement)) {
      return true;
    }
    
    // Check for alternative fullscreen indicators
    if (this.videoElement) {
      const playerContainer = this.videoElement.closest('[class*="player"], [class*="Player"]');
      if (playerContainer && (
        playerContainer.classList.contains('fullscreen') || 
        playerContainer.classList.contains('vjs-fullscreen') ||
        playerContainer.classList.contains('is-fullscreen')
      )) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate the overlay position
   * @param {DOMRect} videoRect - The video element's bounding rectangle
   * @param {boolean} isFullscreen - Whether the video is in fullscreen
   * @returns {Object} Position object with left and bottom properties
   */
  calculateOverlayPosition(videoRect, isFullscreen) {
    let left, bottom;
    
    if (isFullscreen) {
      left = window.innerWidth / 2;
      bottom = 80;
    } else {
      left = videoRect.left + (videoRect.width / 2);
      bottom = Math.max(10, window.innerHeight - videoRect.bottom + 20);
    }
    
    return { left, bottom };
  }

  /**
   * Hide the native subtitle elements
   */
  hideNativeSubtitles() {
    if (!this.enabled) return;
    
    for (const element of this.nativeSubtitleElements) {
      if (element && element.nodeType === Node.ELEMENT_NODE) {
        if (!element.dataset.originalDisplay) {
          element.dataset.originalDisplay = element.style.display || '';
        }
        element.style.display = 'none';
      }
    }
  }

  /**
   * Show the native subtitle elements
   */
  showNativeSubtitles() {
    for (const element of this.nativeSubtitleElements) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) continue;
      
      try {
        const originalDisplay = element.dataset.originalDisplay || '';
        element.style.display = originalDisplay === 'none' ? 'block' : originalDisplay;
        delete element.dataset.originalDisplay;
      } catch (e) {
        console.warn("Failed to restore subtitle element", e);
      }
    }
  }

  /**
   * Event handler for window resize
   */
  handleResize() {
    if (this.enabled) {
      this.requestPositionUpdate();
    }
  }
  
  /**
   * Event handler for window scroll
   */
  handleScroll() {
    if (this.enabled) {
      this.requestPositionUpdate();
    }
  }

  /**
   * Event handler for fullscreen changes
   */
  handleFullscreenChange() {
    if (!this.enabled) return;
    
    setTimeout(() => {
      const isFullscreen = this.isVideoFullscreen();
      
      if (isFullscreen) {
        const fullscreenContainer = document.fullscreenElement || document.webkitFullscreenElement;
        
        if (fullscreenContainer && !fullscreenContainer.contains(this.subtitleOverlay)) {
          fullscreenContainer.appendChild(this.subtitleOverlay);
        }
        
        this.subtitleOverlay.style.zIndex = '9999999';
        this.subtitleOverlay.style.fontSize = '48px';
      } else {
        if (document.body && !document.body.contains(this.subtitleOverlay)) {
          document.body.appendChild(this.subtitleOverlay);
          this.subtitleOverlay.style.zIndex = '9999';
          this.subtitleOverlay.style.fontSize = '28px';
        }
      }
      
      this.requestPositionUpdate();
      
      if (this.currentSubtitleText) {
        this.updateSubtitleOverlay(this.currentSubtitleText);
      }
    }, 100);
  }
}

// Initialize the extractor
const subtitleExtractor = new TVerSubtitleExtractor(); 