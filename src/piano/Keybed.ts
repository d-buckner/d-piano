import { ToneBufferSource } from 'tone';

import { PianoComponent } from './Component';
import { getReleasesUrl } from './Salamander';
import { randomBetween } from './Util';
import AudioBufferCache from './AudioBufferCache';

import type { ToneAudioBuffers } from 'tone';
import type { PianoComponentOptions, UrlsMap } from './Component';


interface KeybedOptions extends PianoComponentOptions {
	minNote: number
	maxNote: number
}

export class Keybed extends PianoComponent {

  /**
	 * All of the buffers of keybed clicks
	 */
  private _buffers: ToneAudioBuffers;

  /**
	 * The urls to load
	 */
  private _urls: UrlsMap = {};

  constructor(options: KeybedOptions) {
    super(options);

    for (let i = options.minNote; i <= options.maxNote; i++) {
      this._urls[i] = getReleasesUrl(i);
    }
  }

  protected async _internalLoad(): Promise<void> {
    this._buffers = await AudioBufferCache.getBuffers(this.samples, this._urls);
  }

  start(note: number, time: number, velocity: number): void {
    if (this._enabled && this._buffers.has(note)) {
      const source = new ToneBufferSource({
        context: this.context,
        url: this._buffers.get(note),
      }).connect(this.output);
      // randomize the velocity slightly
      source.start(time, 0, undefined, 0.015 * velocity * randomBetween(0.5, 1));
    }
  }
}
