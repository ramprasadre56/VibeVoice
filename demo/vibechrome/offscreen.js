// VibeChrome Offscreen Document - Handles Audio Playback
// Service workers cannot use AudioContext, so we use this offscreen document

class OffscreenAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.audioQueue = [];
        this.scheduledTime = 0;
        this.sampleRate = 24000;
        this.isPlaying = false;
        this.speed = 1.0;
        this.ws = null;

        this.init();
    }

    init() {
        console.log('[Offscreen] Audio player initialized');

        // Listen for messages from background
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });
    }

    handleMessage(message, sender, sendResponse) {
        console.log('[Offscreen] Received message:', message.type);

        switch (message.type) {
            case 'OFFSCREEN_SPEAK':
                this.speak(message.text, message.voice, message.serverUrl, message.speed);
                sendResponse({ success: true });
                break;

            case 'OFFSCREEN_PAUSE':
                this.pause();
                sendResponse({ success: true });
                break;

            case 'OFFSCREEN_RESUME':
                this.resume();
                sendResponse({ success: true });
                break;

            case 'OFFSCREEN_STOP':
                this.stop();
                sendResponse({ success: true });
                break;

            case 'OFFSCREEN_SET_SPEED':
                this.speed = message.speed;
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }

    initAudioContext() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
            console.log('[Offscreen] AudioContext created, sample rate:', this.sampleRate);
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.audioQueue = [];
        this.scheduledTime = this.audioContext.currentTime;
    }

    async speak(text, voice, serverUrl, speed) {
        console.log('[Offscreen] Speaking:', text.substring(0, 50) + '...');
        console.log('[Offscreen] Server URL:', serverUrl);
        console.log('[Offscreen] Voice:', voice);

        // Stop any current playback
        this.stop();

        // Update speed
        if (speed) this.speed = speed;

        // Validate
        if (!text || !text.trim()) {
            this.notifyError('No text provided');
            return;
        }

        // Initialize audio context
        this.initAudioContext();

        // Connect via WebSocket
        try {
            await this.connectWebSocket(text, voice, serverUrl);
        } catch (err) {
            console.error('[Offscreen] Connection failed:', err);
            this.notifyError(`Failed to connect: ${err.message}`);
        }
    }

    async connectWebSocket(text, voice, serverUrl) {
        return new Promise((resolve, reject) => {
            // Build WebSocket URL with parameters
            // Convert https:// to wss:// and http:// to ws://
            let wsBaseUrl = serverUrl;
            if (wsBaseUrl.startsWith('https://')) {
                wsBaseUrl = 'wss://' + wsBaseUrl.substring(8);
            } else if (wsBaseUrl.startsWith('http://')) {
                wsBaseUrl = 'ws://' + wsBaseUrl.substring(7);
            }

            const wsUrl = new URL('/stream', wsBaseUrl);
            wsUrl.searchParams.set('text', text);
            if (voice) wsUrl.searchParams.set('voice', voice);
            wsUrl.searchParams.set('cfg', '1.5');
            wsUrl.searchParams.set('steps', '5');

            console.log('[Offscreen] Connecting to:', wsUrl.toString());

            this.ws = new WebSocket(wsUrl.toString());
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                console.log('[Offscreen] WebSocket connected!');
                this.isPlaying = true;
                this.notifyStatus('PLAYBACK_STARTED');
                resolve();
            };

            this.ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    // Binary audio data (PCM16)
                    console.log('[Offscreen] Received audio chunk:', event.data.byteLength, 'bytes');
                    this.handleAudioData(event.data);
                } else {
                    // JSON log message
                    try {
                        const msg = JSON.parse(event.data);
                        console.log('[Offscreen] Server log:', msg.event, msg.data);
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            };

            this.ws.onerror = (error) => {
                console.error('[Offscreen] WebSocket error:', error);
                reject(new Error('WebSocket connection failed. Check if the server is running.'));
            };

            this.ws.onclose = (event) => {
                console.log('[Offscreen] WebSocket closed:', event.code, event.reason);
                this.ws = null;

                // Wait for audio queue to finish, then notify complete
                setTimeout(() => {
                    if (this.audioQueue.length === 0) {
                        this.isPlaying = false;
                        this.notifyStatus('PLAYBACK_ENDED');
                    }
                }, 500);
            };
        });
    }

    handleAudioData(arrayBuffer) {
        if (!this.audioContext) {
            console.warn('[Offscreen] No audio context');
            return;
        }

        // Convert PCM16 to Float32
        const pcm16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(pcm16.length);

        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768.0;
        }

        // Apply speed adjustment by resampling
        const adjustedSamples = this.adjustSpeed(float32, this.speed);

        // Create audio buffer
        const audioBuffer = this.audioContext.createBuffer(1, adjustedSamples.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(adjustedSamples);

        // Schedule playback
        this.schedulePlayback(audioBuffer);
    }

    adjustSpeed(samples, speed) {
        if (speed === 1.0) return samples;

        // Simple linear interpolation for speed adjustment
        const newLength = Math.floor(samples.length / speed);
        const result = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const srcIndex = i * speed;
            const srcIndexFloor = Math.floor(srcIndex);
            const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
            const frac = srcIndex - srcIndexFloor;

            result[i] = samples[srcIndexFloor] * (1 - frac) + samples[srcIndexCeil] * frac;
        }

        return result;
    }

    schedulePlayback(audioBuffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        // Schedule at the end of the queue
        const now = this.audioContext.currentTime;
        if (this.scheduledTime < now) {
            this.scheduledTime = now;
        }

        source.start(this.scheduledTime);
        this.scheduledTime += audioBuffer.duration;

        console.log('[Offscreen] Scheduled audio chunk, duration:', audioBuffer.duration.toFixed(2) + 's');

        // Track for cleanup
        this.audioQueue.push(source);
        source.onended = () => {
            const index = this.audioQueue.indexOf(source);
            if (index > -1) {
                this.audioQueue.splice(index, 1);
            }

            // Check if all audio played
            if (this.audioQueue.length === 0 && !this.ws) {
                this.isPlaying = false;
                this.notifyStatus('PLAYBACK_ENDED');
            }
        };
    }

    pause() {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
            this.isPlaying = false;
            this.notifyStatus('PLAYBACK_PAUSED');
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
            this.isPlaying = true;
            this.notifyStatus('PLAYBACK_RESUMED');
        }
    }

    stop() {
        // Close WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Stop all scheduled audio
        this.audioQueue.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        });
        this.audioQueue = [];

        // Reset state
        this.isPlaying = false;
        this.scheduledTime = 0;

        this.notifyStatus('PLAYBACK_STOPPED');
    }

    // Notify background script of status changes
    notifyStatus(status) {
        console.log('[Offscreen] Status:', status);
        chrome.runtime.sendMessage({ type: status }).catch(() => { });
    }

    notifyError(error) {
        console.error('[Offscreen] Error:', error);
        chrome.runtime.sendMessage({ type: 'PLAYBACK_ERROR', error }).catch(() => { });
    }
}

// Initialize
const player = new OffscreenAudioPlayer();
