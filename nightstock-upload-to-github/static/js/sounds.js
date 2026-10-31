/**
 * NIGHTSTOCK Advanced Web Audio Synthesizer
 * 100% procedural sound effects created purely with Web Audio API.
 * Zero external audio files required!
 */

class SpookySoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = false; // Muted by default to avoid startling judges
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.init();
            this.playSuccess();
        }
        return this.enabled;
    }

    playBatChirp() {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(2800, now);
            osc.frequency.exponentialRampToValueAtTime(1100, now + 0.07);

            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    playCauldronBubble() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [0, 0.05, 0.11, 0.17].forEach((delay) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = now + delay;

                osc.type = 'sine';
                const f = 180 + Math.random() * 260;
                osc.frequency.setValueAtTime(f, t);
                osc.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.08);

                gain.gain.setValueAtTime(0.09, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(t);
                osc.stop(t + 0.08);
            });
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    playThunder() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 1.5;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(260, now);
            filter.frequency.exponentialRampToValueAtTime(60, now + 1.4);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 1.5);
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    playEctoplasmBurst() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = now + i * 0.04;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(t);
                osc.stop(t + 0.35);
            });
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    playAlert() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [220, 233.08, 440].forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.7);
            });
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    playSuccess() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [329.63, 392.00, 493.88, 659.25].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = now + idx * 0.07;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.07, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(t);
                osc.stop(t + 0.35);
            });
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }
}

window.soundEngine = new SpookySoundEngine();
