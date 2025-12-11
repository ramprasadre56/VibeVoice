// VibeChrome Popup - Panel Navigation

class VibePopup {
  constructor() {
    this.serverUrl = 'http://localhost:3000';
    this.voices = [];
    this.currentVoice = '';
    this.speed = 1.0;
    this.isPlaying = false;
    this.isConnected = false;
    this.selectedLanguageFilter = 'all';
    this.init();
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadSettings();
    this.updateUI();
    await this.checkConnection();
  }

  cacheElements() {
    this.elements = {
      // Views
      playerView: document.getElementById('playerView'),
      voicePanel: document.getElementById('voicePanel'),
      speedPanel: document.getElementById('speedPanel'),

      // Player controls
      statusBadge: document.getElementById('statusBadge'),
      nowPlaying: document.getElementById('nowPlaying'),
      currentText: document.getElementById('currentText'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      playIcon: document.querySelector('.play-icon'),
      pauseIcon: document.querySelector('.pause-icon'),
      skipBackBtn: document.getElementById('skipBackBtn'),
      skipForwardBtn: document.getElementById('skipForwardBtn'),

      // Options
      voiceBtn: document.getElementById('voiceBtn'),
      currentVoiceAvatar: document.getElementById('currentVoiceAvatar'),
      currentVoiceName: document.getElementById('currentVoiceName'),
      speedBtn: document.getElementById('speedBtn'),
      speedValue: document.getElementById('speedValue'),

      // Actions
      readPageBtn: document.getElementById('readPageBtn'),
      readSelectionBtn: document.getElementById('readSelectionBtn'),
      settingsBtn: document.getElementById('settingsBtn'),

      // Voice panel
      voiceBackBtn: document.getElementById('voiceBackBtn'),
      languageBtn: document.getElementById('languageBtn'),
      languageMenu: document.getElementById('languageMenu'),
      selectedLanguage: document.getElementById('selectedLanguage'),
      voiceSearch: document.getElementById('voiceSearch'),
      voiceList: document.getElementById('voiceList'),
      voiceSelect: document.getElementById('voiceSelect'),

      // Speed panel
      speedBackBtn: document.getElementById('speedBackBtn'),

      // Settings panel
      settingsPanel: document.getElementById('settingsPanel'),
      settingsBackBtn: document.getElementById('settingsBackBtn'),
      serverUrlInput: document.getElementById('serverUrlInput'),
      saveServerUrl: document.getElementById('saveServerUrl'),
      openFullSettings: document.getElementById('openFullSettings'),

      // Hidden
      speedSlider: document.getElementById('speedSlider'),
    };
  }

  bindEvents() {
    // Playback
    this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.elements.skipBackBtn.addEventListener('click', () => this.skip(-10));
    this.elements.skipForwardBtn.addEventListener('click', () => this.skip(10));

    // Open voice panel
    this.elements.voiceBtn.addEventListener('click', () => this.showPanel('voice'));
    this.elements.voiceBackBtn.addEventListener('click', () => this.showPanel('player'));

    // Open speed panel
    this.elements.speedBtn.addEventListener('click', () => this.showPanel('speed'));
    this.elements.speedBackBtn.addEventListener('click', () => this.showPanel('player'));

    // Open settings page directly
    this.elements.settingsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });

    // Save server URL
    this.elements.saveServerUrl.addEventListener('click', () => this.saveServerUrlAndConnect());

