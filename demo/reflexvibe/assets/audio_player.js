// VibeVoice Audio Player - WebSocket streaming audio
(function () {
    let audioContext = null;
    let audioQueue = [];
    let isPlaying = false;
    let currentSource = null;
    let webSocket = null;
    let playbackRate = 1.0;
    let lastTriggerTime = 0;

    const SAMPLE_RATE = 24000;

    // Initialize audio context on user interaction
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: SAMPLE_RATE
            });
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return audioContext;
    }

    // Convert PCM16 bytes to Float32 audio samples
    function pcm16ToFloat32(pcmData) {
        const int16 = new Int16Array(pcmData);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }
        return float32;
    }

    // Play audio chunk
    async function playAudioChunk(audioData) {
        const ctx = initAudioContext();
        const float32Data = pcm16ToFloat32(audioData);

        const audioBuffer = ctx.createBuffer(1, float32Data.length, SAMPLE_RATE);
        audioBuffer.getChannelData(0).set(float32Data);

        // Queue the buffer
        audioQueue.push(audioBuffer);

        if (!isPlaying) {
            playNextInQueue();
        }
    }

    // Play next buffer in queue
    function playNextInQueue() {
        if (audioQueue.length === 0) {
            isPlaying = false;
            return;
        }

        isPlaying = true;
        const ctx = initAudioContext();
        const audioBuffer = audioQueue.shift();

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRate;
        source.connect(ctx.destination);

        source.onended = () => {
            playNextInQueue();
        };

        currentSource = source;
        source.start();
    }

    // Start TTS streaming
    window.startVibeVoiceTTS = function (serverUrl, text, voice) {
        console.log('[VibeVoice] Starting TTS:', { serverUrl, voice, textLength: text.length });

        // Initialize audio
        initAudioContext();

        // Stop any existing playback
        stopPlayback();

        // Build WebSocket URL
        let wsUrl = serverUrl.replace('https://', 'wss://').replace('http://', 'ws://');
        const params = new URLSearchParams({
            text: text,
            voice: voice || '',
            cfg: '1.5',
            steps: '5'
        });
        wsUrl = `${wsUrl}/stream?${params.toString()}`;

        console.log('[VibeVoice] Connecting to:', wsUrl);

        try {
            webSocket = new WebSocket(wsUrl);
            webSocket.binaryType = 'arraybuffer';

            webSocket.onopen = () => {
                console.log('[VibeVoice] WebSocket connected');
            };

            webSocket.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    // Binary audio data
                    playAudioChunk(event.data);
                } else {
                    // JSON log message
                    try {
                        const msg = JSON.parse(event.data);
                        console.log('[VibeVoice] Log:', msg.event, msg.data);
                    } catch (e) {
                        console.log('[VibeVoice] Message:', event.data);
                    }
                }
            };

            webSocket.onerror = (error) => {
                console.error('[VibeVoice] WebSocket error:', error);
            };

            webSocket.onclose = (event) => {
                console.log('[VibeVoice] WebSocket closed:', event.code, event.reason);
                webSocket = null;
            };

        } catch (error) {
            console.error('[VibeVoice] Failed to connect:', error);
        }
    };

    // Stop playback
    window.stopVibeVoiceTTS = function () {
        stopPlayback();
    };

    function stopPlayback() {
        // Close WebSocket
        if (webSocket) {
            webSocket.close();
            webSocket = null;
        }

        // Stop current audio
        if (currentSource) {
            try {
                currentSource.stop();
            } catch (e) { }
            currentSource = null;
        }

        // Clear queue
        audioQueue = [];
        isPlaying = false;
    }

    // Set playback speed
    window.setVibeVoiceSpeed = function (speed) {
        playbackRate = speed;
        if (currentSource) {
            currentSource.playbackRate.value = speed;
        }
    };

    // Check if currently streaming
    window.isVibeVoiceStreaming = function () {
        return webSocket !== null && webSocket.readyState === WebSocket.OPEN;
    };

    console.log('[VibeVoice] Audio player loaded');
})();

// Playback state watcher - separate from audio player
(function () {
    let lastPlayState = false;
    let playbackTriggered = false;

    function checkPlayback() {
        // Get state from Reflex - these are rendered in hidden elements
        const isPlayingEl = document.getElementById('is-playing-state');
        const textEl = document.getElementById('audio-text-state');
        const serverEl = document.getElementById('audio-server-state');
        const voiceEl = document.getElementById('audio-voice-state');

        if (!isPlayingEl) return;

        const isPlaying = isPlayingEl.dataset.value === 'true';
        const text = textEl ? textEl.dataset.value : '';
        const server = serverEl ? serverEl.dataset.value : '';
        const voice = voiceEl ? voiceEl.dataset.value : '';

        // Detect state transition: not playing -> playing
        if (isPlaying && !lastPlayState) {
            // Start playback
            if (text && server) {
                console.log('[VibeVoice] Play state changed: Starting playback');
                if (window.startVibeVoiceTTS) {
                    window.startVibeVoiceTTS(server, text, voice);
                }
                playbackTriggered = true;
            }
        }
        // Detect state transition: playing -> not playing  
        else if (!isPlaying && lastPlayState) {
            // Stop playback
            console.log('[VibeVoice] Play state changed: Stopping playback');
            if (window.stopVibeVoiceTTS) {
                window.stopVibeVoiceTTS();
            }
            playbackTriggered = false;
        }

        lastPlayState = isPlaying;
    }

    // Check frequently for state changes
    setInterval(checkPlayback, 100);

    console.log('[VibeVoice] Playback watcher started');
})();
