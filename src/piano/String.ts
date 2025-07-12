import { Sampler, ToneAudioNode } from 'tone';

import { getNotesUrl } from './Salamander';
import AudioBufferCache from './AudioBufferCache';

import type { PianoComponentOptions, UrlsMap } from './Component';


interface PianoStringOptions extends PianoComponentOptions {
	notes: number[]
	velocity: number
}

/**
 * A single velocity of strings
 */
export class PianoString extends ToneAudioNode {

  readonly name = 'PianoString';

  private _sampler: Sampler;

  output: Sampler;

  input: undefined;

  private _urls: UrlsMap = {};

  readonly samples: string;

  constructor(options: PianoStringOptions) {
    super(options);

    // create the urls
    options.notes.forEach(note => this._urls[note] = getNotesUrl(note, options.velocity));

    this.samples = options.samples;
  }

  async load(): Promise<void> {
    // TODO: get audio buffers
    const urls = await AudioBufferCache.getBufferMap(this.samples, this._urls);
    return new Promise(onload => {
      this._sampler = this.output = new Sampler({
        attack: 0,
        baseUrl: this.samples,
        curve: 'exponential',
        onload,
        release: 0.4,
        urls,
        volume: 3,
      });
    });
  }

  triggerAttack(note: string, time: number, velocity: number): void {
    this._sampler.triggerAttack(note, time, velocity);
  }

  triggerRelease(note: string, time: number): void {
    this._sampler.triggerRelease(note, time);
  }
}
