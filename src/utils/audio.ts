// Web Audio Synthesizer with Pre-cached Buffers for Zero-Lag 60FPS Performance
// and AI Realistic Speech Synthesis (OpenAI TTS / SiliconFlow CosyVoice / Edge Neural Fallback)
import { getActiveGeminiApiKey } from './security';

class BGMManager {
  private ctx: AudioContext | null = null;
  private currentLocId: string | null = null;
  private isMuted: boolean = false;
  private timerId: number | null = null;
  private gainNode: GainNode | null = null;
  private beatStep: number = 0;
  private cachedNoiseBuffer: AudioBuffer | null = null;
  private endingTimerId: number | null = null;
  private endingGainNode: GainNode | null = null;
  private endingStep: number = 0;
  private isEndingPlaying: boolean = false;
  private endingAudioEl: HTMLAudioElement | null = null;
  private titleTimerId: number | null = null;
  private titleGainNode: GainNode | null = null;
  private isTitlePlaying: boolean = false;
  private titleStep: number = 0;

  // Monorail Dynamic Continuous Engine Fields
  private monorailGain: GainNode | null = null;
  private monorailMotorOsc: OscillatorNode | null = null;
  private monorailInverterOsc: OscillatorNode | null = null;
  private monorailTrackGain: GainNode | null = null;
  private monorailTrackFilter: BiquadFilterNode | null = null;
  private monorailNoiseSource: AudioBufferSourceNode | null = null;
  private monorailLongNoiseBuffer: AudioBuffer | null = null;
  private isMonorailSoundActive: boolean = false;
  private monorailLastWarningTime: number = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.cachedNoiseBuffer && this.ctx) {
      const bufferSize = this.ctx.sampleRate * 0.03;
      this.cachedNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.cachedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.endingAudioEl) {
      this.endingAudioEl.muted = muted;
      if (!muted && this.isEndingPlaying && this.endingAudioEl.paused) {
        this.endingAudioEl.play().catch(() => {});
      }
    }
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(muted ? 0 : 0.15, this.ctx.currentTime);
    }
    if (this.endingGainNode && this.ctx) {
      this.endingGainNode.gain.setValueAtTime(muted ? 0 : 0.22, this.ctx.currentTime);
    }
    if (this.titleGainNode && this.ctx) {
      this.titleGainNode.gain.setValueAtTime(muted ? 0 : 0.18, this.ctx.currentTime);
    }
    if (this.monorailGain && this.ctx) {
      this.monorailGain.gain.setValueAtTime(muted ? 0 : 0.12, this.ctx.currentTime);
    }
    if (muted) {
      stopAllSpeech();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playBGMForLocation(locId: string) {
    if (this.isEndingPlaying) return;
    if (this.currentLocId === locId && this.timerId !== null) return;
    this.currentLocId = locId;

    this.stopBGM();
    this.stopTitleTheme();
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      this.beatStep = 0;

      let intervalMs = 250;
      if (locId === 'jiefangbei') intervalMs = 200;
      else if (locId === 'liziba') intervalMs = 160;
      else if (locId === 'hongyadong') intervalMs = 280;
      else if (locId === 'chonggang') intervalMs = 320;

      this.timerId = window.setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        this.playRhythmicStep(locId, this.beatStep);
        this.beatStep = (this.beatStep + 1) % 16;
      }, intervalMs);
    } catch {
      // AudioContext fallback
    }
  }

  private playRhythmicStep(locId: string, step: number) {
    if (!this.ctx || !this.gainNode) return;
    const now = this.ctx.currentTime;

    // Kick Drum
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(locId === 'chonggang' ? 120 : 150, now);
      kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + 0.12);
      kickGain.gain.setValueAtTime(0.3, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      kickOsc.connect(kickGain);
      kickGain.connect(this.gainNode);
      kickOsc.start(now);
      kickOsc.stop(now + 0.12);
    }

    // Cyber Hi-Hat using PRE-CACHED Noise Buffer (Zero GC Overhead!)
    if ((step % 2 === 1 || locId === 'liziba') && this.cachedNoiseBuffer) {
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = this.cachedNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(locId === 'hongyadong' ? 5000 : 7000, now);

      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(step % 4 === 2 ? 0.12 : 0.06, now);
      hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      whiteNoise.connect(filter);
      filter.connect(hatGain);
      hatGain.connect(this.gainNode);
      whiteNoise.start(now);
    }

    // Lead Melody Synth
    let synthFreq = 0;
    if (locId === 'jiefangbei') {
      const scale = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13];
      synthFreq = scale[step % scale.length];
    } else if (locId === 'liziba') {
      const scale = [329.63, 415.30, 493.88, 659.25, 830.61];
      synthFreq = scale[(step * 2) % scale.length];
    } else if (locId === 'hongyadong') {
      const scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00];
      const melodyPattern = [0, 2, 4, 3, 1, 5, 2, 4, 1, 3, 0, 4, 2, 5, 3, 1];
      synthFreq = scale[melodyPattern[step]];
    } else if (locId === 'chonggang') {
      const scale = [43.65, 51.91, 65.41, 77.78];
      synthFreq = scale[step % scale.length];
    }

    if (synthFreq > 0) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = locId === 'hongyadong' ? 'triangle' : locId === 'liziba' ? 'sawtooth' : locId === 'chonggang' ? 'square' : 'sine';
      osc.frequency.setValueAtTime(synthFreq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(locId === 'liziba' ? 1800 : locId === 'hongyadong' ? 1200 : 800, now);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + (locId === 'hongyadong' ? 0.22 : 0.1));

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.gainNode);

      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  public stopBGM() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public isTitleThemeActive(): boolean {
    return this.isTitlePlaying;
  }

  public stopTitleTheme() {
    if (this.titleTimerId !== null) {
      window.clearInterval(this.titleTimerId);
      this.titleTimerId = null;
    }
    if (this.titleGainNode && this.ctx) {
      try {
        this.titleGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
    }
    this.isTitlePlaying = false;
  }

  public setTitleThemeMuted(muted: boolean) {
    if (this.titleGainNode && this.ctx) {
      this.titleGainNode.gain.setValueAtTime(muted ? 0 : 0.18, this.ctx.currentTime);
    }
  }

  public playTitleTheme() {
    if (this.isEndingPlaying) return;
    if (this.isTitlePlaying && this.titleTimerId !== null) return;
    this.stopBGM();
    this.stopEndingTheme();
    this.stopTitleTheme();

    try {
      this.initCtx();
      if (!this.ctx) return;

      this.titleGainNode = this.ctx.createGain();
      this.titleGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.18, this.ctx.currentTime);
      this.titleGainNode.connect(this.ctx.destination);

      this.isTitlePlaying = true;
      this.titleStep = 0;

      // Ethereal futuristic cyberpunk arpeggio (Pentatonic cyber chords in A / C)
      const notes = [
        110.00, 164.81, 220.00, 277.18, 329.63, 440.00, 329.63, 277.18,
        130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 329.63, 261.63,
      ];

      this.titleTimerId = window.setInterval(() => {
        if (!this.ctx || !this.titleGainNode || this.isMuted) return;
        const now = this.ctx.currentTime;
        const noteFreq = notes[this.titleStep % notes.length];

        // Atmospheric lead note
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(noteFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.titleGainNode);
        osc.start(now);
        osc.stop(now + 0.52);

        // Warm sub-bass heartbeat pulse on every 8 steps
        if (this.titleStep % 8 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(55, now);
          bassGain.gain.setValueAtTime(0.12, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          bassOsc.connect(bassGain);
          bassGain.connect(this.titleGainNode);
          bassOsc.start(now);
          bassOsc.stop(now + 1.25);
        }

        this.titleStep = (this.titleStep + 1) % 64;
      }, 240);
    } catch (e) {
      console.warn('Failed to start title theme:', e);
    }
  }

  public isEndingThemeActive(): boolean {
    return this.isEndingPlaying;
  }

  public stopEndingTheme() {
    if (this.endingAudioEl) {
      try {
        this.endingAudioEl.pause();
        this.endingAudioEl.currentTime = 0;
      } catch {}
    }
    if (this.endingTimerId !== null) {
      window.clearInterval(this.endingTimerId);
      this.endingTimerId = null;
    }
    if (this.endingGainNode && this.ctx) {
      try {
        this.endingGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
    }
    this.isEndingPlaying = false;
  }

  public setEndingThemeMuted(muted: boolean) {
    if (this.endingAudioEl) {
      this.endingAudioEl.muted = muted;
      if (!muted && this.endingAudioEl.paused) {
        this.endingAudioEl.play().catch(() => {});
      }
    }
    if (this.endingGainNode && this.ctx) {
      this.endingGainNode.gain.setValueAtTime(muted ? 0 : 0.22, this.ctx.currentTime);
    }
  }

  public setEndingDucking(ducked: boolean) {
    if (this.endingGainNode && this.ctx) {
      const targetGain = this.isMuted ? 0 : (ducked ? 0.07 : 0.22);
      try {
        this.endingGainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);
      } catch {}
    }
  }

  public getEndingAudioElement(): HTMLAudioElement | null {
    return this.endingAudioEl;
  }

  public getEndingCurrentTime(): number {
    return this.endingAudioEl ? this.endingAudioEl.currentTime : 0;
  }

  public getEndingDuration(): number {
    return this.endingAudioEl && !isNaN(this.endingAudioEl.duration) && this.endingAudioEl.duration > 0
      ? this.endingAudioEl.duration
      : 254;
  }

  public seekEndingTheme(timeInSeconds: number) {
    if (this.endingAudioEl) {
      try {
        const safeTime = Math.max(0, Math.min(timeInSeconds, this.getEndingDuration()));
        this.endingAudioEl.currentTime = safeTime;
      } catch {}
    }
  }

  public toggleEndingPlayback(): boolean {
    if (!this.endingAudioEl) return false;
    if (this.endingAudioEl.paused) {
      this.endingAudioEl.play().catch(() => {});
      return true;
    } else {
      this.endingAudioEl.pause();
      return false;
    }
  }

  public isEndingPaused(): boolean {
    return this.endingAudioEl ? this.endingAudioEl.paused : true;
  }

  public playEndingTheme(endingType: 'harmony' | 'overload' | 'hermit' | 'energy_depleted' = 'harmony') {
    this.stopBGM();
    this.stopTitleTheme();
    this.stopEndingTheme();

    if (endingType === 'harmony' && typeof window !== 'undefined') {
      try {
        if (!this.endingAudioEl) {
          this.endingAudioEl = new Audio('/audio/ruyuan_ending_theme.mp3');
        }
        this.endingAudioEl.loop = false;
        this.endingAudioEl.currentTime = 0;
        this.endingAudioEl.muted = this.isMuted;
        this.endingAudioEl.volume = 0.85;
        this.isEndingPlaying = true;

        const playPromise = this.endingAudioEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.isEndingPlaying = true;
            })
            .catch((err) => {
              console.warn('Ending song autoplay paused by browser policy:', err?.message || err);
            });
        }
        return;
      } catch (e) {
        console.warn('Failed to initialize ending audio element:', e);
      }
    }

    if (endingType === 'overload') {
      this.startOverloadSynth();
      return;
    }

    if (endingType === 'hermit') {
      this.startHermitSynth();
      return;
    }

    // DEFEAT / ENERGY DEPLETED: Play low-energy heartbeat recovery synth
    this.startDefeatSynth();
  }

  private startOverloadSynth() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      this.endingGainNode = this.ctx.createGain();
      this.endingGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.22, this.ctx.currentTime);
      this.endingGainNode.connect(this.ctx.destination);

      this.isEndingPlaying = true;
      this.endingStep = 0;

      const cyberScale = [146.83, 220.00, 293.66, 349.23, 440.00, 523.25, 587.33, 880.00];

      this.endingTimerId = window.setInterval(() => {
        if (!this.ctx || !this.endingGainNode || this.isMuted) return;
        const now = this.ctx.currentTime;
        const step = this.endingStep;

        // Kick Drum pulse
        if (step % 4 === 0) {
          const kick = this.ctx.createOscillator();
          const kickG = this.ctx.createGain();
          kick.frequency.setValueAtTime(140, now);
          kick.frequency.exponentialRampToValueAtTime(0.01, now + 0.14);
          kickG.gain.setValueAtTime(0.28, now);
          kickG.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          kick.connect(kickG);
          kickG.connect(this.endingGainNode);
          kick.start(now);
          kick.stop(now + 0.14);
        }

        // Arpeggiated high-octane laser note
        const noteFreq = cyberScale[(step * 3) % cyberScale.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = step % 8 === 0 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(noteFreq, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800 + Math.sin(step) * 800, now);
        filter.Q.setValueAtTime(3, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.endingGainNode);
        osc.start(now);
        osc.stop(now + 0.26);

        this.endingStep = (this.endingStep + 1) % 64;
      }, 160);
    } catch (e) {
      console.warn('Failed to start overload synth:', e);
    }
  }

  private startHermitSynth() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      this.endingGainNode = this.ctx.createGain();
      this.endingGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.2, this.ctx.currentTime);
      this.endingGainNode.connect(this.ctx.destination);

      this.isEndingPlaying = true;
      this.endingStep = 0;

      // Serene pentatonic scales in G major / D minor (Gong, Shang, Jiao, Zhi, Yu)
      const pentatonic = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

      this.endingTimerId = window.setInterval(() => {
        if (!this.ctx || !this.endingGainNode || this.isMuted) return;
        const now = this.ctx.currentTime;
        const step = this.endingStep;

        // Gentle bamboo flute / Guqin lead note
        const freq = pentatonic[(step + Math.floor(step / 5)) % pentatonic.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.endingGainNode);
        osc.start(now);
        osc.stop(now + 0.72);

        // Warm temple bell toll on every 8 steps
        if (step % 8 === 0) {
          const bell = this.ctx.createOscillator();
          const bellG = this.ctx.createGain();
          bell.type = 'triangle';
          bell.frequency.setValueAtTime(130.81, now);
          bellG.gain.setValueAtTime(0.14, now);
          bellG.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
          bell.connect(bellG);
          bellG.connect(this.endingGainNode);
          bell.start(now);
          bell.stop(now + 1.85);
        }

        this.endingStep = (this.endingStep + 1) % 32;
      }, 380);
    } catch (e) {
      console.warn('Failed to start hermit synth:', e);
    }
  }

  private startDefeatSynth() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      this.endingGainNode = this.ctx.createGain();
      this.endingGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.22, this.ctx.currentTime);
      this.endingGainNode.connect(this.ctx.destination);

      this.isEndingPlaying = true;
      this.endingStep = 0;

      const stepMs = 500;
      const totalSteps = 32;

      this.endingTimerId = window.setInterval(() => {
        if (!this.ctx || !this.endingGainNode) return;
        this.playDefeatThemeStep(this.endingStep);
        this.endingStep = (this.endingStep + 1) % totalSteps;
      }, stepMs);
    } catch (e) {
      console.warn('Failed to start defeat synth:', e);
    }
  }



  private playDefeatThemeStep(step: number) {
    if (!this.ctx || !this.endingGainNode) return;
    const now = this.ctx.currentTime;

    const chords = [
      [164.81, 196.00, 246.94, 329.63], // Em (E3, G3, B3, E4)
      [146.83, 174.61, 220.00, 293.66], // Dm (D3, F3, A3, D4)
      [130.81, 164.81, 196.00, 261.63], // C  (C3, E3, G3, C4)
      [123.47, 164.81, 196.00, 246.94], // Bm (B2, E3, G3, B3)
    ];

    const chordIdx = Math.floor(step / 8) % chords.length;
    const stepInChord = step % 8;

    if (stepInChord === 0 || stepInChord === 4) {
      const notes = chords[chordIdx];
      const freq = notes[stepInChord === 0 ? 0 : 2];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(gain);
      gain.connect(this.endingGainNode);
      osc.start(now);
      osc.stop(now + 1.9);
    }
  }

  public playSfx(type: 'success' | 'hit' | 'bip' | 'steam' | 'whoosh') {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (type === 'bip') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'hit') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'success') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const t = now + idx * 0.08;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(t);
          osc.stop(t + 0.25);
        });
      } else if (type === 'steam' && this.cachedNoiseBuffer) {
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = this.cachedNoiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        whiteNoise.start(now);
      } else if (type === 'whoosh') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {}
  }

  // =========================================================================
  // 🚝 穿楼单轨驾驶动态声效引擎 (Monorail Pilot Dynamic Audio Engine)
  // =========================================================================

  private getMonorailNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.monorailLongNoiseBuffer) {
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * 1.5);
      this.monorailLongNoiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = this.monorailLongNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.monorailLongNoiseBuffer;
  }

  public startMonorailSound() {
    if (this.isMonorailSoundActive) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;

      // Master Monorail Audio Bus (Audible and rich)
      this.monorailGain = this.ctx.createGain();
      const initialMasterGain = this.isMuted ? 0 : 0.32;
      this.monorailGain.gain.setValueAtTime(initialMasterGain, now);
      this.monorailGain.connect(this.ctx.destination);

      // 1. Traction Motor Inverter AC Hum (Triangle wave)
      this.monorailMotorOsc = this.ctx.createOscillator();
      this.monorailMotorOsc.type = 'triangle';
      this.monorailMotorOsc.frequency.setValueAtTime(160, now);
      const motorGain = this.ctx.createGain();
      motorGain.gain.setValueAtTime(0.24, now);
      this.monorailMotorOsc.connect(motorGain);
      motorGain.connect(this.monorailGain);
      this.monorailMotorOsc.start(now);

      // 2. High-frequency VVVF Inverter Switching Whine (Sine overtone)
      this.monorailInverterOsc = this.ctx.createOscillator();
      this.monorailInverterOsc.type = 'sine';
      this.monorailInverterOsc.frequency.setValueAtTime(450, now);
      const inverterGain = this.ctx.createGain();
      inverterGain.gain.setValueAtTime(0.18, now);
      this.monorailInverterOsc.connect(inverterGain);
      inverterGain.connect(this.monorailGain);
      this.monorailInverterOsc.start(now);

      // 3. Continuous Wheel/Beam Rolling Rumble (Filtered 1.5s noise loop)
      const noiseBuffer = this.getMonorailNoiseBuffer();
      if (noiseBuffer) {
        this.monorailNoiseSource = this.ctx.createBufferSource();
        this.monorailNoiseSource.buffer = noiseBuffer;
        this.monorailNoiseSource.loop = true;

        this.monorailTrackFilter = this.ctx.createBiquadFilter();
        this.monorailTrackFilter.type = 'bandpass';
        this.monorailTrackFilter.frequency.setValueAtTime(260, now);
        this.monorailTrackFilter.Q.setValueAtTime(1.8, now);

        this.monorailTrackGain = this.ctx.createGain();
        this.monorailTrackGain.gain.setValueAtTime(0.22, now);

        this.monorailNoiseSource.connect(this.monorailTrackFilter);
        this.monorailTrackFilter.connect(this.monorailTrackGain);
        this.monorailTrackGain.connect(this.monorailGain);
        this.monorailNoiseSource.start(now);
      }

      this.isMonorailSoundActive = true;
    } catch (e) {
      console.warn('Failed to start monorail audio engine:', e);
    }
  }

  public updateMonorailSound(params: {
    speed: number;
    throttle: boolean;
    brake: boolean;
    section: string;
    acousticDamping: boolean;
    isWarning: boolean;
  }) {
    if (!this.ctx || this.isMuted) return;
    if (!this.isMonorailSoundActive) {
      this.startMonorailSound();
    }
    try {
      const now = this.ctx.currentTime;
      const { speed, throttle, brake, section, acousticDamping, isWarning } = params;

      // 1. Modulate Motor and Inverter pitch directly with speed (12 - 95 km/h -> 150Hz - 540Hz)
      const speedRatio = Math.max(0.15, Math.min(1.35, speed / 75));
      let targetMotorFreq = 135 + speedRatio * 310;
      let targetInverterFreq = targetMotorFreq * 2.85;

      // Dynamic Throttle / Brake pitch modulation
      if (throttle) {
        targetMotorFreq += 75;
        targetInverterFreq += 180;
      } else if (brake) {
        targetMotorFreq = Math.max(85, targetMotorFreq - 65);
        targetInverterFreq = Math.max(220, targetInverterFreq - 150);
      }

      if (this.monorailMotorOsc) {
        this.monorailMotorOsc.frequency.setTargetAtTime(targetMotorFreq, now, 0.05);
      }
      if (this.monorailInverterOsc) {
        this.monorailInverterOsc.frequency.setTargetAtTime(targetInverterFreq, now, 0.05);
      }

      // 2. Track & Enclosed Space Acoustic Filtering (River bridge vs. Cliff curve vs. 19F Building tunnel)
      if (this.monorailTrackFilter) {
        if (section === 'tunnel') {
          // Hollow cavernous echoing resonance inside Liziba building
          this.monorailTrackFilter.frequency.setTargetAtTime(620, now, 0.06);
          this.monorailTrackFilter.Q.setTargetAtTime(3.8, now, 0.06);
        } else if (section === 'curve') {
          // Wheel flange high-frequency friction on mountain cliff bend
          this.monorailTrackFilter.frequency.setTargetAtTime(460, now, 0.06);
          this.monorailTrackFilter.Q.setTargetAtTime(2.6, now, 0.06);
        } else {
          // Open-air Jialing River crossing
          this.monorailTrackFilter.frequency.setTargetAtTime(260, now, 0.06);
          this.monorailTrackFilter.Q.setTargetAtTime(1.6, now, 0.06);
        }
      }

      // 3. Dynamic Master Output Volume with Throttle Boost & Acoustic Damping
      if (this.monorailGain) {
        let masterGain = 0.20 + speedRatio * 0.25; // 0.23 ~ 0.53
        if (throttle) {
          masterGain *= 1.45; // Power surge roar on throttle!
        } else if (brake) {
          masterGain *= 0.85;
        }
        if (acousticDamping) {
          masterGain *= 0.42; // -58% acoustic shielding dampening
        }
        this.monorailGain.gain.setTargetAtTime(masterGain, now, 0.05);
      }

      // 4. Centrifugal Over-speed Cockpit Warning Chimes
      if (isWarning) {
        const currentTimeMs = Date.now();
        if (currentTimeMs - this.monorailLastWarningTime > 260) {
          this.monorailLastWarningTime = currentTimeMs;
          this.playMonorailCurveWarning();
        }
      }
    } catch {}
  }

  public stopMonorailSound() {
    if (!this.isMonorailSoundActive) return;
    try {
      if (this.monorailMotorOsc) {
        this.monorailMotorOsc.stop();
        this.monorailMotorOsc.disconnect();
        this.monorailMotorOsc = null;
      }
      if (this.monorailInverterOsc) {
        this.monorailInverterOsc.stop();
        this.monorailInverterOsc.disconnect();
        this.monorailInverterOsc = null;
      }
      if (this.monorailNoiseSource) {
        try {
          this.monorailNoiseSource.stop();
        } catch {}
        this.monorailNoiseSource.disconnect();
        this.monorailNoiseSource = null;
      }
      if (this.monorailTrackFilter) {
        this.monorailTrackFilter.disconnect();
        this.monorailTrackFilter = null;
      }
      if (this.monorailTrackGain) {
        this.monorailTrackGain.disconnect();
        this.monorailTrackGain = null;
      }
      if (this.monorailGain) {
        this.monorailGain.disconnect();
        this.monorailGain = null;
      }
    } catch {}
    this.isMonorailSoundActive = false;
  }

  // Monorail Compressed Air Brake Hiss (Realistic 0.55s pneumatic discharge)
  public playMonorailBrakeHiss() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const noiseBuffer = this.getMonorailNoiseBuffer();
      if (!noiseBuffer) return;

      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(750, now + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.55);
    } catch {}
  }

  // Monorail Acoustic Forcefield Shield Toggle
  public playMonorailShieldToggle(active: boolean) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      if (active) {
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(1450, now + 0.24);
      } else {
        osc.frequency.setValueAtTime(1350, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.24);
      }
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  // Monorail Curve Over-speed Emergency Klaxon
  public playMonorailCurveWarning() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      [880, 660].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.08;
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.075);
      });
    } catch {}
  }

  // Monorail Liziba Building Tunnel Penetration Wind Rush
  public playMonorailTunnelWhoosh() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.linearRampToValueAtTime(190, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.7);
      gain.gain.setValueAtTime(0.36, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.71);

      const noiseBuffer = this.getMonorailNoiseBuffer();
      if (noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(350, now);
        filter.frequency.linearRampToValueAtTime(800, now + 0.22);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.65);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.32, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.7);
      }
    } catch {}
  }

  // Monorail CRT Station Arrival Melodic Chime (E5 -> G5 -> C6 -> E6)
  public playMonorailDockingChime() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const chimeNotes = [659.25, 783.99, 1046.50, 1318.51];
      chimeNotes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.17;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.68);
      });
    } catch {}
  }

  // =========================================================================
  // ⚙️ 量子高炉 · 重工钢铁锻造音效引擎 (Chonggang Steel Forging Audio Engine)
  // =========================================================================

  // Authentic Heavy Pneumatic Hammer Anvil Strike
  public playAnvilStrike(isPerfect: boolean = true) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (isPerfect) {
        // 1. Heavy low-frequency punch (1000kg pneumatic hammer body)
        const punchOsc = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punchOsc.type = 'sine';
        punchOsc.frequency.setValueAtTime(85, now);
        punchOsc.frequency.exponentialRampToValueAtTime(32, now + 0.2);
        punchGain.gain.setValueAtTime(0.45, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        punchOsc.connect(punchGain);
        punchGain.connect(this.ctx.destination);
        punchOsc.start(now);
        punchOsc.stop(now + 0.22);

        // 2. Anvil metallic ring harmonics: inharmonic metal bell modes
        // Typical blacksmith anvil resonance frequencies: 840Hz, 1380Hz, 2420Hz, 3850Hz
        const harmonics = [
          { freq: 840, gain: 0.34, decay: 1.15 },
          { freq: 1380, gain: 0.25, decay: 0.90 },
          { freq: 2420, gain: 0.17, decay: 0.60 },
          { freq: 3850, gain: 0.12, decay: 0.38 },
        ];
        harmonics.forEach(({ freq, gain, decay }) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          g.gain.setValueAtTime(gain, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
          osc.connect(g);
          g.connect(this.ctx!.destination);
          osc.start(now);
          osc.stop(now + decay);
        });

        // 3. Hot metal sparks crackle burst
        if (this.cachedNoiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.cachedNoiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(3600, now);
          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.24, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.ctx.destination);
          noise.start(now);
        }
      } else {
        // Dull mistimed / out-of-temperature clunk
        const thudOsc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thudOsc.type = 'triangle';
        thudOsc.frequency.setValueAtTime(170, now);
        thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
        thudGain.gain.setValueAtTime(0.35, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        thudOsc.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thudOsc.start(now);
        thudOsc.stop(now + 0.22);
      }
    } catch {}
  }

  // Furnace Bellows Oxygen Blast and Flame Roar
  public playFurnaceBellows() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Oxygen flame roar
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const flameGain = this.ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(75, now);
      osc2.frequency.setValueAtTime(115, now);
      osc1.frequency.linearRampToValueAtTime(140, now + 0.25);
      osc2.frequency.linearRampToValueAtTime(190, now + 0.25);
      flameGain.gain.setValueAtTime(0.05, now);
      flameGain.gain.linearRampToValueAtTime(0.28, now + 0.18);
      flameGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.connect(flameGain);
      osc2.connect(flameGain);
      flameGain.connect(this.ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.58);
      osc2.stop(now + 0.58);

      // 2. High-volume wind burst
      if (this.cachedNoiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.cachedNoiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(420, now);
        filter.frequency.exponentialRampToValueAtTime(1100, now + 0.2);
        filter.frequency.exponentialRampToValueAtTime(280, now + 0.5);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
      }
    } catch {}
  }

  // Flux Chemical Solvent Sizzle onto Molten Steel
  public playFluxSizzle() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.cachedNoiseBuffer) return;
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.cachedNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400, now);
      filter.Q.setValueAtTime(3.5, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    } catch {}
  }

  // Target Sweet-spot Rhythm Lock-in Ping (A6 - 1760Hz)
  public playRhythmLockPing() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }
}

