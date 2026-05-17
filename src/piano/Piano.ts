import {
  Gain,
  optionsFromArguments,
  ToneAudioNode,
} from 'tone';

import { PianoSampler } from './PianoSampler';

import type { ToneAudioNodeOptions, Unit } from 'tone';


interface KeyEvent {
  time?: Unit.Time;
  velocity?: number;
  note?: string;
  midi?: number;
}

interface PedalEvent {
  time?: Unit.Time;
}

export interface PianoOptions extends ToneAudioNodeOptions {
  /**
   * The maximum number of velocity levels to load. Progressive loading starts
   * with 1 velocity and upgrades to this target during browser idle time.
   * Default: 8.
   */
  velocities?: number;
  /**
   * The lowest note to load
   */
  minNote?: number;
  /**
   * The highest note to load
   */
  maxNote?: number;
  /**
   * If it should include a 'release' sounds composed of a keyclick and string harmonic
   */
  release?: boolean;
  /**
   * If the piano should include a 'pedal' sound.
   */
  pedal?: boolean;
  /**
   * The directory of the salamander grand piano samples
   */
  url?: string;
  /**
   * The maximum number of notes that can be held at once
   */
  maxPolyphony?: number;
  /**
   * Volume levels for each of the components (in decibels)
   */
  volume?: {
    pedal: number;
    strings: number;
    keybed: number;
    harmonics: number;
  };
  /**
   * Called once when the piano is first ready to play (after the initial velocity pass loads).
   */
  onPlayable?: () => void;
  /**
   * Called after each velocity loading step with a normalized progress value (0–1).
   * Fires after the initial load and after each background expansion step.
   * Progress reaches 1.0 when all target velocities are loaded.
   */
  onLoadProgress?: (_progress: number) => void;
  /**
   * Called if background velocity upgrades do not complete within 30 seconds.
   */
  onTimeout?: () => void;
}

type PianoSamplerConfig = {
  minNote: number;
  maxNote: number;
  release: boolean;
  pedal: boolean;
  url: string;
  maxPolyphony: number;
  volume: {
    pedal: number;
    strings: number;
    keybed: number;
    harmonics: number;
  };
};

/**
 * A progressive piano that upgrades velocity resolution in the background.
 * Always starts with a single velocity for fast time-to-ready, then expands
 * to the target velocity count. Cache hits make each expansion step fast.
 */
export class Piano extends ToneAudioNode<PianoOptions> {

  readonly name = 'Piano';

  readonly input = undefined;

  readonly output = new Gain({ context: this.context });

  private _sampler?: PianoSampler;

  private _velocities: number;

  private _samplerConfig: PianoSamplerConfig;

  private _onPlayable?: () => void;

  private _onLoadProgress?: (_progress: number) => void;

  private _onTimeout?: () => void;

  private _loaded = false;

  // eslint-disable-next-line no-unused-vars
  constructor(options?: Partial<PianoOptions>);

  constructor() {
    super(optionsFromArguments(Piano.getDefaults(), arguments));

    const options = optionsFromArguments(Piano.getDefaults(), arguments);

    if (!options.url.endsWith('/')) {
      options.url += '/';
    }

    this._velocities = options.velocities;
    this._onPlayable = options.onPlayable;
    this._onLoadProgress = options.onLoadProgress;
    this._onTimeout = options.onTimeout;
    this._samplerConfig = {
      minNote: options.minNote,
      maxNote: options.maxNote,
      release: options.release,
      pedal: options.pedal,
      url: options.url,
      maxPolyphony: options.maxPolyphony,
      volume: options.volume,
    };
  }

  static getDefaults(): Required<PianoOptions> {
    return Object.assign(ToneAudioNode.getDefaults(), {
      velocities: 8,
      maxNote: 108,
      maxPolyphony: 32,
      minNote: 21,
      onPlayable: undefined,
      onLoadProgress: undefined,
      onTimeout: undefined,
      pedal: true,
      release: false,
      url: 'https://d-buckner.github.io/salamander-piano/',
      volume: {
        harmonics: 0,
        keybed: 0,
        pedal: 0,
        strings: 0,
      },
    }) as unknown as Required<PianoOptions>;
  }

  /**
   * Load samples progressively. Resolves after the first velocity pass is ready;
   * upgrades to the target velocity count continue in the background.
   */
  async load(): Promise<void> {
    const sampler = new PianoSampler({
      ...this._samplerConfig,
      velocities: 1,
      context: this.context,
    });

    await sampler.load();
    sampler.connect(this.output);
    this._sampler = sampler;
    this._loaded = true;
    this._onPlayable?.();
    this._onLoadProgress?.(1 / this._velocities);

    if (this._velocities > 1) {
      void this._expandInBackground(1);
    }
  }

  /**
   * If the first velocity pass is loaded and ready to play
   */
  get loaded(): boolean {
    return this._loaded;
  }

  /**
   * Play a note.
   */
  keyDown(event: KeyEvent): this {
    this._sampler?.keyDown(event);
    return this;
  }

  /**
   * Release a held note.
   */
  keyUp(event: KeyEvent): this {
    this._sampler?.keyUp(event);
    return this;
  }

  /**
   * Put the pedal down. Causes subsequent notes and currently held notes to sustain.
   */
  pedalDown(event: PedalEvent = {}): this {
    this._sampler?.pedalDown(event);
    return this;
  }

  /**
   * Put the pedal up. Dampens sustained notes.
   */
  pedalUp(event: PedalEvent = {}): this {
    this._sampler?.pedalUp(event);
    return this;
  }

  /**
   * Stop all currently playing notes.
   */
  stopAll(): this {
    this._sampler?.stopAll();
    return this;
  }

  private async _expandInBackground(from: number): Promise<void> {
    const deadline = Date.now() + 30_000;
    try {
      for (let v = from + 1; v <= this._velocities; v++) {
        if (Date.now() >= deadline) {
          this._onTimeout?.();
          return;
        }
        await this._sampler!.expandTo(v);
        this._onLoadProgress?.(v / this._velocities);
      }
    } catch {
      // background expansion errors are non-fatal
    }
  }

}
