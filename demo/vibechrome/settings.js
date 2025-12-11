// VibeChrome Settings - Sidebar Navigation

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
        this.checkConnection();
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
            topBarEnabled: true,
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
            this.showToast('Settings saved!');
            console.log('[VibeChrome] Settings saved');
        } catch (err) {
            console.error('Failed to save settings:', err);
            this.showToast('Error saving!');
        }
    }

    showToast(message) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                padding: 12px 24px;
                background: #8b4513;
                color: white;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 10000;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
        }, 2000);
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.switchSection(item.dataset.section));
        });

        // Close button
        document.getElementById('closeSettings')?.addEventListener('click', () => {
            window.close();
        });

        // Server URL
        document.getElementById('serverUrl')?.addEventListener('change', (e) => {
            this.settings.serverUrl = e.target.value;
            this.saveSettings();
            this.checkConnection();
        });

        // Default Voice
        document.getElementById('defaultVoice')?.addEventListener('change', (e) => {
            this.settings.defaultVoice = e.target.value;
            this.saveSettings();
        });

        // Default Speed
        document.getElementById('defaultSpeed')?.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.settings.defaultSpeed = speed;
            document.getElementById('speedValue').textContent = `${speed.toFixed(1)}x`;
            this.saveSettings();
        });

        // Highlighting
        document.getElementById('highlightingEnabled')?.addEventListener('change', (e) => {
            this.settings.highlightingEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('highlightStyle')?.addEventListener('change', (e) => {
            this.settings.highlightStyle = e.target.value;
            this.saveSettings();
        });

        // Click to Listen
        document.getElementById('clickToListenEnabled')?.addEventListener('change', (e) => {
            this.settings.clickToListenEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('clickElement')?.addEventListener('change', (e) => {
            this.settings.clickElement = e.target.value;
            this.saveSettings();
        });

        // Hover to Listen
        document.getElementById('hoverToListenEnabled')?.addEventListener('change', (e) => {
            this.settings.hoverToListenEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('hoverDelay')?.addEventListener('input', (e) => {
            const delay = parseFloat(e.target.value);
            this.settings.hoverDelay = delay;
            document.getElementById('hoverDelayValue').textContent = `${delay.toFixed(1)}s`;
            this.saveSettings();
        });

        // Auto Scroll
        document.getElementById('autoScrollEnabled')?.addEventListener('change', (e) => {
            this.settings.autoScrollEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('scrollBehavior')?.addEventListener('change', (e) => {
            this.settings.scrollBehavior = e.target.value;
            this.saveSettings();
        });

        // Player Visibility
        document.getElementById('floatingButtonEnabled')?.addEventListener('change', (e) => {
            this.settings.floatingButtonEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('overlayEnabled')?.addEventListener('change', (e) => {
            this.settings.overlayEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('topBarEnabled')?.addEventListener('change', (e) => {
            this.settings.topBarEnabled = e.target.checked;
            this.saveSettings();
        });

        // Keyboard shortcuts link
        document.getElementById('openShortcuts')?.addEventListener('click', (e) => {
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
        const serverUrlEl = document.getElementById('serverUrl');
        if (serverUrlEl) serverUrlEl.value = this.settings.serverUrl;

        // Speed
        const speedEl = document.getElementById('defaultSpeed');
        const speedValueEl = document.getElementById('speedValue');
        if (speedEl) speedEl.value = this.settings.defaultSpeed;
        if (speedValueEl) speedValueEl.textContent = `${this.settings.defaultSpeed.toFixed(1)}x`;

        // Checkboxes
        this.setCheckbox('highlightingEnabled', this.settings.highlightingEnabled);
        this.setCheckbox('clickToListenEnabled', this.settings.clickToListenEnabled);
        this.setCheckbox('hoverToListenEnabled', this.settings.hoverToListenEnabled);
        this.setCheckbox('autoScrollEnabled', this.settings.autoScrollEnabled);
        this.setCheckbox('floatingButtonEnabled', this.settings.floatingButtonEnabled);
        this.setCheckbox('overlayEnabled', this.settings.overlayEnabled);
        this.setCheckbox('topBarEnabled', this.settings.topBarEnabled);

        // Selects
        this.setSelect('highlightStyle', this.settings.highlightStyle);
        this.setSelect('clickElement', this.settings.clickElement);
        this.setSelect('scrollBehavior', this.settings.scrollBehavior);

        // Hover delay
        const hoverDelayEl = document.getElementById('hoverDelay');
        const hoverDelayValueEl = document.getElementById('hoverDelayValue');
        if (hoverDelayEl) hoverDelayEl.value = this.settings.hoverDelay;
        if (hoverDelayValueEl) hoverDelayValueEl.textContent = `${this.settings.hoverDelay.toFixed(1)}s`;
    }

    setCheckbox(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = value;
    }

    setSelect(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    async checkConnection() {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;

        try {
            statusEl.textContent = 'Connecting...';
            statusEl.className = 'connection-status';

            const response = await fetch(`${this.settings.serverUrl}/config`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                const config = await response.json();
                this.voices = config.voices || [];
                this.populateVoices(config.default_voice);

                statusEl.textContent = '✓ Connected';
                statusEl.className = 'connection-status connected';
            } else {
                throw new Error('Server error');
            }
        } catch (err) {
            console.log('Server not connected:', err.message);
            statusEl.textContent = '✗ Offline';
            statusEl.className = 'connection-status error';

            const voiceSelect = document.getElementById('defaultVoice');
            if (voiceSelect) {
                voiceSelect.innerHTML = '<option value="">Server offline</option>';
            }
        }
    }

    populateVoices(defaultVoice) {
        const select = document.getElementById('defaultVoice');
        if (!select) return;

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
            'ja': 'Japanese',
            'kr': 'Korean',
            'ko': 'Korean',
            'nl': 'Dutch',
            'pl': 'Polish',
            'pt': 'Portuguese',
            'sp': 'Spanish',
            'es': 'Spanish',
            'hi': 'Hindi',
            'zh': 'Chinese',
        };
        return languages[code] || code.toUpperCase();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new VibeSettings();
});