export const bgmManager = new BGMManager();

// =========================================================================
// AI Realistic TTS (Text-to-Speech) System
// Supports:
// 1. Natural Neural Speech (Browser Edge/Chrome Neural Voices, fixed natural formant pitch)
// 2. SiliconFlow CosyVoice2 / FishSpeech (Ultra-realistic Chinese human voice models)
// 3. OpenAI TTS-1 / TTS-1-HD (Studio grade)
// 4. Custom OpenAI-compatible TTS endpoints
// =========================================================================

export interface TTSConfig {
  ttsProvider?: 'natural_neural' | 'openai' | 'siliconflow' | 'custom';
  ttsApiKey?: string;
  ttsBaseUrl?: string;
  ttsModel?: string;
}

export interface VoiceProfile {
  name: string;
  roleTitle: string;
  toneDesc: string;
  sampleLine: string;
  gender: 'male' | 'female';
  geminiVoice: string; // Google Gemini Live / TTS Prebuilt Voice (Puck, Charon, Kore, Aoede, Fenrir)
  openaiVoice: string;
  siliconflowVoice: string;
  webSpeech: {
    preferredVoices: string[];
    pitch: number;
    rate: number;
  };
}

export const NPC_VOICE_PROFILES: Record<string, VoiceProfile> = {
  bangbang_88: {
    name: '棒棒 88 号',
    roleTitle: '前哨站引路人',
    toneDesc: '沧桑沉稳 · 温暖叙事长者男声',
    sampleLine: '崽儿！老夫在山城挑了三十年扁担，这双手脚挑出的不是货物，是硬骨头！',
    gender: 'male',
    geminiVoice: 'Charon', // Gemini Authentic Deep Male Voice
    openaiVoice: 'echo',
    siliconflowVoice: 'FunAudioLLM/CosyVoice2-0.5B:alex',
    webSpeech: {
      preferredVoices: ['Kangkang', 'Yunjian', 'Yunxi', 'Yunyang', 'Yunze', 'Danny', 'Male'],
      pitch: 0.95,
      rate: 1.02,
    },
  },
  gaiwan_jie: {
    name: '盖碗姐',
    roleTitle: '茶肆情报掌柜',
    toneDesc: '清脆灵动 · 热忱泼辣巴渝女声',
    sampleLine: '客官，一碗盖碗茶，三五知己摆龙门阵，讲的是平等待人、重义轻利！',
    gender: 'female',
    geminiVoice: 'Kore', // Gemini Authentic Warm Expressive Female Voice
    openaiVoice: 'shimmer',
    siliconflowVoice: 'FunAudioLLM/CosyVoice2-0.5B:anna',
    webSpeech: {
      preferredVoices: ['Huihui', 'Xiaoxiao', 'Xiaoyi', 'Yaoyao', 'Female'],
      pitch: 1.05,
      rate: 1.06,
    },
  },
  zero_machine: {
    name: 'AI 零号机',
    roleTitle: '大河调度主脑',
    toneDesc: '澄澈理智 · 灵动未来智脑女声',
    sampleLine: '单轨穿楼穿行于山水之间，人类在狂澜中同舟共济的协作意志令人动容。',
    gender: 'female',
    geminiVoice: 'Aoede', // Gemini Authentic Futuristic Cyber Female Voice
    openaiVoice: 'nova',
    siliconflowVoice: 'FunAudioLLM/CosyVoice2-0.5B:bella',
    webSpeech: {
      preferredVoices: ['Yaoyao', 'Xiaoxiao', 'Xiaoyi', 'Huihui', 'Female'],
      pitch: 1.08,
      rate: 1.10,
    },
  },
  steel_soul: {
    name: '钢铁之魂',
    roleTitle: '工业变革守望者',
    toneDesc: '雄浑庄严 · 工业史诗威严男声',
    sampleLine: '高炉冷却了百年，但抗战西迁的钢铁血脉在量子深渊中从未熄灭！',
    gender: 'male',
    geminiVoice: 'Fenrir', // Gemini Authentic Deep Resonant Male Voice
    openaiVoice: 'onyx',
    siliconflowVoice: 'FunAudioLLM/CosyVoice2-0.5B:charles',
    webSpeech: {
      preferredVoices: ['Kangkang', 'Yunjian', 'Yunze', 'Yunxi', 'Male'],
      pitch: 0.78,
      rate: 0.95,
    },
  },
};

