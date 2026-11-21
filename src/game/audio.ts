// Ultra-lightweight procedural Web Audio API synthesizer — zero audio file fetches

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.08,
    delay = 0,
    freqEnd?: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playSelect(): void {
    this.playTone(460, 0.06, 'triangle', 0.05, 0, 520);
  }

  public playRecruit(): void {
    this.playTone(170, 0.09, 'triangle', 0.09, 0, 120);
    this.playTone(230, 0.08, 'triangle', 0.06, 0.07, 260);
  }

  public playBuild(): void {
    this.playTone(320, 0.08, 'square', 0.04, 0, 390);
    this.playTone(520, 0.14, 'triangle', 0.07, 0.07, 640);
  }

  public playMarch(): void {
    this.playTone(145, 0.08, 'sine', 0.09, 0, 100);
    this.playTone(145, 0.08, 'sine', 0.07, 0.09, 95);
  }

  public playBattle(won: boolean): void {
    this.playTone(130, 0.12, 'sawtooth', 0.07, 0, 75);
    this.playTone(290, 0.09, 'square', 0.05, 0.04, 180);
    if (won) {
      this.playTone(440, 0.12, 'triangle', 0.07, 0.11);
      this.playTone(554, 0.18, 'triangle', 0.08, 0.2);
    } else {
      this.playTone(210, 0.16, 'sawtooth', 0.06, 0.12, 130);
    }
  }

  public playEndTurn(): void {
    this.playTone(330, 0.09, 'triangle', 0.06, 0, 392);
    this.playTone(440, 0.13, 'triangle', 0.06, 0.08, 494);
  }

  public playEdict(): void {
    this.playTone(293.66, 0.14, 'triangle', 0.08, 0);
    this.playTone(440, 0.16, 'triangle', 0.08, 0.1);
    this.playTone(587.33, 0.28, 'triangle', 0.09, 0.2);
  }

  public playDiplomacy(): void {
    this.playTone(392, 0.1, 'sine', 0.07, 0);
    this.playTone(523.25, 0.18, 'sine', 0.07, 0.09);
  }

  public playVictory(): void {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, i) => {
      this.playTone(n, i === 3 ? 0.45 : 0.16, 'triangle', 0.09, i * 0.12);
    });
  }

  public playDefeat(): void {
    const notes = [330, 293.66, 261.63, 196];
    notes.forEach((n, i) => {
      this.playTone(n, i === 3 ? 0.5 : 0.18, 'sawtooth', 0.05, i * 0.14);
    });
  }
}

export const soundEngine = new SoundEngine();
