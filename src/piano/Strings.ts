import { Midi } from 'tone';

import { PianoComponent } from './Component';
import { getNotesInRange, velocitiesMap } from './Salamander';
import { PianoString } from './String';

import type { PianoComponentOptions } from './Component';
import type { PianoStringOptions } from './String';


interface StringsOptions extends PianoComponentOptions {
	minNote: number
	maxNote: number
	velocities: number
}

/**
 *  Manages all of the hammered string sounds
 */
export class PianoStrings extends PianoComponent {

  /**
	 * All of the piano strings
	 */
  private _strings: PianoString[];

  /**
	 * Maps a midi note to a piano string
	 */
  private _activeNotes: Map<number, PianoString>;

  /**
   * Snapshot of construction options for creating additional PianoString instances
   */
  private _stringBaseConfig: Omit<PianoStringOptions, 'notes' | 'velocity'>;

  /**
   * The notes in range, cached for use in expandTo
   */
  private _notes: number[];

  constructor(options: StringsOptions) {
    super(options);

    const notes = getNotesInRange(options.minNote, options.maxNote);
    const velocities = velocitiesMap[options.velocities].slice();

    this._notes = notes;
    this._stringBaseConfig = { ...options };

    this._strings = velocities.map(velocity => new PianoString({ ...options, notes, velocity }));

    this._activeNotes = new Map();
  }

  /**
	 * Scale a value between a given range
	 */
  private scale(val: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((val - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  triggerAttack(note: number, time: number, velocity: number): void {
    const scaledVel = this.scale(velocity, 0, 1, -0.5, this._strings.length - 0.51);
    const stringIndex = Math.max(Math.round(scaledVel), 0);
    let gain = 1 + scaledVel - stringIndex;

    if (this._strings.length === 1) {
      gain = velocity;
    }

    const sampler = this._strings[stringIndex];

    if (this._activeNotes.has(note)) {
      this.triggerRelease(note, time);
    }

    this._activeNotes.set(note, sampler);
    sampler.triggerAttack(Midi(note).toNote(), time, gain);
  }

  triggerRelease(note: number, time: number): void {
    // trigger the release of all of the notes at that velociy
    if (this._activeNotes.has(note)) {
      this._activeNotes.get(note).triggerRelease(Midi(note).toNote(), time);
      this._activeNotes.delete(note);
    }
  }

  /**
   * Load additional velocity strings up to the target velocity count.
   * New strings are loaded and connected, then atomically merged into _strings.
   * Safe to call while notes are playing: _activeNotes holds refs to old strings.
   */
  async expandTo(targetVelocities: number): Promise<void> {
    if (!this._enabled) {
      return; 
    }

    const targetVelLevels = velocitiesMap[targetVelocities];
    if (!targetVelLevels?.length) {
      return; 
    }

    const loadedVelocities = new Set(this._strings.map(s => s.velocity));
    const newVelLevels = targetVelLevels.filter(v => !loadedVelocities.has(v));
    if (newVelLevels.length === 0) {
      return; 
    }

    const newStrings = await Promise.all(newVelLevels.map(async velocity => {
      const string = new PianoString({ ...this._stringBaseConfig, notes: this._notes, velocity });
      await string.load();
      string.connect(this.output);
      return string;
    }));

    const combined = [...this._strings, ...newStrings];
    combined.sort((a, b) => a.velocity - b.velocity);
    this._strings = combined;
  }

  protected async _internalLoad(): Promise<void> {
    await Promise.all(this._strings.map(async s => {
      await s.load();
      s.connect(this.output);
    }));
  }
}