let currentAudioElement: HTMLAudioElement | null = null;
let currentAudioPlayPromise: Promise<void> | null = null;
const MAX_TTS_CACHE_SIZE = 30;
const ttsAudioCache = new Map<string, string>();

function setCachedAudioUrl(key: string, url: string) {
  if (ttsAudioCache.has(key)) {
    const oldUrl = ttsAudioCache.get(key);
    if (oldUrl && oldUrl !== url && oldUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(oldUrl); } catch {}
    }
    ttsAudioCache.delete(key);
  } else if (ttsAudioCache.size >= MAX_TTS_CACHE_SIZE) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (oldestKey) {
      const oldUrl = ttsAudioCache.get(oldestKey);
      if (oldUrl && oldUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(oldUrl); } catch {}
      }
      ttsAudioCache.delete(oldestKey);
    }
  }
  ttsAudioCache.set(key, url);
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export type SpeechListener = (isSpeaking: boolean, npcId: string) => void;
const speechListeners = new Set<SpeechListener>();
let globalSpeakingNpcId = '';
let globalIsSpeaking = false;

export function subscribeSpeechState(listener: SpeechListener): () => void {
  speechListeners.add(listener);
  listener(globalIsSpeaking, globalSpeakingNpcId);
  return () => {
    speechListeners.delete(listener);
  };
}

