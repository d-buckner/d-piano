import {
  Gain,
  optionsFromArguments,
  ToneAudioNode,
} from 'tone';

import { PianoSampler } from './PianoSampler';
import { getNotesUrl, velocitiesMap } from './Salamander';

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
 * A progressive, cache-aware piano that upgrades velocity resolution in the background.
 * Loads a fast first pass immediately, then upgrades during browser idle time.
 * If samples are already cached, starts at the highest cached quality automatically.
 */
export class Piano extends ToneAudioNode<PianoOptions> {

  readonly name = 'Piano';

  readonly input = undefined;

  readonly output = new Gain({ context: this.context });

  private _sampler?: PianoSampler;

  private _velocities: number;

  private _url: string;

  private _samplerConfig: PianoSamplerConfig;

  private _onPlayable?: () => void;

  private _onLoadProgress?: (_progress: number) => void;

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
    this._url = options.url;
    this._onPlayable = options.onPlayable;
    this._onLoadProgress = options.onLoadProgress;
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
      pedal: true,
      release: false,
      url: 'https://tambien.github.io/Piano/Salamander/',
      volume: {
        harmonics: 0,
        keybed: 0,
        pedal: 0,
        strings: 0,
      },
    }) as unknown as Required<PianoOptions>;
  }

  /**
   * Load samples. Detects cached samples and starts from the best cached quality.
   * Resolves after the first sampler is ready; upgrades continue in the background.
   */
  async load(): Promise<void> {
    const startVelocities = await this._detectStartVelocities();
    const sampler = new PianoSampler({
      ...this._samplerConfig,
      velocities: startVelocities,
      context: this.context,
    });

    await sampler.load();
    sampler.connect(this.output);
    this._sampler = sampler;
    this._loaded = true;
    this._onPlayable?.();
    this._onLoadProgress?.(startVelocities / this._velocities);

    if (startVelocities < this._velocities) {
      void this._expandInBackground(startVelocities);
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
    try {
      for (let v = from + 1; v <= this._velocities; v++) {
        await this._sampler!.expandTo(v);
        this._onLoadProgress?.(v / this._velocities);
      }
    } catch {
      // background expansion errors are non-fatal
    }
  }

  /**
   * Detect the best starting velocity count based on cache state.
   * Returns the target velocity count if cached, otherwise 1 for fast initial load.
   */
  private async _detectStartVelocities(): Promise<number> {
    if (this._velocities <= 1) {
      return 1; 
    }
    if (typeof window === 'undefined' || !window.caches) {
      return 1; 
    }

    const cached = await this._isTargetCached(this._velocities);
    return cached ? this._velocities : 1;
  }

  /**
   * Check whether the target velocity samples are already in the cache.
   */
  private async _isTargetCached(velocities: number): Promise<boolean> {
    const velLevels = velocitiesMap[velocities];
    if (!velLevels?.length) {
      return false; 
    }

    const singleVelLevels = new Set(velocitiesMap[1] ?? []);
    const uniqueVels = velLevels.filter(v => !singleVelLevels.has(v));
    if (!uniqueVels.length) {
      return false; 
    }

    const probeUrl = this._url + getNotesUrl(69 /* A4 */, Math.min(...uniqueVels));
    try {
      const match = await caches.match(probeUrl);
      return !!match;
    } catch {
      return false;
    }
  }
}
