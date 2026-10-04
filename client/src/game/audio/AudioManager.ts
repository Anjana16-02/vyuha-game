type Bus = "master" | "music" | "sfx" | "ambience";

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private amb: GainNode | null = null;
  private musicNodes: OscillatorNode[] = [];
  private ambTimer: number | null = null;
  private musicTimer: number | null = null;
  private started = false;
  vols = { master: 0.8, music: 0.45, sfx: 0.7, ambience: 0.5, muted: false };
  private intensity = 0;
  private scene: "intro" | "camp" | "battle" | "victory" | "defeat" = "intro";
  private musicPhase = 0;

  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.amb = this.ctx.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.amb.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.apply();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (!this.started) {
      this.started = true;
      this.loopAmbience();
      this.loopMusic();
    }
  }

  setVolumes(v: Partial<typeof this.vols>) {
    this.vols = { ...this.vols, ...v };
    this.apply();
  }

  setScene(s: typeof this.scene, intensity = 0) {
    this.scene = s;
    this.intensity = intensity;
  }

  private apply() {
    if (!this.master || !this.music || !this.sfx || !this.amb) return;
    const m = this.vols.muted ? 0 : this.vols.master;
    this.master.gain.value = m;
    this.music.gain.value = this.vols.music;
    this.sfx.gain.value = this.vols.sfx;
    this.amb.gain.value = this.vols.ambience;
  }

  private env(g: GainNode, a: number, d: number, peak: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + a);
    g.gain.exponentialRampToValueAtTime(0.0001, now + a + d);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, bus: GainNode, freqEnd?: number) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(bus);
    this.env(g, 0.02, dur, gain);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.05);
  }

  private noise(dur: number, gain: number, bus: GainNode, filterFreq = 800) {
    if (!this.ctx) return;
    const n = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    n.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    n.connect(f);
    f.connect(g);
    g.connect(bus);
    this.env(g, 0.01, dur, gain);
    n.start();
  }

  hover() {
    if (!this.sfx) return;
    this.tone(620, 0.07, "sine", 0.05, this.sfx);
  }
  select() {
    if (!this.sfx) return;
    this.tone(240, 0.12, "triangle", 0.08, this.sfx, 420);
  }
  confirm() {
    if (!this.sfx) return;
    this.tone(180, 0.18, "sawtooth", 0.06, this.sfx, 90);
    this.tone(360, 0.2, "triangle", 0.05, this.sfx);
  }
  back() {
    if (!this.sfx) return;
    this.tone(300, 0.1, "sine", 0.05, this.sfx, 160);
  }
  error() {
    if (!this.sfx) return;
    this.tone(90, 0.25, "square", 0.05, this.sfx);
  }
  unlockItem() {
    if (!this.sfx) return;
    this.tone(440, 0.2, "triangle", 0.08, this.sfx, 880);
  }
  reward() {
    if (!this.sfx) return;
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.sfx && this.tone(f, 0.22, "triangle", 0.07, this.sfx), i * 90));
  }
  levelUp() {
    this.reward();
    if (this.sfx) this.tone(220, 0.4, "sawtooth", 0.04, this.sfx, 440);
  }
  achievement() {
    this.reward();
  }
  battleStart() {
    if (!this.sfx) return;
    this.noise(0.6, 0.12, this.sfx, 300);
    this.tone(55, 0.8, "sine", 0.18, this.sfx);
    this.tone(110, 0.6, "sine", 0.12, this.sfx);
  }
  warning() {
    if (!this.sfx) return;
    this.tone(160, 0.15, "square", 0.05, this.sfx);
  }
  victory() {
    this.setScene("victory", 0);
    if (!this.sfx) return;
    [261, 329, 392, 523, 659].forEach((f, i) => setTimeout(() => this.sfx && this.tone(f, 0.4, "triangle", 0.1, this.sfx), i * 120));
  }
  defeat() {
    this.setScene("defeat", 0);
    if (!this.sfx) return;
    this.tone(110, 1.2, "sine", 0.1, this.sfx, 55);
    this.tone(82, 1.5, "sine", 0.08, this.sfx, 41);
  }
  impact() {
    if (!this.sfx) return;
    this.noise(0.2, 0.15, this.sfx, 800);
    this.tone(150, 0.1, "square", 0.08, this.sfx, 75);
  }
  arrows() {
    if (!this.sfx) return;
    this.noise(0.3, 0.1, this.sfx, 3200);
    this.tone(980, 0.15, "sine", 0.05, this.sfx, 490);
  }
  drums() {
    if (!this.sfx) return;
    this.tone(55, 0.3, "sine", 0.2, this.sfx);
    this.noise(0.15, 0.12, this.sfx, 150);
    this.tone(82, 0.25, "sine", 0.15, this.sfx);
  }
  cavalryCharge() {
    if (!this.sfx) return;
    this.noise(0.5, 0.12, this.sfx, 400);
    this.tone(130, 0.4, "sawtooth", 0.1, this.sfx);
  }
  elephantCharge() {
    if (!this.sfx) return;
    this.noise(0.6, 0.18, this.sfx, 100);
    this.tone(42, 0.5, "sine", 0.15, this.sfx, 25);
  }
  moraleBreak() {
    if (!this.sfx) return;
    this.tone(220, 0.8, "sawtooth", 0.1, this.sfx, 88);
    this.noise(0.4, 0.12, this.sfx, 500);
  }
  formationCollapse() {
    if (!this.sfx) return;
    this.tone(98, 1.0, "square", 0.12, this.sfx, 39);
    this.noise(0.5, 0.15, this.sfx, 250);
  }
  conch() {
    if (!this.sfx) return;
    this.tone(220, 2.5, "sine", 0.15, this.sfx, 110);
    this.tone(330, 2.0, "sine", 0.1, this.sfx, 165);
  }
  commanderVoice(command: "advance" | "hold" | "attack" | "flank" | "charge") {
    if (!this.sfx) return;
    const freqs: Record<string, number[]> = {
      advance: [196, 247, 294],
      hold: [220, 262, 330],
      attack: [247, 294, 370],
      flank: [262, 330, 392],
      charge: [294, 370, 440],
    };
    const tones = freqs[command] || [220, 262, 330];
    tones.forEach((f, i) => setTimeout(() => this.sfx && this.tone(f, 0.3, "triangle", 0.06, this.sfx), i * 80));
  }

  private loopAmbience() {
    const tick = () => {
      if (this.ctx && this.amb && this.started) {
        if (this.scene === "intro" || this.scene === "camp") {
          this.noise(2.0, 0.025, this.amb, 350);
          if (Math.random() < 0.25) this.tone(82, 1.0, "sine", 0.018, this.amb);
        } else if (this.scene === "battle") {
          this.noise(1.5, 0.05 + this.intensity * 0.05, this.amb, 800);
          if (Math.random() < 0.35) this.tone(65, 0.25, "sine", 0.025, this.amb);
          if (Math.random() < 0.25) this.noise(0.2, 0.06, this.sfx ?? this.amb, 2000);
          if (Math.random() < 0.15) this.tone(55, 0.4, "sine", 0.03, this.amb);
        }
      }
      this.ambTimer = window.setTimeout(tick, this.scene === "battle" ? 800 : 1800);
    };
    tick();
  }

  private loopMusic() {
    const tick = () => {
      if (this.ctx && this.music && this.started && !this.vols.muted) {
        this.musicPhase = (this.musicPhase + 1) % 8;
        let base: number, fifth: number, octave: number;
        
        if (this.scene === "defeat") {
          base = 82;
          fifth = 98;
          octave = 110;
        } else if (this.scene === "victory") {
          base = 196;
          fifth = 247;
          octave = 262;
        } else if (this.scene === "battle") {
          base = 110;
          fifth = this.intensity > 0.5 ? 165 : 147;
          octave = 220;
        } else {
          base = 130;
          fifth = 164;
          octave = 196;
        }

        const rhythm = this.scene === "battle" ? 1.2 : 2.0;
        const gainBase = 0.04 + this.intensity * 0.025;
        
        this.tone(base, rhythm * 1.5, "sine", gainBase, this.music);
        this.tone(fifth, rhythm * 1.3, "triangle", gainBase * 0.7, this.music);
        
        if (this.scene === "battle") {
          if (this.intensity > 0.4) {
            this.tone(octave, rhythm * 0.6, "square", gainBase * 0.4, this.music);
          }
          if (this.intensity > 0.6 && this.musicPhase % 2 === 0) {
            this.tone(base * 1.5, rhythm * 0.4, "sawtooth", gainBase * 0.5, this.music);
          }
        } else if (this.scene === "intro" || this.scene === "camp") {
          if (this.musicPhase % 3 === 0) {
            this.tone(octave, rhythm * 0.8, "sine", gainBase * 0.3, this.music);
          }
        }
      }
      this.musicTimer = window.setTimeout(tick, this.scene === "battle" ? 1200 : 2500);
    };
    tick();
  }
}

export const audio = new AudioManager();