export function setSpeechState(isSpeaking: boolean, npcId: string = '') {
  globalIsSpeaking = isSpeaking;
  globalSpeakingNpcId = isSpeaking ? npcId : '';
  speechListeners.forEach((l) => {
    try {
      l(globalIsSpeaking, globalSpeakingNpcId);
    } catch {}
  });
}

let activeSpeechRequestId = 0;
let activeTtsAbortController: AbortController | null = null;
let activeLiveWebSocket: WebSocket | null = null;
let streamingAudioCtx: AudioContext | null = null;
const activeSourceNodes: AudioBufferSourceNode[] = [];
let streamingScheduledTime = 0;

function getStreamingAudioContext(): AudioContext {
  if (!streamingAudioCtx || streamingAudioCtx.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    streamingAudioCtx = new AudioCtxClass();
  }
  if (streamingAudioCtx.state === 'suspended') {
    streamingAudioCtx.resume().catch(() => {});
  }
  return streamingAudioCtx;
}

export function stopAllSpeech() {
  activeSpeechRequestId++;
  setSpeechState(false, '');
  if (activeLiveWebSocket) {
    try {
      activeLiveWebSocket.close();
    } catch {}
    activeLiveWebSocket = null;
  }
  for (const src of activeSourceNodes) {
    try {
      src.stop();
      src.disconnect();
    } catch {}
  }
  activeSourceNodes.length = 0;
  if (streamingAudioCtx && streamingAudioCtx.state === 'running') {
    streamingScheduledTime = streamingAudioCtx.currentTime;
  } else {
    streamingScheduledTime = 0;
  }
  if (activeTtsAbortController) {
    try {
      activeTtsAbortController.abort();
    } catch {}
    activeTtsAbortController = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }
  if (currentAudioElement) {
    const el = currentAudioElement;
    currentAudioElement = null;
    if (currentAudioPlayPromise) {
      currentAudioPlayPromise
        .then(() => {
          el.pause();
          el.currentTime = 0;
        })
        .catch(() => {});
      currentAudioPlayPromise = null;
    } else {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    }
  }
}

export function cleanDialogueText(text: string): string {
  let cleanText = text;

  // 针对 NPC 开场白带有冒号的情况（如 "⚠️ 【索要前置道具】：客官，听说..." 或 "【角色名】：你好"）：
  // 只念 “：” 或 ":" 后面的实际台词内容
  const colonIndex = cleanText.indexOf('：') !== -1 ? cleanText.indexOf('：') : cleanText.indexOf(':');
  if (colonIndex !== -1) {
    const bracketEndIndex = cleanText.indexOf('】');
    if (bracketEndIndex !== -1 && bracketEndIndex > colonIndex) {
      // 冒号在括号内部（例如：【警告：逻辑死锁】人类生理机能极其脆弱...）
      const secondColon = cleanText.indexOf('：', bracketEndIndex) !== -1
        ? cleanText.indexOf('：', bracketEndIndex)
        : cleanText.indexOf(':', bracketEndIndex);
      if (secondColon !== -1) {
        cleanText = cleanText.slice(secondColon + 1);
      } else {
        cleanText = cleanText.slice(bracketEndIndex + 1);
      }
    } else {
      // 冒号在括号外部或无括号（例如：⚠️ 【索要前置道具】：客官，听说...）
      const afterColon = cleanText.slice(colonIndex + 1).trim();
      if (afterColon) {
        cleanText = afterColon;
      }
    }
  } else {
    // 若开场白以无冒号的标签开头（例如：【溯源者接入】崽儿！...）
    cleanText = cleanText.replace(/^[⚠️🔔💬📢🎙️💡]?\s*【[^】]+】\s*/, '');
  }

  // 去除可能追加的离线应答提醒与系统状态后缀，避免朗读提示文本
  cleanText = cleanText.replace(/💡【本地离线应答提醒】[\s\S]*$/, '');
  cleanText = cleanText.replace(/【💬 自主交流共鸣】[\s\S]*$/, '');
  cleanText = cleanText.replace(/【🛡️ 迷失解除共鸣】[\s\S]*$/, '');

  // 彻底去除好感度数值变动与提示（如 【好感度 +10】、好感度 +10！、好感度加十！、好感度已达100 等），严禁跨括号贪婪匹配
  cleanText = cleanText.replace(/[【\[（(][^【\[（()）\]】]*?好感度[^【\[（()）\]】]*?[】\]）)][！!。]?/g, '');
  cleanText = cleanText.replace(/好感度\s*([+加增加提升减少降低扣除-]*\s*[\d一二三四五六七八九十百]+|[已达到达超过满]+\s*[\d一二三四五六七八九十百]+)[！!。]?/g, '');
  cleanText = cleanText.replace(/好感度\s*[+-]?\s*\d+[！!。]?/g, '');
  // 去除 markdown 标记、括号与前缀
  cleanText = cleanText.replace(/[*_#`[\]()【】]/g, '');
  // 去除头部可能残留的 emoji 符号
  cleanText = cleanText.replace(/^[⚠️🔔💬📢🎙️💡]\s*/, '');

  return cleanText.trim();
}

function playAudioUrl(url: string, npcId: string = '', fallbackText?: string) {
  if (currentAudioElement && !currentAudioElement.paused && currentAudioElement.src.includes(url)) {
    return;
  }
  stopAllSpeech();
  const audio = new Audio(url);
  currentAudioElement = audio;
  audio.onplay = () => {
    setSpeechState(true, npcId);
  };
  audio.onended = () => {
    setSpeechState(false, '');
    if (currentAudioElement === audio) {
      currentAudioElement = null;
      currentAudioPlayPromise = null;
    }
  };
  audio.onerror = (e) => {
    console.warn(`[Audio Playback] 本地预录音频加载失败或未落盘 (${url}):`, e);
    setSpeechState(false, '');
    if (currentAudioElement === audio) {
      currentAudioElement = null;
      currentAudioPlayPromise = null;
    }
    // 关键自愈容灾：若本地预录音频 404 或损坏，立即无缝降级至拟真神经语音引擎，100% 保证有声！
    if (fallbackText) {
      console.info(`[Audio Fallback] 已自动启用神经语音保底播报: "${fallbackText.slice(0, 25)}..."`);
      speakWithLocalNeuralVoice(npcId, fallbackText);
    }
  };
  currentAudioPlayPromise = audio.play();
  currentAudioPlayPromise.catch((err) => {
    if (err.name !== 'AbortError') {
      console.warn('[Audio Playback] 自动播放受阻或失败:', err);
      if (fallbackText) {
        speakWithLocalNeuralVoice(npcId, fallbackText);
      }
    }
    setSpeechState(false, '');
  });
}

const MALE_VOICE_TAGS = ['kangkang', 'yunxi', 'yunjian', 'yunyang', 'yunze', 'yunjie', 'yunhao', 'yunbiao', 'danny', 'male', 'yu-shu', 'bo-lin', 'cxc', 'sfg'];
const FEMALE_VOICE_TAGS = ['huihui', 'yaoyao', 'xiaoxiao', 'xiaoyi', 'xiaoxuan', 'xiaomeng', 'xiaomo', 'xiaohan', 'xiaorui', 'hanhan', 'ting-ting', 'sin-ji', 'mei-jia', 'female'];

export function speakWithLocalNeuralVoice(npcId: string, cleanText: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Chrome bug prevention: ensure speech synthesis queue is responsive
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'zh-CN';

  const voices = window.speechSynthesis.getVoices();
  const zhVoices = voices.filter((v) => v.lang.includes('zh') || v.name.includes('Chinese'));

  // 88号棒棒 & 钢铁之魂 are male; all others (zero_machine, gaiwan_jie, or generic) are strictly female
  const profile = NPC_VOICE_PROFILES[npcId] || {
    name: 'NPC',
    roleTitle: '智能实体',
    toneDesc: '灵动女声',
    sampleLine: cleanText,
    gender: 'female' as const,
    geminiVoice: 'Aoede',
    openaiVoice: 'nova',
    siliconflowVoice: 'FunAudioLLM/CosyVoice2-0.5B:bella',
    webSpeech: {
      preferredVoices: ['Yaoyao', 'Huihui', 'Xiaoxiao', 'Female'],
      pitch: 1.08,
      rate: 1.08,
    },
  };

  const targetGender = profile.gender || (npcId === 'bangbang_88' || npcId === 'steel_soul' ? 'male' : 'female');

  // 1. First priority: match from preferredVoices list
  let chosenVoice: SpeechSynthesisVoice | undefined;
  for (const preferred of profile.webSpeech.preferredVoices) {
    chosenVoice = zhVoices.find((v) => v.name.toLowerCase().includes(preferred.toLowerCase()));
    if (chosenVoice) break;
  }

  // 2. Strict gender enforcement: if preferred voice not available on this OS, pick any voice matching target gender
  if (!chosenVoice) {
    const genderTags = targetGender === 'male' ? MALE_VOICE_TAGS : FEMALE_VOICE_TAGS;
    chosenVoice = zhVoices.find((v) => genderTags.some((tag) => v.name.toLowerCase().includes(tag)));
  }

  // 3. Fallback: if browser only provides a single generic voice, adapt pitch to guarantee male vs female distinction
  let pitch = profile.webSpeech.pitch;
  if (!chosenVoice && zhVoices.length > 0) {
    chosenVoice = zhVoices[0];
    const isVoiceMale = MALE_VOICE_TAGS.some((tag) => chosenVoice!.name.toLowerCase().includes(tag));
    if (targetGender === 'male' && !isVoiceMale) {
      pitch = Math.min(pitch, 0.74); // Pitch down female voice to produce distinctly masculine timbre
    } else if (targetGender === 'female' && isVoiceMale) {
      pitch = Math.max(pitch, 1.25); // Pitch up male voice to produce distinctly feminine timbre
    }
  }

  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }

  utterance.pitch = pitch;
  utterance.rate = profile.webSpeech.rate;

  utterance.onstart = () => {
    setSpeechState(true, npcId);
  };
  utterance.onend = () => {
    setSpeechState(false, '');
  };
  utterance.onerror = () => {
    setSpeechState(false, '');
  };

  window.speechSynthesis.speak(utterance);
}

export function cleanPoemLineForSpeech(text: string): string {
  return text
    .replace(/【[^】]+】/g, '') // remove 【高炉长鸣】 or 【古琴悠悠】
    .replace(/1500°C/g, '一千五百度')
    .replace(/1000%/g, '百分之一千')
    .replace(/[·•]/g, '，')
    .replace(/\s+/g, '，')
    .replace(/，+/g, '，')
    .replace(/^，|，$/g, '')
    .trim();
}

export function reciteEndingPoemLine(
  text: string,
  endingType: 'overload' | 'hermit' | 'energy_depleted' | 'harmony',
  onEnd?: () => void,
  isMuted: boolean = false
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted) {
    onEnd?.();
    return () => {};
  }

  const cleanText = cleanPoemLineForSpeech(text);
  if (!cleanText) {
    onEnd?.();
    return () => {};
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
  } catch {}

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'zh-CN';

  const voices = window.speechSynthesis.getVoices();
  const zhVoices = voices.filter((v) => v.lang.includes('zh') || v.name.includes('Chinese'));

  if (endingType === 'overload' || endingType === 'harmony') {
    // 雄浑刚毅、威严千钧、金石之音 (钢铁之魂 / 领航者风格)
    const maleVoice = zhVoices.find((v) =>
      ['kangkang', 'yunxi', 'yunjian', 'yunyang', 'danny', 'male'].some((tag) =>
        v.name.toLowerCase().includes(tag)
      )
    );
    if (maleVoice) {
      utterance.voice = maleVoice;
    } else if (zhVoices.length > 0) {
      utterance.voice = zhVoices[0];
    }
    utterance.pitch = 0.82;
    utterance.rate = 0.88;
  } else if (endingType === 'hermit') {
    // 洒脱悠然、市井温润、诗情画意 (盖碗姐 / 市井大侠风格)
    const femaleVoice = zhVoices.find((v) =>
      ['yaoyao', 'huihui', 'xiaoxiao', 'female'].some((tag) =>
        v.name.toLowerCase().includes(tag)
      )
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (zhVoices.length > 0) {
      utterance.voice = zhVoices[0];
    }
    utterance.pitch = 1.05;
    utterance.rate = 0.92;
  } else {
    // 能量耗尽：老挑夫质朴敦厚 (棒棒 88 号风格)
    const elderVoice = zhVoices.find((v) =>
      ['kangkang', 'yunze', 'male'].some((tag) => v.name.toLowerCase().includes(tag))
    );
    if (elderVoice) {
      utterance.voice = elderVoice;
    } else if (zhVoices.length > 0) {
      utterance.voice = zhVoices[0];
    }
    utterance.pitch = 0.92;
    utterance.rate = 0.95;
  }

  let finished = false;
  const finishOnce = () => {
    if (!finished) {
      finished = true;
      onEnd?.();
    }
  };

  utterance.onend = finishOnce;
  utterance.onerror = finishOnce;

  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    finishOnce();
  }

  return () => {
    finished = true;
    try {
      window.speechSynthesis.cancel();
    } catch {}
  };
}

