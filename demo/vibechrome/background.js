// VibeChrome Background Service Worker - Coordinates TTS via Offscreen Document
// Note: Audio playback happens in offscreen.js because service workers cannot use AudioContext

class VibeVoiceClient {
    constructor() {
        this.serverUrl = 'http://localhost:3000';
        this.voice = null;
        this.speed = 1.0;
        this.isPlaying = false;
        this.isPaused = false;
        this.offscreenCreated = false;

        this.init();
    }

    init() {
        // Load settings
        this.loadSettings();

        // Listen for messages
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep channel open for async response
        });

        // Create context menu
        this.setupContextMenu();

        // Listen for keyboard commands
        this.setupCommandListener();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['serverUrl', 'voice', 'speed']);
            if (result.serverUrl) this.serverUrl = result.serverUrl;
            if (result.voice) this.voice = result.voice;
            if (result.speed) this.speed = parseFloat(result.speed);
        } catch (err) {
            console.error('[Background] Failed to load settings:', err);
        }
    }

    setupContextMenu() {
        chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
                id: 'vibechrome-read',
                title: 'Read with VibeVoice',
                contexts: ['selection'],
            });
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'vibechrome-read' && info.selectionText) {
                this.speak(info.selectionText);
            }
        });
    }

    setupCommandListener() {
        chrome.commands.onCommand.addListener(async (command) => {
            console.log('[Background] Command received:', command);

            switch (command) {
                case 'read-selection':
                    // Get selected text from active tab
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab) {
                        chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (response) => {
                            if (response && response.text) {
                                this.speak(response.text);
                            }
                        });
                    }
                    break;

                case 'save-bookmark':
                    const [bookmarkTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (bookmarkTab) {
                        chrome.tabs.sendMessage(bookmarkTab.id, { type: 'SAVE_BOOKMARK' });
                    }
                    break;

                case 'toggle-playback':
                    if (this.isPlaying) {
                        this.pause();
                    } else {
                        this.resume();
                    }
                    break;
            }
        });
    }

    handleMessage(message, sender, sendResponse) {
        console.log('[Background] Received message:', message.type);

        switch (message.type) {
            case 'SPEAK':
                this.speak(message.text, message.voice, message.serverUrl);
                sendResponse({ success: true });
                break;

            case 'PLAY':
                this.resume();
                sendResponse({ success: true });
                break;

            case 'PAUSE':
                this.pause();
                sendResponse({ success: true });
                break;

            case 'STOP':
                this.stop();
                sendResponse({ success: true });
                break;

            case 'SKIP':
                // Skip not fully implemented yet
                sendResponse({ success: true });
                break;

            case 'SET_VOICE':
                this.voice = message.voice;
                sendResponse({ success: true });
                break;

            case 'SET_SPEED':
                this.speed = message.speed;
                this.sendToOffscreen({ type: 'OFFSCREEN_SET_SPEED', speed: this.speed });
                sendResponse({ success: true });
                break;

            case 'SET_SERVER':
                this.serverUrl = message.url;
                sendResponse({ success: true });
                break;

            case 'GET_STATUS':
                sendResponse({
                    isPlaying: this.isPlaying,
                    isPaused: this.isPaused,
                    voice: this.voice,
                    speed: this.speed,
                    serverUrl: this.serverUrl,
                });
                break;

            // Status updates from offscreen document
            case 'PLAYBACK_STARTED':
                this.isPlaying = true;
                this.isPaused = false;
                this.broadcast({ type: 'PLAYBACK_STARTED' });
                sendResponse({ success: true });
                break;

            case 'PLAYBACK_STOPPED':
                this.isPlaying = false;
                this.isPaused = false;
                this.broadcast({ type: 'PLAYBACK_STOPPED' });
                sendResponse({ success: true });
                break;

            case 'PLAYBACK_ENDED':
                this.isPlaying = false;
                this.isPaused = false;
                this.broadcast({ type: 'PLAYBACK_ENDED' });
                sendResponse({ success: true });
                break;

            case 'PLAYBACK_PAUSED':
                this.isPaused = true;
                this.isPlaying = false;
                this.broadcast({ type: 'PLAYBACK_STOPPED' });
                sendResponse({ success: true });
                break;

            case 'PLAYBACK_RESUMED':
                this.isPaused = false;
                this.isPlaying = true;
                this.broadcast({ type: 'PLAYBACK_STARTED' });
                sendResponse({ success: true });
                break;

            case 'PLAYBACK_ERROR':
                this.isPlaying = false;
                this.broadcast({ type: 'PLAYBACK_ERROR', error: message.error });
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }

    async ensureOffscreenDocument() {
        // Check if offscreen document already exists
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });

        if (existingContexts.length > 0) {
            console.log('[Background] Offscreen document already exists');
            return;
        }

        // Create offscreen document
        console.log('[Background] Creating offscreen document...');
        try {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Playing TTS audio from VibeVoice server'
            });
            console.log('[Background] Offscreen document created');
        } catch (err) {
            console.error('[Background] Failed to create offscreen document:', err);
            throw err;
        }
    }

    async sendToOffscreen(message) {
        await this.ensureOffscreenDocument();

        try {
            await chrome.runtime.sendMessage(message);
        } catch (err) {
            console.error('[Background] Failed to send to offscreen:', err);
        }
    }

    async speak(text, voice, serverUrl) {
        // Update settings if provided
        if (voice) this.voice = voice;
        if (serverUrl) this.serverUrl = serverUrl;

        // Validate
        if (!text || !text.trim()) {
            this.broadcast({ type: 'PLAYBACK_ERROR', error: 'No text provided' });
            return;
        }

        console.log('[Background] Speaking:', text.substring(0, 50) + '...');
        console.log('[Background] Server URL:', this.serverUrl);
        console.log('[Background] Voice:', this.voice);

        // Send to offscreen document for audio playback
        await this.sendToOffscreen({
            type: 'OFFSCREEN_SPEAK',
            text: text,
            voice: this.voice,
            serverUrl: this.serverUrl,
            speed: this.speed,
        });
    }

    async pause() {
        await this.sendToOffscreen({ type: 'OFFSCREEN_PAUSE' });
    }

    async resume() {
        await this.sendToOffscreen({ type: 'OFFSCREEN_RESUME' });
    }

    async stop() {
        await this.sendToOffscreen({ type: 'OFFSCREEN_STOP' });
    }

    // Broadcast status to popup and content scripts
    broadcast(message) {
        // Send to popup if open
        chrome.runtime.sendMessage(message).catch(() => {
            // Popup not open, ignore
        });

        // Send to active tab's content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
                    // Content script not loaded, ignore
                });
            }
        });
    }
}

// Initialize the client
const vibeClient = new VibeVoiceClient();

console.log('[Background] VibeChrome service worker initialized');
