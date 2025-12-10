// VibeChrome Popup Script - UI Logic with Bookmarks

class VibeChrome {
  constructor() {
    // State
    this.isPlaying = false;
    this.isConnected = false;
    this.voices = [];
    this.currentVoice = null;
    this.speed = 1.0;
    this.serverUrl = 'http://localhost:3000';
    this.bookmarks = [];

    // DOM Elements
    this.elements = {};

    this.init();
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadSettings();
    await this.loadBookmarks();
    this.updateUI();
    await this.checkConnection();
  }

  cacheElements() {
    this.elements = {
      connectionStatus: document.getElementById('connectionStatus'),
      nowPlaying: document.getElementById('nowPlaying'),
      currentText: document.getElementById('currentText'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      playIcon: document.querySelector('.play-icon'),
      pauseIcon: document.querySelector('.pause-icon'),
      stopBtn: document.getElementById('stopBtn'),
      skipBackBtn: document.getElementById('skipBackBtn'),
      skipForwardBtn: document.getElementById('skipForwardBtn'),
      voiceSelect: document.getElementById('voiceSelect'),
      voiceGrid: document.getElementById('voiceGrid'),
      languageBtn: document.getElementById('languageBtn'),
      languageMenu: document.getElementById('languageMenu'),
      selectedLanguage: document.getElementById('selectedLanguage'),
      speedSlider: document.getElementById('speedSlider'),
      speedValue: document.getElementById('speedValue'),
      speedDisplay: document.getElementById('speedDisplay'),
      presetBtns: document.querySelectorAll('.preset-btn'),
      speedBtns: document.querySelectorAll('.speed-btn'),
      serverUrl: document.getElementById('serverUrl'),
      connectBtn: document.getElementById('connectBtn'),
      serverSettingsToggle: document.getElementById('serverSettingsToggle'),
      serverSettings: document.getElementById('serverSettings'),
      readPageBtn: document.getElementById('readPageBtn'),
      readSelectionBtn: document.getElementById('readSelectionBtn'),
      // Bookmarks
      bookmarksToggle: document.getElementById('bookmarksToggle'),
      bookmarksPanel: document.getElementById('bookmarksPanel'),
      saveBookmarkBtn: document.getElementById('saveBookmarkBtn'),
      bookmarksList: document.getElementById('bookmarksList'),
      // Settings
      openSettingsBtn: document.getElementById('openSettingsBtn'),
    };

    // Voice state
    this.voices = [];
    this.selectedLanguageFilter = 'all';
  }

  bindEvents() {
    // Playback controls
    this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.elements.stopBtn.addEventListener('click', () => this.stop());
    this.elements.skipBackBtn.addEventListener('click', () => this.skip(-10));
    this.elements.skipForwardBtn.addEventListener('click', () => this.skip(10));

    // Settings
    this.elements.voiceSelect.addEventListener('change', (e) => this.setVoice(e.target.value));
    this.elements.speedSlider.addEventListener('input', (e) => this.setSpeed(e.target.value));
    this.elements.serverUrl.addEventListener('change', (e) => this.setServerUrl(e.target.value));
    this.elements.connectBtn.addEventListener('click', () => this.connect());

    // Language dropdown toggle
    this.elements.languageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.languageMenu.classList.toggle('open');
    });