export function stopEndingPoemRecitation() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

function pcmChunksToWavBlobUrl(base64Chunks: string[], sampleRate = 24000): string {
  try {
    let totalBytes = 0;
    const uint8Arrays = base64Chunks.map((b64) => {
      const binaryString = atob(b64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      totalBytes += len;
      return bytes;
    });

    const mergedBytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const arr of uint8Arrays) {
      mergedBytes.set(arr, offset);
      offset += arr.length;
    }

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // "RIFF"
    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + mergedBytes.length, true);
    // "WAVE"
    view.setUint32(8, 0x57415645, false);
    // "fmt "
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Linear PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16-bit
    // "data"
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, mergedBytes.length, true);

    const blob = new Blob([wavHeader, mergedBytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('[Audio] pcmChunksToWavBlobUrl error:', e);
    return '';
  }
}

function decodePcm16ToFloat32(base64Data: string): Float32Array {
  try {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const samples = Math.floor(len / 2);
    const float32 = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const low = binaryString.charCodeAt(i * 2);
      const high = binaryString.charCodeAt(i * 2 + 1);
      let int16 = (high << 8) | low;
      if (int16 >= 0x8000) int16 -= 0x10000;
      float32[i] = int16 / 32768.0;
    }
    return float32;
  } catch (err) {
    console.warn('[Audio] decodePcm16ToFloat32 error:', err);
    return new Float32Array(0);
  }
}

const NPC_PERSONA_PROMPTS: Record<string, string> = {
  bangbang_88: '你扮演解放碑的赛博重工仿生挑夫棒棒88号，深知自身是承载老一辈挑夫灵魂的仿生机械躯体。说话带着地道沧桑、豪爽干练的川渝重庆方言口音，语气充满江湖义气和长者关切。绝对只直接朗读台词本身，严禁添加任何额外前缀、说明或标号。',
  gaiwan_jie: '你扮演洪崖洞茶馆掌柜盖碗姐，说话热情泼辣、灵动风趣，带着地道重庆方言口吻。绝对只直接朗读台词本身，严禁添加任何额外前缀、说明或标号。',
  zero_machine: '你扮演李子坝轻轨站未来AI调度主脑AI零号机，声音是澄澈清透、灵动理智的年轻女声，带着赛博未来科幻质感与理智共情。绝对只直接朗读台词本身，严禁添加任何额外前缀、说明或标号。',
  steel_soul: '你扮演大渡口重钢工业遗址守护者钢铁之魂，历经抗战烽火西迁与百年炉火的硬汉工匠化身、工业变革的终极史诗试炼官。你的声音必须是极其深沉低浑、雄浑威严、宛如洪钟巨鼓与地下钢铁高炉轰鸣的金石之音！语调务必沉稳凝练、铿锵有力、字字千钧，带着不怒自威的庄严压迫感与震撼人心的钢铁回响。绝对只直接朗读台词本身，严禁添加任何多余字词、说明或标号。',
};

export interface LiveSpeechResult {
  wavUrl?: string;
  totalDuration: number;
  completedNormally: boolean;
  scheduledEndTime: number;
}

export function splitIntoClauses(text: string): string[] {
  const regex = /[^，。！？；\n]+[，。！？；\n]?/g;
  const matches = text.match(regex);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [text];
}

export function getRemainingText(cleanText: string, playedDurationSec: number): string {
  const clauses = splitIntoClauses(cleanText);
  let accumulatedTime = 0;
  const remainingClauses: string[] = [];

  for (const clause of clauses) {
    const clauseDuration = Math.max(0.6, clause.length * 0.22);
    // 若当前已播时长已覆盖此子句的 75% 以上，视为已念完
    if (accumulatedTime + clauseDuration * 0.75 <= playedDurationSec) {
      accumulatedTime += clauseDuration;
    } else {
      remainingClauses.push(clause);
    }
  }
  return remainingClauses.join('');
}

async function speakWithGeminiLiveWebSocket(
  cleanText: string,
  geminiVoice: string,
  currentReqId: number,
  npcId: string = ''
): Promise<LiveSpeechResult> {
  const geminiApiKey = getActiveGeminiApiKey();
  if (!geminiApiKey) throw new Error('未配置 Gemini API Key');

  return new Promise((resolve, reject) => {
    let isSettled = false;
    let totalAudioDuration = 0;
    let completedNormally = false;

    const safeResolve = (val: LiveSpeechResult) => {
      if (isSettled) return;
      isSettled = true;
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      resolve(val);
    };
    const safeReject = (err: any) => {
      if (isSettled) return;
      isSettled = true;
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      reject(err);
    };

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;
    const ws = new WebSocket(url);
    activeLiveWebSocket = ws;

    const ctx = getStreamingAudioContext();
    streamingScheduledTime = ctx.currentTime + 0.05;

    let receivedFirstChunk = false;
    const allBase64Chunks: string[] = [];

    // 首包响应等待计时器（8秒内若无握手/首包则判定超时降级）
    let inactivityTimer: number | null = window.setTimeout(() => {
      ws.close();
      if (!receivedFirstChunk) {
        safeReject(new Error('Gemini Live 首包响应超时 (8s)'));
      }
    }, 8000);

    const resetInactivityTimer = () => {
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      // 只要持续有流式音频分块进来，重置计时器为 8 秒流式超时
      inactivityTimer = window.setTimeout(() => {
        ws.close();
        if (receivedFirstChunk && allBase64Chunks.length > 0) {
          const wavUrl = pcmChunksToWavBlobUrl(allBase64Chunks, 24000);
          safeResolve({
            wavUrl,
            totalDuration: totalAudioDuration,
            completedNormally,
            scheduledEndTime: streamingScheduledTime,
          });
        } else {
          safeReject(new Error('Gemini Live 数据流中断'));
        }
      }, 8000);
    };

    ws.onopen = () => {
      console.log(`[Gemini Live] 🟢 已接入 Gemini 3.1 Live 实时流引擎 (模型: gemini-3.1-flash-live-preview / 音色: ${geminiVoice})...`);
      const personaPrompt = NPC_PERSONA_PROMPTS[npcId] || '你是一名专业的台词朗读者。请使用生动地道的情感直接朗读给定的台词，绝对不要输出任何非台词内容。';
      const setupMsg = {
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
          systemInstruction: {
            parts: [{ text: personaPrompt }],
          },
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: geminiVoice,
                },
              },
            },
          },
        },
      };
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = async (event: MessageEvent) => {
      if (currentReqId !== activeSpeechRequestId) {
        ws.close();
        safeReject(new Error('请求已被后续语音打断'));
        return;
      }

      let text = '';
      if (typeof event.data === 'string') {
        text = event.data;
      } else if (event.data instanceof Blob) {
        text = await event.data.text();
      } else if (event.data instanceof ArrayBuffer) {
        text = new TextDecoder().decode(event.data);
      }

      try {
        const msg = JSON.parse(text);
        if (msg.setupComplete) {
          console.log('[Gemini Live] 握手就绪，向实时模型发送台词流...');
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: `朗读台词（直接念出台词内容，切勿添加任何提示词或多余解释）：${cleanText}` }],
                  },
                ],
                turnComplete: true,
              },
            })
          );
        } else if (msg.serverContent) {
          resetInactivityTimer();
          const parts = msg.serverContent.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              const b64 = part.inlineData.data;
              allBase64Chunks.push(b64);

              // 毫秒级解码与排队播放
              const float32 = decodePcm16ToFloat32(b64);
              if (float32.length > 0) {
                if (!receivedFirstChunk) {
                  receivedFirstChunk = true;
                  console.log('[Gemini Live] ⚡ 首帧 24kHz 音频已到达，启动流式毫秒级播报！');
                }
                const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
                audioBuffer.getChannelData(0).set(float32);
                totalAudioDuration += audioBuffer.duration;

                const sourceNode = ctx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(ctx.destination);

                const startTime = Math.max(streamingScheduledTime, ctx.currentTime + 0.02);
                sourceNode.start(startTime);
                streamingScheduledTime = startTime + audioBuffer.duration;
                activeSourceNodes.push(sourceNode);

                sourceNode.onended = () => {
                  const idx = activeSourceNodes.indexOf(sourceNode);
                  if (idx !== -1) activeSourceNodes.splice(idx, 1);
                };
              }
            }
          }

          if (msg.serverContent.turnComplete || msg.serverContent.generationComplete) {
            completedNormally = true;
            ws.close();
            if (allBase64Chunks.length > 0) {
              const wavUrl = pcmChunksToWavBlobUrl(allBase64Chunks, 24000);
              console.log(`[Gemini Live] ✅ 成功流式完成 ${allBase64Chunks.length} 帧 Live 音频播放！`);
              safeResolve({
                wavUrl,
                totalDuration: totalAudioDuration,
                completedNormally: true,
                scheduledEndTime: streamingScheduledTime,
              });
            } else {
              safeReject(new Error('未返回音频流'));
            }
          }
        }
      } catch (err) {
        // Parse error
      }
    };

    ws.onerror = () => {
      if (currentReqId === activeSpeechRequestId) {
        if (allBase64Chunks.length > 0) {
          const wavUrl = pcmChunksToWavBlobUrl(allBase64Chunks, 24000);
          safeResolve({
            wavUrl,
            totalDuration: totalAudioDuration,
            completedNormally: false,
            scheduledEndTime: streamingScheduledTime,
          });
        } else {
          safeReject(new Error('Gemini Live WebSocket 连接异常'));
        }
      }
    };

    ws.onclose = () => {
      if (activeLiveWebSocket === ws) {
        activeLiveWebSocket = null;
      }
      if (currentReqId !== activeSpeechRequestId) {
        safeReject(new Error('请求已被后续语音打断'));
        return;
      }
      if (allBase64Chunks.length > 0) {
        const wavUrl = pcmChunksToWavBlobUrl(allBase64Chunks, 24000);
        safeResolve({
          wavUrl,
          totalDuration: totalAudioDuration,
          completedNormally,
          scheduledEndTime: streamingScheduledTime,
        });
      } else {
        safeReject(new Error('Gemini Live WebSocket 意外断开'));
      }
    };
  });
}

