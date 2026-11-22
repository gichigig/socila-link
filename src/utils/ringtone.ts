// Ringtone & Audio Tone Synthesizer using Web Audio API
// Generates melodious incoming chime and standard outgoing ringback tones without external audio assets.

class RingtoneManager {
  private audioCtx: AudioContext | null = null;
  private currentStopFn: (() => void) | null = null;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays a harmonious smartphone-style incoming call chime in a recurring loop.
   * Returns a function that stops the ringtone immediately.
   */
  public playIncoming(): () => void {
    this.stop();

    let isPlaying = true;
    let timerId: NodeJS.Timeout | null = null;

    // Harmonic pentatonic arpeggio frequencies (D5, F#5, A5, C#6, E6)
    const notes = [587.33, 739.99, 880.0, 1108.73, 1318.51];

    const playChimeSequence = () => {
      if (!isPlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime + 0.05;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Soft, rich tone combining fundamental with soft chime decay
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.12);

        gain.gain.setValueAtTime(0, startTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.12, startTime + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + idx * 0.12);
        osc.stop(startTime + idx * 0.12 + 0.65);
      });
    };

    playChimeSequence();
    timerId = setInterval(playChimeSequence, 2400);

    const stop = () => {
      isPlaying = false;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      if (this.currentStopFn === stop) {
        this.currentStopFn = null;
      }
    };

    this.currentStopFn = stop;
    return stop;
  }

  /**
   * Plays a classic dual-tone outgoing ringback tone (440Hz + 480Hz) while waiting for answer.
   * Returns a function that stops the ringback tone immediately.
   */
  public playOutgoing(): () => void {
    this.stop();

    let isPlaying = true;
    let timerId: NodeJS.Timeout | null = null;

    const playRingbackBurst = () => {
      if (!isPlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime + 0.05;
      const duration = 1.6; // 1.6 seconds ring, followed by interval

      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
        gain.gain.setValueAtTime(0.04, now + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    };

    playRingbackBurst();
    timerId = setInterval(playRingbackBurst, 3600);

    const stop = () => {
      isPlaying = false;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      if (this.currentStopFn === stop) {
        this.currentStopFn = null;
      }
    };

    this.currentStopFn = stop;
    return stop;
  }

  public stop(): void {
    if (this.currentStopFn) {
      this.currentStopFn();
      this.currentStopFn = null;
    }
  }
}

export const ringtone = new RingtoneManager();
