/**
 * Synthesised factory audio (Web Audio API, no assets).
 *  - servo whine: detuned saw pair → low-pass, pitch/gain follow joint speed
 *  - conveyor hum: low square + filtered noise, gain follows belt speed
 *  - one-shots: vacuum hiss, release puff, crate clunk, UI blip, arrival chime
 * Muted by default; the AudioContext is only created after a user gesture.
 */

type OneShot = "suction" | "release" | "clunk" | "blip" | "arrive";

class FactoryAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private servoGain: GainNode | null = null;
  private servoOscA: OscillatorNode | null = null;
  private servoOscB: OscillatorNode | null = null;
  private servoFilter: BiquadFilterNode | null = null;
  private convGain: GainNode | null = null;
  private convOsc: OscillatorNode | null = null;
  private convFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  enabled = false;

  private build() {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    // Shared white-noise buffer.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    // Servo whine.
    this.servoFilter = ctx.createBiquadFilter();
    this.servoFilter.type = "lowpass";
    this.servoFilter.frequency.value = 900;
    this.servoFilter.Q.value = 4;
    this.servoGain = ctx.createGain();
    this.servoGain.gain.value = 0;
    this.servoOscA = ctx.createOscillator();
    this.servoOscA.type = "sawtooth";
    this.servoOscA.frequency.value = 180;
    this.servoOscB = ctx.createOscillator();
    this.servoOscB.type = "sawtooth";
    this.servoOscB.frequency.value = 182.5;
    this.servoOscA.connect(this.servoFilter);
    this.servoOscB.connect(this.servoFilter);
    this.servoFilter.connect(this.servoGain).connect(master);
    this.servoOscA.start();
    this.servoOscB.start();

    // Conveyor hum + rumble.
    this.convGain = ctx.createGain();
    this.convGain.gain.value = 0;
    this.convFilter = ctx.createBiquadFilter();
    this.convFilter.type = "lowpass";
    this.convFilter.frequency.value = 260;
    this.convOsc = ctx.createOscillator();
    this.convOsc.type = "square";
    this.convOsc.frequency.value = 52;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.35;
    this.convOsc.connect(humGain).connect(this.convFilter);
    const rumble = ctx.createBufferSource();
    rumble.buffer = buf;
    rumble.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "bandpass";
    rumbleFilter.frequency.value = 140;
    rumbleFilter.Q.value = 0.8;
    rumble.connect(rumbleFilter).connect(this.convFilter);
    this.convFilter.connect(this.convGain).connect(master);
    this.convOsc.start();
    rumble.start();
  }

  async setEnabled(on: boolean) {
    if (typeof window === "undefined") return;
    if (on && !this.ctx) this.build();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.enabled = on;
    const now = ctx.currentTime;
    if (on) {
      if (ctx.state === "suspended") await ctx.resume();
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.55, now, 0.08);
    } else {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.05);
    }
  }

  /** Called every frame with live telemetry. */
  update(jointSpeed: number, beltSpeed: number) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    const servo = Math.min(jointSpeed / 2.4, 1);
    this.servoGain!.gain.setTargetAtTime(servo * 0.06, t, 0.05);
    const f = 140 + servo * 260;
    this.servoOscA!.frequency.setTargetAtTime(f, t, 0.05);
    this.servoOscB!.frequency.setTargetAtTime(f * 1.014, t, 0.05);
    this.servoFilter!.frequency.setTargetAtTime(500 + servo * 1600, t, 0.05);

    const belt = Math.min(Math.abs(beltSpeed) / 7, 1);
    this.convGain!.gain.setTargetAtTime(belt * 0.22, t, 0.08);
    this.convOsc!.frequency.setTargetAtTime(42 + belt * 30, t, 0.1);
    this.convFilter!.frequency.setTargetAtTime(180 + belt * 260, t, 0.1);
  }

  play(kind: OneShot) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled || !this.master || !this.noiseBuffer) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(this.master);

    if (kind === "suction" || kind === "release") {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.2;
      const startF = kind === "suction" ? 4200 : 2600;
      const endF = kind === "suction" ? 1800 : 5200;
      bp.frequency.setValueAtTime(startF, t);
      bp.frequency.exponentialRampToValueAtTime(endF, t + 0.35);
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(kind === "suction" ? 0.22 : 0.16, t + 0.03);
      out.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "suction" ? 0.45 : 0.3));
      src.connect(bp).connect(out);
      src.start(t);
      src.stop(t + 0.5);
      return;
    }

    if (kind === "clunk") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(48, t + 0.18);
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(out);
      osc.start(t);
      osc.stop(t + 0.3);
      return;
    }

    const notes = kind === "arrive" ? [880, 1320] : [1560];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const start = t + i * 0.11;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.06, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
      osc.connect(g).connect(out);
      osc.start(start);
      osc.stop(start + 0.12);
    });
  }
}

export const factoryAudio = new FactoryAudio();