    // Language options
    document.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('click', (e) => {
        this.selectedLanguageFilter = option.dataset.lang;
        this.elements.selectedLanguage.textContent = option.textContent.replace('All Languages', 'All');
        document.querySelectorAll('.language-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        this.elements.languageMenu.classList.remove('open');
        this.renderVoiceGrid();
      });
    });

    // Close language menu when clicking outside
    document.addEventListener('click', () => {
      this.elements.languageMenu.classList.remove('open');
    });

    // Speed presets
    this.elements.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.setSpeed(speed);
        this.elements.speedSlider.value = speed;
        this.updatePresetButtons(speed);
      });
    });

    // Speed +/- buttons
    this.elements.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = btn.textContent === '+' ? 0.1 : -0.1;
        const newSpeed = Math.max(0.5, Math.min(2.0, this.speed + delta));
        this.setSpeed(newSpeed);
        this.elements.speedSlider.value = newSpeed;
      });
    });

    // Collapsibles
    this.elements.serverSettingsToggle.addEventListener('click', () => this.toggleServerSettings());
    this.elements.bookmarksToggle.addEventListener('click', () => this.toggleBookmarks());

    // Quick actions
    this.elements.readPageBtn.addEventListener('click', () => this.readPage());
    this.elements.readSelectionBtn.addEventListener('click', () => this.readSelection());

    // Bookmarks
    this.elements.saveBookmarkBtn.addEventListener('click', () => this.saveBookmark());

    // Open Settings
    this.elements.openSettingsBtn.addEventListener('click', () => this.openSettings());

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message);
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['serverUrl', 'voice', 'speed']);

      if (result.serverUrl) {
        this.serverUrl = result.serverUrl;
        this.elements.serverUrl.value = result.serverUrl;
      }

      if (result.speed) {
        this.speed = parseFloat(result.speed);
        this.elements.speedSlider.value = this.speed;
      }

      if (result.voice) {
        this.currentVoice = result.voice;
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        serverUrl: this.serverUrl,
        voice: this.currentVoice,
        speed: this.speed,
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  updateUI() {
    // Update speed display
    this.elements.speedValue.textContent = `${this.speed.toFixed(1)}x`;

    // Update play/pause button
    if (this.isPlaying) {
      this.elements.playIcon.classList.add('hidden');
      this.elements.pauseIcon.classList.remove('hidden');
    } else {
      this.elements.playIcon.classList.remove('hidden');
      this.elements.pauseIcon.classList.add('hidden');
    }

    // Update connection status
    const statusBadge = this.elements.connectionStatus;
    const statusText = statusBadge.querySelector('.status-text');

    if (this.isConnected) {
      statusBadge.classList.add('connected');
      statusText.textContent = 'Connected';
    } else {
      statusBadge.classList.remove('connected');
      statusText.textContent = 'Disconnected';
    }
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.serverUrl}/config`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const config = await response.json();
        this.isConnected = true;
        this.voices = config.voices || [];
        this.populateVoices(config.default_voice);
      } else {
        throw new Error('Server not available');
      }
    } catch (err) {
      console.log('Server not connected:', err.message);
      this.isConnected = false;
      this.elements.voiceSelect.innerHTML = '<option value="">Server offline</option>';
    }

    this.updateUI();
  }

  populateVoices(defaultVoice) {
    const select = this.elements.voiceSelect;
    select.innerHTML = '';

    this.voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice;
      option.textContent = this.formatVoiceName(voice);

      if (voice === (this.currentVoice || defaultVoice)) {
        option.selected = true;
        this.currentVoice = voice;
      }

      select.appendChild(option);
    });

    // Also render voice grid
    this.renderVoiceGrid();
  }

  renderVoiceGrid() {
    const grid = this.elements.voiceGrid;
    if (!grid) return;

    // Filter voices by language
    const filteredVoices = this.selectedLanguageFilter === 'all'
      ? this.voices
      : this.voices.filter(v => {
        const langCode = v.split('-')[0];
        return langCode === this.selectedLanguageFilter ||
          this.mapLanguageCode(langCode) === this.selectedLanguageFilter;
      });

    if (filteredVoices.length === 0) {
      grid.innerHTML = '<div class="voice-loading">No voices found</div>';
      return;
    }

    grid.innerHTML = filteredVoices.map(voice => {
      const parts = voice.split('-');
      const langCode = parts[0];
      const nameGender = parts[1]?.split('_') || ['Voice', ''];
      const name = nameGender[0];
      const gender = nameGender[1];
      const initials = name.substring(0, 2).toUpperCase();
      const langName = this.getLanguageName(langCode);
      const genderLabel = gender === 'man' ? 'Male' : gender === 'woman' ? 'Female' : '';
      const isSelected = voice === this.currentVoice;

      return `
        <div class="voice-card ${isSelected ? 'selected' : ''}" data-voice="${voice}">
          <div class="voice-avatar">${initials}</div>
          <div class="voice-info">
            <div class="voice-name">${name}</div>
            <div class="voice-desc">${langName}${genderLabel ? ' · ' + genderLabel : ''}</div>
          </div>
          <button class="voice-preview-btn" data-voice="${voice}" title="Preview">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    // Bind click events for voice cards
    grid.querySelectorAll('.voice-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.voice-preview-btn')) return;
        const voice = card.dataset.voice;
        this.selectVoice(voice);
      });
    });

    // Bind preview button events
    grid.querySelectorAll('.voice-preview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const voice = btn.dataset.voice;
        this.previewVoice(voice);
      });
    });
  }

  selectVoice(voice) {
    this.currentVoice = voice;
    this.setVoice(voice);

    // Update visual state
    this.elements.voiceGrid.querySelectorAll('.voice-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.voice === voice);
    });

    // Update hidden select
    this.elements.voiceSelect.value = voice;
  }

  previewVoice(voice) {
    chrome.runtime.sendMessage({
      type: 'SPEAK',
      text: 'Hello! This is how I sound.',
      voice: voice
    });
  }

  mapLanguageCode(code) {
    const map = {
      'jp': 'ja',
      'kr': 'ko',
      'sp': 'es',
    };
    return map[code] || code;
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

  toggleServerSettings() {
    const container = this.elements.serverSettingsToggle.closest('.collapsible');
    container.classList.toggle('open');
  }

  toggleBookmarks() {
    const container = this.elements.bookmarksToggle.closest('.collapsible');
    container.classList.toggle('open');
  }

  openSettings() {
    // Open settings page in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  }


  async setVoice(voice) {
    this.currentVoice = voice;
    await this.saveSettings();
    chrome.runtime.sendMessage({ type: 'SET_VOICE', voice });
  }

  async setSpeed(value) {
    this.speed = parseFloat(value);
    this.elements.speedValue.textContent = `${this.speed.toFixed(1)}x`;
    if (this.elements.speedDisplay) {
      this.elements.speedDisplay.textContent = `${this.speed.toFixed(1)}x`;
    }
    this.updatePresetButtons(this.speed);
    await this.saveSettings();
    chrome.runtime.sendMessage({ type: 'SET_SPEED', speed: this.speed });
  }

  updatePresetButtons(speed) {
    this.elements.presetBtns.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', Math.abs(btnSpeed - speed) < 0.01);
    });
  }

  async setServerUrl(url) {
    this.serverUrl = url;
    await this.saveSettings();
  }

  async connect() {
    this.elements.connectBtn.textContent = 'Connecting...';
    this.elements.connectBtn.disabled = true;

    await this.checkConnection();

    this.elements.connectBtn.textContent = 'Connect';
    this.elements.connectBtn.disabled = false;

    chrome.runtime.sendMessage({ type: 'SET_SERVER', url: this.serverUrl });
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    chrome.runtime.sendMessage({ type: 'PLAY' });
    this.isPlaying = true;
    this.updateUI();
  }

  pause() {
    chrome.runtime.sendMessage({ type: 'PAUSE' });
    this.isPlaying = false;
    this.updateUI();
  }

  stop() {
    chrome.runtime.sendMessage({ type: 'STOP' });
    this.isPlaying = false;
    this.elements.currentText.textContent = 'Select text on any page to start';
    this.updateUI();
  }

  skip(seconds) {
    chrome.runtime.sendMessage({ type: 'SKIP', seconds });
  }

  async readPage() {
    if (!this.isConnected) {
      this.showError('Please connect to a VibeVoice server first');
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TEXT' }, (response) => {
      if (response && response.text) {
        this.speakText(response.text);
      }
    });
  }

  async readSelection() {
    if (!this.isConnected) {
      this.showError('Please connect to a VibeVoice server first');
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (response) => {
      if (response && response.text) {
        this.speakText(response.text);
      } else {
        this.showError('No text selected. Select some text on the page first.');
      }
    });
  }

  speakText(text) {
    this.elements.currentText.textContent = text.substring(0, 150) + (text.length > 150 ? '...' : '');

    chrome.runtime.sendMessage({
      type: 'SPEAK',
      text: text,
      voice: this.currentVoice,
      serverUrl: this.serverUrl,
    });

    this.isPlaying = true;
    this.updateUI();
  }

  // === BOOKMARKS ===

  async loadBookmarks() {
    try {
      const result = await chrome.storage.local.get(['bookmarks']);
      this.bookmarks = result.bookmarks || [];
      this.renderBookmarks();
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  }

  async saveBookmark() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Get selected text from content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, async (response) => {
      const text = response?.text || '';

      if (!text) {
        this.showError('Select text to bookmark');
        return;
      }

      const bookmark = {
        id: Date.now().toString(),
        url: tab.url,
        title: tab.title || 'Untitled',
        text: text.substring(0, 200),
        fullText: text,
        timestamp: new Date().toISOString(),
      };

      this.bookmarks.unshift(bookmark);

      // Limit to 50 bookmarks
      if (this.bookmarks.length > 50) {
        this.bookmarks.pop();
      }

      try {
        await chrome.storage.local.set({ bookmarks: this.bookmarks });
        this.renderBookmarks();
        this.showSuccess('Bookmark saved!');
      } catch (err) {
        console.error('Failed to save bookmark:', err);
      }
    });
  }

  async deleteBookmark(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);

    try {
      await chrome.storage.local.set({ bookmarks: this.bookmarks });
      this.renderBookmarks();
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  }

  renderBookmarks() {
    const list = this.elements.bookmarksList;

    if (this.bookmarks.length === 0) {
      list.innerHTML = '<div class="bookmarks-empty">No bookmarks yet</div>';
      return;
    }

    list.innerHTML = this.bookmarks.map(bookmark => `
      <div class="bookmark-item" data-id="${bookmark.id}">
        <div class="bookmark-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
        </div>
        <div class="bookmark-content">
          <div class="bookmark-title">${this.escapeHtml(bookmark.title)}</div>
          <div class="bookmark-preview">${this.escapeHtml(bookmark.text)}</div>
          <div class="bookmark-date">${this.formatDate(bookmark.timestamp)}</div>
        </div>
        <button class="bookmark-delete" data-id="${bookmark.id}" title="Delete bookmark">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Bind click events
    list.querySelectorAll('.bookmark-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-delete')) {
          e.stopPropagation();
          this.deleteBookmark(e.target.closest('.bookmark-delete').dataset.id);
        } else {
          this.readBookmark(item.dataset.id);
        }
      });
    });
  }

  readBookmark(id) {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      this.speakText(bookmark.fullText);
    }
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleMessage(message) {
    switch (message.type) {
      case 'PLAYBACK_STARTED':
        this.isPlaying = true;
        this.updateUI();
        break;

      case 'PLAYBACK_STOPPED':
      case 'PLAYBACK_ENDED':
        this.isPlaying = false;
        this.updateUI();
        break;

      case 'PLAYBACK_ERROR':
        this.showError(message.error);
        this.isPlaying = false;
        this.updateUI();
        break;

      case 'TEXT_SELECTED':
        this.elements.currentText.textContent = message.text.substring(0, 150) +
          (message.text.length > 150 ? '...' : '');
        break;
    }
  }

  showError(message) {
    console.error('VibeChrome Error:', message);
    this.elements.currentText.textContent = `Error: ${message}`;
  }

  showSuccess(message) {
    this.elements.currentText.textContent = message;
    setTimeout(() => {
      if (this.elements.currentText.textContent === message) {
        this.elements.currentText.textContent = 'Select text on any page to start';
      }
    }, 2000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new VibeChrome();
});