// =========================================================================
// 本地静态 NPC 音频指纹映射表
// 所有固定台词（问候 / 选项回应 / 好感满值 / 试听词）的文本前缀 → 本地 MP3 路径
// 匹配规则：cleanText 去标点/空白后的前 N 字 startsWith 某条指纹即命中
// =========================================================================
type LocalAudioEntry = { npcId: string; prefix: string; file: string };

const NPC_LOCAL_AUDIO_MAP: LocalAudioEntry[] = [
  // ── 棒棒 88 号 ──────────────────────────────────────────────────────────
  // 问候语
  { npcId: 'bangbang_88', prefix: '仿生核心接入', file: '/audio/npc/bangbang_greeting.mp3' },
  // 试听 sampleLine
  { npcId: 'bangbang_88', prefix: '崽儿！老夫在山城挑了三十年扁担', file: '/audio/npc/bangbang_audition.mp3' },
  // 提示台词（没有道具时的引导）
  { npcId: 'bangbang_88', prefix: '崽儿，老夫这台重工仿生机体在解放碑', file: '/audio/npc/bangbang_tip.mp3' },
  // 好感度满值台词（满 100 后的通用奖励语）
  { npcId: 'bangbang_88', prefix: '好感度已达', file: '/audio/npc/bangbang_favor_max.mp3' },
  // 固定选项回应
  { npcId: 'bangbang_88', prefix: '好小子！解放碑建于', file: '/audio/npc/bangbang_bb_history.mp3' },
  { npcId: 'bangbang_88', prefix: '时代变了，摩天大楼建到了几百米高', file: '/audio/npc/bangbang_bb_culture.mp3' },
  { npcId: 'bangbang_88', prefix: '那还有假？咱们重庆山包山', file: '/audio/npc/bangbang_bb_terrain.mp3' },
  { npcId: 'bangbang_88', prefix: '以前咱们重庆没有现代电梯', file: '/audio/npc/bangbang_bb_staircase_lore.mp3' },
  { npcId: 'bangbang_88', prefix: '十八梯连接着上半城和下半城', file: '/audio/npc/bangbang_bb_steeps.mp3' },
  { npcId: 'bangbang_88', prefix: '机器再聪明，也替不了人去流汗', file: '/audio/npc/bangbang_bb_chongqing_spirit.mp3' },
  // 棒棒 88 号新增 6 条深度文化对话
  { npcId: 'bangbang_88', prefix: '朝天门是两江汇流的咽喉', file: '/audio/npc/bangbang_bb_chaotianmen_dock.mp3' },
  { npcId: 'bangbang_88', prefix: '外行看热闹，内行看门道', file: '/audio/npc/bangbang_bb_bamboo_craft.mp3' },
  { npcId: 'bangbang_88', prefix: '早年间城里货车进不来巷子', file: '/audio/npc/bangbang_bb_dock_haomi.mp3' },
  { npcId: 'bangbang_88', prefix: '那时候日军飞机狂轰滥炸', file: '/audio/npc/bangbang_bb_anti_air_raid.mp3' },
  { npcId: 'bangbang_88', prefix: '下完苦力，梯坎拐角的小摊', file: '/audio/npc/bangbang_bb_mountain_delicacy.mp3' },
  { npcId: 'bangbang_88', prefix: '下完苦力', file: '/audio/npc/bangbang_bb_mountain_delicacy.mp3' },
  { npcId: 'bangbang_88', prefix: '老夫这钛合金骨架再坚硬', file: '/audio/npc/bangbang_bb_cyber_heritage.mp3' },
  // 防火墙破壁台词
  { npcId: 'bangbang_88', prefix: '逻辑防火墙全面破壁', file: '/audio/npc/bangbang_firewall_breach.mp3' },
  // 棒棒 88 号实操彩蛋与挑运小游戏
  { npcId: 'bangbang_88', prefix: '好小子！有骨气！这机械扁担虽沉', file: '/audio/npc/bangbang_bb_egg_porter_climb.mp3' },
  { npcId: 'bangbang_88', prefix: '好小子！有骨气', file: '/audio/npc/bangbang_bb_egg_porter_climb.mp3' },
  { npcId: 'bangbang_88', prefix: '好小子！抓稳扁担', file: '/audio/npc/bangbang_porter_start.mp3' },
  { npcId: 'bangbang_88', prefix: '好小子！抓稳扁担！十八梯路滑梯陡', file: '/audio/npc/bangbang_porter_start.mp3' },
  { npcId: 'bangbang_88', prefix: '好样的！八十米陡坎硬是一步一个脚印踩上来了', file: '/audio/npc/bangbang_porter_win.mp3' },
  { npcId: 'bangbang_88', prefix: '好样的！八十米陡坎', file: '/audio/npc/bangbang_porter_win.mp3' },
  { npcId: 'bangbang_88', prefix: '好后生！肩挑千斤腰不弯', file: '/audio/npc/bangbang_porter_win.mp3' },

  // ── 盖碗姐 ──────────────────────────────────────────────────────────────
  // 问候语
  { npcId: 'gaiwan_jie', prefix: '系统叹息', file: '/audio/npc/gaiwan_greeting.mp3' },
  { npcId: 'gaiwan_jie', prefix: '客官，如今智能茶饮机', file: '/audio/npc/gaiwan_greeting.mp3' },
  { npcId: 'gaiwan_jie', prefix: '在这被智能萃取液和合成茶多酚统治的时代', file: '/audio/npc/gaiwan_greeting.mp3' },
  // 试听 sampleLine
  { npcId: 'gaiwan_jie', prefix: '客官，一碗盖碗茶，三五知己摆龙门阵', file: '/audio/npc/gaiwan_audition.mp3' },
  // 提示台词
  { npcId: 'gaiwan_jie', prefix: '客官，听说你在李子坝大河节点唤醒', file: '/audio/npc/gaiwan_tip.mp3' },
  // 好感满值
  { npcId: 'gaiwan_jie', prefix: '好感度已达', file: '/audio/npc/gaiwan_favor_max.mp3' },
  // 固定选项回应（出示道具）
  { npcId: 'gaiwan_jie', prefix: '茶烟缭绕', file: '/audio/npc/gaiwan_gw_present_tea.mp3' },
  { npcId: 'gaiwan_jie', prefix: '这大河水运的气息', file: '/audio/npc/gaiwan_gw_present_tea.mp3' },
  // 固定选项回应（吊脚楼）
  { npcId: 'gaiwan_jie', prefix: '妹儿/兄弟懂行！咱们重庆全是陡坡悬崖', file: '/audio/npc/gaiwan_gw_stilt_wisdom.mp3' },
  { npcId: 'gaiwan_jie', prefix: '妹儿懂行！咱们重庆全是陡坡悬崖', file: '/audio/npc/gaiwan_gw_stilt_wisdom.mp3' },
  { npcId: 'gaiwan_jie', prefix: '妹儿懂行', file: '/audio/npc/gaiwan_gw_stilt_wisdom.mp3' },
  { npcId: 'gaiwan_jie', prefix: '老茶馆是重庆人的', file: '/audio/npc/gaiwan_gw_tea_culture.mp3' },
  { npcId: 'gaiwan_jie', prefix: '每到夜晚，红灯笼与飞檐暖光', file: '/audio/npc/gaiwan_gw_night_scenery.mp3' },
  { npcId: 'gaiwan_jie', prefix: '机器冷冰冰的，只知道算得失', file: '/audio/npc/gaiwan_gw_market_vitality.mp3' },
  // 防火墙破壁台词
  { npcId: 'gaiwan_jie', prefix: '逻辑防火墙全面破壁', file: '/audio/npc/gaiwan_firewall_breach.mp3' },
  // 背包有道具进场提醒
  { npcId: 'gaiwan_jie', prefix: '检测到你的背包中有大河渔猎之魂', file: '/audio/npc/gaiwan_prereq_hint.mp3' },
  { npcId: 'gaiwan_jie', prefix: '请出示前置道具', file: '/audio/npc/gaiwan_prereq_hint.mp3' },
  // 特殊交互
  { npcId: 'gaiwan_jie', prefix: '好香的九宫格量子火锅', file: '/audio/npc/gaiwan_hotpot.mp3' },
  { npcId: 'gaiwan_jie', prefix: '好俊俏的变脸绝技', file: '/audio/npc/gaiwan_opera_mask.mp3' },
  { npcId: 'gaiwan_jie', prefix: '恭喜！非遗量子工坊成功熔铸', file: '/audio/npc/gaiwan_craft_item.mp3' },
  // 盖碗姐新增 5 条深度文化选项
  { npcId: 'gaiwan_jie', prefix: '好眼光！老重庆城依山傍水', file: '/audio/npc/gaiwan_gw_seventeen_gates.mp3' },
  { npcId: 'gaiwan_jie', prefix: '这就说到老巴渝的灵魂咯', file: '/audio/npc/gaiwan_gw_hotpot_origin.mp3' },
  { npcId: 'gaiwan_jie', prefix: '算你问着行家了', file: '/audio/npc/gaiwan_gw_tea_array_code.mp3' },
  { npcId: 'gaiwan_jie', prefix: '变脸变的是世态人情', file: '/audio/npc/gaiwan_gw_opera_heritage.mp3' },
  { npcId: 'gaiwan_jie', prefix: '早年间江面上万舟并进', file: '/audio/npc/gaiwan_gw_chuanjiang_market.mp3' },
  // 盖碗姐实操彩蛋与火锅小游戏
  { npcId: 'gaiwan_jie', prefix: '哎哟喂！小行家还真手痒了撒', file: '/audio/npc/gaiwan_gw_egg_hotpot_master.mp3' },
  { npcId: 'gaiwan_jie', prefix: '哎哟喂！小行家还真手痒了撒？灶膛柴火正旺', file: '/audio/npc/gaiwan_gw_egg_hotpot_master.mp3' },
  { npcId: 'gaiwan_jie', prefix: '起火开烫咯！毛肚鸭肠七上八下', file: '/audio/npc/gaiwan_hotpot_start.mp3' },
  { npcId: 'gaiwan_jie', prefix: '起火开烫咯', file: '/audio/npc/gaiwan_hotpot_start.mp3' },
  { npcId: 'gaiwan_jie', prefix: '巴适得板！毛肚七上八下脆生生', file: '/audio/npc/gaiwan_trial_win.mp3' },
  { npcId: 'gaiwan_jie', prefix: '巴适得板', file: '/audio/npc/gaiwan_trial_win.mp3' },

  // ── AI 零号机 ───────────────────────────────────────────────────────────
  // 问候语
  { npcId: 'zero_machine', prefix: '警告：逻辑死锁', file: '/audio/npc/zero_greeting.mp3' },
  { npcId: 'zero_machine', prefix: '人类生理机能极其脆弱', file: '/audio/npc/zero_greeting.mp3' },
  // 试听 sampleLine
  { npcId: 'zero_machine', prefix: '单轨穿楼穿行于山水之间', file: '/audio/npc/zero_audition.mp3' },
  // 提示台词
  { npcId: 'zero_machine', prefix: '身份核验中', file: '/audio/npc/zero_tip.mp3' },
  // 背包有信物进场提示
  { npcId: 'zero_machine', prefix: '检测到你的背包中有山城脊梁之竹', file: '/audio/npc/zero_prereq_hint.mp3' },
  // 固定选项回应（出示信物）
  { npcId: 'zero_machine', prefix: '逻辑振荡', file: '/audio/npc/zero_present_pass.mp3' },
  { npcId: 'zero_machine', prefix: '查验到古老长江纤夫', file: '/audio/npc/zero_present_pass.mp3' },
  // 固定选项回应
  { npcId: 'zero_machine', prefix: '本中枢核心架构', file: '/audio/npc/zero_monorail_tech.mp3' },
  { npcId: 'zero_machine', prefix: '李子坝站与', file: '/audio/npc/zero_monorail_tech.mp3' },
  { npcId: 'zero_machine', prefix: '计算矩阵表明', file: '/audio/npc/zero_chongqing_transit.mp3' },
  { npcId: 'zero_machine', prefix: '跨座式单轨爬坡能力', file: '/audio/npc/zero_chongqing_transit.mp3' },
  { npcId: 'zero_machine', prefix: '检索到李子坝建设初期档案', file: '/audio/npc/zero_human_coexistence.mp3' },
  { npcId: 'zero_machine', prefix: '当时若选择拆楼改道', file: '/audio/npc/zero_human_coexistence.mp3' },
  { npcId: 'zero_machine', prefix: '嘉陵江是古巴蜀大河渔猎', file: '/audio/npc/zero_river_history.mp3' },
  // AI 零号机新增 5 条深度文化选项
  { npcId: 'zero_machine', prefix: '数据流回溯：川江水势狂暴', file: '/audio/npc/zero_tracker_history.mp3' },
  { npcId: 'zero_machine', prefix: '川江水势狂暴', file: '/audio/npc/zero_tracker_history.mp3' },
  { npcId: 'zero_machine', prefix: '地质扫描显示', file: '/audio/npc/zero_geological_cliff.mp3' },
  { npcId: 'zero_machine', prefix: '李子坝站坐落于近', file: '/audio/npc/zero_geological_cliff.mp3' },
  { npcId: 'zero_machine', prefix: '交通拓扑推演', file: '/audio/npc/zero_river_transit_evolve.mp3' },
  { npcId: 'zero_machine', prefix: '自1982年中国首条', file: '/audio/npc/zero_river_transit_evolve.mp3' },
  { npcId: 'zero_machine', prefix: '自一九八二年中国首条', file: '/audio/npc/zero_river_transit_evolve.mp3' },
  { npcId: 'zero_machine', prefix: '计算矩阵检索到一千二百余年', file: '/audio/npc/zero_baiheliang_hydrology.mp3' },
  { npcId: 'zero_machine', prefix: '白鹤梁石鱼题刻', file: '/audio/npc/zero_baiheliang_hydrology.mp3' },
  { npcId: 'zero_machine', prefix: '声学频段解析', file: '/audio/npc/zero_monorail_material.mp3' },
  { npcId: 'zero_machine', prefix: '与传统钢轮钢轨地铁不同', file: '/audio/npc/zero_monorail_material.mp3' },
  // 防火墙破壁台词
  { npcId: 'zero_machine', prefix: '逻辑防火墙全面破壁', file: '/audio/npc/zero_firewall_breach.mp3' },
  { npcId: 'zero_machine', prefix: 'AI 零号机底层逻辑完成净化', file: '/audio/npc/zero_firewall_breach.mp3' },
  { npcId: 'zero_machine', prefix: 'AI零号机底层逻辑完成净化', file: '/audio/npc/zero_firewall_breach.mp3' },
  // AI 零号机实操彩蛋与单轨驾驶小游戏
  { npcId: 'zero_machine', prefix: '指令确认·全息神经同步', file: '/audio/npc/zero_egg_monorail_pilot.mp3' },
  { npcId: 'zero_machine', prefix: '指令确认全息神经同步', file: '/audio/npc/zero_egg_monorail_pilot.mp3' },
  { npcId: 'zero_machine', prefix: '指令确认', file: '/audio/npc/zero_egg_monorail_pilot.mp3' },
  { npcId: 'zero_machine', prefix: '监测到碳基生物强烈同调意图', file: '/audio/npc/zero_egg_monorail_pilot.mp3' },
  { npcId: 'zero_machine', prefix: '零号机动力核心已就绪', file: '/audio/npc/zero_monorail_start.mp3' },
  { npcId: 'zero_machine', prefix: '完美进站！穿楼消噪阻尼完全闭合', file: '/audio/npc/zero_monorail_win.mp3' },
  { npcId: 'zero_machine', prefix: '完美进站', file: '/audio/npc/zero_monorail_win.mp3' },
  { npcId: 'zero_machine', prefix: '监测到神经阻抗下降', file: '/audio/npc/zero_trial_win.mp3' },

  // ── 钢铁之魂 ────────────────────────────────────────────────────────────
  // 试听 sampleLine（必须排在长句问候语之前，防止较短前缀被先命中）
  { npcId: 'steel_soul', prefix: '高炉冷却了百年，但抗战西迁的钢铁血脉在量子深渊中从未熄灭！', file: '/audio/npc/steel_audition.mp3' },
  { npcId: 'steel_soul', prefix: '高炉冷却了百年但抗战西迁的钢铁血脉在量子深渊中从未熄灭', file: '/audio/npc/steel_audition.mp3' },

  // 问候语（带有后半句特征短语，保证与试听短句精确互斥）
  { npcId: 'steel_soul', prefix: '高炉冷却了百年，但抗战西迁的钢铁血脉在量子深渊中从未熄灭！文明溯源者', file: '/audio/npc/steel_greeting.mp3' },
  { npcId: 'steel_soul', prefix: '文明溯源者，你已集齐三大文明碎片', file: '/audio/npc/steel_greeting.mp3' },
  { npcId: 'steel_soul', prefix: '轰鸣震颤', file: '/audio/npc/steel_greeting.mp3' },

  // 智能探索提示（索要前置碎片）
  { npcId: 'steel_soul', prefix: '崽儿，大渡口重钢高炉已冷却百年', file: '/audio/npc/steel_tip.mp3' },
  { npcId: 'steel_soul', prefix: '索要前置道具', file: '/audio/npc/steel_tip.mp3' },

  // 背包有碎片进场提示
  { npcId: 'steel_soul', prefix: '检测到你的背包中有山崖农耕之火', file: '/audio/npc/steel_prereq_hint.mp3' },
  { npcId: 'steel_soul', prefix: '请出示前置道具', file: '/audio/npc/steel_prereq_hint.mp3' },

  // 好感度满值 100
  { npcId: 'steel_soul', prefix: '好感度已达', file: '/audio/npc/steel_favor_max.mp3' },
  { npcId: 'steel_soul', prefix: '好崽儿！你的骨气与热血已深深刻入百年高炉', file: '/audio/npc/steel_favor_max.mp3' },

  // 固定选项 1：出示【山崖农耕之火·烟火宝典碎片】回应
  { npcId: 'steel_soul', prefix: '高炉金石激荡', file: '/audio/npc/steel_present_chip.mp3' },
  { npcId: 'steel_soul', prefix: '好崽儿！这不仅是吊脚楼的烟火', file: '/audio/npc/steel_present_chip.mp3' },

  // 固定选项 2：汉阳铁厂西迁
  { npcId: 'steel_soul', prefix: '一九三八年武汉沦陷在即', file: '/audio/npc/steel_hanyang_history.mp3' },
  { npcId: 'steel_soul', prefix: '1938年武汉沦陷在即', file: '/audio/npc/steel_hanyang_history.mp3' },
  { npcId: 'steel_soul', prefix: '1938 年武汉沦陷在即', file: '/audio/npc/steel_hanyang_history.mp3' },

  // 固定选项 3：宜昌大撤退 / 卢作孚抢运
  { npcId: 'steel_soul', prefix: '那是血与火写就的壮举', file: '/audio/npc/steel_yichang_retreat.mp3' },

  // 固定选项 4：地下钢厂大轰炸坚守
  { npcId: 'steel_soul', prefix: '日机狂轰滥炸数千次', file: '/audio/npc/steel_underground_plant.mp3' },

  // 固定选项 5：战火防卫军工贡献
  { npcId: 'steel_soul', prefix: '迁渝后的重钢顶着日机', file: '/audio/npc/steel_defense_role.mp3' },

  // 固定选项 6：成渝铁路第一根钢轨
  { npcId: 'steel_soul', prefix: '问得痛快！1950年百废待兴', file: '/audio/npc/steel_chengyu_rail.mp3' },
  { npcId: 'steel_soul', prefix: '问得痛快！1950 年百废待兴', file: '/audio/npc/steel_chengyu_rail.mp3' },
  { npcId: 'steel_soul', prefix: '问得痛快！一九五零年百废待兴', file: '/audio/npc/steel_chengyu_rail.mp3' },
  { npcId: 'steel_soul', prefix: '问得痛快', file: '/audio/npc/steel_chengyu_rail.mp3' },

  // 固定选项 7：工业博物馆与城市更新传承
  { npcId: 'steel_soul', prefix: '时代发展了，大渡口老厂区完成了环保搬迁', file: '/audio/npc/steel_museum_heritage.mp3' },
  { npcId: 'steel_soul', prefix: '时代发展了', file: '/audio/npc/steel_museum_heritage.mp3' },

  // 固定选项 8：特种装甲钢与大国重器
  { npcId: 'steel_soul', prefix: '好眼界！重钢不仅炼造普钢', file: '/audio/npc/steel_special_armor.mp3' },
  { npcId: 'steel_soul', prefix: '好眼界', file: '/audio/npc/steel_special_armor.mp3' },

  // 固定选项 9：称呼“崽儿”与工人热血豪迈
  { npcId: 'steel_soul', prefix: '哈哈！钢铁工人的字典里从没有退缩二字', file: '/audio/npc/steel_worker_culture.mp3' },
  { npcId: 'steel_soul', prefix: '哈哈！钢铁工人的字典里从没有“退缩”二字', file: '/audio/npc/steel_worker_culture.mp3' },

  // 固定选项 10：工匠精神抵御虚无
  { npcId: 'steel_soul', prefix: '钢铁需要千锤百炼才能去杂成钢', file: '/audio/npc/steel_craftsman_spirit.mp3' },

  // 固定选项 11：实体钢铁与物理骨架
  { npcId: 'steel_soul', prefix: '任凭云端算力幻化万千', file: '/audio/npc/steel_cyber_foundation.mp3' },

  // 固定选项 12：执锤淬火实操彩蛋与高炉锻造小游戏
  { npcId: 'steel_soul', prefix: '好！崽儿好气魄！空谈误国', file: '/audio/npc/steel_egg_steel_forging.mp3' },
  { npcId: 'steel_soul', prefix: '好！崽儿好气魄', file: '/audio/npc/steel_egg_steel_forging.mp3' },
  { npcId: 'steel_soul', prefix: '高炉已沸，炉温正炽', file: '/audio/npc/steel_forging_start.mp3' },
  { npcId: 'steel_soul', prefix: '高炉已沸', file: '/audio/npc/steel_forging_start.mp3' },
  { npcId: 'steel_soul', prefix: '百炼成钢！火花淬尽千重铁', file: '/audio/npc/steel_forging_win.mp3' },
  { npcId: 'steel_soul', prefix: '百炼成钢', file: '/audio/npc/steel_forging_win.mp3' },
  { npcId: 'steel_soul', prefix: '千锤百炼，烈火金刚', file: '/audio/npc/steel_trial_win.mp3' },

  // 请求开启试炼回应
  { npcId: 'steel_soul', prefix: '很好！高炉的火光将见证', file: '/audio/npc/steel_start_quiz.mp3' },

  // 开启试炼前置条件未满足阻断语音
  { npcId: 'steel_soul', prefix: '高炉试炼阻断！文明火种尚未齐备', file: '/audio/npc/steel_trial_missing_items.mp3' },
  { npcId: 'steel_soul', prefix: '高炉试炼阻断', file: '/audio/npc/steel_trial_missing_items.mp3' },
  { npcId: 'steel_soul', prefix: '高炉尚未预热！急躁乃工匠大忌', file: '/audio/npc/steel_trial_low_favor.mp3' },
  { npcId: 'steel_soul', prefix: '高炉尚未预热', file: '/audio/npc/steel_trial_low_favor.mp3' },
  { npcId: 'steel_soul', prefix: '高炉未亲手锻造！空谈误国', file: '/audio/npc/steel_trial_not_forged.mp3' },
  { npcId: 'steel_soul', prefix: '高炉未亲手锻造', file: '/audio/npc/steel_trial_not_forged.mp3' },

  // 防火墙破壁（破壁战第 3 轮胜利）
  { npcId: 'steel_soul', prefix: '逻辑防火墙全面破壁', file: '/audio/npc/steel_firewall_breach.mp3' },
  { npcId: 'steel_soul', prefix: '百年钢铁之火重燃', file: '/audio/npc/steel_firewall_breach.mp3' },

  // 重钢遗址解封语音
  { npcId: 'steel_soul', prefix: '封印解除！终极纪元重钢遗址已成功解封', file: '/audio/npc/steel_unlock.mp3' },

  // 终极试炼答题胜负
  { npcId: 'steel_soul', prefix: '轰鸣庆祝！你的记忆共鸣度', file: '/audio/npc/steel_quiz_passed.mp3' },
  { npcId: 'steel_soul', prefix: '记忆共鸣度未达到', file: '/audio/npc/steel_quiz_failed.mp3' },
  { npcId: 'steel_soul', prefix: '记忆共鸣度为', file: '/audio/npc/steel_quiz_failed.mp3' },
];

