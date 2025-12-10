// VibeChrome Settings Page - JavaScript Logic

class VibeSettings {
    constructor() {
        this.settings = {};
        this.voices = [];
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.updateUI();
        await this.checkConnection();
    }

    async loadSettings() {
        const defaults = {
            serverUrl: 'http://localhost:3000',
            defaultVoice: '',
            defaultSpeed: 1.0,
            highlightingEnabled: true,
            highlightStyle: 'sentence',
            clickToListenEnabled: false,
            clickElement: 'paragraph',
            hoverToListenEnabled: false,
            hoverDelay: 1.5,
            autoScrollEnabled: true,
            scrollBehavior: 'smooth',
            floatingButtonEnabled: true,
            overlayEnabled: true,
        };

        try {
            const result = await chrome.storage.local.get(Object.keys(defaults));
            this.settings = { ...defaults, ...result };
        } catch (err) {
            console.error('Failed to load settings:', err);
            this.settings = defaults;
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set(this.settings);
            // Notify content scripts of settings change
            this.broadcastSettingsUpdate();
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    }

    broadcastSettingsUpdate() {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SETTINGS_UPDATED',
                    settings: this.settings
                }).catch(() => { });
            });
        });
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.switchSection(item.dataset.section));
        });

        // Close button
        document.getElementById('closeSettings').addEventListener('click', () => {
            window.close();
        });

        // Server URL
        document.getElementById('serverUrl').addEventListener('change', (e) => {
            this.settings.serverUrl = e.target.value;
            this.saveSettings();
        });

        // Default Voice
        document.getElementById('defaultVoice').addEventListener('change', (e) => {
            this.settings.defaultVoice = e.target.value;
            this.saveSettings();
        });

        // Default Speed
        document.getElementById('defaultSpeed').addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.settings.defaultSpeed = speed;
            document.getElementById('speedValue').textContent = `${speed.toFixed(1)}x`;
            this.saveSettings();
        });

        // Highlighting
        document.getElementById('highlightingEnabled').addEventListener('change', (e) => {
            this.settings.highlightingEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('highlightStyle').addEventListener('change', (e) => {
            this.settings.highlightStyle = e.target.value;
            this.saveSettings();
        });

        // Click to Listen
        document.getElementById('clickToListenEnabled').addEventListener('change', (e) => {
            this.settings.clickToListenEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('clickElement').addEventListener('change', (e) => {
            this.settings.clickElement = e.target.value;
            this.saveSettings();
        });

        // Hover to Listen
        document.getElementById('hoverToListenEnabled').addEventListener('change', (e) => {
            this.settings.hoverToListenEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('hoverDelay').addEventListener('input', (e) => {
            const delay = parseFloat(e.target.value);
            this.settings.hoverDelay = delay;
            document.getElementById('hoverDelayValue').textContent = `${delay.toFixed(1)}s`;
            this.saveSettings();
        });

        // Auto Scroll
        document.getElementById('autoScrollEnabled').addEventListener('change', (e) => {
            this.settings.autoScrollEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('scrollBehavior').addEventListener('change', (e) => {
            this.settings.scrollBehavior = e.target.value;
            this.saveSettings();
        });

        // Player Visibility
        document.getElementById('floatingButtonEnabled').addEventListener('change', (e) => {
            this.settings.floatingButtonEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('overlayEnabled').addEventListener('change', (e) => {
            this.settings.overlayEnabled = e.target.checked;
            this.saveSettings();
        });

        // Keyboard shortcuts link
        document.getElementById('openShortcuts').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        });
    }

    switchSection(sectionId) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        // Update sections
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.toggle('active', section.id === `section-${sectionId}`);
        });
    }

    updateUI() {
        // Server URL
        document.getElementById('serverUrl').value = this.settings.serverUrl;

        // Speed
        document.getElementById('defaultSpeed').value = this.settings.defaultSpeed;
        document.getElementById('speedValue').textContent = `${this.settings.defaultSpeed.toFixed(1)}x`;

        // Highlighting
        document.getElementById('highlightingEnabled').checked = this.settings.highlightingEnabled;
        document.getElementById('highlightStyle').value = this.settings.highlightStyle;

        // Click to Listen
        document.getElementById('clickToListenEnabled').checked = this.settings.clickToListenEnabled;
        document.getElementById('clickElement').value = this.settings.clickElement;

        // Hover to Listen
        document.getElementById('hoverToListenEnabled').checked = this.settings.hoverToListenEnabled;
        document.getElementById('hoverDelay').value = this.settings.hoverDelay;
        document.getElementById('hoverDelayValue').textContent = `${this.settings.hoverDelay.toFixed(1)}s`;

        // Auto Scroll
        document.getElementById('autoScrollEnabled').checked = this.settings.autoScrollEnabled;
        document.getElementById('scrollBehavior').value = this.settings.scrollBehavior;

        // Player Visibility
        document.getElementById('floatingButtonEnabled').checked = this.settings.floatingButtonEnabled;
        document.getElementById('overlayEnabled').checked = this.settings.overlayEnabled;
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.settings.serverUrl}/config`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                const config = await response.json();
                this.voices = config.voices || [];
                this.populateVoices(config.default_voice);
            } else {
                throw new Error('Server not available');
            }
        } catch (err) {
            console.log('Server not connected:', err.message);
            document.getElementById('defaultVoice').innerHTML = '<option value="">Server offline</option>';
        }
    }

    populateVoices(defaultVoice) {
        const select = document.getElementById('defaultVoice');
        select.innerHTML = '';

        this.voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice;
            option.textContent = this.formatVoiceName(voice);

            if (voice === (this.settings.defaultVoice || defaultVoice)) {
                option.selected = true;
                this.settings.defaultVoice = voice;
            }

            select.appendChild(option);
        });
    }

    formatVoiceName(voice) {
        const parts = voice.split('-');
        if (parts.length >= 2) {
            const lang = this.getLanguageName(parts[0]);
            const nameGender = parts[1].split('_');
            const name = nameGender[0];
            const gender = nameGender[1] === 'man' ? 'Male' : nameGender[1] === 'woman' ? 'Female' : '';
            return `${name} (${lang}${gender ? ', ' + gender : ''})`;
        }
        return voice;
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'de': 'German',
            'fr': 'French',
            'it': 'Italian',
            'jp': 'Japanese',
            'kr': 'Korean',
            'nl': 'Dutch',
            'pl': 'Polish',
            'pt': 'Portuguese',
            'sp': 'Spanish',
        };
        return languages[code] || code.toUpperCase();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new VibeSettings();
});