    // Open full settings page
    this.elements.openFullSettings.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });

    // Speed options
    document.querySelectorAll('.speed-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.setSpeed(speed);
        document.querySelectorAll('.speed-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.showPanel('player');
      });
    });

    // Actions
    this.elements.readPageBtn.addEventListener('click', () => this.readPage());
    this.elements.readSelectionBtn.addEventListener('click', () => this.readSelection());

    // Language dropdown
    this.elements.languageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.languageMenu.classList.toggle('open');
    });

    document.querySelectorAll('.lang-option').forEach(option => {
      option.addEventListener('click', () => {
        this.selectedLanguageFilter = option.dataset.lang;
        this.elements.selectedLanguage.textContent =
          option.dataset.lang === 'all' ? 'All' : option.textContent;
        document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        this.elements.languageMenu.classList.remove('open');
        this.renderVoiceList();
      });
    });

    document.addEventListener('click', () => {
      this.elements.languageMenu.classList.remove('open');
    });

    // Voice search
    this.elements.voiceSearch.addEventListener('input', () => {
      this.renderVoiceList();
    });

    // Listen for messages
    chrome.runtime.onMessage.addListener((msg) => this.handleMessage(msg));
  }

  showPanel(panel) {
    this.elements.playerView.classList.toggle('hidden', panel !== 'player');
    this.elements.voicePanel.classList.toggle('hidden', panel !== 'voice');
    this.elements.speedPanel.classList.toggle('hidden', panel !== 'speed');
    this.elements.settingsPanel.classList.toggle('hidden', panel !== 'settings');

    // When opening settings, populate current URL
    if (panel === 'settings') {
      this.elements.serverUrlInput.value = this.serverUrl;
    }
  }

  async saveServerUrlAndConnect() {
    const newUrl = this.elements.serverUrlInput.value.trim();
    if (!newUrl) {
      alert('Please enter a server URL');
      return;
    }

    this.serverUrl = newUrl;
    await chrome.storage.local.set({ serverUrl: newUrl });

    this.showPanel('player');
    await this.checkConnection();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'serverUrl', 'voice', 'speed', 'isPlaying'
      ]);

      this.serverUrl = result.serverUrl || 'http://localhost:3000';
      this.currentVoice = result.voice || '';
      this.speed = result.speed || 1.0;
      this.isPlaying = result.isPlaying || false;

      this.elements.serverUrl.value = this.serverUrl;
      this.elements.speedSlider.value = this.speed;

      // Update speed option active state
      document.querySelectorAll('.speed-option').forEach(btn => {
        btn.classList.toggle('active',
          Math.abs(parseFloat(btn.dataset.speed) - this.speed) < 0.01);
      });
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
    // Speed
    this.elements.speedValue.textContent = `${this.speed.toFixed(1)}x`;

    // Play/Pause icon
    if (this.isPlaying) {
      this.elements.playIcon.classList.add('hidden');
      this.elements.pauseIcon.classList.remove('hidden');
    } else {
      this.elements.playIcon.classList.remove('hidden');
      this.elements.pauseIcon.classList.add('hidden');
    }

    // Current voice display
    if (this.currentVoice) {
      const parsed = this.parseVoice(this.currentVoice);
      this.elements.currentVoiceAvatar.textContent = parsed.initials;
      this.elements.currentVoiceName.textContent = parsed.name;
    }
  }

  async checkConnection() {
    const badge = this.elements.statusBadge;
    badge.querySelector('.status-text').textContent = 'Connecting...';

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

        badge.classList.add('connected');
        badge.classList.remove('error');
        badge.querySelector('.status-text').textContent = 'Connected';
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      this.isConnected = false;
      badge.classList.add('error');
      badge.classList.remove('connected');
      badge.querySelector('.status-text').textContent = 'Offline';

      this.elements.voiceList.innerHTML = `
        <div class="voice-loading">
          Unable to connect<br>
          <small>Check Settings → Server URL</small>
        </div>
      `;
    }
  }

  populateVoices(defaultVoice) {
    const select = this.elements.voiceSelect;
    select.innerHTML = '';

    this.voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice;
      option.textContent = voice;

      if (voice === (this.currentVoice || defaultVoice)) {
        option.selected = true;
        this.currentVoice = voice;
      }

      select.appendChild(option);
    });

    this.updateUI();
    this.renderVoiceList();
  }

  renderVoiceList() {
    const container = this.elements.voiceList;
    const searchTerm = this.elements.voiceSearch.value.toLowerCase();

    let filtered = this.voices;

    // Language filter
    if (this.selectedLanguageFilter !== 'all') {
      filtered = filtered.filter(v => {
        const langCode = v.split('-')[0];
        return this.mapLanguageCode(langCode) === this.selectedLanguageFilter;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.toLowerCase().includes(searchTerm) ||
        this.parseVoice(v).name.toLowerCase().includes(searchTerm)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="voice-loading">No voices found</div>';
      return;
    }

    container.innerHTML = filtered.map(voice => {
      const parsed = this.parseVoice(voice);
      const isSelected = voice === this.currentVoice;

      return `
        <div class="voice-item ${isSelected ? 'selected' : ''}" data-voice="${voice}">
          <div class="voice-avatar">${parsed.initials}</div>
          <div class="voice-info">
            <div class="voice-name">${parsed.name}</div>
            <div class="voice-desc">${parsed.lang} · ${parsed.style}</div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.voice-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectVoice(item.dataset.voice);
        this.showPanel('player');
      });
    });
  }

  parseVoice(voice) {
    const parts = voice.split('-');
    const langCode = parts[0] || 'en';
    const nameGender = (parts[1] || 'Voice_neutral').split('_');
    const name = nameGender[0] || 'Voice';
    const gender = nameGender[1] || '';

    const styles = ['Expressive', 'Calm', 'Professional', 'Energetic', 'Warm'];
    const style = styles[Math.abs(this.hashString(voice)) % styles.length];

    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      initials: name.substring(0, 2).toUpperCase(),
      lang: this.getLanguageName(langCode),
      gender: gender === 'man' ? 'Male' : gender === 'woman' ? 'Female' : '',
      style: style,
    };
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  mapLanguageCode(code) {
    const map = { 'jp': 'ja', 'kr': 'ko', 'sp': 'es' };
    return map[code] || code;
  }

  getLanguageName(code) {
    const langs = {
      'en': 'US', 'de': 'DE', 'fr': 'FR', 'it': 'IT',
      'jp': 'JP', 'ja': 'JP', 'kr': 'KR', 'ko': 'KR',
      'pt': 'PT', 'sp': 'ES', 'es': 'ES', 'hi': 'IN', 'zh': 'CN'
    };
    return langs[code] || code.toUpperCase();
  }

  selectVoice(voice) {
    this.currentVoice = voice;
    this.saveSettings();
    this.updateUI();

    chrome.runtime.sendMessage({ type: 'SET_VOICE', voice });
  }

  setSpeed(speed) {
    this.speed = speed;
    this.elements.speedValue.textContent = `${speed.toFixed(1)}x`;
    this.elements.speedSlider.value = speed;
    this.saveSettings();

    chrome.runtime.sendMessage({ type: 'SET_SPEED', speed });
  }

  togglePlayPause() {
    if (this.isPlaying) {
      chrome.runtime.sendMessage({ type: 'PAUSE' });
    } else {
      this.readPage();
    }
  }

  async readPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'READ_PAGE' });
    } catch (err) {
      console.error('Failed to read page:', err);
    }
  }

  async readSelection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'READ_SELECTION' });
    } catch (err) {
      console.error('Failed to read selection:', err);
    }
  }

  skip(seconds) {
    chrome.runtime.sendMessage({ type: 'SKIP', seconds });
  }

  openSettings() {
    // Use tabs.create which is more reliable
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'PLAYBACK_STARTED':
        this.isPlaying = true;
        this.updateUI();
        if (msg.text) {
          this.elements.currentText.textContent = msg.text.substring(0, 100) + '...';
          this.elements.nowPlaying.querySelector('.now-playing-label').textContent = 'Now Playing';
        }
        break;
      case 'PLAYBACK_STOPPED':
      case 'PLAYBACK_ENDED':
        this.isPlaying = false;
        this.updateUI();
        this.elements.nowPlaying.querySelector('.now-playing-label').textContent = 'Ready to read';
        break;
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new VibePopup();
});
