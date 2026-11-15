// Web Audio API Synthesizer for Gaia Jukebox

class GaiaAudioEngine {
  private ctx: AudioContext | null = null;
  private activeOscillator: OscillatorNode | null = null;
  private activeGain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a soft tactile click when clicking buttons/nodes
  playClick() {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  // Play ambient channel frequency based on selected Jukebox channel
  playChannelTone(channelName: string) {
    try {
      this.init();
      if (!this.ctx) return;

      // Stop previous ambient sound if playing
      this.stopTone();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      let freq = 220; // Default A3
      let type: OscillatorType = 'sine';

      if (channelName === "Planet in Motion") {
        freq = 110; // Low rumble drone (A2)
        type = 'sawtooth';
      } else if (channelName === "Ocean Explorer") {
        freq = 174; // Deep resonant water frequency
        type = 'sine';
      } else if (channelName === "Endangered Species") {
        freq = 329.63; // E4 (Solitary harmonic tone)
        type = 'triangle';
      } else {
        freq = 196; // G3 Overview drone
        type = 'sine';
      }

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Smooth fade-in
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.activeOscillator = osc;
      this.activeGain = gain;
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  stopTone() {
    try {
      if (this.activeGain && this.activeOscillator && this.ctx) {
        this.activeGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        const osc = this.activeOscillator;
        setTimeout(() => {
          try { osc.stop(); } catch(e){}
        }, 300);
        this.activeOscillator = null;
        this.activeGain = null;
      }
    } catch (e) {
      console.error("Audio stop error:", e);
    }
  }
}

export const audio = new GaiaAudioEngine();