/**
 * 尝试将 rawText 或 cleanText 与本地静态音频映射表匹配。
 * 策略：去除所有标点/空白后，检查文本前缀是否命中任一条目的 prefix。
 * @returns 匹配到的本地 MP3 路径，未匹配时返回 null。
 */
function matchLocalNpcAudio(npcId: string, rawText: string, cleanText: string): string | null {
  const strippedClean = cleanText.replace(/[\s【】\[\]()（）⚠️🔔💬📢🎙️💡!！。，,、：:]/g, '');
  const strippedRaw = rawText.replace(/[\s【】\[\]()（）⚠️🔔💬📢🎙️💡!！。，,、：:]/g, '');
  for (const entry of NPC_LOCAL_AUDIO_MAP) {
    if (entry.npcId !== npcId) continue;
    const strippedPrefix = entry.prefix.replace(/[\s【】\[\]()（）⚠️🔔💬📢🎙️💡!！。，,、：:]/g, '');
    if (strippedClean.startsWith(strippedPrefix) || strippedRaw.startsWith(strippedPrefix)) {
      return entry.file;
    }
  }
  return null;
}

export async function speakNpcMessage(
  npcId: string,
  text: string,
  isMuted: boolean = false,
  ttsConfig?: TTSConfig
): Promise<void> {
  if (isMuted) return;

  stopAllSpeech();
  const currentReqId = ++activeSpeechRequestId;

  const cleanText = cleanDialogueText(text);
  if (!cleanText) return;

  // =========================================================================
  // 0. 最高优先级：本地预录静态 NPC 音频（零延迟，零 API 消耗）
  //    所有固定台词（问候/选项回应/好感满值/试听词）直接命中本地 MP3，秒开播放。
  //    只有自由对话（玩家自定义输入的动态 AI 回应）才继续走 TTS 链路。
  // =========================================================================
  const localFile = matchLocalNpcAudio(npcId, text, cleanText);
  if (localFile) {
    console.info(`[Local NPC Audio] ✅ 命中本地预录音频: ${localFile}`);
    if (currentReqId === activeSpeechRequestId) {
      playAudioUrl(localFile, npcId, cleanText);
    }
    return;
  }

  const profile = NPC_VOICE_PROFILES[npcId] || {
    name: 'NPC',
    roleTitle: '智能实体',
    toneDesc: '灵动女声',
    sampleLine: cleanText,
    gender: 'female' as const,
    geminiVoice: 'Aoede',
    openaiVoice: 'nova',
    siliconflowVoice: 'FunAudioLLM/CosyVoice2-0.5B:bella',
    webSpeech: {
      preferredVoices: ['Yaoyao', 'Huihui', 'Xiaoxiao', 'Female'],
      pitch: 1.08,
      rate: 1.08,
    },
  };

  // =========================================================================
  // 1. 最高优先级：Google Gemini 官方原生 Multimodal Live API (WebSocket 极速直连)
  //    使用与《Gemini游戏AI助手》完全一致的 gemini-3.1-flash-live-preview 实时双向流引擎！
  //    零 429 限制，极速秒响应，原汁原味真实声线！
  //    配备【断流容灾自愈 & 剩余子句无缝续念】机制，即使网络波动丢包也 100% 完整念完台词！
  // =========================================================================
  const geminiApiKey = getActiveGeminiApiKey();
  if (geminiApiKey) {
    const geminiVoice = profile.geminiVoice || (profile.gender === 'male' ? 'Charon' : 'Aoede');
    const cacheKey = `gemini-live:${geminiVoice}:${cleanText}`;

    if (ttsAudioCache.has(cacheKey)) {
      console.log('[Gemini Live] 命中本地音频缓存，直接播放');
      if (currentReqId === activeSpeechRequestId) {
        playAudioUrl(ttsAudioCache.get(cacheKey)!, npcId);
      }
      return;
    }

    try {
      const res = await speakWithGeminiLiveWebSocket(cleanText, geminiVoice, currentReqId, npcId);

      const expectedMinDuration = Math.max(1.2, cleanText.length * 0.16);
      const isReallyFinished = res.completedNormally && res.totalDuration >= expectedMinDuration * 0.7;

      if (isReallyFinished) {
        if (res.wavUrl) setCachedAudioUrl(cacheKey, res.wavUrl);
        return;
      }

      // 若流式因网络波动提前断开或只吐出部分音频：
      const ctx = getStreamingAudioContext();
      const delayMs = Math.max(0, (res.scheduledEndTime - ctx.currentTime) * 1000);

      // 若前面仅接收到极碎片段（< 1.2s），停掉杂音并立即由本地引擎完整重播整句
      if (res.totalDuration < 1.2) {
        stopAllSpeech();
        speakWithLocalNeuralVoice(npcId, cleanText);
        return;
      }

      // 若前面已平稳播放数秒，计算未读完的剩余子句，并在前序音频播放结束的瞬间无缝接力续念！
      const remaining = getRemainingText(cleanText, res.totalDuration);
      if (remaining && currentReqId === activeSpeechRequestId) {
        console.log(`[Audio Continuation] ⚡ 实时流因网络抖动中断(已播${res.totalDuration.toFixed(1)}s)，将于 ${Math.round(delayMs)}ms 后无缝接力续念后半句: "${remaining}"`);
        window.setTimeout(() => {
          if (currentReqId === activeSpeechRequestId) {
            speakWithLocalNeuralVoice(npcId, remaining);
          }
        }, delayMs);
      }
      return;
    } catch (liveErr: any) {
      console.warn('[Gemini Live] 实时通道未建立或受阻，降级至全量本地拟真引擎:', liveErr?.message || liveErr);
      if (currentReqId === activeSpeechRequestId) {
        speakWithLocalNeuralVoice(npcId, cleanText);
      }
      return;
    }
  }

  // =========================================================================
  // 2. 次级提供商（OpenAI TTS / SiliconFlow CosyVoice）
  // =========================================================================
  const provider = ttsConfig?.ttsProvider || 'natural_neural';
  const apiKey = ttsConfig?.ttsApiKey?.trim() || '';

  if (provider !== 'natural_neural' && apiKey) {
    let endpoint = '';
    let modelName = ttsConfig?.ttsModel?.trim() || '';
    let voiceName = '';

    if (provider === 'siliconflow') {
      endpoint = ttsConfig?.ttsBaseUrl?.trim() || 'https://api.siliconflow.cn/v1/audio/speech';
      if (!modelName) modelName = 'FunAudioLLM/CosyVoice2-0.5B';
      voiceName = profile.siliconflowVoice;
    } else if (provider === 'openai') {
      endpoint = ttsConfig?.ttsBaseUrl?.trim() || 'https://api.openai.com/v1/audio/speech';
      if (!modelName) modelName = 'tts-1';
      voiceName = profile.openaiVoice;
    } else if (provider === 'custom') {
      endpoint = ttsConfig?.ttsBaseUrl?.trim() || '';
      if (!modelName) modelName = 'tts-1';
      voiceName = profile.openaiVoice;
    }

    if (endpoint) {
      const cacheKey = `${provider}:${modelName}:${voiceName}:${cleanText}`;
      if (ttsAudioCache.has(cacheKey)) {
        const cachedUrl = ttsAudioCache.get(cacheKey)!;
        playAudioUrl(cachedUrl, npcId);
        return;
      }

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            input: cleanText,
            voice: voiceName,
            response_format: 'mp3',
          }),
        });

        if (resp.ok) {
          const audioBlob = await resp.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          setCachedAudioUrl(cacheKey, audioUrl);
          playAudioUrl(audioUrl, npcId);
          return;
        }
      } catch (err) {
        console.warn('[AI TTS] 备选云端语音异常，切换至本地神经引擎:', err);
      }
    }
  }

  // =========================================================================
  // 3. 终极绝对保底：本地系统神经人声 (Web Speech API Neural)
  //    当未连接网络、连不上 Gemini、额度超限或任何云端异常时，100% 保证有声！
  // =========================================================================
  console.info('[Audio Fallback] 云端 Gemini 语音未连接/超时，已无缝切换至默认本地拟真双声线方案');
  speakWithLocalNeuralVoice(npcId, cleanText);
}

export async function auditionNpcVoice(npcId: string, ttsConfig?: TTSConfig): Promise<void> {
  const profile = NPC_VOICE_PROFILES[npcId] || NPC_VOICE_PROFILES.bangbang_88;
  await speakNpcMessage(npcId, profile.sampleLine, false, ttsConfig);
}
