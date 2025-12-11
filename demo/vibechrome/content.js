// VibeChrome Content Script - Full Featured with Click/Hover to Listen

class VibeContentScript {
    constructor() {
        this.floatingButton = null;
        this.topBar = null;
        this.currentSelection = '';
        this.isPlaying = false;
        this.sentences = [];
        this.currentSentenceIndex = 0;
        this.originalText = '';
        this.highlightOverlay = null;
        this.sentenceElements = [];
        this.hoverTimeout = null;
        this.pageReadingTime = 0;

        // Settings (loaded from storage)
        this.settings = {
            highlightingEnabled: true,
            clickToListenEnabled: false,
            clickElement: 'paragraph',
            hoverToListenEnabled: false,
            hoverDelay: 1.5,
            autoScrollEnabled: true,
            floatingButtonEnabled: true,
            overlayEnabled: true,
            topBarEnabled: true,
        };

        this.init();
    }

    async init() {
        await this.loadSettings();
        this.createFloatingButton();
        this.createTopBar();
        this.createHighlightOverlay();
        this.setupEventListeners();
        this.setupMessageListener();
        this.setupStorageListener();
        console.log('[VibeChrome] Content script initialized');
    }

    setupStorageListener() {
        // Listen for storage changes (real-time settings sync)
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                for (const [key, { newValue }] of Object.entries(changes)) {
                    if (this.settings.hasOwnProperty(key)) {
                        this.settings[key] = newValue;
                        console.log(`[VibeChrome] Setting updated: ${key} = ${newValue}`);
                    }
                }
                // Update UI elements based on new settings
                this.applySettings();
            }
        });
    }

    applySettings() {
        // Show/hide top bar based on settings
        if (this.topBar) {
            if (this.settings.topBarEnabled === false) {
                this.topBar.classList.remove('visible');
            }
        }

        // Show/hide floating button based on settings
        if (this.floatingButton && this.settings.floatingButtonEnabled === false) {
            this.floatingButton.style.display = 'none';
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                'highlightingEnabled',
                'clickToListenEnabled',
                'clickElement',
                'hoverToListenEnabled',
                'hoverDelay',
                'autoScrollEnabled',
                'floatingButtonEnabled',
                'overlayEnabled',
            ]);
            this.settings = { ...this.settings, ...result };
        } catch (e) {
            console.log('[VibeChrome] Using default settings');
        }
    }

    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.id = 'vibechrome-floating-btn';
        this.floatingButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
      </svg>
      <span>Read</span>
    `;
        this.floatingButton.style.display = 'none';
        document.body.appendChild(this.floatingButton);

        this.floatingButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.readSelection();
        });
    }

    createTopBar() {
        // Create the bar immediately with placeholder time
        this.pageReadingTime = '...';

        this.topBar = document.createElement('div');
        this.topBar.id = 'vibechrome-top-bar';
        this.topBar.className = 'vibechrome-top-bar';
        this.topBar.innerHTML = `
            <button class="vibechrome-topbar-play" id="vibechrome-topbar-play">
                <svg class="vibechrome-play-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <svg class="vibechrome-pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            </button>
            <span class="vibechrome-topbar-text">Listen to This Page</span>
            <button class="vibechrome-topbar-close" id="vibechrome-topbar-close" title="Close">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        `;
        document.body.appendChild(this.topBar);

        // Bind events
        document.getElementById('vibechrome-topbar-play').addEventListener('click', () => {
            if (this.isPlaying) {
                this.safeMessage({ type: 'STOP' });
            } else {
                this.readFullPage();
            }
        });

        document.getElementById('vibechrome-topbar-close').addEventListener('click', () => {
            this.hideTopBar();
        });

        // Calculate reading time in background (non-blocking)
        requestIdleCallback(() => {
            this.calculateReadingTime();
        }, { timeout: 2000 });

        // Show after a delay
        setTimeout(() => {
            this.topBar.classList.add('visible');
        }, 500);
    }

    calculateReadingTime() {
        try {
            const pageText = this.extractPageText();
            const wordCount = pageText.split(/\s+/).length;
            const wordsPerMinute = 150;
            this.pageReadingTime = Math.ceil(wordCount / wordsPerMinute);

            const textEl = this.topBar?.querySelector('.vibechrome-topbar-text');
            if (textEl && !this.isPlaying) {
                textEl.textContent = `Listen to This Page · ${this.pageReadingTime} min`;
            }
        } catch (e) {
            console.log('[VibeChrome] Error calculating reading time:', e);
        }
    }

    // readFullPage is defined later in the class

    showTopBar() {
        if (this.topBar) {
            this.topBar.classList.add('visible');
        }
    }

    hideTopBar() {
        if (this.topBar) {
            this.topBar.classList.remove('visible');
        }
    }

    updateTopBarPlayState(playing) {
        const playIcon = this.topBar?.querySelector('.vibechrome-play-icon');
        const pauseIcon = this.topBar?.querySelector('.vibechrome-pause-icon');
        const textEl = this.topBar?.querySelector('.vibechrome-topbar-text');

        if (playIcon && pauseIcon) {
            playIcon.style.display = playing ? 'none' : 'block';
            pauseIcon.style.display = playing ? 'block' : 'none';
        }

        if (textEl) {
            textEl.textContent = playing ? 'Now Reading...' : `Listen to This Page · ${this.pageReadingTime} min`;
        }
    }

    createHighlightOverlay() {
        this.highlightOverlay = document.createElement('div');
        this.highlightOverlay.id = 'vibechrome-highlight-overlay';
        this.highlightOverlay.className = 'vibechrome-highlight-overlay';
        this.highlightOverlay.style.display = 'none';
        document.body.appendChild(this.highlightOverlay);
    }

    setupEventListeners() {
        // Text selection
        document.addEventListener('mouseup', (e) => {
            if (e.target.closest('#vibechrome-floating-btn')) return;
            if (e.target.closest('#vibechrome-highlight-overlay')) return;
            setTimeout(() => this.handleSelectionChange(e), 10);
        });

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('#vibechrome-floating-btn')) {
                this.hideFloatingButton();
            }
        });

        document.addEventListener('scroll', () => {
            this.hideFloatingButton();
        }, true);

        // Click to Listen
        document.addEventListener('click', (e) => {
            if (!this.settings.clickToListenEnabled) return;
            if (e.target.closest('#vibechrome-floating-btn')) return;
            if (e.target.closest('#vibechrome-highlight-overlay')) return;
            if (window.getSelection().toString().trim()) return;

            const element = this.findReadableElement(e.target);
            if (element) {
                e.preventDefault();
                this.readElement(element);
            }
        });

        // Hover to Listen
        document.addEventListener('mouseenter', (e) => {
            if (!this.settings.hoverToListenEnabled) return;

            const element = this.findReadableElement(e.target);
            if (element && element.innerText.trim().length > 20) {
                this.startHoverTimer(element);
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            this.cancelHoverTimer();
        }, true);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.readSelection();
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                this.saveBookmark();
            }
            if (e.key === 'Escape' && this.isPlaying) {
                this.safeMessage({ type: 'STOP' });
            }
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'GET_SELECTION':
                    const selection = window.getSelection().toString().trim();
                    sendResponse({ text: selection });
                    break;

                case 'GET_PAGE_TEXT':
                    const pageText = this.extractPageText();
                    sendResponse({ text: pageText });
                    break;

                case 'PLAYBACK_STARTED':
                    this.isPlaying = true;
                    this.currentSentenceIndex = 0;
                    this.updateButtonState();
                    this.updateTopBarPlayState(true);
                    if (this.settings.overlayEnabled && this.settings.highlightingEnabled) {
                        this.startHighlighting();
                    }
                    break;

                case 'PLAYBACK_STOPPED':
                case 'PLAYBACK_ENDED':
                    this.isPlaying = false;
                    this.updateButtonState();
                    this.updateTopBarPlayState(false);
                    this.hideHighlightOverlay();
                    break;

                case 'SETTINGS_UPDATED':
                    this.settings = { ...this.settings, ...message.settings };
                    break;

                case 'SAVE_BOOKMARK':
                    this.saveBookmark();
                    sendResponse({ success: true });
                    break;

                case 'READ_PAGE':
                    this.readFullPage();
                    sendResponse({ success: true });
                    break;

                case 'READ_SELECTION':
                    this.readSelection();
                    sendResponse({ success: true });
                    break;

                default:
                    break;
            }
            return true;
        });
    }

    // === CLICK TO LISTEN ===

    findReadableElement(target) {
        const readableElements = ['P', 'DIV', 'ARTICLE', 'SECTION', 'LI', 'TD', 'SPAN'];
        let element = target;

        while (element && element !== document.body) {
            if (readableElements.includes(element.tagName)) {
                const text = element.innerText.trim();
                if (text.length > 20 && text.length < 10000) {
                    return element;
                }
            }
            element = element.parentElement;
        }
        return null;
    }

    readElement(element) {
        const text = element.innerText.trim();
        if (!text) return;

        this.originalText = text;
        this.currentSelection = text;

        // Visual feedback
        element.classList.add('vibechrome-reading-target');
        setTimeout(() => {
            element.classList.remove('vibechrome-reading-target');
        }, 500);

        // Start reading
        this.speakText(text);
    }

    // === HOVER TO LISTEN ===

    startHoverTimer(element) {
        this.cancelHoverTimer();

        const delay = this.settings.hoverDelay * 1000;
        this.hoverTimeout = setTimeout(() => {
            if (!this.isPlaying) {
                this.readElement(element);
            }
        }, delay);
    }

    cancelHoverTimer() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }

    // === TEXT HIGHLIGHTING ===

    splitIntoSentences(text) {
        const sentenceRegex = /[^.!?]*[.!?]+|[^.!?]+$/g;
        const matches = text.match(sentenceRegex);
        return matches ? matches.map(s => s.trim()).filter(s => s.length > 0) : [text];
    }

    startHighlighting() {
        if (!this.originalText) return;

        this.sentences = this.splitIntoSentences(this.originalText);
        this.currentSentenceIndex = 0;
        this.sentenceElements = [];

        console.log('[VibeChrome] Starting highlighting with', this.sentences.length, 'sentences');
        this.showHighlightOverlay();
    }

    showHighlightOverlay() {
        const overlay = this.highlightOverlay;
        overlay.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'vibechrome-overlay-header';
        header.innerHTML = `
      <span class="vibechrome-overlay-title">🎧 Now Reading</span>
      <button class="vibechrome-overlay-close" id="vibechrome-close-overlay">✕</button>
    `;
        overlay.appendChild(header);

        const content = document.createElement('div');
        content.className = 'vibechrome-overlay-content';

        this.sentences.forEach((sentence, index) => {
            const sentenceEl = document.createElement('div');
            sentenceEl.className = 'vibechrome-overlay-sentence';
            sentenceEl.dataset.index = index;
            sentenceEl.textContent = sentence;

            if (index === 0) {
                sentenceEl.classList.add('vibechrome-active');
            }

            content.appendChild(sentenceEl);
            this.sentenceElements.push(sentenceEl);
        });

        overlay.appendChild(content);
        overlay.style.display = 'block';

        document.getElementById('vibechrome-close-overlay').addEventListener('click', () => {
            this.safeMessage({ type: 'STOP' });
            this.hideHighlightOverlay();
        });

        this.startSentenceTimer();
    }

    startSentenceTimer() {
        this.advanceSentence(0);
    }

    advanceSentence(index) {
        if (!this.isPlaying || index >= this.sentences.length) return;

        this.sentenceElements.forEach((el, i) => {
            el.classList.toggle('vibechrome-active', i === index);
        });

        if (this.sentenceElements[index] && this.settings.autoScrollEnabled) {
            this.sentenceElements[index].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }

        this.currentSentenceIndex = index;

        const sentence = this.sentences[index];
        const charsPerSecond = 12;
        const duration = Math.max(1000, (sentence.length / charsPerSecond) * 1000);

        setTimeout(() => {
            if (this.isPlaying && index + 1 < this.sentences.length) {
                this.advanceSentence(index + 1);
            }
        }, duration);
    }

    hideHighlightOverlay() {
        this.highlightOverlay.style.display = 'none';
        this.sentences = [];
        this.sentenceElements = [];
        this.currentSentenceIndex = 0;
    }

    // === BOOKMARKS ===

    async saveBookmark() {
        const text = this.currentSelection || window.getSelection().toString().trim();
        if (!text) {
            console.log('[VibeChrome] No text selected for bookmark');
            return;
        }

        const bookmark = {
            id: Date.now().toString(),
            url: window.location.href,
            title: document.title,
            text: text.substring(0, 200),
            fullText: text,
            timestamp: new Date().toISOString(),
        };

        try {
            const result = await chrome.storage.local.get(['bookmarks']);
            const bookmarks = result.bookmarks || [];
            bookmarks.unshift(bookmark);
            if (bookmarks.length > 50) bookmarks.pop();
            await chrome.storage.local.set({ bookmarks });
            this.showBookmarkSavedToast();
        } catch (e) {
            console.error('[VibeChrome] Failed to save bookmark:', e);
        }
    }

    showBookmarkSavedToast() {
        const toast = document.createElement('div');
        toast.className = 'vibechrome-toast';
        toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" class="vibechrome-toast-icon">
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
      </svg>
      <span>Bookmark saved!</span>
    `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // === SELECTION & READING ===

    handleSelectionChange(event) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText && selectedText.length > 0) {
            this.currentSelection = selectedText;
            this.originalText = selectedText;

            if (this.settings.floatingButtonEnabled) {
                this.showFloatingButton(event);
            }

            this.safeMessage({
                type: 'TEXT_SELECTED',
                text: selectedText,
            });
        } else {
            this.hideFloatingButton();
        }
    }

    showFloatingButton(event) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const left = rect.left + (rect.width / 2) - 40;
        const top = rect.top - 45;

        this.floatingButton.style.left = `${Math.max(10, left + window.scrollX)}px`;
        this.floatingButton.style.top = `${Math.max(10, top + window.scrollY)}px`;
        this.floatingButton.style.display = 'flex';

        requestAnimationFrame(() => this.floatingButton.classList.add('visible'));
    }

    hideFloatingButton() {
        this.floatingButton.classList.remove('visible');
        setTimeout(() => {
            this.floatingButton.style.display = 'none';
        }, 200);
    }

    updateButtonState() {
        if (this.isPlaying) {
            this.floatingButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
        </svg>
        <span>Stop</span>
      `;
        } else {
            this.floatingButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
        </svg>
        <span>Read</span>
      `;
        }
    }

    safeMessage(message) {
        try {
            if (chrome.runtime?.id) {
                chrome.runtime.sendMessage(message).catch(() => { });
            }
        } catch (e) {
            console.log('[VibeChrome] Extension context invalidated.');
        }
    }

    readSelection() {
        if (this.isPlaying) {
            this.safeMessage({ type: 'STOP' });
            return;
        }

        const text = this.currentSelection || window.getSelection().toString().trim();
        if (!text) {
            console.log('[VibeChrome] No text selected');
            return;
        }

        this.originalText = text;
        this.speakText(text);
        this.hideFloatingButton();
    }

    speakText(text) {
        try {
            if (!chrome.runtime?.id) return;

            chrome.storage.local.get(['serverUrl', 'voice'], (result) => {
                this.safeMessage({
                    type: 'SPEAK',
                    text: text,
                    voice: result.voice,
                    serverUrl: result.serverUrl || 'http://localhost:3000',
                });
            });
        } catch (e) {
            console.log('[VibeChrome] Extension context invalidated.');
        }
    }

    readFullPage() {
        if (this.isPlaying) {
            this.safeMessage({ type: 'STOP' });
            return;
        }

        const text = this.extractPageText();
        if (!text || text.length < 10) {
            console.log('[VibeChrome] No readable text found on page');
            return;
        }

        console.log('[VibeChrome] Reading page, text length:', text.length);
        this.originalText = text;
        this.speakText(text);
    }

    readElement(element) {
        if (this.isPlaying) {
            this.safeMessage({ type: 'STOP' });
            return;
        }

        const text = element.innerText.trim();
        if (!text) return;

        this.originalText = text;
        this.speakText(text);
    }

    extractPageText() {
        const selectors = ['article', '[role="main"]', 'main', '.post-content', '.article-content', '.content', '#content'];
        let content = null;

        for (const selector of selectors) {
            content = document.querySelector(selector);
            if (content && content.innerText.trim().length > 100) break;
        }

        if (!content) content = document.body;

        let text = content.innerText
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\t/g, ' ')
            .replace(/ {2,}/g, ' ')
            .trim();

        return text.length > 10000 ? text.substring(0, 10000) + '...' : text;
    }
}

// Initialize
if (!window.vibeContentScript) {
    window.vibeContentScript = new VibeContentScript();
}
